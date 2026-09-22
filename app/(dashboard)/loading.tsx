// Next.js troca automaticamente o conteúdo de children pelo conteúdo deste
// arquivo (via Suspense) sempre que uma página do dashboard ainda está
// buscando dado no servidor — sidebar/header continuam parados, só a área
// de conteúdo mostra isso enquanto a próxima tela não está pronta.
export default function DashboardLoading() {
  return (
    <div className="fin-route-loading">
      <span className="fin-route-loading__spinner" />
    </div>
  );
}
