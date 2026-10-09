import type { Deal, Estado, Status } from "./tipos";
import { EVENTOS_EXTRAS } from "./dados";
import { monthKey } from "./fmt";
import { dealId } from "./estado";

export function statusEfetivo(e: Estado, d: Deal): Status {
  return e.linhas[dealId(d)]?.statusOverride || d.status;
}

// Quem está em fila de espera não tem turma: fica fora dos gráficos, dos totais e dos seletores de
// turma, e aparece só na aba Lista de Espera.
export function alunosEmTurma(e: Estado): Deal[] {
  return e.deals.filter((d) => !d.espera);
}

export function alunosEmEspera(e: Estado): Deal[] {
  return e.deals.filter((d) => d.espera);
}

// Lista de turmas na ordem do calendário. Sai do estado, não da resposta crua da API, porque o
// nome da turma é editável na aba Turmas — renomear ali tem que refletir em todos os filtros.
export function todasTurmas(e: Estado): string[] {
  const set = new Set(alunosEmTurma(e).map((d) => e.linhas[dealId(d)]?.turma).filter(Boolean) as string[]);
  return Array.from(set).sort((a, b) => monthKey(a) - monthKey(b) || a.localeCompare(b, "pt-BR"));
}

// A ordem das linhas é a que veio do HubSpot e não muda durante a sessão, então editar um campo
// nunca faz a linha pular de lugar no meio da digitação.
export function ordemLinhas(e: Estado): Deal[] {
  return alunosEmTurma(e);
}

export function valorDaLinha(e: Estado, d: Deal): number {
  return Number(e.linhas[dealId(d)]?.amount) || 0;
}

export function receitaDaTurma(e: Estado, turma: string): number {
  return alunosEmTurma(e).reduce((s, d) => (e.linhas[dealId(d)]?.turma === turma ? s + valorDaLinha(e, d) : s), 0);
}

export function alunosDaTurma(e: Estado, turma: string): Deal[] {
  return alunosEmTurma(e).filter((d) => e.linhas[dealId(d)]?.turma === turma);
}

export function eventosDaPasta(e: Estado, pasta: string): string[] {
  const turmas = todasTurmas(e);
  if (pasta === "The Best Weekend") return turmas.filter((t) => /TBW|The Best Weekend/i.test(t));
  if (pasta === "The Best Day") return turmas.filter((t) => /TBD|The Best Day/i.test(t));
  return EVENTOS_EXTRAS[pasta] || [];
}
