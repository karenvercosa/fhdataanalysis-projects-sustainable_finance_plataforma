import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-body-sm",
  md: "h-10 w-10 text-body",
  lg: "h-16 w-16 text-h4"
};

export function Avatar({
  name,
  src,
  size = "md",
  className
}: {
  name: string;
  src?: string;
  size?: Size;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md bg-primary-100 font-semibold text-primary-700",
        SIZES[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  );
}
