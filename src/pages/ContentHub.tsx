import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, BookOpen, Video, Mic, FileText, FileBarChart, Download, Crown, Mic2, Building2, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { CONTENTS, getSpeaker, getCurator, getSessionTitle } from "@/data/catalog";
import { type Content, type ContentFormat } from "@/data/schema";

const ICON: Record<ContentFormat, React.ComponentType<{ className?: string }>> = {
  "E-book": BookOpen,
  "Vídeo": Video,
  Podcast: Mic,
  Relatório: FileBarChart,
  PDF: FileText
};

export default function ContentHub() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const canDownload = can("download:content"); // TRAVA do "Não Pago"
  const [filter, setFilter] = useState<"Todos" | Content["phase"]>("Todos");

  const list = CONTENTS.filter((c) => filter === "Todos" || c.phase === filter);

  return (
    <div className="space-y-4">
      <PageHeader title="Conteúdos para download" subtitle="Relatórios, vídeos on-demand, e-books e PDFs (Acesso ao Conhecimento)" icon={BookOpen} />

      {/* Banner de upgrade — trava de download (Não Pago) */}
      {!canDownload && (
        <Card className="border-secondary-500 bg-secondary-400/15">
          <CardBody className="flex items-center gap-3">
            <Crown className="h-6 w-6 shrink-0 text-secondary-600" />
            <div className="flex-1">
              <p className="text-h4 text-neutral-900">Veja o que você poderá baixar</p>
              <p className="text-body-sm text-neutral-600">
                O <strong>download</strong> destes materiais exige um ingresso. O streaming ao vivo
                continua livre na aba <strong>Streaming</strong>.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate("/ingressos")}>
              Adquirir ingresso
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(["Todos", "Pré-evento", "Pós-evento"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1 text-body-sm transition-colors " +
              (filter === f ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const Icon = ICON[c.format];
          const downloadLocked = c.premium && !canDownload;
          const speaker = getSpeaker(c.speakerIds[0]);
          const curator = getCurator(c.curatorIds[0]);
          return (
            <li key={c.id}>
              <Card className="flex h-full flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  {/* Cabeçalho */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-neutral-900">{c.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-body-sm text-neutral-600">{c.format} · {c.phase}</span>
                        {c.premium && <Badge tone="primary">Premium</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Associação coesa: Sessão × Palestrante × Curador */}
                  <div className="space-y-1 rounded-md bg-neutral-50 p-2.5 text-body-sm text-neutral-600">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{getSessionTitle(c.sessionIds[0])}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mic2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{speaker?.name ?? "—"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{curator?.name ?? "—"}</span>
                    </p>
                  </div>

                  {/* Ação: download (Acesso ao Conhecimento) com trava p/ Não Pago */}
                  <div className="mt-auto">
                    {downloadLocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        leftIcon={<Lock className="h-4 w-4" />}
                        onClick={() => navigate("/ingressos")}
                      >
                        Bloqueado — Adquirir ingresso
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" fullWidth leftIcon={<Download className="h-4 w-4" />}>
                        Baixar
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
