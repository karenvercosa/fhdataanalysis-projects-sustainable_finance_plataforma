import { Link } from "react-router-dom";
import { Tv, BookOpen, CalendarDays, Ticket, Clock, MapPin, ArrowRight, Radio } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionsContext";
import { Badge, Card, CardBody } from "@/components/ui";
import { TRACK_TONE, toMinutes } from "@/data/mock";

const QUICK = [
  { to: "/streaming", label: "Ao Vivo", desc: "Assista aos painéis agora", icon: Tv },
  { to: "/conteudos", label: "Conteúdos", desc: "Artigos, vídeos e podcasts", icon: BookOpen },
  { to: "/programacao", label: "Programação", desc: "Linha do tempo do evento", icon: CalendarDays }
];

export default function HomePage() {
  const { user, can } = useAuth();
  const { sessions } = useSessions();
  const preview = [...sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).slice(0, 4);
  const canBuy = can("purchase:ticket");

  return (
    <div className="space-y-6">
      {/* Hero de boas-vindas */}
      <Card className="overflow-hidden border-primary-500 bg-primary-500 text-white">
        <CardBody className="space-y-3">
          <Badge tone="neutral" className="bg-white/15 text-white">04 de Setembro, 2026 · Goiânia</Badge>
          <h1 className="text-h1">Olá, {user.name.split(" ")[0]} 👋</h1>
          <p className="max-w-xl text-body-lg text-white/85">
            Bem-vindo(a) ao Sustainable Finance 2026. Explore a programação, assista aos painéis ao
            vivo e acesse conteúdos — adquira seu ingresso para liberar o acesso total.
          </p>
          {canBuy && (
            <Link
              to="/ingressos"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-white px-5 text-button text-primary-700 transition hover:bg-neutral-50"
            >
              <Ticket className="h-4 w-4" /> Adquirir ingresso
            </Link>
          )}
        </CardBody>
      </Card>

      {/* Acesso rápido */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="h-full transition-shadow hover:shadow-pop">
              <CardBody className="space-y-2">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-h4 text-neutral-900">{label}</p>
                <p className="text-body-sm text-neutral-600">{desc}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* Preview da agenda */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-neutral-900">Prévia da programação</h2>
          <Link to="/programacao" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
            Ver tudo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="space-y-2">
          {preview.map((s, i) => (
            <li key={s.id}>
              <Card>
                <CardBody className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-center font-mono text-body-sm text-neutral-600">{s.start}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-neutral-900">{s.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-body-sm text-neutral-600">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.start}–{s.end}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.room}</span>
                    </div>
                  </div>
                  {i === 0 ? (
                    <Badge tone="error"><span className="inline-flex items-center gap-1"><Radio className="h-3 w-3" /> Ao vivo</span></Badge>
                  ) : (
                    <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                  )}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
