"use client";

import { useEffect, useRef, useState } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import { getExampleNumber } from "libphonenumber-js";
import exemplos from "libphonenumber-js/mobile/examples";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

/**
 * País pré-selecionado no seletor, conforme o idioma da plataforma. Quem
 * navega em inglês costuma ter um número de fora, então não faz sentido abrir
 * o campo já em +55.
 */
export function paisPadraoDoLocale(locale: string): Country {
  return locale.toLowerCase().startsWith("en") ? "US" : "BR";
}

type OpcaoPais = { value?: string; label: string; divider?: boolean };

type SeletorPaisProps = {
  value?: string;
  onChange: (valor?: string) => void;
  options: OpcaoPais[];
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent: React.ElementType;
  "aria-label"?: string;
};

/**
 * Lista de países própria, no lugar do `<select>` nativo da biblioteca.
 *
 * O select nativo é renderizado com `opacity: 0` (ele só serve de área
 * clicável sobre a bandeira), e o popup que o navegador abre a partir dele
 * ignora qualquer cor de fundo definida no CSS — abria sempre em cinza claro,
 * ilegível sobre o card verde escuro. Com uma lista em HTML comum a cor fica
 * sob nosso controle.
 */
function SeletorPais({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: Icon,
  "aria-label": ariaLabel,
}: Readonly<SeletorPaisProps>) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const selecionado = options.find((o) => !o.divider && (o.value ?? "ZZ") === (value ?? "ZZ"));

  // Fecha ao clicar fora ou apertar Esc — comportamento que o select nativo
  // dava de graça.
  useEffect(() => {
    if (!aberto) return;
    const onClique = (e: MouseEvent) => {
      if (!container.current?.contains(e.target as Node)) setAberto(false);
    };
    const onTecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", onClique);
    document.addEventListener("keydown", onTecla);
    return () => {
      document.removeEventListener("mousedown", onClique);
      document.removeEventListener("keydown", onTecla);
    };
  }, [aberto]);

  return (
    <div className="PhoneInputCountry" ref={container}>
      {/* Mantém a classe da biblioteca: é ela que faz o gatilho cobrir a
          bandeira e a seta, exatamente como o select nativo cobria. */}
      <button
        type="button"
        className="PhoneInputCountrySelect"
        disabled={disabled || readOnly}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      />
      {selecionado && <Icon aria-hidden country={value} label={selecionado.label} />}
      <div className="PhoneInputCountrySelectArrow" />

      {aberto && (
        // `<fieldset>` em vez de `role="listbox"` ou `role="group"`: a regra
        // typescript:S6819 pede o elemento nativo no lugar do papel ARIA, e o
        // fieldset já agrupa controles com esse papel implícito. O `<select>`
        // que a regra sugere para listbox está fora de cogitação — é
        // justamente ele que não dá para estilizar, porque o popup é
        // desenhado pelo sistema operacional.
        <fieldset className="absolute left-0 top-full z-30 mt-1 max-h-64 w-64 max-w-[70vw] overflow-y-auto rounded-md border border-white/15 bg-[#193029] py-1 shadow-xl">
          <legend className="sr-only">{ariaLabel}</legend>
          {options.map((opcao) =>
            opcao.divider ? (
              <div key="divisor" className="my-1 h-px bg-white/15" />
            ) : (
              <button
                key={opcao.value ?? "ZZ"}
                type="button"
                aria-pressed={(opcao.value ?? "ZZ") === (value ?? "ZZ")}
                onClick={() => {
                  onChange(opcao.value ?? undefined);
                  setAberto(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left text-body-sm transition-colors",
                  (opcao.value ?? "ZZ") === (value ?? "ZZ")
                    ? "bg-[#8DD596] font-medium text-[#102823]"
                    : "text-white hover:bg-white/10",
                )}
              >
                {opcao.label}
              </button>
            ),
          )}
        </fieldset>
      )}
    </div>
  );
}

/**
 * Campo de celular com seletor de país.
 *
 * O `react-phone-number-input` formata o número conforme o país escolhido e
 * devolve o valor sempre em E.164 (`+5562999998888`), que é o formato que o
 * cadastro e o Asaas esperam. O placeholder também acompanha o país —
 * mostramos um número de exemplo real daquele país, e não `(00) 00000-0000`
 * fixo.
 */
export function PhoneField({
  value,
  onChange,
  defaultCountry = "BR",
  inputClassName,
  className,
  ariaLabel,
}: Readonly<{
  value: string;
  onChange: (valor: string) => void;
  defaultCountry?: Country;
  inputClassName: string;
  className?: string;
  ariaLabel?: string;
}>) {
  const [pais, setPais] = useState<Country | undefined>(defaultCountry);

  // Número de exemplo do país selecionado, no mesmo formato nacional em que a
  // pessoa vai digitar. Sem país (lista "internacional"), fica sem exemplo.
  const exemplo = pais ? getExampleNumber(pais, exemplos)?.formatNational() : undefined;

  return (
    <PhoneInput
      international={false}
      defaultCountry={defaultCountry}
      onCountryChange={setPais}
      value={value}
      onChange={(valor) => onChange(valor ?? "")}
      placeholder={exemplo}
      countrySelectComponent={SeletorPais}
      numberInputProps={{ className: inputClassName, "aria-label": ariaLabel }}
      className={className}
    />
  );
}
