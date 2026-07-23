import { Link, useNavigate } from "react-router-dom";
import { QrCode, Star, MapPin, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useSessions } from "@/context/SessionsContext";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { TRACK_TONE, toMinutes } from "@/data/mock";

export default function ParticipantDashboard() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  // Favoritos compartilhados e persistentes (sincroniza com a Programação).
  const { isFavorite, toggle } = useFavorites();
  const { sessions } = useSessions();
  // Amostra limitada é sinal de "sem ingresso" — favoritar já vale para todos.
  const locked = !can("download:content");
  // Credencial só existe para quem tem ingresso Presencial.
  const hasCredential = can("view:ticket-qr") && user.hasCredential !== false;
  // "Minha agenda": as pautas favoritadas, em ordem de horário.
  const favorites = sessions
    .filter((s) => isFavorite(s.id))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  const body = (
    <div className="space-y-4">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Sua agenda do dia 04/09"
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

      {/* Minha Agenda — apenas as pautas favoritadas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-neutral-900">Minha Agenda</h2>
          <Badge tone="primary">{favorites.length} sessões</Badge>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardBody className="text-center text-body text-neutral-600">
              Sua agenda está vazia. Favorite as pautas na{" "}
              <Link to="/programacao" className="font-medium text-primary-600">
                Programação
              </Link>{" "}
              e elas aparecem aqui.
            </CardBody>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardBody className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                      <button
                        onClick={() => toggle(s.id)}
                        aria-label="Remover dos favoritos"
                        className="text-secondary-500 hover:text-secondary-600"
                      >
                        <Star className="h-5 w-5 fill-current" />
                      </button>
                    </div>
                    <h3 className="text-h4 text-neutral-900">{s.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {s.start}–{s.end}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {s.room}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/programacao")}>
          Ver programação completa
        </Button>
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
