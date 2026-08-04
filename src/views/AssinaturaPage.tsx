"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Barcode, Check, CheckCircle2, CreditCard,
  Infinity as InfinityIcon, MapPin, Monitor, QrCode, Ticket
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Badge, Button, Card, CardBody, CardHeader, Input, Loader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PhoneField, paisPadraoDoLocale } from "@/components/ui/PhoneField";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PixStep } from "@/components/pagamento/PixStep";
import { CartaoStep } from "@/components/pagamento/CartaoStep";
import { BoletoStep } from "@/components/pagamento/BoletoStep";
import { PlanoCard, Wrapper, type CartaoData, type TitularData } from "@/components/pagamento/shared";
import {
  PRODUTOS,
  type BillingTypeCliente,
  type CobrancaIniciada,
  type DadosParaPagamento,
  type ProdutoId,
} from "@/types";

/** Máscara de CPF: aceita só dígitos (máx. 11) e formata como xxx.xxx.xxx-xx. */
function formatarCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

type Etapa = "dados" | "pix" | "cartao" | "boleto" | "sucesso";

/**
 * Aquisição de acesso, com pagamento pelo Asaas.
 *
 * A integração veio da landing page; o LAYOUT é o da plataforma — `PageHeader`
 * e cards claros do design system, na mesma estrutura de passos numerados que
 * a aba de Ingressos já usava.
 *
 * Duas diferenças em relação à landing page, que vêm do contexto:
 *
 *  - aqui a pessoa SEMPRE tem conta, então nada de criar cadastro nem pedir
 *    senha: a tela puxa o que o banco já sabe e pergunta só o que falta;
 *  - são dois produtos, assinatura anual e ingresso presencial.
 *
 * Em inglês só existe cartão de crédito: PIX e boleto são arranjos bancários
 * brasileiros e não atendem quem paga de fora.
 */
/**
 * Polling do PIX/boleto enquanto o Asaas não confirma. Em sandbox o webhook não
 * chega, então esta é a única confirmação que existe. Fica como hook próprio
 * para tirar do componente um bloco que sozinho respondia por boa parte da
 * complexidade cognitiva (SonarQube S3776).
 */
function usePollingDeConfirmacao(etapa: Etapa, paymentId: string | null, aoConfirmar: () => void) {
  const confirmarRef = useRef(aoConfirmar);
  confirmarRef.current = aoConfirmar;

  useEffect(() => {
    if ((etapa !== "pix" && etapa !== "boleto") || !paymentId) return;

    let ativo = true;
    const id = window.setInterval(async () => {
      try {
        const { pago } = await api.get<{ pago: boolean }>(
          `/api/assinatura/status?paymentId=${paymentId}`,
        );
        if (ativo && pago) {
          window.clearInterval(id);
          confirmarRef.current();
        }
      } catch {
        /* rede instável — tenta de novo no próximo ciclo */
      }
    }, 4000);

    return () => {
      ativo = false;
      window.clearInterval(id);
    };
  }, [etapa, paymentId]);
}

/**
 * Passo 1 — escolha do produto. Sai do componente principal porque o `.map`
 * com um ternário por linha respondia por boa parte da complexidade cognitiva
 * da página (SonarQube S3776).
 */
function PassoProduto({
  produto,
  onEscolher,
  t
}: Readonly<{
  produto: ProdutoId;
  onEscolher: (id: ProdutoId) => void;
  t: (chave: string) => string;
}>) {
  return (
    <Card>
      <CardHeader>
        <p className="text-h4 text-neutral-900">1. {t("produtoTitulo")}</p>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["online", "presencial"] as const).map((id) => {
            const ativo = produto === id;
            const Icone = id === "online" ? Monitor : MapPin;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onEscolher(id)}
                aria-pressed={ativo}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  ativo
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 hover:border-primary-300",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icone className="h-5 w-5 text-primary-600" />
                    <span className="text-h4 text-neutral-900">
                      {id === "online" ? t("produtoOnlineNome") : t("produtoPresencialNome")}
                    </span>
                  </div>
                  <span className="text-h4 text-neutral-900">
                    {id === "online" ? t("produtoOnlineValor") : t("produtoPresencialValor")}
                  </span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1 text-body-sm text-neutral-600">
                  {id === "online" && <InfinityIcon className="h-4 w-4" />}
                  {id === "online" ? t("produtoOnlineDesc") : t("produtoPresencialDesc")}
                </p>
                <p className="mt-1 text-body-sm text-neutral-500">
                  {id === "online" ? `/${t("produtoOnlinePeriodo")}` : t("produtoPresencialPeriodo")}
                </p>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export default function AssinaturaPage() {
  const t = useTranslations("Assinatura");
  const locale = useLocale();
  const navigate = useNavigate();
  const { recarregarSessao } = useAuth();

  const soCartaoInternacional = locale.toLowerCase().startsWith("en");
  const paisPadrao = paisPadraoDoLocale(locale);

  const [dados, setDados] = useState<DadosParaPagamento | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [produto, setProduto] = useState<ProdutoId>("online");
  const [billing, setBilling] = useState<BillingTypeCliente>(
    soCartaoInternacional ? "CREDIT_CARD" : "PIX",
  );
  const [internacional, setInternacional] = useState(soCartaoInternacional);

  const [form, setForm] = useState({ phone: "", empresa: "", cargo: "", cpf: "" });
  const [card, setCard] = useState<CartaoData>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });
  const [titular, setTitular] = useState<TitularData>({ postalCode: "", addressNumber: "" });

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pix, setPix] = useState<CobrancaIniciada["pix"] | null>(null);
  const [boleto, setBoleto] = useState<CobrancaIniciada["boleto"] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [popup, setPopup] = useState(false);

  // O formulário chega preenchido com o que o cadastro já tem; a pessoa só
  // completa o que falta.
  useEffect(() => {
    let ativo = true;
    api
      .get<{ dados: DadosParaPagamento }>("/api/assinatura/dados")
      .then(({ dados: d }) => {
        if (!ativo) return;
        setDados(d);
        setForm((f) => ({ ...f, phone: d.telefone, empresa: d.empresa, cargo: d.cargo }));
      })
      .catch((e: any) => setErrorMsg(e?.message ?? null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const cpfDigitos = form.cpf.replace(/\D/g, "");
  const cpfValido = cpfDigitos.length === 11;
  const telefoneValido = Boolean(form.phone) && isValidPhoneNumber(form.phone);

  // O CPF do cadastro é guardado mascarado, então é pedido de novo sempre que
  // for criar o cliente no Asaas ou pagar com cartão — o Asaas exige o CPF do
  // titular na tokenização (`creditCardHolderInfo.cpfCnpj`).
  const pedeCpf = (dados?.precisaCpf ?? true) || billing === "CREDIT_CARD";

  const dadosValidos =
    telefoneValido && form.empresa.trim() && form.cargo.trim() && (!pedeCpf || cpfValido);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setC = (k: keyof CartaoData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCard((c) => ({ ...c, [k]: e.target.value }));
  const setTit = (k: keyof TitularData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitular((tt) => ({ ...tt, [k]: e.target.value }));

  /** Direciona para a etapa do método escolhido, guardando o payload da cobrança. */
  const aplicarCobranca = (cobranca: CobrancaIniciada) => {
    if (billing === "PIX") {
      setPix(cobranca.pix ?? null);
      setEtapa("pix");
      return;
    }
    if (billing === "BOLETO") {
      setBoleto(cobranca.boleto ?? null);
      setEtapa("boleto");
      return;
    }
    setEtapa("cartao");
  };

  /**
   * Confirma o pagamento: popup, recarrega a sessão (o papel virou Premium no
   * servidor) e mostra a tela de sucesso.
   */
  const confirmarPago = useCallback(() => {
    setPopup(true);
    window.setTimeout(async () => {
      setPopup(false);
      await recarregarSessao();
      setEtapa("sucesso");
    }, 2200);
  }, [recarregarSessao]);

  usePollingDeConfirmacao(etapa, paymentId, confirmarPago);

  const iniciar = async () => {
    if (!dadosValidos || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cobranca = await api.post<CobrancaIniciada>("/api/assinatura/iniciar", {
        produto,
        billingType: billing,
        internacional,
        phone: form.phone,
        empresa: form.empresa.trim(),
        cargo: form.cargo.trim(),
        cpf: form.cpf,
      });

      setPaymentId(cobranca.paymentId);
      aplicarCobranca(cobranca);
    } catch (err: any) {
      setErrorMsg(err?.message ?? t("erroGenerico"));
    } finally {
      setSubmitting(false);
    }
  };

  const pagarCartao = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { pago } = await api.post<{ pago: boolean }>("/api/assinatura/pagar-cartao", {
        paymentId,
        card,
        titular: {
          name: card.holderName,
          cpfCnpj: cpfDigitos,
          postalCode: titular.postalCode,
          addressNumber: titular.addressNumber,
          phone: form.phone,
        },
      });

      if (pago) confirmarPago();
      else setErrorMsg(t("pagamentoNaoAprovado"));
    } catch (err: any) {
      setErrorMsg(err?.message ?? t("erroPagamento"));
    } finally {
      setSubmitting(false);
    }
  };

  const copiar = async () => {
    if (!pix?.payload) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  const popupText = t("popupSucesso");

  if (carregando) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Loader label="Carregando…" />
      </div>
    );
  }

  // Já é Premium: oferecer a assinatura de novo seria cobrar por algo que a
  // pessoa já tem.
  if (dados?.jaEhPremium && etapa !== "sucesso") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title={t("titulo")} icon={Ticket} />
        <Card className="border-primary-500 bg-primary-50">
          <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary-600" />
            <p className="text-h3 text-neutral-900">{t("jaPremiumTitulo")}</p>
            <p className="max-w-md text-body text-neutral-700">{t("jaPremiumDesc")}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (etapa === "sucesso") {
    return (
      <Wrapper showPopup={popup} popupText={popupText}>
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-500" />
            <h1 className="text-h2 text-neutral-900">{t("sucessoPremiumTitulo")}</h1>
            <p className="max-w-md text-body text-neutral-600">{t("sucessoPremiumDesc")}</p>
            <div className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-success-500">
              {produto === "online" ? <Monitor className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              {produto === "online" ? t("produtoOnlineNome") : t("produtoPresencialNome")} ·{" "}
              {produto === "online" ? t("produtoOnlineValor") : t("produtoPresencialValor")}
            </div>
            <Button size="lg" className="mt-2" onClick={() => navigate("/inicio")}>
              {t("btnIrParaInicio")} <ArrowRight className="h-4 w-4" />
            </Button>
          </CardBody>
        </Card>
      </Wrapper>
    );
  }

  if (etapa === "pix") {
    return (
      <Wrapper showPopup={popup} popupText={popupText}>
        <PixStep pix={pix ?? null} copied={copied} onCopy={copiar} />
      </Wrapper>
    );
  }

  if (etapa === "boleto") {
    return (
      <Wrapper showPopup={popup} popupText={popupText}>
        <BoletoStep boleto={boleto ?? null} />
      </Wrapper>
    );
  }

  if (etapa === "cartao") {
    return (
      <Wrapper showPopup={popup} popupText={popupText}>
        <CartaoStep
          card={card}
          onCardChange={setC}
          titular={titular}
          onTitularChange={setTit}
          submitting={submitting}
          errorMsg={errorMsg}
          onPagar={pagarCartao}
        />
      </Wrapper>
    );
  }

  // ---- Etapa única: produto + método + dados que faltam ----
  const metodos = soCartaoInternacional
    ? ([{ key: "CREDIT_CARD", label: t("metodoCartaoInternacional"), icon: CreditCard }] as const)
    : ([
        { key: "PIX", label: t("metodoPix"), icon: QrCode },
        { key: "CREDIT_CARD", label: t("metodoCartao"), icon: CreditCard },
        { key: "BOLETO", label: t("metodoBoleto"), icon: Barcode },
      ] as const);

  return (
    <Wrapper showPopup={popup} popupText={popupText}>
      <PageHeader title={t("titulo")} subtitle={t("produtoTitulo")} icon={Ticket} />

      <PassoProduto produto={produto} onEscolher={setProduto} t={t} />

      {/* Passo 2 — Forma de pagamento */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">2. {t("metodoTitulo")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className={cn("grid gap-3", soCartaoInternacional ? "grid-cols-1" : "sm:grid-cols-3")}>
            {metodos.map((m) => {
              const ativo = billing === m.key;
              const Ico = m.icon;
              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setBilling(m.key)}
                  aria-pressed={ativo}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-body-sm font-medium transition-colors",
                    ativo
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-200 text-neutral-700 hover:border-primary-300",
                  )}
                >
                  <Ico className="h-5 w-5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {soCartaoInternacional ? (
            <p className="flex items-start gap-2 rounded-md border border-neutral-200 p-3 text-body-sm text-neutral-600">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
              {t("somenteCartaoEn")}
            </p>
          ) : (
            billing === "CREDIT_CARD" && (
              <label className="flex cursor-pointer items-center gap-2 text-body-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={internacional}
                  onChange={(e) => setInternacional(e.target.checked)}
                  className="h-4 w-4 accent-[#027D5B]"
                />
                {t("cartaoInternacional")}
              </label>
            )
          )}
        </CardBody>
      </Card>

      {/* Passo 3 — Seus dados */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">3. {t("dadosCompletarTitulo")}</p>
          <p className="text-body-sm text-neutral-600">{t("dadosCompletarDesc")}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutral-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-body font-medium text-neutral-900">{dados?.nome || dados?.email}</p>
              {dados?.nome && <p className="text-body-sm text-neutral-600">{dados.email}</p>}
            </div>
            <Badge tone="success">{t("contaAtiva")}</Badge>
          </div>

          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">{t("labelCelular")}</label>
            <PhoneField
              value={form.phone}
              onChange={(valor) => setForm((f) => ({ ...f, phone: valor }))}
              defaultCountry={paisPadrao}
              inputClassName="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              ariaLabel={t("labelCelular")}
            />
            {form.phone.length > 0 && !telefoneValido && (
              <p className="text-body-sm text-error-500">{t("erroCelular")}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("labelEmpresa")}
              placeholder={t("placeholderEmpresa")}
              autoComplete="organization"
              value={form.empresa}
              onChange={setF("empresa")}
            />
            <Input
              label={t("labelCargo")}
              placeholder={t("placeholderCargo")}
              autoComplete="organization-title"
              value={form.cargo}
              onChange={setF("cargo")}
            />
          </div>

          {pedeCpf && (
            <Input
              label={t("labelCpf")}
              placeholder={t("placeholderCpf")}
              inputMode="numeric"
              maxLength={14}
              value={form.cpf}
              onChange={(e) => setForm((f) => ({ ...f, cpf: formatarCpf(e.target.value) }))}
              error={form.cpf.length > 0 && !cpfValido ? t("erroCpf") : undefined}
              success={cpfValido}
              hint={t("avisoCpf")}
            />
          )}
        </CardBody>
      </Card>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500"
        >
          <AlertCircle className="h-5 w-5 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Resumo + ação */}
      <PlanoCard
        nome={produto === "online" ? t("produtoOnlineNome") : t("produtoPresencialNome")}
        desc={produto === "online" ? t("produtoOnlineDesc") : t("produtoPresencialDesc")}
        valor={produto === "online" ? t("produtoOnlineValor") : t("produtoPresencialValor")}
        periodo={produto === "online" ? t("produtoOnlinePeriodo") : t("produtoPresencialPeriodo")}
      />

      <Button fullWidth size="lg" onClick={iniciar} disabled={!dadosValidos || submitting}>
        {submitting
          ? t("processando")
          : `${t("btnProximo")} · R$ ${PRODUTOS[produto].valor.toLocaleString("pt-BR")}`}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </Button>

      {!dadosValidos && (
        <p className="text-center text-body-sm text-neutral-600">
          <Check className="mr-1 inline h-3.5 w-3.5" />
          {t("dadosCompletarDesc")}
        </p>
      )}
    </Wrapper>
  );
}
