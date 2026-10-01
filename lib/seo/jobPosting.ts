// Schema.org JobPosting (JSON-LD) pra indexação no Google for Jobs — campos
// conforme https://developers.google.com/search/docs/appearance/structured-data/job-posting
// Sem lib de schema.org: é um objeto simples, sem necessidade de dependência nova.

export type JobPostingInput = {
  job: {
    id: string;
    title: string;
    description: string;
    location: string | null;
    workMode: string; // "PRESENCIAL" | "REMOTO" | "HIBRIDO"
    employmentType: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    validThrough: Date | null;
  };
  company: {
    name: string;
    addressStreet: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZip: string | null;
    addressCountry: string | null;
  };
  // URL absoluta da própria vaga pública (pro campo "url" do JobPosting).
  jobUrl: string;
};

// Mapa de texto livre (CompanyOption, em português, cadastrado por cada
// empresa) pro enum fechado que o Google espera. Sem mapa exato, cai em
// OTHER em vez de quebrar ou inventar um valor.
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  clt: "FULL_TIME",
  efetivo: "FULL_TIME",
  permanente: "FULL_TIME",
  "tempo integral": "FULL_TIME",
  pj: "CONTRACTOR",
  "pessoa juridica": "CONTRACTOR",
  "pessoa jurídica": "CONTRACTOR",
  freelancer: "CONTRACTOR",
  freela: "CONTRACTOR",
  autonomo: "CONTRACTOR",
  autônomo: "CONTRACTOR",
  estagio: "INTERN",
  estágio: "INTERN",
  temporario: "TEMPORARY",
  temporário: "TEMPORARY",
  "meio periodo": "PART_TIME",
  "meio período": "PART_TIME",
  "part-time": "PART_TIME",
  voluntario: "VOLUNTEER",
  voluntário: "VOLUNTEER",
};

function mapEmploymentType(value: string | null): string {
  if (!value) return "OTHER";
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return EMPLOYMENT_TYPE_MAP[normalized] ?? EMPLOYMENT_TYPE_MAP[value.toLowerCase().trim()] ?? "OTHER";
}

// HTML básico é aceito pelo Google dentro de "description" — como a
// descrição hoje é texto puro (sem marcação), só convertemos quebras de
// linha em <br> pra preservar formatação em vez de truncar/resumir.
function descriptionToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br>");
}

export function buildJobPostingJsonLd({ job, company, jobUrl }: JobPostingInput): Record<string, unknown> {
  const hasAddress = Boolean(company.addressCity && company.addressState);

  const jobLocation = job.workMode === "REMOTO" && !hasAddress
    ? undefined
    : {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          ...(company.addressStreet ? { streetAddress: company.addressStreet } : {}),
          ...(company.addressCity ? { addressLocality: company.addressCity } : {}),
          ...(company.addressState ? { addressRegion: company.addressState } : {}),
          ...(company.addressZip ? { postalCode: company.addressZip } : {}),
          addressCountry: company.addressCountry || "BR",
        },
      };

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: descriptionToHtml(job.description),
    identifier: {
      "@type": "PropertyValue",
      name: company.name,
      value: job.id,
    },
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    url: jobUrl,
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
    },
    employmentType: mapEmploymentType(job.employmentType),
  };

  if (job.validThrough) posting.validThrough = job.validThrough.toISOString();

  if (job.workMode === "REMOTO") {
    posting.jobLocationType = "TELECOMMUTE";
    // Exigido pelo Google quando jobLocationType=TELECOMMUTE: país onde o
    // candidato precisa estar. Sem endereço estruturado, assume Brasil (BR)
    // — é o único mercado que o produto atende hoje.
    posting.applicantLocationRequirements = {
      "@type": "Country",
      name: company.addressCountry || "BR",
    };
  }
  if (jobLocation) posting.jobLocation = jobLocation;

  // baseSalary intencionalmente de fora: o sistema não tem campo de salário
  // ainda (decisão tomada na investigação desta sprint).

  return posting;
}
