import { Link } from "react-router-dom";
import { useState } from "react";
import { Tv, BookOpen, CalendarDays, Ticket, Clock, MapPin, ArrowRight, Star, QrCode, ChevronRight, Handshake, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSessions } from "@/context/SessionsContext";
import { SponsorLogo } from "@/components/SponsorLogo";
import { SponsorAdBanner } from "@/components/SponsorAdBanner";
import { NowCard } from "@/components/NowCard";
import { ParticipationCard } from "@/components/ParticipationCard";
import { EuVouShare, type TipoParticipante } from "@/components/EuVouCard";
import { PreInscricaoPresencial } from "@/components/PreInscricaoPresencial";
import { PaywallModal } from "@/components/PaywallModal";
import { PartnershipBanners } from "@/components/PartnershipBanners";
import { usePersistentState } from "@/hooks/usePersistentState";
import { ROLE_LABEL } from "@/lib/roles";
import { BronzeMarquee } from "@/components/BronzeMarquee";
import { useFavorites } from "@/context/FavoritesContext";
import { Badge, Card, CardBody, CardHeader, Tooltip } from "@/components/ui";
import { credentialCode, cn } from "@/lib/utils";
import { TRACK_TONE, toMinutes } from "@/data/mock";

// `premium` marca o que o Plano Gratuito não acessa — o clique abre o paywall.
const QUICK = [
  { to: "/streaming", label: "Ao Vivo", desc: "Assista aos painéis agora", icon: Tv, premium: false },
  { to: "/conteudos", label: "Conteúdos", desc: "Artigos, vídeos e podcasts", icon: BookOpen, premium: true },
  { to: "/programacao", label: "Programação", desc: "Linha do tempo do evento", icon: CalendarDays, premium: true },
  { to: "/networking", label: "Networking & Conexões", desc: "Participantes e empresas do evento", icon: Handshake, premium: true }
];

export default function HomePage() {
  const { user, can } = useAuth();
  const { sessions } = useSessions();
  const { isFavorite, toggle } = useFavorites();
  const canBuy = can("purchase:ticket");
  // Card "acontecendo agora": Plano Gratuito, Participante Premium e Palestrante.
  const showNowCard = user.role === "guest" || user.role === "attendee" || user.role === "speaker";

  const isGratuito = user.role === "guest";
  // Recurso que o gratuito tentou abrir — controla o paywall.
  const [paywall, setPaywall] = useState<string | null>(null);
  // Plano Gratuito não divulga presença — o card "Eu vou" é de quem tem ingresso.
  const podeDivulgar = !isGratuito;
  // Card "Eu vou": o tipo exibido vem do papel; curador/patrocinador viram
  // "Patrocinador" e os demais participantes, "Premium".
  const tipoParticipante: TipoParticipante =
    user.role === "speaker" ? "Palestrante" : user.role === "curator" ? "Patrocinador" : "Premium";
  // Cargo · empresa salvos no perfil; sem isso, cai no rótulo do papel.
  const [profile] = usePersistentState<{ headline?: string; company?: string }>("sf_profile", {});
  const cargoEmpresa =
    [profile.headline, profile.company].filter(Boolean).join(" · ") || ROLE_LABEL[user.role];
  // Atalho da credencial: precisa da capacidade E de ingresso com credencial (Presencial).
  const hasCredential = can("view:ticket-qr") && user.hasCredential !== false;
  const credCode = credentialCode(user.role, user.email, user.ticketCode);
  // "Minha Agenda": apenas as pautas favoritadas, em ordem de horário.
  const canFavorite = can("manage:personal-agenda");
  const agenda = sessions
    .filter((s) => isFavorite(s.id))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const preview = agenda.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Boas-vindas — compacto e discreto (menos destaque que o banner) */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm text-neutral-500">04 de Setembro, 2026 · Goiânia</p>
            <h1 className="text-h3 text-neutral-900">Olá, {user.name.split(" ")[0]}</h1>
            <p className="text-body-sm text-neutral-600">
              {isGratuito
                ? "Você está no Plano Gratuito. Aproveite o 'ao vivo'. Para networking, downloads e acesso presencial, explore as opções abaixo."
                : canBuy
                ? "Adquira o ingresso Online e tenha acesso ilimitado à plataforma."
                : "Bem-vindo(a) ao Sustainable Finance 2026."}
            </p>
          </div>
          {canBuy && (
            <Link
              to="/ingressos"
              className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-[4px] bg-[#027D5B] px-6 py-3 text-button font-semibold text-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)] transition-colors hover:bg-[#19302B]"
            >
              {isGratuito ? (
                <>
                  <Sparkles className="h-4 w-4" /> Torne-se Membro Premium
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4" /> Adquirir ingresso
                </>
              )}
            </Link>
          )}
        </CardBody>
      </Card>

      {/* Banner rotativo dos patrocinadores (2:1) — primeiro bloco após a saudação */}
      <SponsorAdBanner />

      {/* Plano Gratuito: caminho para o Presencial sem voucher, logo na entrada */}
      {isGratuito && (
        <PreInscricaoPresencial
          destaque
          nome={user.name}
          email={user.email}
          empresaInicial={profile.company}
          cargoInicial={profile.headline}
        />
      )}

      {/* Acesso rápido à credencial (quem tem ingresso Presencial) */}
      {hasCredential && (
        <Link to="/credencial" aria-label="Abrir Minha credencial" className="block lg:max-w-md">
          <Card className="border-primary-500 bg-primary-500 text-white transition hover:bg-primary-600">
            <CardBody className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-white/15">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-h4">Minha credencial</p>
                  <p className="font-mono text-body-sm text-white/80">{credCode}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5" />
            </CardBody>
          </Card>
        </Link>
      )}

      {/* Acesso rápido. No Plano Gratuito, os premium abrem o paywall. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map(({ to, label, desc, icon: Icon, premium }) => {
          const bloqueado = isGratuito && premium;
          const conteudo = (
            <Card className="h-full transition-shadow hover:shadow-pop">
              <CardBody className="space-y-2">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-md",
                      bloqueado ? "bg-neutral-100 text-neutral-400" : "bg-primary-50 text-primary-600"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {bloqueado && <Lock className="h-4 w-4 text-neutral-400" />}
                </div>
                <p className="text-h4 text-neutral-900">{label}</p>
                <p className="text-body-sm text-neutral-600">{desc}</p>
              </CardBody>
            </Card>
          );

          return bloqueado ? (
            <button
              key={to}
              onClick={() => setPaywall(label)}
              aria-label={`${label} — exclusivo para membros`}
              className="block h-full w-full text-left"
            >
              {conteudo}
            </button>
          ) : (
            <Link key={to} to={to} className="block">
              {conteudo}
            </Link>
          );
        })}
      </div>

      {/* Captação comercial — só faz sentido para quem ainda não é parceiro */}
      {isGratuito && <PartnershipBanners nome={user.name} email={user.email} />}

      {/* Card personalizado do participante: o que acontece agora e o que vem depois */}
      {showNowCard && <NowCard />}

      {/* Participação do usuário na plataforma */}
      {showNowCard && <ParticipationCard />}

      {/* Card "Eu vou" — divulgação da presença. Exclusivo de quem tem ingresso. */}
      {podeDivulgar && (
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Conte que você vai</p>
            <p className="text-body-sm text-neutral-600">
              Gere seu card "Eu vou" e compartilhe a presença no Summit.
            </p>
          </CardHeader>
          <CardBody>
            <EuVouShare
              nomeUsuario={user.name}
              cargoEmpresa={cargoEmpresa}
              urlFotoPerfil={user.avatarUrl}
              tipoParticipante={tipoParticipante}
            />
          </CardBody>
        </Card>
      )}

      {/* Minha Agenda — só as pautas favoritadas pelo usuário */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-neutral-900">Minha Agenda</h2>
          {/* Personalizar a agenda é recurso de membro — o gratuito vê o paywall. */}
          {isGratuito ? (
            <button
              onClick={() => setPaywall("Agenda personalizada")}
              className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600"
            >
              Ver programação <Lock className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link to="/programacao" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
              {agenda.length > preview.length ? `Ver tudo (${agenda.length})` : "Ver programação"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {agenda.length === 0 ? (
          // Estado vazio: explica como a agenda é montada.
          <Card>
            <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
              <Star className="h-8 w-8 text-neutral-300" />
              <p className="text-body font-medium text-neutral-900">Sua agenda está vazia</p>
              <p className="max-w-sm text-body-sm text-neutral-600">
                {isGratuito
                  ? "Montar uma agenda personalizada é exclusivo de Membros Premium."
                  : "Favorite as pautas na Programação e elas aparecem aqui, na ordem dos horários."}
              </p>
              {isGratuito ? (
                <button
                  onClick={() => setPaywall("Agenda personalizada")}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-[4px] bg-[#027D5B] px-6 py-3 text-button font-semibold text-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)] transition-colors hover:bg-[#19302B]"
                >
                  <Lock className="h-4 w-4" /> Desbloquear agenda
                </button>
              ) : (
                <Link
                  to="/programacao"
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-[4px] bg-[#027D5B] px-6 py-3 text-button font-semibold text-white shadow-[0_2px_4px_0_rgba(30,30,30,0.12)] transition-colors hover:bg-[#19302B]"
                >
                  <CalendarDays className="h-4 w-4" /> Escolher pautas
                </Link>
              )}
            </CardBody>
          </Card>
        ) : (
          <ul className="space-y-2">
            {preview.map((s) => (
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
                    <SponsorLogo name={s.company} />
                    <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                    {/* Desfavoritar direto da agenda */}
                    {canFavorite && (
                      <Tooltip label={isFavorite(s.id) ? "Remover da agenda" : "Adicionar à agenda"}>
                        <button
                          onClick={() => toggle(s.id)}
                          aria-label={`Remover "${s.title}" da minha agenda`}
                          aria-pressed={isFavorite(s.id)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-neutral-100"
                        >
                          <Star className={cn("h-5 w-5", isFavorite(s.id) && "fill-current text-secondary-500")} />
                        </button>
                      </Tooltip>
                    )}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Patrocinadores — esteira de logos menores no rodapé, mais afastada */}
      <div className="pt-8">
        <BronzeMarquee />
      </div>

      <PaywallModal open={!!paywall} onClose={() => setPaywall(null)} recurso={paywall ?? undefined} />
    </div>
  );
}
