import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;        // mensagem de suporte
  error?: string;       // estado de erro (Heurística 9)
  success?: boolean;    // validação ok em tempo real (Heurística 5)
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, success, rightSlot, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-h5 text-neutral-900">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "h-10 w-full rounded-md border bg-white px-4 text-body text-neutral-900",
              "placeholder:text-neutral-400 transition-colors",
              "focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none",
              error
                ? "border-error-500 focus:border-error-500 focus:ring-error-50"
                : success
                ? "border-primary-500"
                : "border-neutral-200",
              rightSlot && "pr-11",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightSlot}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-err`} className="text-body-sm text-error-500">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-body-sm text-neutral-600">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
