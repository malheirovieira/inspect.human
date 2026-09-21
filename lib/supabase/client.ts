"use client";

import { createBrowserClient } from "@supabase/ssr";

// Único uso legítimo do Supabase no browser: login/logout via Auth. Nenhuma
// tabela de negócio é consultada por aqui — isso é sempre feito no servidor
// (Server Actions/Route Handlers), nunca pelo client direto do Supabase.
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
