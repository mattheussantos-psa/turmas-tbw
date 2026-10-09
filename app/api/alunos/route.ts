import { NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { buscarAlunos } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

// São ~8 páginas de busca com pausa entre elas, mais os lotes de associação e de contatos. Passa
// folgado do limite padrão de 10s da Vercel, e um timeout aqui aparece como erro genérico.
export const maxDuration = 60;

// Cache com refresh manual: a busca no HubSpot só roda de novo quando alguém chama
// /api/alunos?refresh=1. Entre um refresh e outro todo mundo lê o mesmo resultado.
const alunosEmCache = unstable_cache(buscarAlunos, ["alunos-hubspot"], { tags: ["alunos"] });

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  if (refresh) revalidateTag("alunos");

  try {
    return NextResponse.json(await alunosEmCache());
  } catch (e) {
    // O erro sobe pro painel com a mensagem real do HubSpot — token faltando, scope errado,
    // estágio inexistente. Engolir aqui só adiaria o problema pra quem for usar o painel.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[/api/alunos]", msg);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
