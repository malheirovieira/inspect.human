import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Briefcase, Settings } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). Conteúdo deliberadamente mínimo por
// ora — o que entra aqui é decisão futura, não dado inventado.
export default async function InicioPage() {
  const session = await requireSession();
  const company = await prisma.company.findUnique({ where: { id: session.companyId }, select: { name: true } });

  return (
    <>
      <Header title="Início" date={formatHeaderDate(new Date())} />
      <div className="fin-content">
        <div className="rounded-lg border border-[var(--border)] bg-white p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink">Bem-vindo(a)</span>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            {session.name}
            {company?.name ? ` · ${company.name}` : ""}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Escolha um módulo no menu ao lado para começar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/recrutamento"
            className="fin-card-hover-lift flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white p-5"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--success-surface)", color: "var(--success)" }}
            >
              <Briefcase size={18} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Recrutamento</div>
              <div className="text-xs text-gray-400">Vagas e candidatos</div>
            </div>
          </Link>
          <Link
            href="/configuracoes"
            className="fin-card-hover-lift flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white p-5"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--surface-muted)", color: "var(--text-secondary)" }}
            >
              <Settings size={18} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Configurações</div>
              <div className="text-xs text-gray-400">Empresa e usuários</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
