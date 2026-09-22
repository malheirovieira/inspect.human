"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { TemporaryPasswordCard } from "@/components/ui/TemporaryPasswordCard";
import { createColaborador, updateColaborador } from "@/app/(dashboard)/colaboradores/actions";
import type { Dependent } from "@/schemas/colaborador";

type FormState = {
  name: string;
  email: string;
  birthDate: string;
  sex: string;
  nationality: string;
  birthplace: string;
  maritalStatus: string;
  motherName: string;
  fatherName: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  phone: string;
  educationLevel: string;
  raceColor: string;
  cpf: string;
  idDocumentType: string;
  idDocumentNumber: string;
  ctpsNumber: string;
  pisNumber: string;
  voterTitleNumber: string;
  reservistCertificate: string;
  civilRegistryType: string;
  civilRegistryNumber: string;
  department: string;
  position: string;
  admissionDate: string;
  salary: string;
  workSchedule: string;
  registrationNumber: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  transportVoucherOptIn: "sim" | "nao";
  admissionExamDate: string;
  admissionExamResult: string;
};

const INITIAL_STATE: FormState = {
  name: "",
  email: "",
  birthDate: "",
  sex: "",
  nationality: "Brasileira",
  birthplace: "",
  maritalStatus: "",
  motherName: "",
  fatherName: "",
  addressZip: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  phone: "",
  educationLevel: "",
  raceColor: "",
  cpf: "",
  idDocumentType: "RG",
  idDocumentNumber: "",
  ctpsNumber: "",
  pisNumber: "",
  voterTitleNumber: "",
  reservistCertificate: "",
  civilRegistryType: "",
  civilRegistryNumber: "",
  department: "",
  position: "",
  admissionDate: "",
  salary: "",
  workSchedule: "",
  registrationNumber: "",
  role: "EMPLOYEE",
  bankName: "",
  bankAgency: "",
  bankAccount: "",
  transportVoucherOptIn: "nao",
  admissionExamDate: "",
  admissionExamResult: "",
};

function Section({
  eyebrow,
  title,
  children,
  style,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, ...style }}>
      <div>
        <span className="fin-eyebrow">{eyebrow}</span>
        <div className="fin-heading" style={{ marginBottom: 0 }}>
          {title}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {children}
      </div>
    </Card>
  );
}

const ROW_STYLE: React.CSSProperties = { display: "flex", width: "100%", gap: 20, alignItems: "flex-start", flexWrap: "wrap" };
const HALF_STYLE: React.CSSProperties = { flex: "1 1 420px" };

export function ColaboradorForm({
  departmentOptions = [],
  workScheduleOptions = [],
  colaboradorId,
  initial,
  initialDependents,
}: {
  departmentOptions?: string[];
  workScheduleOptions?: string[];
  colaboradorId?: string;
  initial?: Partial<FormState>;
  initialDependents?: Dependent[];
}) {
  const router = useRouter();
  const isEdit = Boolean(colaboradorId);
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL_STATE, ...initial }));
  const [dependents, setDependents] = useState<Dependent[]>(initialDependents ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccess, setCreatedAccess] = useState<{ email: string; temporaryPassword: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addDependent() {
    setDependents((prev) => [...prev, { name: "", cpf: "", birthCertificateNumber: "" }]);
  }

  function updateDependent(index: number, key: keyof Dependent, value: string) {
    setDependents((prev) => prev.map((dep, i) => (i === index ? { ...dep, [key]: value } : dep)));
  }

  function removeDependent(index: number) {
    setDependents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      salary: form.salary as unknown as number,
      transportVoucherOptIn: form.transportVoucherOptIn === "sim",
      dependents,
    };

    if (isEdit) {
      const result = await updateColaborador(colaboradorId!, payload);
      setSubmitting(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/colaboradores");
      router.refresh();
      return;
    }

    const result = await createColaborador(payload);
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    // Mostra a senha temporária antes de sair da tela — ela só aparece
    // aqui, uma vez, então não dá pra navegar embora sem exibi-la.
    setCreatedAccess({ email: form.email, temporaryPassword: result.temporaryPassword });
    router.refresh();
  }

  if (createdAccess) {
    return (
      <TemporaryPasswordCard
        email={createdAccess.email}
        temporaryPassword={createdAccess.temporaryPassword}
        dismissLabel="Ir para Colaboradores"
        onDismiss={() => router.push("/colaboradores")}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={ROW_STYLE}>
      <Section eyebrow="1. Dados pessoais" title="Dados pessoais básicos" style={HALF_STYLE}>
        <FieldLabel label="Nome completo" required>
          <Input required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="E-mail" required>
          <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Data de nascimento" required>
          <Input
            type="date"
            required
            disabled={isEdit}
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Sexo" required>
          <Select required disabled={isEdit} value={form.sex} onChange={(e) => update("sex", e.target.value)}>
            <option value="">Selecione</option>
            <option value="FEMININO">Feminino</option>
            <option value="MASCULINO">Masculino</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Nacionalidade" required>
          <Input required disabled={isEdit} value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Naturalidade">
          <Input
            placeholder="Cidade/UF de nascimento"
            disabled={isEdit}
            value={form.birthplace}
            onChange={(e) => update("birthplace", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Estado civil" required>
          <Select required value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)}>
            <option value="">Selecione</option>
            <option value="SOLTEIRO">Solteiro(a)</option>
            <option value="CASADO">Casado(a)</option>
            <option value="DIVORCIADO">Divorciado(a)</option>
            <option value="VIUVO">Viúvo(a)</option>
            <option value="UNIAO_ESTAVEL">União estável</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Nome da mãe" required>
          <Input required disabled={isEdit} value={form.motherName} onChange={(e) => update("motherName", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Nome do pai">
          <Input disabled={isEdit} value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Telefone" required>
          <Input required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Grau de instrução">
          <Select value={form.educationLevel} onChange={(e) => update("educationLevel", e.target.value)}>
            <option value="">Selecione</option>
            <option value="FUNDAMENTAL">Ensino fundamental</option>
            <option value="MEDIO">Ensino médio</option>
            <option value="SUPERIOR">Ensino superior</option>
            <option value="POS_GRADUACAO">Pós-graduação</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Raça/cor (autodeclaração)">
          <Select value={form.raceColor} onChange={(e) => update("raceColor", e.target.value)}>
            <option value="">Selecione</option>
            <option value="BRANCA">Branca</option>
            <option value="PRETA">Preta</option>
            <option value="PARDA">Parda</option>
            <option value="AMARELA">Amarela</option>
            <option value="INDIGENA">Indígena</option>
            <option value="NAO_INFORMAR">Prefiro não informar</option>
          </Select>
        </FieldLabel>
      </Section>

      <Section eyebrow="1. Endereço" title="Endereço residencial" style={HALF_STYLE}>
        <FieldLabel label="CEP" required>
          <Input required value={form.addressZip} onChange={(e) => update("addressZip", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Endereço" required>
          <Input required value={form.addressStreet} onChange={(e) => update("addressStreet", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Número">
          <Input value={form.addressNumber} onChange={(e) => update("addressNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Complemento">
          <Input value={form.addressComplement} onChange={(e) => update("addressComplement", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Bairro">
          <Input value={form.addressNeighborhood} onChange={(e) => update("addressNeighborhood", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Cidade" required>
          <Input required value={form.addressCity} onChange={(e) => update("addressCity", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Estado (UF)" required>
          <Input required maxLength={2} value={form.addressState} onChange={(e) => update("addressState", e.target.value.toUpperCase())} />
        </FieldLabel>
      </Section>
      </div>

      <div style={ROW_STYLE}>
      <Section eyebrow="2. Documentos" title="Documentos de identificação" style={HALF_STYLE}>
        {isEdit && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, gridColumn: "1 / -1" }}>
            Documentos de identidade não podem ser alterados depois do cadastro.
          </p>
        )}
        <FieldLabel label="CPF" required>
          <Input required disabled={isEdit} value={form.cpf} onChange={(e) => update("cpf", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Tipo de documento">
          <Select disabled={isEdit} value={form.idDocumentType} onChange={(e) => update("idDocumentType", e.target.value)}>
            <option value="RG">RG</option>
            <option value="CNH">CNH</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Número do documento">
          <Input disabled={isEdit} value={form.idDocumentNumber} onChange={(e) => update("idDocumentNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Carteira de Trabalho Digital (nº)">
          <Input disabled={isEdit} value={form.ctpsNumber} onChange={(e) => update("ctpsNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="PIS/PASEP/NIS">
          <Input disabled={isEdit} value={form.pisNumber} onChange={(e) => update("pisNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Título de Eleitor">
          <Input disabled={isEdit} value={form.voterTitleNumber} onChange={(e) => update("voterTitleNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Certificado de Reservista">
          <Input
            placeholder="Se aplicável (homens 18-45)"
            disabled={isEdit}
            value={form.reservistCertificate}
            onChange={(e) => update("reservistCertificate", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Certidão">
          <Select disabled={isEdit} value={form.civilRegistryType} onChange={(e) => update("civilRegistryType", e.target.value)}>
            <option value="">Selecione</option>
            <option value="NASCIMENTO">Certidão de nascimento</option>
            <option value="CASAMENTO">Certidão de casamento</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Número da certidão">
          <Input disabled={isEdit} value={form.civilRegistryNumber} onChange={(e) => update("civilRegistryNumber", e.target.value)} />
        </FieldLabel>
      </Section>

      <Section eyebrow="3. Contrato" title="Dados profissionais e contratuais" style={HALF_STYLE}>
        <FieldLabel label="Setor">
          <Select value={form.department} onChange={(e) => update("department", e.target.value)}>
            <option value="">Selecione</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FieldLabel>
        <FieldLabel label="Cargo/função" required>
          <Input required value={form.position} onChange={(e) => update("position", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Data de admissão" required>
          <Input
            type="date"
            required
            value={form.admissionDate}
            onChange={(e) => update("admissionDate", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Salário (R$)" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.salary}
            onChange={(e) => update("salary", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Jornada de trabalho" required>
          <Select required value={form.workSchedule} onChange={(e) => update("workSchedule", e.target.value)}>
            <option value="">Selecione</option>
            {workScheduleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FieldLabel>
        <FieldLabel label="Matrícula interna">
          <Input value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Perfil de acesso" required>
          <Select required value={form.role} onChange={(e) => update("role", e.target.value as FormState["role"])}>
            <option value="EMPLOYEE">Colaborador</option>
            <option value="HR">RH</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        </FieldLabel>
      </Section>
      </div>

      <div style={ROW_STYLE}>
      <Section eyebrow="4. Financeiro" title="Dados bancários e benefícios" style={HALF_STYLE}>
        <FieldLabel label="Banco">
          <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Agência">
          <Input value={form.bankAgency} onChange={(e) => update("bankAgency", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Conta">
          <Input value={form.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Vale-transporte" required>
          <Select
            required
            value={form.transportVoucherOptIn}
            onChange={(e) => update("transportVoucherOptIn", e.target.value as FormState["transportVoucherOptIn"])}
          >
            <option value="nao">Recusa formalmente</option>
            <option value="sim">Optou por receber</option>
          </Select>
        </FieldLabel>
      </Section>

      <Section eyebrow="5. Saúde ocupacional" title="Atestado de Saúde Ocupacional (ASO) admissional" style={HALF_STYLE}>
        <FieldLabel label="Data do exame admissional">
          <Input
            type="date"
            value={form.admissionExamDate}
            onChange={(e) => update("admissionExamDate", e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Resultado">
          <Select value={form.admissionExamResult} onChange={(e) => update("admissionExamResult", e.target.value)}>
            <option value="">Selecione</option>
            <option value="APTO">Apto</option>
            <option value="INAPTO">Inapto</option>
          </Select>
        </FieldLabel>
      </Section>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="fin-eyebrow">4. Dependentes</span>
            <div className="fin-heading" style={{ marginBottom: 0 }}>
              Filhos/dependentes (se houver)
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={addDependent}>
            <Plus size={14} /> Adicionar dependente
          </Button>
        </div>

        {dependents.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum dependente adicionado.</p>
        )}

        {dependents.map((dependent, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) auto",
              gap: 12,
              alignItems: "end",
              paddingBottom: 12,
              borderBottom: index === dependents.length - 1 ? "none" : "1px solid var(--border)",
            }}
          >
            <FieldLabel label="Nome do dependente" required>
              <Input
                required
                value={dependent.name}
                onChange={(e) => updateDependent(index, "name", e.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="CPF do dependente">
              <Input value={dependent.cpf} onChange={(e) => updateDependent(index, "cpf", e.target.value)} />
            </FieldLabel>
            <FieldLabel label="Nº certidão de nascimento">
              <Input
                value={dependent.birthCertificateNumber}
                onChange={(e) => updateDependent(index, "birthCertificateNumber", e.target.value)}
              />
            </FieldLabel>
            <Button type="button" variant="secondary" onClick={() => removeDependent(index)} aria-label="Remover dependente">
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Caderneta de vacinação e comprovante escolar (para salário-família) serão anexados numa fase futura, quando
          o upload de documentos estiver disponível.
        </p>
      </Card>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--danger-surface)",
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button type="submit" variant={submitting ? "disabled" : "primary"}>
          {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar colaborador"}
        </Button>
      </div>
    </form>
  );
}
