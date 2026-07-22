import { useState } from "react";
import { Cookie } from "lucide-react";
import { Button, Modal, Switch } from "@/components/ui";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { LegalModal } from "@/components/legal/LegalModal";
import { type LegalDocId } from "@/data/legal";

/**
 * Banner de consentimento de cookies: aparece só até a primeira decisão,
 * fixado no rodapé, sem bloquear a navegação.
 */
export function CookieBanner() {
  const { pendente, aceitarTodos, salvar, painelAberto, abrirPainel, fecharPainel } = useCookieConsent();
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const [doc, setDoc] = useState<LegalDocId | null>(null);

  if (!pendente) return null;

  const link = (id: LegalDocId, texto: string) => (
    <button onClick={() => setDoc(id)} className="font-medium text-primary-300 underline hover:text-primary-200">
      {texto}
    </button>
  );

  return (
    <>
      <div
        role="region"
        aria-label="Aviso de cookies"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-primary-ink/95 px-4 py-4 text-white backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-secondary-500" />
            <p className="text-body-sm leading-relaxed text-white/85">
              Utilizamos cookies para personalizar sua experiência, analisar o tráfego e melhorar
              nossos serviços. Ao continuar navegando, você concorda com a nossa{" "}
              {link("cookies", "Política de Cookies")} e {link("privacidade", "Política de Privacidade")}.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={abrirPainel}
            >
              Configurar cookies
            </Button>
            <Button onClick={aceitarTodos}>Aceitar todos</Button>
          </div>
        </div>
      </div>

      {/* Preferências por categoria */}
      <Modal
        open={painelAberto}
        onClose={fecharPainel}
        title="Preferências de cookies"
        footer={
          <>
            <Button variant="outline" onClick={fecharPainel}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                salvar({ analytics, marketing });
                fecharPainel();
              }}
            >
              Salvar preferências
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-body-sm text-neutral-700">
            Escolha o que podemos armazenar no seu navegador. Você muda essa decisão quando quiser
            em <strong>Legal &amp; Privacidade</strong>.
          </p>

          <Categoria
            titulo="Necessários"
            desc="Mantêm você autenticado e guardam suas preferências. Sem eles a plataforma não funciona."
            checked
            travado
          />
          <Categoria
            titulo="Analytics"
            desc="Medem, de forma agregada, quais páginas e palestras são mais acessadas."
            checked={analytics}
            onChange={setAnalytics}
          />
          <Categoria
            titulo="Marketing"
            desc="Permitem medir campanhas e enviar comunicações mais relevantes sobre o Summit."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      </Modal>

      <LegalModal open={!!doc} onClose={() => setDoc(null)} docInicial={doc ?? "cookies"} />
    </>
  );
}

function Categoria({
  titulo,
  desc,
  checked,
  onChange,
  travado
}: {
  titulo: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  travado?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 p-3">
      <div className="min-w-0">
        <p className="text-body font-medium text-neutral-900">
          {titulo}
          {travado && <span className="ml-2 text-body-sm font-normal text-neutral-500">Sempre ativo</span>}
        </p>
        <p className="text-body-sm text-neutral-600">{desc}</p>
      </div>
      <Switch
        checked={checked}
        disabled={travado}
        onChange={(v) => onChange?.(v)}
        label={`Cookies de ${titulo}`}
      />
    </div>
  );
}
