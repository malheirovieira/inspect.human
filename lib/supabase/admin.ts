import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com service_role — só pode ser importado por código que roda no
// servidor (Route Handlers/Server Actions). Usado exclusivamente para ações
// administrativas de Auth (criar/excluir usuário) que exigem privilégio
// total, fora do fluxo normal de sessão do usuário.
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
