import { Header } from "@/components/layout/Header";

// Horário de Brasília — o servidor roda em UTC e erraria a saudação.
const TIME_ZONE = "America/Sao_Paulo";

function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now));
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function dateLabel(now: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function InicioLayout({
  firstName,
  companyName,
  children,
}: {
  firstName: string;
  companyName: string | null;
  children?: React.ReactNode;
}) {
  const now = new Date();
  return (
    <>
      <Header title="Início" compact />
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-8 p-5 sm:p-7">
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xs font-medium text-neutral-500">{dateLabel(now)}</p>
            <h1 className="mt-2 max-w-md text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
              {greetingFor(now)}
              {firstName ? `, ${firstName}.` : "."}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {companyName ? `Este é o painel da ${companyName}. ` : ""}O menu ao lado recolhe para uma barra de ícones
              quando você precisar de mais espaço.
            </p>
          </div>
          {children}
        </div>

        <div className="flex items-end justify-between border-t border-neutral-200 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Visão ativa</p>
            <p className="mt-1 text-sm font-medium text-neutral-950">Início</p>
          </div>
          <p className="hidden text-xs text-neutral-500 sm:block">Pressione Ctrl+B (⌘B no Mac) para recolher o menu</p>
        </div>
      </div>
    </>
  );
}

