import { Activity, Download, Star, Tv } from "lucide-react";
import { Card, CardBody, CardHeader, ProgressBar } from "@/components/ui";
import { useParticipation } from "@/context/ParticipationContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useSessions } from "@/context/SessionsContext";

/**
 * Participação do usuário na plataforma: palestras assistidas, downloads
 * realizados e pautas na agenda. Mostra o quanto ele já aproveitou do evento.
 */
export function ParticipationCard() {
  const { watched, downloads } = useParticipation();
  const { count: favorites } = useFavorites();
  const { sessions } = useSessions();

  const total = sessions.length;
  const pct = total ? Math.round((watched.length / total) * 100) : 0;

  // Cards apenas informativos — sem navegação.
  const METRICS = [
    { label: "Palestras assistidas", value: watched.length, icon: Tv },
    { label: "Downloads feitos", value: downloads.length, icon: Download },
    { label: "Pautas na agenda", value: favorites, icon: Star }
  ];

  return (
    <Card>
      <CardHeader>
        <p className="inline-flex items-center gap-2 text-h4 text-neutral-900">
          <Activity className="h-4 w-4 text-primary-600" /> Sua participação
        </p>
        <p className="text-body-sm text-neutral-600">O que você já aproveitou do evento</p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {METRICS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-md border border-neutral-100 p-3">
              <Icon className="h-5 w-5 text-primary-600" />
              <p className="mt-1 text-h2 text-neutral-900">{value}</p>
              <p className="text-body-sm leading-tight text-neutral-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-neutral-600">Palestras assistidas</span>
            <span className="font-medium text-neutral-900">
              {watched.length} de {total}
            </span>
          </div>
          <ProgressBar value={watched.length} max={total || 1} />
          <p className="text-body-sm text-neutral-500">
            {watched.length === 0
              ? "Comece pelo Ao Vivo para registrar sua primeira palestra."
              : `Você já acompanhou ${pct}% da programação.`}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
