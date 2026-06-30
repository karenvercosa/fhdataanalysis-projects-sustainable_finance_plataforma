import { cn } from "@/lib/utils";

export type ChartTone = "primary" | "secondary" | "success" | "warning" | "info" | "error" | "neutral";

// Cores alinhadas aos design tokens.
const COLORS: Record<ChartTone, string> = {
  primary: "#1E8E5A",
  secondary: "#FBAB38",
  success: "#2E8B57",
  warning: "#E6A100",
  info: "#2F80ED",
  error: "#D93838",
  neutral: "#9AA5B1"
};

export interface Segment {
  label: string;
  value: number;
  tone: ChartTone;
}

/** Donut em SVG puro (sem dependências). */
export function Donut({
  segments,
  size = 168,
  thickness = 22,
  centerValue,
  centerLabel
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF0F2" strokeWidth={thickness} />
            {segments.map((s) => {
              const len = (s.value / total) * circ;
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={COLORS[s.tone]}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
          </g>
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-h2 text-neutral-900">{centerValue}</span>}
            {centerLabel && <span className="text-body-sm text-neutral-600">{centerLabel}</span>}
          </div>
        )}
      </div>

      {/* Legenda */}
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-body">
            <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[s.tone] }} />
            <span className="text-neutral-600">{s.label}</span>
            <span className="font-medium text-neutral-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gráfico de barras horizontais (CSS puro). */
export function BarChart({
  data,
  max,
  className
}: {
  data: Segment[];
  max?: number;
  className?: string;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("space-y-3", className)}>
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-neutral-600">{d.label}</span>
            <span className="font-medium text-neutral-900">{d.value}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / m) * 100}%`, background: COLORS[d.tone] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
