import { Header } from "@/components/layout/Header";
import { ColaboradorForm } from "@/components/colaboradores/ColaboradorForm";
import { requireRole } from "@/lib/session";
import { listCompanyOptions } from "@/services/companyOptions";

export default async function NovoColaboradorPage() {
  await requireRole(["ADMIN", "HR"]);
  const [departments, workSchedules] = await Promise.all([
    listCompanyOptions("SETOR"),
    listCompanyOptions("HORARIO_TRABALHO"),
  ]);

  return (
    <>
      <Header
        title="Cadastrar colaborador"
        backHref="/colaboradores"
        breadcrumb={[{ label: "Colaboradores", href: "/colaboradores" }, { label: "Cadastrar" }]}
      />
      <div className="fin-content">
        <ColaboradorForm
          departmentOptions={departments.map((d) => d.label)}
          workScheduleOptions={workSchedules.map((w) => w.label)}
        />
      </div>
    </>
  );
}
