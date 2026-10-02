import { Header } from "@/components/layout/Header";
import { ExitAnalysisDashboard } from "@/components/desligamentos/analise/ExitAnalysisDashboard";
import { getExitAnalysis, getExitAnalysisReport, defaultPeriods } from "@/services/exitAnalysis";
import { requireRole } from "@/lib/session";
import { getCompany } from "@/services/company";

const MIN_VOLUME = 10;

export default async function AnaliseDesligamentosPage() {
  const { current, previous } = defaultPeriods();
  const [session, data, report] = await Promise.all([
    requireRole(["ADMIN", "HR"]),
    getExitAnalysis(current, previous, MIN_VOLUME),
    getExitAnalysisReport(current),
  ]);
  const company = await getCompany(session.companyId);

  return (
    <>
      <Header eyebrow="PESSOAS" title="Análise de Desligamentos" />
      <div className="fin-content">
        <ExitAnalysisDashboard
          companyName={company?.name ?? "Empresa"}
          initialCurrent={current}
          initialPrevious={previous}
          initialMinVolume={MIN_VOLUME}
          initialData={data}
          initialReport={report ? { recommendations: report.recommendations, themeStatus: report.themeStatus, themeResult: report.themeResult as { themes: { theme: string; count: number; examples: string[] }[] } | null, themeResponsesAnalyzed: report.themeResponsesAnalyzed } : null}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Análise de Desligamentos - Inspect Talent",
};
