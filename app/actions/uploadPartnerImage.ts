"use server";

import { requireRole } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PARTNERS_BUCKET = "partners";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024;

type UploadResult = { success: true; url: string } | { success: false; error: string };

export async function uploadPartnerImage(formData: FormData): Promise<UploadResult> {
  await requireRole(["SUPERADMIN"]);

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "Arquivo não encontrado" };
  if (!ALLOWED_TYPES.includes(file.type)) return { success: false, error: "Formato inválido. Use JPG, PNG, WebP ou SVG" };
  if (file.size > MAX_SIZE) return { success: false, error: "Imagem muito grande. Máximo 2MB" };

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `partner-${Date.now()}.${ext}`;

  const { data, error } = await createSupabaseAdminClient()
    .storage.from(PARTNERS_BUCKET)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) return { success: false, error: `Erro no upload: ${error.message}` };

  const { data: urlData } = createSupabaseAdminClient().storage.from(PARTNERS_BUCKET).getPublicUrl(data.path);
  return { success: true, url: urlData.publicUrl };
}
