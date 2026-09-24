import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { processTasks } from "@/lib/tasks";
import { checkCronAuth } from "@/lib/tasks/cronAuth";

// Chamada pelo pg_cron do Supabase (supabase/cron/process_tasks.sql), só
// quando há trabalho. Em dev: `npm run tasks:dev`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// O processador para de pegar tarefa nova aos 40s; o resto é folga pra
// tarefa em andamento terminar. O timeout do pg_net (65s) fica acima disto.
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = checkCronAuth(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (auth === "not-configured") {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const workerId = `${process.env.VERCEL_REGION ?? "local"}-${randomUUID()}`;
  const summary = await processTasks({ workerId });
  // Só contagens — nunca payload (pode ter dado pessoal).
  return NextResponse.json(summary);
}
