import { Link } from "react-router-dom";
import { useState } from "react";
import { Tv, BookOpen, CalendarDays, Ticket, QrCode, ChevronRight, Handshake, Sparkles, Lock, Hourglass } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EuVouShare, type TipoParticipante } from "@/components/EuVouCard";
import { PreInscricaoPresencial } from "@/components/PreInscricaoPresencial";
import { PaywallModal } from "@/components/PaywallModal";
import { PartnershipBanners } from "@/components/PartnershipBanners";
import { ROLE_LABEL } from "@/lib/roles";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { credentialCode, cn } from "@/lib/utils";

/**
 * Tela inicial.
 *
 * Os blocos que dependiam de dados de protótipo saíram — banner de
 * divulgações, esteira de logos, "acontecendo agora", participação e a prévia
 * da agenda liam de `src/data/mock.ts` e mostravam um evento que não existe.
 * Os componentes seguem no repositório (`SponsorAdBanner`, `BronzeMarquee`,
 * `NowCard`, `ParticipationCard`), prontos para voltar quando a Programação
 * sair da construção e as sessões vierem do banco.
 */

// `premium` marca o que o Plano Gratuito não acessa — o clique abre o paywall.
const QUICK = [
  { to: "/streaming", label: "Ao Vivo", desc: "Assista aos painéis agora", icon: Tv, premium: false },
  { to: "/conteudos", label: "Conteúdos", desc: "Artigos, vídeos e podcasts", icon: BookOpen, premium: true },
  { to: "/programacao", label: "Programação", desc: "Linha do tempo do evento", icon: CalendarDays, premium: true },
  { to: "/networking", label: "Networking & Conexões", desc: "Participantes e empresas do evento", icon: Handshake, premium: true }
];

/** Tipo exibido no card "Eu vou" — deriva do papel (era ternário aninhado). */
function tipoDoParticipante(role: string): TipoParticipante {
  if (role === "speaker") return "Palestrante";
  return role === "curator" ? "Patrocinador" : "Premium";
}

/** Chamada do cabeçalho conforme o que a pessoa ainda pode adquirir. */
function chamadaDoCabecalho(isGratuito: boolean, canBuy: boolean): string {
  if (isGratuito)
    return "Você está no Plano Gratuito. Aproveite o 'ao vivo'. Para networking, downloads e acesso presencial, explore as opções abaixo.";
  if (canBuy) return "Adquira o ingresso Online e tenha acesso ilimitado à plataforma.";
  return "Bem-vindo(a) ao Sustainable Finance 2026.";
}

export default function HomePage() {
  const { user, can } = useAuth();
  const canBuy = can("purchase:ticket");

  const isGratuito = user.role === "guest";
  // Recurso que o gratuito tentou abrir — controla o paywall.
  const [paywall, setPaywall] = useState<string | null>(null);
  // Plano Gratuito não divulga presença — o card "Eu vou" é de quem tem ingresso.
  const podeDivulgar = !isGratuito;
  // Card "Eu vou": o tipo exibido vem do papel; curador/patrocinador viram
  // "Patrocinador" e os demais participantes, "Premium".
  const tipoParticipante = tipoDoParticipante(user.role);
  // Cargo · empresa do próprio cadastro; sem isso, cai no rótulo do papel.
  const cargoEmpresa =
    [user.cargo, user.empresaNome].filter(Boolean).join(" · ") || ROLE_LABEL[user.role];
  // Atalho da credencial: precisa da capacidade E de ingresso com credencial (Presencial).
  const hasCredential = can("view:ticket-qr") && user.hasCredential !== false;
  const credCode = credentialCode(user.role, user.email, user.ticketCode);

  return (
    <div className="space-y-6">
      {/* Voucher aguardando o curador — primeira coisa da tela, porque explica
          por que a conta ainda está no Plano Gratuito. */}
      {user.voucherPendente && (
        <output
          className="flex w-full items-start gap-3 rounded-md border border-warning-500/40 bg-warning-50 px-4 py-3"
        >
          <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-warning-500" />
          <div className="min-w-0">
            <p className="text-body font-medium text-neutral-900">
              Seu voucher está aguardando aprovação
            </p>
            <p className="text-body-sm text-neutral-700">
              O responsável por <strong>{user.voucherPendente.empresaNome}</strong> precisa liberar
              o código <span className="font-mono">{user.voucherPendente.codigo}</span>. Assim que
              ele aprovar, sua conta passa a ser Participante Premium — até lá você segue no Plano
              Gratuito.
            </p>
          </div>
        </output>
      )}

      {/* Boas-vindas — compacto e discreto (menos destaque que o banner) */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm text-neutral-500">04 de Setembro, 2026 · Goiânia</p>
            <h1 className="text-h3 text-neutral-900">Olá, {user.name.split(" ")[0]}</h1>
            <p className="text-body-sm text-neutral-600">
              {chamadaDoCabecalho(isGratuito, canBuy)}
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

      {/* Plano Gratuito: caminho para o Presencial sem voucher, logo na entrada */}
      {isGratuito && (
        <PreInscricaoPresencial
          destaque
          nome={user.name}
          email={user.email}
          empresaInicial={user.empresaNome ?? ""}
          cargoInicial={user.cargo ?? ""}
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
      {isGratuito && <PartnershipBanners nome={user.name} />}

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

      <PaywallModal open={!!paywall} onClose={() => setPaywall(null)} recurso={paywall ?? undefined} />
    </div>
  );
}
