// Um registro do snapshot do HubSpot: negócio do Funil de Vendas B2C com stage Ganho.
// `key` é a identidade da LINHA, não do negócio: 143 dos 416 registros vieram sem hubspot_id
// (são os "não encontrados") e há ids repetidos entre pessoas diferentes, então o id do HubSpot
// serve só para o link. Quando a integração entrar, cada linha passa a ter id de negócio de verdade.
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
};

export type EsperaEstado = {
  name: string;
  turmaInteresse: string;
  nota: string;
  chamado: boolean;
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
  linhas: Record<string, LinhaEstado>;
  espera: Record<string, EsperaEstado>;
  dre: Record<string, DreEstado>;
  kpiCols: KpiColuna[];
  kpiCells: Record<string, Record<string, string>>;
  avaliacoes: Record<string, DiaAvaliacao[]>;
};

export type Aba = "home" | "roster" | "waitlist" | "aval" | "kpis" | "dre";
