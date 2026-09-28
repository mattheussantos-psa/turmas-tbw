"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Deal, DreEstado, Estado, EsperaEstado, LinhaEstado } from "./tipos";
import { DEALS, DRE_SEED, ESPERA_NOMES } from "./dados";
import { slugify } from "./fmt";

const CHAVE = "painel-turmas:v1";

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

function estadoInicial(): Estado {
  const linhas: Record<string, LinhaEstado> = {};
  for (const d of DEALS) linhas[dealId(d)] = linhaPadrao(d);
  const espera: Record<string, EsperaEstado> = {};
  for (const n of ESPERA_NOMES) espera[slugify(n)] = esperaPadrao(n);
  return {
    linhas,
    espera,
    dre: {},
    kpiCols: KPI_COLS_PADRAO.map((c) => ({ ...c })),
    kpiCells: {},
    avaliacoes: {},
  };
}

// ponytail: edições ficam no localStorage do navegador — some se trocar de máquina e não é
// compartilhado entre pessoas. Quando status/nota/onboarding/mentoria virarem propriedades
// de negócio no HubSpot, a gravação passa a ser lá e isto aqui vira só cache de rascunho.
function ler(): Estado {
  const base = estadoInicial();
  if (typeof window === "undefined") return base;
  const bruto = window.localStorage.getItem(CHAVE);
  if (!bruto) return base;
  const salvo = JSON.parse(bruto) as Partial<Estado>;
  return {
    linhas: { ...base.linhas, ...(salvo.linhas || {}) },
    espera: { ...base.espera, ...(salvo.espera || {}) },
    dre: salvo.dre || {},
    kpiCols: salvo.kpiCols || base.kpiCols,
    kpiCells: salvo.kpiCells || {},
    avaliacoes: salvo.avaliacoes || {},
  };
}

export function usePainel() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Só depois da hidratação, senão o servidor renderiza um estado e o cliente outro.
  useEffect(() => setEstado(ler()), []);

  const atualizar = useCallback((fn: (e: Estado) => Estado) => {
    setEstado((atual) => {
      if (!atual) return atual;
      const novo = fn(atual);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        window.localStorage.setItem(CHAVE, JSON.stringify(novo));
      }, 300);
      return novo;
    });
  }, []);

  return { estado, atualizar };
}
