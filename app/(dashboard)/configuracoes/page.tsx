import { Header } from "@/components/layout/Header";
import { OptionList } from "@/components/configuracoes/OptionList";
import { listAllCompanyOptions } from "@/services/companyOptions";

export default async function ConfiguracoesPage() {
  const options = await listAllCompanyOptions();

  return (
    <>
      <Header title="Configurações" />
      <div className="fin-content">
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
          <OptionList
            category="CATEGORIA_BUDGET"
            title="Categorias de budget"
            description="Ex.: Treinamento, Confraternizações, Benefícios. Salário é automático e não aparece aqui."
            options={options.CATEGORIA_BUDGET}
          />
        </div>
      </div>
    </>
  );
}
