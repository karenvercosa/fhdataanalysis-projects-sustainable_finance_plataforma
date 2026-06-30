import { useState } from "react";
import { Map as MapIcon, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge, Card, CardBody } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";
import { cn } from "@/lib/utils";

type ZoneType = "palco" | "sala" | "stand" | "servico";

interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  desc: string;
}

const ZONES: Zone[] = [
  { id: "palco", name: "Palco Principal", type: "palco", x: 16, y: 16, w: 244, h: 72, desc: "Abertura, painéis principais e encerramento." },
  { id: "salaA", name: "Sala A", type: "sala", x: 276, y: 16, w: 108, h: 52, desc: "Workshops e mensuração de impacto." },
  { id: "salaB", name: "Sala B", type: "sala", x: 276, y: 78, w: 108, h: 52, desc: "Trilha de Investimentos." },
  { id: "salaC", name: "Sala C", type: "sala", x: 276, y: 140, w: 108, h: 52, desc: "Trilha de Inovação." },
  { id: "stands", name: "Área de Stands", type: "stand", x: 16, y: 104, w: 244, h: 88, desc: "Stands de patrocinadores e startups." },
  { id: "cred", name: "Credenciamento", type: "servico", x: 16, y: 208, w: 130, h: 64, desc: "Retirada de credencial e suporte." },
  { id: "food", name: "Praça de Alimentação", type: "servico", x: 162, y: 208, w: 222, h: 64, desc: "Café, almoço e coffee breaks." }
];

const FILL: Record<ZoneType, string> = {
  palco: "#C9EBD8",
  sala: "#E9F1FD",
  stand: "#FCF4E3",
  servico: "#EDF0F2"
};
const STROKE: Record<ZoneType, string> = {
  palco: "#1E8E5A",
  sala: "#2F80ED",
  stand: "#E6A100",
  servico: "#9AA5B1"
};
const TYPE_LABEL: Record<ZoneType, string> = {
  palco: "Palco",
  sala: "Sala",
  stand: "Stands",
  servico: "Serviços"
};
const TYPE_TONE = { palco: "success", sala: "info", stand: "warning", servico: "neutral" } as const;

export default function MapPage() {
  const { can } = useAuth();
  const locked = !can("view:event-map");
  const [selectedId, setSelectedId] = useState("palco");
  const selected = ZONES.find((z) => z.id === selectedId)!;

  const body = (
    <div className="space-y-4">
      <PageHeader title="Mapa do evento" subtitle="Toque nos pontos para localizar palcos, stands e salas" icon={MapIcon} />

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABEL) as ZoneType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-body-sm text-neutral-600">
            <span className="h-3 w-3 rounded-sm" style={{ background: FILL[t], border: `1.5px solid ${STROKE[t]}` }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,300px]">
        {/* Mapa estático clicável */}
        <Card>
          <CardBody>
            <svg viewBox="0 0 400 288" className="w-full" role="group" aria-label="Mapa do evento">
              <rect x="0" y="0" width="400" height="288" rx="12" fill="#F5F7F8" />
              {ZONES.map((z) => {
                const active = z.id === selectedId;
                return (
                  <g key={z.id} onClick={() => setSelectedId(z.id)} className="cursor-pointer">
                    <rect
                      x={z.x}
                      y={z.y}
                      width={z.w}
                      height={z.h}
                      rx="8"
                      fill={FILL[z.type]}
                      stroke={STROKE[z.type]}
                      strokeWidth={active ? 3 : 1.5}
                      opacity={active ? 1 : 0.9}
                    />
                    <text
                      x={z.x + z.w / 2}
                      y={z.y + z.h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="12"
                      fontWeight={active ? 700 : 500}
                      fill="#1F2933"
                    >
                      {z.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardBody>
        </Card>

        {/* Detalhe do ponto selecionado */}
        <Card className="h-fit">
          <CardBody className="space-y-2">
            <Badge tone={TYPE_TONE[selected.type]}>{TYPE_LABEL[selected.type]}</Badge>
            <h2 className="flex items-center gap-2 text-h3 text-neutral-900">
              <MapPin className="h-5 w-5 text-primary-600" /> {selected.name}
            </h2>
            <p className="text-body text-neutral-600">{selected.desc}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedId(z.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-body-sm transition-colors",
                    z.id === selectedId
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-600 hover:border-primary-300"
                  )}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );

  return locked ? (
    <PreviewLock message="Veja o mapa do evento. A navegação completa por palcos, stands e salas é liberada com o ingresso.">
      {body}
    </PreviewLock>
  ) : (
    body
  );
}
