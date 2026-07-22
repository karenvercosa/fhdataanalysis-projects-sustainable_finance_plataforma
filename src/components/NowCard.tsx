import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Clock, MapPin, Radio } from "lucide-react";
import { Badge, Card, CardBody } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useEventNow, formatCountdown, formatElapsed } from "@/hooks/useEventNow";
import { TRACK_TONE } from "@/data/mock";

/**
 * Card personalizado do participante (Plano Gratuito, Premium e Palestrante):
 * o que está acontecendo agora, onde, há quanto tempo começou e qual a próxima
 * pauta. É a primeira leitura de quem abre a plataforma durante o evento.
 */
export function NowCard() {
  const { user } = useAuth();
  const { phase, current, elapsed, next, minutesToNext } = useEventNow();
  const live = current[0];
  const parallel = current.length - 1;

  return (
    <Card className="border-neutral-200">
      <CardBody className="space-y-3">
        {/* ---- Acontecendo agora ---- */}
        {phase === "live" && live ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="error">
                <span className="inline-flex items-center gap-1">
                  <Radio className="h-3 w-3" /> Acontecendo agora
                </span>
              </Badge>
              <Badge tone={TRACK_TONE[live.track]}>{live.track}</Badge>
            </div>
            <div>
              <p className="text-h3 text-neutral-900">{live.title}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {live.room}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {live.start}–{live.end} · {formatElapsed(elapsed)}
                </span>
              </div>
              {parallel > 0 && (
                <p className="mt-1 text-body-sm text-neutral-500">
                  +{parallel} {parallel === 1 ? "sessão em paralelo" : "sessões em paralelo"}
                </p>
              )}
            </div>
          </>
        ) : phase === "before" ? (
          <div>
            <Badge tone="info">Em breve</Badge>
            <p className="mt-2 text-h3 text-neutral-900">
              Olá, {user.name.split(" ")[0]} — o evento começa {formatCountdown(minutesToNext)}
            </p>
            <p className="text-body-sm text-neutral-600">
              Confira a programação do dia 04/09 e monte sua agenda.
            </p>
          </div>
        ) : phase === "break" ? (
          <div>
            <Badge tone="neutral">Intervalo</Badge>
            <p className="mt-2 text-h3 text-neutral-900">Nenhuma sessão em andamento</p>
            <p className="text-body-sm text-neutral-600">A programação retoma em instantes.</p>
          </div>
        ) : (
          <div>
            <Badge tone="neutral">Encerrado</Badge>
            <p className="mt-2 text-h3 text-neutral-900">Programação encerrada por hoje</p>
            <p className="text-body-sm text-neutral-600">
              Os conteúdos das sessões seguem disponíveis na plataforma.
            </p>
          </div>
        )}

        {/* ---- Próxima pauta ---- */}
        {next && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-body-sm font-medium text-neutral-500">
                <CalendarClock className="h-4 w-4" /> A seguir · {next.start} ·{" "}
                {formatCountdown(minutesToNext)}
              </p>
              <p className="truncate text-body font-medium text-neutral-900">{next.title}</p>
              <p className="truncate text-body-sm text-neutral-600">{next.room}</p>
            </div>
            <Link
              to="/programacao"
              className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline"
            >
              Ver programação <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
