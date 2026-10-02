import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Callback único do Supabase Auth (fluxo PKCE, padrão do @supabase/ssr) —
// troca o `code` da URL por uma sessão de verdade, gravando os cookies
// (só funciona aqui ou em Server Action; Server Component engole o
// setAll, ver lib/supabase/server.ts). Usado hoje só por "esqueci minha
// senha" (recuperar-senha/page.tsx manda redirectTo pra cá), mas é
// genérico o bastante pra qualquer fluxo de e-mail do Supabase Auth que
// precise disso no futuro (convite, confirmação de e-mail).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Pra onde ir depois de trocar o código por sessão — nunca aceito como URL
  // absoluta (só um caminho local), pra não virar um open redirect.
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sem code, ou troca falhou (link expirado/já usado): volta pro início do
  // fluxo de recuperação com um aviso, em vez de um erro genérico.
  return NextResponse.redirect(`${origin}/recuperar-senha?erro=link_invalido`);
}
