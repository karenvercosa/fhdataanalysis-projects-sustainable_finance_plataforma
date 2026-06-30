import { cn } from "@/lib/utils";

/**
 * QR determinístico a partir do código do ingresso — placeholder visual.
 * Em produção, trocar por `qrcode.react` mantendo a mesma API (value/size).
 * Reconhecimento em vez de recordação (Heurística 6): credencial num clique.
 */
export function QRCode({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const grid = 21; // QR v1
  const cell = size / grid;
  // Hash simples e estável → matriz pseudo-aleatória reproduzível.
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  const rng = (i: number) => ((seed ^ (i * 2654435761)) >>> 0) % 100 < 48;

  const cells: JSX.Element[] = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const finder =
        (r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7);
      const on = finder
        ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) &&
          !(r > 6 || c > 6) // desenho dos finder patterns dos cantos
        : rng(r * grid + c);
      if (on) {
        cells.push(
          <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0A2A1C" />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("rounded-md bg-white", className)}
      role="img"
      aria-label={`QR Code do ingresso ${value}`}
    >
      {cells}
    </svg>
  );
}
