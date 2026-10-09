import type { Deal } from "./tipos";

const BASE = "https://api.hubapi.com";

// Funil de Vendas B2C e o estágio "Ganho" DESTE funil. Medidos no portal 49656171 em 09/10/2026 —
// cuidado: existe um "Ganho / Contrato assinado" (1076664460) que é do funil B2B, não serve aqui.
const PIPELINE = (process.env.HUBSPOT_PIPELINE_B2C ?? "").trim() || "725182862";
const STAGE_GANHO = (process.env.HUBSPOT_STAGE_GANHO ?? "").trim() || "1105295876";

const PROP_TURMA = "turma_the_best_weekend_";
const PROP_PRODUTO = "produto_de_interesse";

// Valores da propriedade de turma que não designam uma turma de verdade — entram como "sem turma"
// e ficam de fora do painel.
const NAO_E_TURMA = new Set(["Não se aplica", "Nenhuma", "Cancelado", ""]);

// Diz em que estado a variável chegou ao runtime, sem nunca revelar o valor. "existe mas vazia" e
// "não existe" são problemas diferentes (um é cadastro em branco, o outro é escopo/redeploy), e a
// mensagem genérica de antes mandava procurar no lugar errado.
function estadoDaVar(nome: string): string {
  const v = process.env[nome];
  if (v === undefined) return `${nome}: não chegou ao runtime`;
  if (v.trim() === "") return `${nome}: existe, mas está vazia`;
  return `${nome}: ok (${v.trim().length} caracteres)`;
}

function headers() {
  const token = (process.env.HUBSPOT_TOKEN ?? "").trim();
  if (!token) {
    const diagnostico = ["HUBSPOT_TOKEN", "HUBSPOT_PIPELINE_B2C", "HUBSPOT_STAGE_GANHO"]
      .map(estadoDaVar)
      .join(" · ");
    throw new Error(
      `Sem token do HubSpot. O que o runtime enxerga agora → ${diagnostico}. ` +
        `Se a variável existe mas está vazia, preencha o valor; se não chegou ao runtime, confira o ` +
        `ambiente (Production/Preview) e refaça o deploy, porque a variável só entra no build.`
    );
  }
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// Toda chamada passa por aqui: se o HubSpot responder erro ele estoura com status e corpo, em vez
// de quebrar depois num .json() de uma página de HTML.
//
// Em 403 por scope faltando, o próprio HubSpot nomeia o que falta em context.requiredGranularScopes.
// É a única fonte confiável disso: qual scope cada endpoint exige não está documentado de forma
// completa, então em vez de adivinhar a lista nós mostramos a resposta da API.
async function hs(caminho: string, init?: RequestInit) {
  const res = await fetch(BASE + caminho, { ...init, headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    const metodo = init?.method || "GET";

    if (res.status === 403) {
      let exigidos: string[] = [];
      try {
        const j = JSON.parse(corpo);
        exigidos = j?.context?.requiredGranularScopes ?? j?.requiredGranularScopes ?? [];
      } catch {
        // corpo não-JSON: segue para a mensagem genérica abaixo, com o texto cru
      }
      if (exigidos.length) {
        throw new Error(
          `O token não tem scope para ${metodo} ${caminho}. O HubSpot diz que basta UM destes: ` +
            `${exigidos.join(", ")}. Adicione no Private App, gere o token de novo e refaça o deploy.`
        );
      }
      throw new Error(`HubSpot negou ${metodo} ${caminho} (403). Resposta: ${corpo.slice(0, 400)}`);
    }

    throw new Error(`HubSpot ${metodo} ${caminho} → ${res.status}: ${corpo.slice(0, 300)}`);
  }
  return res.json();
}

// Mapa value -> label de uma propriedade de enumeração. Os dois enums deste painel têm value
// diferente do label (a turma cujo value diz "Fevereiro 2026" tem label "Abril 2026"), e a API de
// objetos devolve o VALUE. Sem esta tradução o painel mostra turma e produto errados.
async function rotulos(propriedade: string): Promise<Map<string, string>> {
  const data = await hs(`/crm/v3/properties/deals/${propriedade}`);
  return new Map((data.options ?? []).map((o: any) => [String(o.value), String(o.label ?? o.value)]));
}

type DealBruto = { id: string; properties: Record<string, string | null> };

async function buscarGanhos(): Promise<DealBruto[]> {
  const out: DealBruto[] = [];
  let after: string | undefined;
  for (let i = 0; i < 100; i++) {
    const body: any = {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINE },
            { propertyName: "dealstage", operator: "EQ", value: STAGE_GANHO },
            { propertyName: PROP_TURMA, operator: "HAS_PROPERTY" },
          ],
        },
      ],
      properties: [PROP_TURMA, PROP_PRODUTO, "amount", "dealname"],
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      limit: 100,
    };
    if (after) body.after = after;
    const data = await hs("/crm/v3/objects/deals/search", { method: "POST", body: JSON.stringify(body) });
    out.push(...(data.results ?? []));
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

const lotes = <T,>(xs: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// negócio -> primeiro contato associado. Um negócio sem contato associado fica de fora do mapa e
// o aluno aparece com o nome do negócio como último recurso.
async function contatoPorNegocio(dealIds: string[]): Promise<Map<string, string>> {
  const paraContato = new Map<string, string>();
  for (const lote of lotes(dealIds, 100)) {
    const data = await hs("/crm/v4/associations/deals/contacts/batch/read", {
      method: "POST",
      body: JSON.stringify({ inputs: lote.map((id) => ({ id })) }),
    });
    for (const r of data.results ?? []) {
      const primeiro = (r.to ?? [])[0];
      if (primeiro) paraContato.set(String(r.from.id), String(primeiro.toObjectId));
    }
  }

  const nomePorContato = new Map<string, string>();
  for (const lote of lotes(Array.from(new Set(paraContato.values())), 100)) {
    const data = await hs("/crm/v3/objects/contacts/batch/read", {
      method: "POST",
      body: JSON.stringify({
        // hs_full_name_or_email já resolve o contato sem nome preenchido, caindo no e-mail.
        properties: ["hs_full_name_or_email"],
        inputs: lote.map((id) => ({ id })),
      }),
    });
    for (const c of data.results ?? []) {
      nomePorContato.set(String(c.id), String(c.properties?.hs_full_name_or_email ?? "").trim());
    }
  }

  const out = new Map<string, string>();
  paraContato.forEach((contatoId, dealId) => {
    const nome = nomePorContato.get(contatoId);
    if (nome) out.set(dealId, nome);
  });
  return out;
}

export function montarAlunos(
  brutos: DealBruto[],
  nomes: Map<string, string>,
  turmaLabel: Map<string, string>,
  produtoLabel: Map<string, string>,
  portalId: string
): Deal[] {
  const alunos: Deal[] = [];
  for (const d of brutos) {
    const turmaValue = (d.properties[PROP_TURMA] ?? "").trim();
    if (NAO_E_TURMA.has(turmaValue)) continue;

    // produto_de_interesse é multi-seleção: vem "A;B" e cada parte precisa do próprio rótulo.
    const produto = (d.properties[PROP_PRODUTO] ?? "")
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => produtoLabel.get(v) ?? v)
      .join(" + ");

    const amount = d.properties.amount;
    alunos.push({
      key: d.id,
      name: nomes.get(d.id) || (d.properties.dealname ?? "").trim() || "(sem contato associado)",
      turma: turmaLabel.get(turmaValue) ?? turmaValue,
      produto,
      amount: amount === null || amount === undefined || amount === "" ? null : Number(amount),
      // Todo registro aqui é um negócio ganho de verdade, então nasce confirmado. Os status de
      // divergência existiam na conferência manual contra a lista em papel, não na fonte.
      status: "ok",
      nota: "",
      hubspot_id: Number(d.id),
      hubspot_url: `https://app.hubspot.com/contacts/${portalId}/record/0-3/${d.id}`,
    });
  }

  return alunos.sort((a, b) => a.turma.localeCompare(b.turma, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));
}

export async function buscarAlunos(): Promise<{ alunos: Deal[]; buscadoEm: string }> {
  const portalId = (process.env.HUBSPOT_PORTAL_ID ?? "").trim() || "49656171";
  const [brutos, turmaLabel, produtoLabel] = await Promise.all([
    buscarGanhos(),
    rotulos(PROP_TURMA),
    rotulos(PROP_PRODUTO),
  ]);
  const nomes = await contatoPorNegocio(brutos.map((d) => d.id));
  return {
    alunos: montarAlunos(brutos, nomes, turmaLabel, produtoLabel, portalId),
    buscadoEm: new Date().toISOString(),
  };
}
