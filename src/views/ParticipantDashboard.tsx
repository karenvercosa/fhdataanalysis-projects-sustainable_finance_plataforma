import { Link } from "react-router-dom";
import { QrCode, Star, ChevronRight, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";

/**
 * Painel do Participante Premium.
 *
 * A agenda saiu daqui junto com os dados de protótipo: as pautas vinham de
 * `src/data/mock.ts` e mostravam um evento inventado. Enquanto a Programação
 * estiver em construção não há de onde tirar sessões de verdade, então a tela
 * assume o vazio em vez de encenar conteúdo.
 *
 * O que sobrou é o que existe: o atalho da credencial, para quem tem ingresso
 * presencial. `FavoritesContext` e `SessionsContext` seguem no repositório
 * para a agenda voltar quando a Programação vier do banco.
 */
export default function ParticipantDashboard() {
  const { user, can } = useAuth();
  // Amostra limitada é sinal de "sem ingresso" — a trava continua valendo.
  const locked = !can("download:content");
  // Credencial só existe para quem tem ingresso Presencial.
  const hasCredential = can("view:ticket-qr") && user.hasCredential !== false;

  const body = (
    <div className="space-y-4">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Seu espaço no Sustainable Finance 2026"
        icon={Star}
      />

      {/* Atalho da credencial — só para quem tem ingresso Presencial */}
      {hasCredential && (
        <Link to="/credencial" aria-label="Abrir QR Code de credenciamento" className="block lg:max-w-md">
          <Card className="bg-primary-500 border-primary-500 text-white">
            <CardBody className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-white/15">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-h4">Minha credencial</p>
                  <p className="text-body-sm text-white/80">Código {user.ticketCode ?? "—"}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </CardBody>
          </Card>
        </Link>
      )}

      {/* Agenda: sem programação publicada, o estado vazio é a informação. */}
      <section className="space-y-3">
        <h2 className="text-h3 text-neutral-900">Minha Agenda</h2>
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-neutral-300" />
            <p className="text-body font-medium text-neutral-900">
              A programação ainda não foi publicada
            </p>
            <p className="max-w-sm text-body-sm text-neutral-600">
              Quando as pautas do dia 04/09 forem divulgadas, você poderá favoritá-las e elas
              aparecem aqui na ordem dos horários.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );

  return locked ? (
    <PreviewLock message="Você tem acesso livre à plataforma. Torne-se membro para liberar o acesso total (credencial, download de conteúdos e networking).">
      {body}
    </PreviewLock>
  ) : (
    body
  );
}
