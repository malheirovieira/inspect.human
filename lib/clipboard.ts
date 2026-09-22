// navigator.clipboard exige contexto seguro (HTTPS ou localhost) — falha
// silenciosamente ao acessar via IP da rede local em HTTP puro. Este
// fallback via document.execCommand("copy") funciona nesse caso.
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // cai para o fallback abaixo
    }
  }
  return fallbackCopy(text);
}
