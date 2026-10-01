// Parametrização — integrações de divulgação de vagas. Fonte única de
// verdade pra: cards de Configurações > Parametrização, checkboxes "Divulgar
// em" do cadastro de vaga, e o que os feeds/JSON-LD respeitam.
//
// LinkedIn e InfoJobs: sem API self-service de publicação — exigem parceria
// comercial prévia da Inspect Talent (confirmado na investigação: a API
// pública da InfoJobs só cobre o lado candidato; o LinkedIn já era sabido).
// O campo da empresa pode ser preenchido desde já; só fica disponível pro
// checkbox da vaga quando a flag global (env var, controlada pela Inspect
// Talent, não por cada cliente) estiver ligada.
export type JobBoardKey = "google" | "jooble" | "indeed" | "linkedin" | "infojobs";

export type CompanyIntegrationFields = {
  indeedEmployerEmail: string | null;
  linkedinCompanyId: string | null;
  infojobsId: string | null;
};

export type JobBoardAvailability = {
  key: JobBoardKey;
  label: string;
  available: boolean;
  // Só presente quando available=false — motivo pro tooltip do checkbox.
  unavailableReason?: string;
};

function isLinkedinLive(): boolean {
  return process.env.LINKEDIN_INTEGRATION_LIVE === "true";
}

function isInfojobsLive(): boolean {
  return process.env.INFOJOBS_INTEGRATION_LIVE === "true";
}

// Google e Jooble não dependem de nenhum dado da empresa — sempre
// disponíveis. Indeed depende só do e-mail preenchido (self-service).
// LinkedIn/InfoJobs dependem do campo preenchido E da flag global.
export function getJobBoardAvailability(company: CompanyIntegrationFields): JobBoardAvailability[] {
  return [
    { key: "google", label: "Google for Jobs", available: true },
    { key: "jooble", label: "Jooble", available: true },
    {
      key: "indeed",
      label: "Indeed",
      available: Boolean(company.indeedEmployerEmail),
      unavailableReason: "Configure o e-mail do Indeed em Configurações > Parametrização para habilitar esta opção.",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      available: Boolean(company.linkedinCompanyId) && isLinkedinLive(),
      unavailableReason: isLinkedinLive()
        ? "Configure o ID da empresa no LinkedIn em Configurações > Parametrização para habilitar esta opção."
        : "A publicação automática no LinkedIn ainda depende de aprovação comercial da Inspect Talent (em andamento).",
    },
    {
      key: "infojobs",
      label: "InfoJobs",
      available: Boolean(company.infojobsId) && isInfojobsLive(),
      unavailableReason: isInfojobsLive()
        ? "Configure o identificador da InfoJobs em Configurações > Parametrização para habilitar esta opção."
        : "A publicação automática na InfoJobs ainda depende de parceria comercial da Inspect Talent (em andamento).",
    },
  ];
}
