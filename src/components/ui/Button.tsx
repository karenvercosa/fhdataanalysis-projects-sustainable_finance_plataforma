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

// shadow/sm do DS — aplicada aos botões com preenchimento e ao secundário.
const SHADOW_SM = "shadow-[0_2px_4px_0_rgba(30,30,30,0.12)]";

// Variantes do DS. Primário e secundário seguem os tokens especificados;
// os demais acompanham o mesmo raio e sombra para não destoar.
//
// A cor do texto usa a sintaxe de propriedade arbitrária `[color:...]` de
// propósito: `text-*` de cor entra em conflito com o `text-button` (tamanho)
// aplicado em SIZES, e o tailwind-merge descarta um dos dois. Assim as duas
// coisas coexistem.
const VARIANTS: Record<Variant, string> = {
  primary: `bg-[#027D5B] [color:#FFFFFF] hover:bg-[#19302B] active:bg-[#19302B] ${SHADOW_SM}`,
  // Contorno e texto no mesmo verde do botão primário.
  secondary: `border border-[#027D5B] bg-white [color:#027D5B] hover:bg-primary-50 ${SHADOW_SM}`,
  outline: "border border-primary-500 [color:#15784B] bg-white hover:bg-primary-50",
  ghost: "[color:#15784B] hover:bg-primary-50",
  dark: `bg-primary-ink [color:#FFFFFF] hover:bg-primary-900 ${SHADOW_SM}`,
  danger: `bg-error-500 [color:#FFFFFF] hover:brightness-95 ${SHADOW_SM}`
};

// `md` é o tamanho do DS: padding 12px/24px. sm e lg variam em torno dele.
const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-button gap-1.5",
  md: "px-6 py-3 text-button gap-2",
  lg: "px-8 py-4 text-button gap-2"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, leftIcon, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[4px] font-body font-semibold",
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
