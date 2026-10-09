// Um aluno: negócio do Funil de Vendas B2C no estágio Ganho. `key` é o id do negócio no HubSpot.
export type Deal = {
  key: string;
  name: string;
  turma: string;
  produto: string;
  amount: number | null;
  status: Status;
  nota: string;
  hubspot_id: number;
  hubspot_url: string;
  /** A turma do CRM é uma lista de espera: a pessoa já pagou mas ainda não tem turma definida. */
  espera: boolean;
};

export type Status = "ok" | "divergencia" | "nao_encontrado" | "resolvido";

export type LinhaEstado = {
  name: string;
  turma: string;
  produto: string;
  amount: number | string;
  nota: string;
  statusOverride: Status | null;
  onboarding: boolean;
  mentoria: boolean;
  /** Marcação manual da aba Lista de Espera: já falaram com a pessoa. */
  contatado: boolean;
};

export type DreEstado = {
  orcamento: number | string;
  receita: number | string;
  custoEvento: number | string;
  custoCaches: number | string;
  custoExtras: number | string;
  notas: string;
};

export type KpiColuna = { id: string; name: string };

export type Arquivo = {
  fileName: string;
  uploadedAt: string;
  sizeKB: number;
  url: string;
};

// Um dia de avaliação: primeira linha de `rows` é o cabeçalho das perguntas.
export type DiaAvaliacao = {
  fileName: string;
  uploadedAt: string;
  sheetName: string;
  rows: (string | number)[][];
  anexo: Arquivo | null;
};

export type Quali = {
  resumo: string;
  destaquesPositivos: string[];
  pontosDeAtencao: string[];
};

export type Estado = {
  /** Alunos vindos do HubSpot nesta carga. Não é persistido — vem da API a cada abertura. */
  deals: Deal[];
  linhas: Record<string, LinhaEstado>;
  dre: Record<string, DreEstado>;
  kpiCols: KpiColuna[];
  kpiCells: Record<string, Record<string, string>>;
  avaliacoes: Record<string, DiaAvaliacao[]>;
};

export type Aba = "home" | "roster" | "waitlist" | "aval" | "kpis" | "dre";
