export const MONTH_ORDER: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, "Março": 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

export const ALL_MONTHS = Object.keys(MONTH_ORDER).sort((a, b) => MONTH_ORDER[a] - MONTH_ORDER[b]);

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// O mês aparece no MEIO do rótulo do HubSpot ("TBW POA | Outubro/26", "TBW - POA/Agosto/2026"),
// não no começo como no painel antigo ("Janeiro TBW | SP"). Procurar só no início fazia TODA turma
// cair em 99: a ordenação por mês virava empate geral e sobrava a ordem alfabética, e a "próxima
// turma" passava a ser sempre a primeira do alfabeto.
// Vale o mês que aparece primeiro no texto; turma sem mês reconhecível vai para o fim da lista.
export function monthKey(turma: string): number {
  const alvo = semAcento(turma);
  let mes = 99;
  let posicao = Infinity;
  for (const m in MONTH_ORDER) {
    const i = alvo.indexOf(semAcento(m));
    if (i !== -1 && i < posicao) {
      posicao = i;
      mes = MONTH_ORDER[m];
    }
  }
  return mes;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function fmtMoney(n: number | string | null | undefined): string | null {
  if (n === null || n === undefined || n === "") return null;
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isNumericCell(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return false;
  const n = Number(v);
  return !isNaN(n) && isFinite(n);
}

export const STATUS_LABELS: Record<string, string> = {
  ok: "Confirmado",
  divergencia: "Divergência",
  nao_encontrado: "Não encontrado",
  resolvido: "Resolvido por mim",
};
