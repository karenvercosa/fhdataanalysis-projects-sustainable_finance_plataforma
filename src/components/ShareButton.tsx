import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Link direto da pauta — a Programação abre o popup ao receber `?pauta=`. */
export function sessionUrl(sessionId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/programacao?pauta=${sessionId}`;
}

/**
 * Compartilhar pauta por cópia de link. Em `icon` fica compacto no card da
 * programação; em `button` aparece com rótulo no popup de detalhamento.
 */
export function ShareButton({
  sessionId,
  variant = "button",
  className
}: {
  sessionId: string;
  variant?: "button" | "icon";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    // No card, o clique não deve abrir o popup da pauta.
    e.stopPropagation();
    navigator.clipboard?.writeText(sessionUrl(sessionId));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={copy}
        aria-label={copied ? "Link copiado" : "Compartilhar pauta (copiar link)"}
        title={copied ? "Link copiado!" : "Copiar link da pauta"}
        className={cn(
          "transition-colors",
          copied ? "text-primary-600" : "text-neutral-400 hover:text-primary-600",
          className
        )}
      >
        {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className={className}
      leftIcon={copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    >
      {copied ? "Link copiado!" : "Compartilhar"}
    </Button>
  );
}
