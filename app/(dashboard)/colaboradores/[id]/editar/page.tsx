import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ColaboradorForm } from "@/components/colaboradores/ColaboradorForm";
import { getColaborador } from "@/services/colaboradores";
import { listCompanyOptions } from "@/services/companyOptions";
import type { Dependent } from "@/schemas/colaborador";
import type { CompanyOption } from "@prisma/client";

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditarColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [colaborador, departments, workSchedules] = await Promise.all([
    getColaborador(id),
    listCompanyOptions("SETOR"),
    listCompanyOptions("HORARIO_TRABALHO"),
  ]);

  if (!colaborador) notFound();

  return (
    <>
      <Header
        title={`Editar ${colaborador.name}`}
        backHref="/colaboradores"
        breadcrumb={[{ label: "Colaboradores", href: "/colaboradores" }, { label: "Editar" }]}
      />
      <div className="fin-content">
        <ColaboradorForm
          colaboradorId={colaborador.id}
          departmentOptions={departments.map((d: CompanyOption) => d.label)}
          workScheduleOptions={workSchedules.map((w: CompanyOption) => w.label)}
          initialDependents={(colaborador.dependents as Dependent[] | null) ?? []}
          initial={{
            name: colaborador.name,
            email: colaborador.email,
            birthDate: toDateInput(colaborador.birthDate),
            sex: colaborador.sex ?? "",
            nationality: colaborador.nationality ?? "",
            birthplace: colaborador.birthplace ?? "",
            maritalStatus: colaborador.maritalStatus ?? "",
            motherName: colaborador.motherName ?? "",
            fatherName: colaborador.fatherName ?? "",
            addressZip: colaborador.addressZip ?? "",
            addressStreet: colaborador.addressStreet ?? "",
            addressNumber: colaborador.addressNumber ?? "",
            addressComplement: colaborador.addressComplement ?? "",
            addressNeighborhood: colaborador.addressNeighborhood ?? "",
            addressCity: colaborador.addressCity ?? "",
            addressState: colaborador.addressState ?? "",
            phone: colaborador.phone ?? "",
            educationLevel: colaborador.educationLevel ?? "",
            raceColor: colaborador.raceColor ?? "",
            cpf: colaborador.cpf ?? "",
            idDocumentType: colaborador.idDocumentType ?? "RG",
            idDocumentNumber: colaborador.idDocumentNumber ?? "",
            ctpsNumber: colaborador.ctpsNumber ?? "",
            pisNumber: colaborador.pisNumber ?? "",
            voterTitleNumber: colaborador.voterTitleNumber ?? "",
            reservistCertificate: colaborador.reservistCertificate ?? "",
            civilRegistryType: colaborador.civilRegistryType ?? "",
            civilRegistryNumber: colaborador.civilRegistryNumber ?? "",
            department: colaborador.department ?? "",
            position: colaborador.position ?? "",
            admissionDate: toDateInput(colaborador.admissionDate),
            salary: colaborador.salary?.toString() ?? "",
            workSchedule: colaborador.workSchedule ?? "",
            registrationNumber: colaborador.registrationNumber ?? "",
            role: colaborador.role as "ADMIN" | "HR" | "EMPLOYEE",
            bankName: colaborador.bankName ?? "",
            bankAgency: colaborador.bankAgency ?? "",
            bankAccount: colaborador.bankAccount ?? "",
            transportVoucherOptIn: colaborador.transportVoucherOptIn ? "sim" : "nao",
            admissionExamDate: toDateInput(colaborador.admissionExamDate),
            admissionExamResult: colaborador.admissionExamResult ?? "",
          }}
        />
      </div>
    </>
  );
}
