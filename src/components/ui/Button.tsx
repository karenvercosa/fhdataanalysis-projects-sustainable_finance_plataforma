import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Variantes espelhando o DS (verde de marca + escuro + outline).
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
  secondary: "bg-primary-100 text-primary-700 hover:bg-primary-200",
  outline: "border border-primary-500 text-primary-600 bg-white hover:bg-primary-50",
  ghost: "text-primary-600 hover:bg-primary-50",
  dark: "bg-primary-ink text-white hover:bg-primary-900",
  danger: "bg-error-500 text-white hover:brightness-95"
};

// Alturas múltiplas de 8 (grid 8pt): 32 / 40 / 48px.
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-button gap-1.5",
  md: "h-10 px-4 text-button gap-2",
  lg: "h-12 px-6 text-button gap-2"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, leftIcon, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-body font-semibold",
        "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  )
);
Button.displayName = "Button";
