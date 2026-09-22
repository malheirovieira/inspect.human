import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OptionList } from "@/components/configuracoes/OptionList";
import { listAllCompanyOptions } from "@/services/companyOptions";
import { requireSession } from "@/lib/session";

export default async function ConfiguracoesPage() {
  const [session, options] = await Promise.all([requireSession(), listAllCompanyOptions()]);

  return (
    <>
      <Header title="Configurações" />
      <div className="fin-content">
        {session.role === "ADMIN" && (
          <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span className="fin-eyebrow">ACESSO</span>
              <div className="fin-heading" style={{ marginBottom: 0 }}>
                Usuários
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Crie acesso ao sistema pro seu time (RH ou colaborador) sem passar pelo Supabase.
              </p>
            </div>
            <Link href="/configuracoes/usuarios">
              <Button variant="secondary">Convidar colaborador</Button>
            </Link>
          </Card>
        )}

        <div>
          <span className="fin-eyebrow">LISTAS DA EMPRESA</span>
          <div className="fin-heading" style={{ marginBottom: 0 }}>
            Opções pré-definidas
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Essas opções aparecem nos formulários de colaboradores e vagas.
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <OptionList
            category="SETOR"
            title="Setores"
            description="Ex.: Comercial, Financeiro, Operações."
            options={options.SETOR}
          />
          <OptionList
            category="HORARIO_TRABALHO"
            title="Horários de trabalho"
            description="Ex.: Seg-Sex 08h-17h, Escala 12x36."
            options={options.HORARIO_TRABALHO}
          />
          <OptionList
            category="MODALIDADE_CONTRATACAO"
            title="Modalidades de contratação"
            description="Ex.: CLT, PJ, Estágio."
            options={options.MODALIDADE_CONTRATACAO}
          />
        </div>
      </div>
    </>
  );
}
