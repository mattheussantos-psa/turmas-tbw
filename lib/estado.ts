"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal, DreEstado, Estado, EsperaEstado, LinhaEstado } from "./tipos";
import { DRE_SEED, ESPERA_NOMES } from "./dados";
import { slugify } from "./fmt";

const CHAVE = "painel-turmas:v2";

export const KPI_COLS_PADRAO = [
  { id: "cac", name: "CAC (Custo de Aquisição)" },
  { id: "conversao", name: "Taxa de conversão (%)" },
  { id: "nps", name: "NPS de atendimento" },
];

export function dealId(d: Deal): string {
  return d.key;
}

export function linhaPadrao(d: Deal): LinhaEstado {
  return {
    name: d.name,
    turma: d.turma,
    produto: d.produto,
    amount: d.amount === null || d.amount === undefined ? "" : d.amount,
    nota: d.nota || "",
    statusOverride: null,
    onboarding: false,
    mentoria: false,
  };
}

export function esperaPadrao(name: string): EsperaEstado {
  return { name, turmaInteresse: "", nota: "", chamado: false };
}

export function drePadrao(slug: string, receitaCalculada: number): DreEstado {
  const seed = DRE_SEED[slug] || {};
  return {
    orcamento: seed.orcamento ?? "",
    // Receita nasce somando o "Valor pago" dos alunos dessa turma na aba Turmas. Editar o campo
    // grava a edição e ele para de seguir a Turmas.
    receita: receitaCalculada || "",
    custoEvento: seed.custoEvento ?? "",
    custoCaches: seed.custoCaches ?? "",
    custoExtras: seed.custoExtras ?? "",
    notas: seed.notas ?? "",
  };
}

// As edições do usuário — só elas. Os alunos vêm do HubSpot a cada carga, nunca do localStorage,
// senão uma turma renomeada no CRM ficaria presa no navegador de quem já abriu o painel.
type Edicoes = Omit<Estado, "deals">;

function estadoInicial(deals: Deal[]): Estado {
  const linhas: Record<string, LinhaEstado> = {};
  for (const d of deals) linhas[dealId(d)] = linhaPadrao(d);
  const espera: Record<string, EsperaEstado> = {};
  for (const n of ESPERA_NOMES) espera[slugify(n)] = esperaPadrao(n);
  return {
    deals,
    linhas,
    espera,
    dre: {},
    kpiCols: KPI_COLS_PADRAO.map((c) => ({ ...c })),
    kpiCells: {},
    avaliacoes: {},
  };
}

// ponytail: edições ficam no localStorage do navegador — some se trocar de máquina e não é
// compartilhado entre pessoas. Quando status/nota/onboarding/mentoria virarem propriedades de
// negócio no HubSpot, a gravação passa a ser lá e isto aqui vira só cache de rascunho.
function comEdicoesSalvas(base: Estado): Estado {
  const bruto = window.localStorage.getItem(CHAVE);
  if (!bruto) return base;
  const salvo = JSON.parse(bruto) as Partial<Edicoes>;

  // Só reaplica edição de linha que ainda existe no HubSpot; negócio que saiu do funil some junto.
  const linhas = { ...base.linhas };
  for (const [id, edicao] of Object.entries(salvo.linhas || {})) {
    if (linhas[id]) linhas[id] = { ...linhas[id], ...edicao };
  }

  return {
    deals: base.deals,
    linhas,
    espera: { ...base.espera, ...(salvo.espera || {}) },
    dre: salvo.dre || {},
    kpiCols: salvo.kpiCols || base.kpiCols,
    kpiCells: salvo.kpiCells || {},
    avaliacoes: salvo.avaliacoes || {},
  };
}

function salvar(e: Estado) {
  const { deals: _fora, ...edicoes } = e;
  window.localStorage.setItem(CHAVE, JSON.stringify(edicoes));
}

export type Carga =
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "pronto"; buscadoEm: string };

export function usePainel() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [carga, setCarga] = useState<Carga>({ fase: "carregando" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async (refresh = false) => {
    setCarga({ fase: "carregando" });
    try {
      const res = await fetch("/api/alunos" + (refresh ? "?refresh=1" : ""));
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo?.erro || `/api/alunos respondeu ${res.status}`);
      setEstado(comEdicoesSalvas(estadoInicial(corpo.alunos)));
      setCarga({ fase: "pronto", buscadoEm: corpo.buscadoEm });
    } catch (e) {
      setCarga({ fase: "erro", mensagem: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizar = useCallback((fn: (e: Estado) => Estado) => {
    setEstado((atual) => {
      if (!atual) return atual;
      const novo = fn(atual);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => salvar(novo), 300);
      return novo;
    });
  }, []);

  return { estado, carga, atualizar, recarregar: () => carregar(true) };
}
