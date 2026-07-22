import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Mic, Star, AlertTriangle, Users, UserCheck, Download, FileText, BadgeCheck, Radio, BellRing, Check, CalendarCheck, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useSessions } from "@/context/SessionsContext";
import { useParticipation } from "@/context/ParticipationContext";
import { useNowMinutes, statusOf } from "@/hooks/useEventNow";
import { Badge, Button, Card, CardBody, Modal, Tooltip } from "@/components/ui";
import { SealAvatar } from "@/components/Seal";
import { PageHeader } from "@/components/layout/AppShell";
import { SponsorLogo, CompanyMark } from "@/components/SponsorLogo";
import { ShareButton } from "@/components/ShareButton";
import { SponsorShareNotice } from "@/components/legal/SponsorShareNotice";
import { TRACK_TONE, toMinutes, sessionsOverlap, type Session } from "@/data/mock";
import { personCompany } from "@/data/networking";
import { cn } from "@/lib/utils";

type TrackFilter = "Todas" | Session["track"];
const TRACKS: TrackFilter[] = ["Todas", "ESG", "Investimentos", "Inovação"];

export default function ProgrammingPage() {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const canFavorite = can("manage:personal-agenda");
  const canDownload = can("download:content");
  // Favoritos compartilhados e persistentes (sincroniza com o Dashboard).
  const { isFavorite, toggle } = useFavorites();
  const { sessions } = useSessions();
  const { markDownload } = useParticipation();
  // Material aguardando o aviso de compartilhamento com o patrocinador.
  const [avisoDownload, setAvisoDownload] = useState<
    { id: string; titulo: string; patrocinador: string } | null
  >(null);
  const [track, setTrack] = useState<TrackFilter>("Todas");
  const [onlyMine, setOnlyMine] = useState(false); // filtro do palestrante
  // Sessão aberta no popup. Um link compartilhado (`?pauta=`) já abre a pauta.
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("pauta"));

  // Fechar o popup limpa o parâmetro, para o link não "grudar" na navegação.
  const closeDetail = () => {
    setDetailId(null);
    if (searchParams.has("pauta")) {
      searchParams.delete("pauta");
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Palestrante: identifica as pautas em que ele palestra (pelo nome).
  const isSpeaker = user.role === "speaker";
  // Protótipo: garante ao menos uma pauta ao palestrante. Se o nome do usuário
  // não casar com nenhuma sessão, adota a primeira sessão como demonstração.
  const speakerFallbackId = useMemo(() => {
    if (!isSpeaker) return null;
    const hasNamed = sessions.some((s) => s.speaker === user.name);
    return hasNamed ? null : sessions[0]?.id ?? null;
  }, [isSpeaker, sessions, user.name]);
  const isMine = (s: Session) => isSpeaker && (s.speaker === user.name || s.id === speakerFallbackId);
  const mineCount = useMemo(
    () => (isSpeaker ? sessions.filter(isMine).length : 0),
    [isSpeaker, sessions, user.name, speakerFallbackId]
  );

  // Sessão atual do popup, sempre derivada do store (reflete novos materiais).
  const detail = detailId ? sessions.find((s) => s.id === detailId) ?? null : null;
  // Antes / durante / depois — define a ação principal do popup.
  const nowMinutes = useNowMinutes();
  const detailStatus = detail ? statusOf(detail, nowMinutes) : null;

  // Empresas creditadas na pauta: a que apresenta + as de quem sobe ao palco.
  // Uma empresa que aparece em mais de um papel é creditada uma vez só.
  const involved = useMemo(() => {
    if (!detail) return [];
    const entries: { name: string; credit: string }[] = [];
    const add = (name: string | undefined, credit: string) => {
      if (!name) return;
      const found = entries.find((e) => e.name === name);
      if (found) found.credit += ` · ${credit}`;
      else entries.push({ name, credit });
    };
    add(detail.company, "Apresentação");
    add(personCompany(detail.speaker), `Palestrante · ${detail.speaker}`);
    add(personCompany(detail.moderator), `Mediação · ${detail.moderator}`);
    return entries;
  }, [detail]);

  // Conflitos: pares de sessões favoritadas que se sobrepõem no horário.
  const conflictIds = useMemo(() => {
    const favs = sessions.filter((s) => isFavorite(s.id));
    const ids = new Set<string>();
    for (let i = 0; i < favs.length; i++)
      for (let j = i + 1; j < favs.length; j++)
        if (sessionsOverlap(favs[i], favs[j])) {
          ids.add(favs[i].id);
          ids.add(favs[j].id);
        }
    return ids;
  }, [isFavorite, sessions]);

  // Filtra por trilha (e "minhas pautas" do palestrante) e agrupa por horário.
  const grouped = useMemo(() => {
    const filtered = sessions
      .filter((s) => track === "Todas" || s.track === track)
      .filter((s) => !onlyMine || isMine(s))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      if (!map.has(s.start)) map.set(s.start, []);
      map.get(s.start)!.push(s);
    }
    return [...map.entries()];
  }, [track, sessions, onlyMine, isSpeaker, user.name]);

  return (
    <div className="space-y-6">
      <PageHeader title="Programação" subtitle="4 de Setembro, 2026 · evento multi-trilha" icon={CalendarDays} />

      {/* Alerta de conflito de horários (v2) */}
      {conflictIds.size > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-warning-500/40 bg-warning-50 px-4 py-3 text-warning-500">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-body">
            <strong>Conflito de horário</strong> na sua agenda: você favoritou sessões que acontecem
            ao mesmo tempo. Elas estão destacadas abaixo.
          </p>
        </div>
      )}

      {/* Filtros por trilha */}
      <div className="flex flex-wrap gap-2">
        {TRACKS.map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-sm transition-colors",
              track === t ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {t}
          </button>
        ))}
        {/* Palestrante: filtro rápido das próprias pautas */}
        {isSpeaker && (
          <button
            onClick={() => setOnlyMine((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm transition-colors",
              onlyMine ? "bg-secondary-500 text-[#102823]" : "bg-secondary-400/20 text-secondary-700 hover:bg-secondary-400/30"
            )}
          >
            <BadgeCheck className="h-4 w-4" /> Minhas pautas{mineCount > 0 ? ` (${mineCount})` : ""}
          </button>
        )}
      </div>

      {/* Aviso do palestrante */}
      {isSpeaker && (
        <p className="text-body-sm text-neutral-600">
          As pautas destacadas em <span className="font-medium text-secondary-700">âmbar</span> são aquelas em que você é palestrante — abra a pauta para inserir materiais.
        </p>
      )}

      {/* Timeline agrupada por horário */}
      <div className="space-y-6">
        {grouped.map(([time, items]) => (
          <div key={time} className="flex gap-4">
            {/* Coluna de horário */}
            <div className="w-14 shrink-0 pt-1 text-right">
              <span className="text-h5 text-neutral-900">{time}</span>
            </div>
            {/* Sessões do horário */}
            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => {
                const conflicted = conflictIds.has(s.id);
                const fav = isFavorite(s.id);
                const mine = isMine(s);
                return (
                  <Card
                    key={s.id}
                    onClick={() => setDetailId(s.id)}
                    className={cn(
                      "cursor-pointer transition-shadow hover:shadow-pop",
                      conflicted && "border-warning-500 ring-1 ring-warning-500/30",
                      mine && "border-secondary-500 ring-2 ring-secondary-500/30"
                    )}
                  >
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={TRACK_TONE[s.track]}>{s.track}</Badge>
                          {mine && (
                            <Badge tone="secondary">
                              <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Você palestra</span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <SponsorLogo name={s.company} />
                          <ShareButton sessionId={s.id} variant="icon" />
                          {canFavorite && (
                            <Tooltip label={fav ? "Remover da agenda" : "Adicionar à agenda"}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                                aria-label={fav ? "Remover dos favoritos" : "Adicionar à agenda"}
                                className={cn(
                                  "transition-colors",
                                  fav ? "text-secondary-500 hover:text-secondary-600" : "text-neutral-400 hover:text-secondary-500"
                                )}
                              >
                                <Star className={cn("h-5 w-5", fav && "fill-current")} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <h3 className="text-h4 text-neutral-900">{s.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {s.start}–{s.end}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {s.room}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-4 w-4" /> {s.speaker}
                        </span>
                      </div>
                      {/* Vagas totais da sessão — visível para todos os perfis */}
                      <Badge tone="info">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {s.capacity} {s.capacity === 1 ? "vaga" : "vagas"}
                        </span>
                      </Badge>
                      {conflicted && (
                        <p className="inline-flex items-center gap-1 text-body-sm text-warning-500">
                          <AlertTriangle className="h-3.5 w-3.5" /> Conflito com outra sessão favoritada
                        </p>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {grouped.length === 0 && (
        <Card>
          <CardBody className="py-8 text-center text-body text-neutral-600">
            Nenhuma sessão para esta trilha.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setTrack("Todas")}>
                Ver todas as trilhas
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Popup com os detalhes da pauta */}
      <SponsorShareNotice
        open={!!avisoDownload}
        onClose={() => setAvisoDownload(null)}
        patrocinador={avisoDownload?.patrocinador ?? ""}
        material={avisoDownload?.titulo}
        onConfirm={() => {
          if (avisoDownload) markDownload(avisoDownload.id);
          setAvisoDownload(null);
        }}
      />

      <Modal open={!!detail} onClose={closeDetail} title={detail?.title ?? ""}>
        {detail && (
          <div className="space-y-4">
            {/* Tag + metadados */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TRACK_TONE[detail.track]}>{detail.track}</Badge>
              <Badge tone="info">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {detail.capacity} {detail.capacity === 1 ? "vaga" : "vagas"}
                </span>
              </Badge>
              {isMine(detail) && (
                <Badge tone="secondary">
                  <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Você palestra</span>
                </Badge>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <p className="inline-flex items-center gap-1.5 text-body text-neutral-700">
                <Clock className="h-4 w-4 text-neutral-400" /> {detail.start}–{detail.end}
              </p>
              <p className="inline-flex items-center gap-1.5 text-body text-neutral-700">
                <MapPin className="h-4 w-4 text-neutral-400" /> {detail.room}
              </p>
            </div>

            {/* Logos de todas as empresas envolvidas na pauta */}
            {involved.length > 0 && (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-body-sm font-medium uppercase tracking-wide text-neutral-500">
                  {involved.length === 1 ? "Empresa envolvida" : "Empresas envolvidas"}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {involved.map((co) => (
                    <div key={co.name} className="flex min-w-0 items-center gap-3">
                      <CompanyMark name={co.name} />
                      <div className="min-w-0">
                        <p className="truncate text-h4 text-neutral-900">{co.name}</p>
                        <p className="truncate text-body-sm text-neutral-600">{co.credit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ação principal muda conforme o horário da pauta */}
            <div className="flex flex-wrap items-center gap-2">
              {detailStatus === "live" ? (
                // No ar: destaque vermelho levando à transmissão.
                detail.liveUrl ? (
                  <a
                    href={detail.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-error-500 px-3 text-button font-semibold text-white transition hover:brightness-95"
                  >
                    <Radio className="h-4 w-4" /> Assistir ao vivo
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<Radio className="h-4 w-4" />}
                    onClick={() => navigate("/streaming")}
                  >
                    Assistir ao vivo
                  </Button>
                )
              ) : detailStatus === "before" && canFavorite ? (
                // Ainda vai acontecer: ação neutra, ligada à Minha Agenda.
                <Button
                  size="sm"
                  variant={isFavorite(detail.id) ? "secondary" : "outline"}
                  leftIcon={isFavorite(detail.id) ? <Check className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                  onClick={() => toggle(detail.id)}
                >
                  {isFavorite(detail.id) ? "Na sua agenda" : "Adicionar à agenda"}
                </Button>
              ) : detailStatus === "after" ? (
                // Já encerrada: sem ação — os materiais ficam logo abaixo.
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-100 px-3 text-button font-semibold text-neutral-600">
                  <CalendarCheck className="h-4 w-4" /> Sessão encerrada
                </span>
              ) : null}
              <ShareButton sessionId={detail.id} />
            </div>

            {/* Sobre */}
            {detail.description && (
              <div>
                <p className="text-h5 text-neutral-900">Sobre</p>
                <p className="mt-1 text-body text-neutral-700">{detail.description}</p>
              </div>
            )}

            {/* Palestrante e mediador (com foto) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <PersonRow role="Palestrante" name={detail.speaker} icon={<Mic className="h-3.5 w-3.5" />} />
              {detail.moderator && (
                <PersonRow role="Mediador" name={detail.moderator} icon={<UserCheck className="h-3.5 w-3.5" />} />
              )}
            </div>

            {/* Materiais disponíveis */}
            <div>
              <p className="text-h5 text-neutral-900">Materiais disponíveis</p>
              {detail.materials && detail.materials.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {detail.materials.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-neutral-100 p-2.5">
                      <span className="inline-flex items-center gap-2 text-body text-neutral-800">
                        <FileText className="h-4 w-4 text-neutral-400" /> {m.title}
                        <Badge tone="neutral">{m.format}</Badge>
                      </span>
                      {/* Sem permissão de download o botão fica visível porém
                          desativado — deixa claro o limite do plano. */}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canDownload}
                        title={canDownload ? undefined : "Disponível para Membros Premium"}
                        leftIcon={canDownload ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        onClick={() =>
                          // Material de patrocinador exige aviso antes; sem
                          // empresa creditada, o download segue direto.
                          detail.company
                            ? setAvisoDownload({ id: `${detail.id}:${m.title}`, titulo: m.title, patrocinador: detail.company })
                            : markDownload(`${detail.id}:${m.title}`)
                        }
                      >
                        Baixar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-body-sm text-neutral-600">Nenhum material disponível ainda.</p>
              )}
            </div>

            {/* Palestrante: aviso de onde inserir material (feito na aba Conteúdos). */}
            {isMine(detail) && (
              <p className="rounded-md border border-secondary-500/40 bg-secondary-400/10 p-3 text-body-sm text-neutral-700">
                <BadgeCheck className="mr-1 inline h-4 w-4 text-secondary-700" />
                Você palestra nesta pauta. Envie materiais pela aba <strong>Conteúdos</strong> → <strong>Novo material</strong>.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function PersonRow({ role, name, icon }: { role: string; name: string; icon: React.ReactNode }) {
  // Quem sobe ao palco leva o selo de Palestrante; mediador segue sem selo.
  const seal = role === "Palestrante" ? ("Palestrante" as const) : undefined;
  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-100 p-3">
      <SealAvatar name={name} seal={seal} className="h-11 w-11" />
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1 text-body-sm text-neutral-500">{icon} {role}</p>
        <p className="truncate text-body font-medium text-neutral-900">{name}</p>
      </div>
    </div>
  );
}
