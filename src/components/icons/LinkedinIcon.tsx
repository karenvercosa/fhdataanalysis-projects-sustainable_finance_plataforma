/**
 * Ícone do LinkedIn.
 *
 * O `Linkedin` do lucide-react está marcado como deprecado: os ícones de marca
 * saem da biblioteca na v1.0 (lucide-icons/lucide#670). Como o link para o
 * LinkedIn é parte do perfil público, o desenho passa a viver aqui — mesmo
 * traçado do lucide, mesma API de `className`, sem depender de algo que a
 * próxima major remove.
 */
export function LinkedinIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
