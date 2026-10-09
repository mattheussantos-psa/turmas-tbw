import type { DiaAvaliacao, DreEstado, Arquivo, Quali } from "./tipos";
import esperaJson from "@/data/espera.json";
import dreJson from "@/data/dre.json";
import checklistsJson from "@/data/checklists.json";
import avaliacoesJson from "@/data/avaliacoes.json";
import qualiJson from "@/data/avaliacoes-quali.json";

// Os alunos vêm do HubSpot em /api/alunos (negócios ganhos do Funil de Vendas B2C). O que sobrou
// aqui é o que ainda não tem origem no CRM: lista de espera, custos de evento e avaliações.
export const ESPERA_NOMES = esperaJson as string[];

// Custos reais dos fechamentos CSX (DREs) recebidos em 21/09/2026. Não há orçamento previsto
// nesses documentos — o campo nasce vazio de propósito, para ser preenchido à mão.
export const DRE_SEED = dreJson as Record<string, Partial<DreEstado>>;

export const CHECKLISTS = checklistsJson as Record<string, Arquivo>;
export const AVALIACOES_SEED = avaliacoesJson as Record<string, DiaAvaliacao[]>;
export const QUALI_SEED = qualiJson as Record<string, Quali>;

export const DRE_PASTAS = ["The Best Weekend", "The Best Day", "The Best Speaker", "PSA.Experience"];

export const PAGE_HEADERS: Record<string, [string, string]> = {
  home: ["Visão Geral", "Painel PSA 2026 · Funil de Vendas B2C · HubSpot"],
  roster: ["Turmas 2026", "Negócios ganhos do Funil de Vendas B2C, direto do HubSpot"],
  waitlist: ["Lista de Espera", "Interessados sem turma confirmada ainda"],
  aval: ["Avaliações", "Respostas dos alunos por turma, dia a dia"],
  kpis: ["KPIs", "Seus indicadores, mês a mês"],
  dre: ["DRE", "Orçamento e receita realizada, por evento"],
};

export const ABAS: [string, string][] = [
  ["home", "Visão Geral"],
  ["roster", "Turmas"],
  ["waitlist", "Lista de Espera"],
  ["aval", "Avaliações"],
  ["kpis", "KPIs"],
  ["dre", "DRE"],
];

// Eventos que não vêm do HubSpot (não têm negócio associado), mas têm DRE própria.
export const EVENTOS_EXTRAS: Record<string, string[]> = {
  "The Best Speaker": ["The Best Speaker 2026"],
  "PSA.Experience": ["PSA.Experience — 1ª edição (Agosto)", "PSA.Experience — 2ª edição (Outubro, 2 dias)"],
};
