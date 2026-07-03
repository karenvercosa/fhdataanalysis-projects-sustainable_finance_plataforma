import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft, Building2, Globe, Briefcase, Star, Linkedin, Phone, Mail, ImageIcon,
  Download, BookOpen, Headphones, Video, FileText, Link2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConnectionFavorites } from "@/context/ConnectionFavoritesContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Avatar, Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { PreviewLock } from "@/components/PreviewLock";
import { getConnection, type Connection } from "@/data/networking";
import { BRAND_KEY, BRAND_SEED, type BrandContent, type BrandFormat } from "@/data/brandContent";
import { cn } from "@/lib/utils";

const BRAND_ICON: Record<BrandFormat, React.ComponentType<{ className?: string }>> = {
  "E-book": BookOpen,
  Podcast: Headphones,
  "Vídeo": Video,
  Artigo: FileText
};

export default function NetworkingProfile() {
  const { id = "" } = useParams();
  const { can } = useAuth();
  const { isFavorite, toggle } = useConnectionFavorites();
  const locked = !can("view:networking");
  const c = getConnection(id);

  if (!c) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/networking" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
          <ChevronLeft className="h-4 w-4" /> Voltar às conexões
        </Link>
        <Card>
          <CardBody className="py-10 text-center text-body text-neutral-600">Perfil não encontrado.</CardBody>
        </Card>
      </div>
    );
  }

  const isCompany = c.kind === "company";

  const profileInfo = (
    <div className="space-y-4">
      {/* Banner horizontal do perfil */}
      <ProfileBanner c={c} isCompany={isCompany} />

      {/* Cabeçalho do perfil */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          {isCompany ? (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-secondary-400/20 text-secondary-600">
              <Building2 className="h-9 w-9" />
            </div>
          ) : (
            <Avatar name={c.name} size="lg" className="h-20 w-20 text-h2" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h2 text-neutral-900">{c.name}</h1>
              <Badge tone="neutral">{isCompany ? "Empresa" : "Participante"}</Badge>
            </div>
            <p className="text-body text-neutral-600">{c.subtitle}</p>
          </div>
          <button
            onClick={() => toggle(c.id)}
            aria-pressed={isFavorite(c.id)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-button transition-colors",
              isFavorite(c.id)
                ? "bg-secondary-500 text-[#102823] hover:brightness-95"
                : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            )}
          >
            <Star className={cn("h-4 w-4", isFavorite(c.id) && "fill-current")} />
            {isFavorite(c.id) ? "Favoritado" : "Favoritar"}
          </button>
        </CardBody>
      </Card>

      {/* Sobre */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Sobre</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-body text-neutral-700">{c.bio}</p>

          <div className="flex flex-wrap gap-2">
            {c.tags.map((t) => (
              <Badge key={t} tone="primary">{t}</Badge>
            ))}
          </div>

          {/* Detalhes específicos */}
          <div className="grid gap-3 sm:grid-cols-2">
            {isCompany ? (
              <>
                <Detail icon={<Briefcase className="h-4 w-4" />} label="Segmento" value={c.segment ?? "—"} />
                {c.website && <Detail icon={<Globe className="h-4 w-4" />} label="Site" value={c.website} href={`https://${c.website}`} />}
              </>
            ) : (
              <>
                <Detail icon={<Briefcase className="h-4 w-4" />} label="Cargo" value={c.role ?? "—"} />
                <Detail icon={<Building2 className="h-4 w-4" />} label="Empresa" value={c.company ?? "—"} />
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Contato</p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" value={c.linkedin ?? "—"} href={c.linkedin ? `https://${c.linkedin}` : undefined} />
            <Detail icon={<Phone className="h-4 w-4" />} label="Contato (celular)" value={c.phone ?? "—"} href={c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : undefined} />
            <Detail icon={<Mail className="h-4 w-4" />} label="E-mail" value={c.email ?? "—"} href={c.email ? `mailto:${c.email}` : undefined} />
          </div>
        </CardBody>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/networking" className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
        <ChevronLeft className="h-4 w-4" /> Voltar às conexões
      </Link>

      {/* Dados do perfil (pré-visualização limitada para o Não Pago). */}
      {locked ? (
        <PreviewLock message="Perfil em pré-visualização. Adquira seu ingresso para conectar e ver os contatos.">
          {profileInfo}
        </PreviewLock>
      ) : (
        profileInfo
      )}

      {/* Conteúdos publicados pela empresa — baixáveis por todos os visitantes. */}
      {isCompany && <CompanyContent companyName={c.name} />}
    </div>
  );
}

/** Conteúdos publicados por uma empresa (fora da trava: qualquer visitante baixa). */
function CompanyContent({ companyName }: { companyName: string }) {
  const [brand] = usePersistentState<BrandContent[]>(BRAND_KEY, BRAND_SEED);
  const items = brand.filter((b) => b.company === companyName);

  return (
    <Card>
      <CardHeader>
        <p className="text-h4 text-neutral-900">Conteúdos publicados</p>
        <p className="text-body-sm text-neutral-600">Materiais desta empresa disponíveis para download</p>
      </CardHeader>
      <CardBody className="space-y-2">
        {items.length === 0 && (
          <p className="text-body-sm text-neutral-600">Nenhum conteúdo publicado ainda.</p>
        )}
        {items.map((ct) => {
          const Icon = BRAND_ICON[ct.format];
          const assoc = [ct.panel, ct.speaker].filter(Boolean).join(" · ");
          return (
            <div key={ct.id} className="flex items-center gap-3 rounded-md border border-neutral-100 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-neutral-900">{ct.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-body-sm text-neutral-600">
                  <span>{ct.format}</span>
                  {assoc && (
                    <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> {assoc}</span>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                Baixar
              </Button>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function Detail({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <>
      <span className={cn(href ? "text-primary-600" : "text-neutral-400")}>{icon}</span>
      <div className="min-w-0">
        <p className="text-body-sm text-neutral-500">{label}</p>
        <p className={cn("truncate text-body font-medium", href ? "text-primary-600" : "text-neutral-900")}>{value}</p>
      </div>
    </>
  );
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="flex items-center gap-2 rounded-md border border-neutral-100 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
    >
      {inner}
    </a>
  ) : (
    <div className="flex items-center gap-2 rounded-md border border-neutral-100 p-3">{inner}</div>
  );
}

/** Banner horizontal do perfil: usa a imagem quando houver, senão um placeholder. */
function ProfileBanner({ c, isCompany }: { c: Connection; isCompany: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      {c.banner ? (
        <img src={c.banner} alt={`Banner de ${c.name}`} className="h-32 w-full object-cover sm:h-40" />
      ) : (
        <div
          className={cn(
            "relative flex h-32 w-full items-center justify-center bg-gradient-to-r sm:h-40",
            isCompany ? "from-secondary-500 to-primary-600" : "from-primary-500 to-primary-700"
          )}
        >
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
            <ImageIcon className="h-3 w-3" /> Banner
          </span>
          <div className="px-4 text-center text-white">
            <p className="text-h3 font-heading">{c.name}</p>
            <p className="text-body-sm text-white/85">Espaço para banner horizontal</p>
          </div>
        </div>
      )}
    </div>
  );
}
