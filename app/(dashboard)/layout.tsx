import { Sidebar } from "@/components/layout/Sidebar";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const company = await prisma.company.findUnique({ where: { id: session.companyId } });

  return (
    <div className="fin-app">
      <Sidebar userName={session.name} companyName={company?.name} />
      <div className="fin-main">{children}</div>
    </div>
  );
}
