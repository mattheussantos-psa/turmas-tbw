export const MONTH_ORDER: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, "Março": 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

export const ALL_MONTHS = Object.keys(MONTH_ORDER).sort((a, b) => MONTH_ORDER[a] - MONTH_ORDER[b]);

// Turmas sem mês reconhecível vão para o fim da lista.
export function monthKey(turma: string): number {
  for (const m in MONTH_ORDER) if (turma.startsWith(m)) return MONTH_ORDER[m];
  return 99;
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
