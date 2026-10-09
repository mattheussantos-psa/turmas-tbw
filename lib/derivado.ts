import type { Deal, Estado, Status } from "./tipos";
import { EVENTOS_EXTRAS } from "./dados";
import { monthKey } from "./fmt";
import { dealId } from "./estado";

export function statusEfetivo(e: Estado, d: Deal): Status {
  return e.linhas[dealId(d)]?.statusOverride || d.status;
}

// Lista de turmas na ordem do calendário. Sai do estado, não da resposta crua da API, porque o
// nome da turma é editável na aba Turmas — renomear ali tem que refletir em todos os filtros.
export function todasTurmas(e: Estado): string[] {
  const set = new Set(e.deals.map((d) => e.linhas[dealId(d)]?.turma).filter(Boolean) as string[]);
  return Array.from(set).sort((a, b) => monthKey(a) - monthKey(b) || a.localeCompare(b, "pt-BR"));
}

// A ordem das linhas é a que veio do HubSpot e não muda durante a sessão, então editar um campo
// nunca faz a linha pular de lugar no meio da digitação.
export function ordemLinhas(e: Estado): Deal[] {
  return e.deals;
}

export function valorDaLinha(e: Estado, d: Deal): number {
  return Number(e.linhas[dealId(d)]?.amount) || 0;
}

export function receitaDaTurma(e: Estado, turma: string): number {
  return e.deals.reduce((s, d) => (e.linhas[dealId(d)]?.turma === turma ? s + valorDaLinha(e, d) : s), 0);
}

export function alunosDaTurma(e: Estado, turma: string): Deal[] {
  return e.deals.filter((d) => e.linhas[dealId(d)]?.turma === turma);
}

export function eventosDaPasta(e: Estado, pasta: string): string[] {
  const turmas = todasTurmas(e);
  if (pasta === "The Best Weekend") return turmas.filter((t) => /TBW|The Best Weekend/i.test(t));
  if (pasta === "The Best Day") return turmas.filter((t) => /TBD|The Best Day/i.test(t));
  return EVENTOS_EXTRAS[pasta] || [];
}
