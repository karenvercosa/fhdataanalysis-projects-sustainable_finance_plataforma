import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "error" | "info" | "neutral" | "primary";

const TONES: Record<Tone, string> = {
  success: "bg-success-50 text-success-500",
  warning: "bg-warning-50 text-warning-500",
  error: "bg-error-50 text-error-500",
  info: "bg-info-50 text-info-500",
  neutral: "bg-neutral-100 text-neutral-600",
  primary: "bg-primary-50 text-primary-600"
};

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-body-sm font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
