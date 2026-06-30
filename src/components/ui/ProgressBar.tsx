import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "primary"
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "primary" | "warning";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-100", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "primary" ? "bg-primary-500" : "bg-secondary-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
