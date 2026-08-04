import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, UserCircle, CheckCircle2, Award, Camera, Trash2, Link2, Sparkles, ImageIcon, Linkedin, Phone, Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInterests } from "@/context/InterestsContext";
import { useTierMatrix } from "@/context/TierMatrixContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Badge, Button, Card, CardBody, CardHeader, Loader } from "@/components/ui";
import { SealAvatar, SealBadge } from "@/components/Seal";
import { DeleteAccount } from "@/components/DeleteAccount";
import { sealForRole } from "@/lib/seals";
import { PageHeader } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/roles";
import { api } from "@/lib/admin-api";
import { type PerfilPublico } from "@/types";
import { BRAND_KEY, BRAND_SEED, type BrandContent } from "@/data/brandContent";
import { cn } from "@/lib/utils";

/**
 * Perfil vazio, usado enquanto a resposta do servidor não chega.
 *
 * O perfil deixou de morar no `localStorage`: ele é público, então precisa
 * existir no banco para que outras pessoas possam vê-lo. A leitura e a escrita
 * passam por `/api/perfil`.
 */
const PERFIL_VAZIO: PerfilPublico = {
  nome: "",
  email: "",
  cargo: "",
  empresa: "",
  telefone: "",
  bio: "",
  linkedin: "",
  foto: "",
  capa: "",
  interesseIds: []
};

/**
 * Recurso não incluído na cota do patrocinador. Em vez de sumir da tela, fica
 * visível e explicado — e aponta a cota que o libera (caminho de upgrade).
 */
function LockedFeature({ title, desc, tier }: { title: string; desc: string; tier?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
      <Lock className="h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-neutral-700">{title}</p>
        <p className="text-body-sm text-neutral-500">
          {desc} {tier && <>Disponível a partir da cota <strong>{tier}</strong>.</>}
        </p>
      </div>
      <Link to="/curador" className="text-body-sm font-medium text-primary-600 hover:underline">
        Ver cotas
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const isSpeaker = user.role === "speaker";
  const isPublic = isSpeaker || user.role === "curator"; // perfil público (aparece em Conexões)
  const mySeal = sealForRole(user.role, user.sponsorKind);
  const [form, setForm] = useState<PerfilPublico>(PERFIL_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { perfil } = await api.get<{ perfil: PerfilPublico }>("/api/perfil");
      setForm(perfil);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar seu perfil.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Selo concedido pelo Admin. Vem da sessão — o servidor lê `usuario.selo`,
  // a mesma coluna que o CRUD de usuários grava.
  const myTag = user.selo;

  // Conteúdos publicados (exibidos no perfil público do curador).
  const isCurator = user.role === "curator";
  const [brand] = usePersistentState<BrandContent[]>(BRAND_KEY, BRAND_SEED);
  const myContent = brand.filter((c) => c.ownerId === "cur_1");

  // Recursos liberados pela COTA do patrocinador (Matriz Global, definida no Admin).
  // Quem não tem cota (palestrante) não sofre restrição.
  const { matrix, featuresOf } = useTierMatrix();
  const feats = featuresOf(user.tier);
  /** Menor cota que libera um recurso — usado para indicar o caminho de upgrade. */
  const tierOffering = (key: keyof typeof feats) => matrix.find((t) => t.features[key])?.name;

  // Nuvem de interesses (mesma do cadastro) — escolhida no perfil público.
  const { catalogo: interestCatalog } = useInterests();
  // O vínculo é gravado por ID: renomear um tema no Admin não desfaz a escolha
  // de ninguém, e o relatório continua somando o mesmo interesse.
  const toggleInterest = (id: string) =>
    setForm((f) => ({
      ...f,
      interesseIds: f.interesseIds.includes(id)
        ? f.interesseIds.filter((i) => i !== id)
        : [...f.interesseIds, id]
    }));

  // Lê um arquivo de imagem para data URL e grava no campo indicado (foto/capa).
  const onImage = (key: "foto" | "capa") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  const onPhoto = onImage("foto");

  const save = async () => {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const { perfil } = await api.put<{ perfil: PerfilPublico }>("/api/perfil", form);
      setForm(perfil);
      setToast(true);
      window.setTimeout(() => setToast(false), 2500);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={isPublic ? "Meu Perfil Público" : "Meu perfil"}
        subtitle={isSpeaker ? "Bio, foto e selo de autoridade" : isPublic ? "Bio e foto exibidas em Conexões" : "Seus dados básicos"}
        icon={UserCircle}
      />

      {toast && (
        <div className="flex items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500">
          <CheckCircle2 className="h-5 w-5" /> Perfil salvo com sucesso.
        </div>
      )}

      {erro && (
        <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-4 py-3 text-body text-error-500">
          <AlertCircle className="h-5 w-5 shrink-0" /> {erro}
        </div>
      )}

      {carregando && <Loader label="Carregando seu perfil…" />}

      {/* Cota do patrocinador: o que ela libera aqui é definido na Matriz do Admin */}
      {isPublic && user.tier && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-body-sm text-neutral-600">
            Sua cota <Badge tone="primary">{user.tier}</Badge>
          </span>
          <span className="text-body-sm text-neutral-500">
            define quais campos deste perfil ficam disponíveis.
          </span>
        </div>
      )}

      {/* Foto de capa — vista pelo público como banner horizontal do perfil */}
      {isPublic && !feats.topBanner && (
        <LockedFeature
          title="Banner de topo"
          tier={tierOffering("topBanner")}
          desc="A foto de capa do perfil público não está incluída na sua cota."
        />
      )}
      {isPublic && feats.topBanner && (
        <Card className="overflow-hidden">
          <div className="relative">
            {form.capa ? (
              <img src={form.capa} alt="Foto de capa do perfil" className="h-36 w-full object-cover sm:h-44" />
            ) : (
              <div className="flex h-36 w-full items-center justify-center bg-gradient-to-r from-primary-500 to-primary-700 text-white sm:h-44">
                <div className="px-4 text-center">
                  <ImageIcon className="mx-auto h-7 w-7 opacity-90" />
                  <p className="mt-1 text-h4">Foto de capa</p>
                  <p className="text-body-sm text-white/85">Aparece como banner horizontal do seu perfil público</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-body-sm text-neutral-800 shadow hover:bg-white">
                <Camera className="h-4 w-4" /> {form.capa ? "Trocar capa" : "Adicionar capa"}
                <input type="file" accept="image/*" className="hidden" onChange={onImage("capa")} />
              </label>
              {form.capa && (
                <button
                  onClick={() => setForm((f) => ({ ...f, capa: "" }))}
                  className="inline-flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-body-sm text-neutral-700 shadow hover:bg-white hover:text-error-500"
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Identidade + foto + selo */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <SealAvatar name={user.name} src={form.foto || user.avatarUrl} seal={mySeal} size="lg" className="h-20 w-20 text-h2" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-h3 text-neutral-900">{user.name}</p>
              <SealBadge seal={mySeal} />
            </div>
            <p className="text-body text-neutral-600">{user.email}</p>
            {/* Edição de foto */}
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-body-sm text-neutral-700 hover:bg-neutral-50">
                <Camera className="h-4 w-4" /> Alterar foto
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
              {form.foto && (
                <button
                  onClick={() => setForm((f) => ({ ...f, foto: "" }))}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-body-sm text-neutral-600 hover:bg-neutral-100 hover:text-error-500"
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              )}
            </div>
          </div>

          {/* Selo de autoridade (Palestrante) ou papel/tag */}
          <div className="flex flex-col items-end gap-1">
            {isSpeaker ? (
              <>
                <Badge tone="secondary">
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-4 w-4" /> Palestrante
                  </span>
                </Badge>
                <span className="text-body-sm text-neutral-500">Selo de autoridade</span>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {myTag && myTag !== "—" && <Badge tone="secondary">{myTag}</Badge>}
                <Badge tone="primary">{ROLE_LABEL[user.role]}</Badge>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Dados editáveis */}
      <Card>
        <CardHeader>
          <p className="text-h4 text-neutral-900">Dados profissionais</p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Cargo</label>
              <input
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                placeholder="Ex.: Head de ESG"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Empresa</label>
              <input
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                placeholder="Ex.: FundCo"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          {/* Campo "Sobre" — liberado (ou não) pela cota */}
          {feats.about ? (
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Sobre</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                placeholder={isSpeaker ? "Apresente sua trajetória e temas de autoridade…" : "Conte um pouco sobre você para o networking…"}
                className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          ) : (
            <LockedFeature
              title='Campo "Sobre"'
              desc="O texto de apresentação não está incluído na sua cota."
              tier={tierOffering("about")}
            />
          )}
        </CardBody>
      </Card>

      {/* Contato — cada campo depende do que a cota libera */}
      {isPublic && (
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Contato</p>
            <p className="text-body-sm text-neutral-600">
              Os canais disponíveis são definidos pela sua cota.
            </p>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {feats.showLinkedin ? (
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Linkedin className="h-4 w-4 text-primary-600" /> LinkedIn</label>
                <input
                  value={form.linkedin ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/seu-perfil"
                  className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            ) : (
              <LockedFeature title="LinkedIn" desc="Não incluído na sua cota." tier={tierOffering("showLinkedin")} />
            )}

            {feats.showPhone ? (
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Phone className="h-4 w-4 text-primary-600" /> Telefone / WhatsApp</label>
                <input
                  value={form.telefone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="+55 62 99999-0000"
                  className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            ) : (
              <LockedFeature
                title="Telefone / WhatsApp direto"
                desc="Não incluído na sua cota."
                tier={tierOffering("showPhone")}
              />
            )}

            <div className="sm:col-span-2">
              {feats.showEmail ? (
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Mail className="h-4 w-4 text-primary-600" /> E-mail corporativo</label>
                  {/* Só leitura: o e-mail é a chave de login, e trocá-lo por
                      aqui deixaria a conta inacessível sem confirmação. */}
                  <input
                    type="email"
                    value={form.email || user.email}
                    readOnly
                    aria-readonly
                    className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-4 text-body text-neutral-600 outline-none"
                  />
                  <p className="text-body-sm text-neutral-500">
                    É o e-mail do seu cadastro, usado para entrar na plataforma.
                  </p>
                </div>
              ) : (
                <LockedFeature title="E-mail corporativo" desc="Não incluído na sua cota." tier={tierOffering("showEmail")} />
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recursos de conteúdo controlados pela cota */}
      {isPublic && user.tier && (
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Conteúdos e ações</p>
            <p className="text-body-sm text-neutral-600">Recursos herdados da cota {user.tier}.</p>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {feats.materialUpload ? (
              <div className="rounded-md border border-primary-500 bg-primary-50 p-3">
                <p className="text-body font-medium text-neutral-900">Upload de materiais</p>
                <p className="text-body-sm text-neutral-600">
                  {myContent.length} {myContent.length === 1 ? "material publicado" : "materiais publicados"}
                </p>
              </div>
            ) : (
              <LockedFeature
                title="Upload de materiais"
                desc="O envio de PDFs e relatórios não está incluído na sua cota."
                tier={tierOffering("materialUpload")}
              />
            )}
            {feats.featuredVideo ? (
              <div className="rounded-md border border-primary-500 bg-primary-50 p-3">
                <p className="text-body font-medium text-neutral-900">Vídeo em destaque</p>
                <p className="text-body-sm text-neutral-600">Habilitado na sua cota</p>
              </div>
            ) : (
              <LockedFeature title="Vídeo em destaque" desc="Não incluído na sua cota." tier={tierOffering("featuredVideo")} />
            )}
            <div className="sm:col-span-2">
              {feats.scheduleMeeting ? (
                <div className="rounded-md border border-primary-500 bg-primary-50 p-3">
                  <p className="text-body font-medium text-neutral-900">Agendar reunião no estande</p>
                  <p className="text-body-sm text-neutral-600">
                    O botão aparece para os participantes no seu perfil público.
                  </p>
                </div>
              ) : (
                <LockedFeature
                  title='Botão "Agendar reunião no estande"'
                  desc="Não incluído na sua cota."
                  tier={tierOffering("scheduleMeeting")}
                />
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Interesses (nuvem de palavras) — perfil público (curador/palestrante) */}
      {isPublic && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-h4 text-neutral-900">Interesses</p>
              <p className="text-body-sm text-neutral-600">
                Escolha os temas que aparecerão no seu perfil público e ajudam no networking.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {interestCatalog.map((tema) => {
                const active = form.interesseIds.includes(tema.id);
                return (
                  <button
                    key={tema.id}
                    type="button"
                    onClick={() => toggleInterest(tema.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-body-sm transition-colors",
                      active
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-neutral-200 text-neutral-700 hover:border-primary-300"
                    )}
                  >
                    {tema.nome}
                  </button>
                );
              })}
            </div>
            <p className="text-body-sm text-neutral-500">
              {form.interesseIds.length > 0
                ? `${form.interesseIds.length} interesse(s) selecionado(s).`
                : "Nenhum interesse selecionado ainda."}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Conteúdos publicados (perfil público do curador) */}
      {isCurator && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <p className="text-h4 text-neutral-900">Meus conteúdos publicados</p>
              <p className="text-body-sm text-neutral-600">Exibidos no seu perfil e na Seção de Conteúdos</p>
            </div>
            <Link to="/conteudos" className="text-body-sm font-medium text-primary-600">
              Gerenciar
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {/* Sem upload na cota, os materiais já publicados saem do ar no perfil público. */}
            {!feats.materialUpload && myContent.length > 0 && (
              <p className="rounded-md border border-warning-500 bg-warning-50 p-3 text-body-sm text-warning-500">
                Sua cota não inclui upload de materiais — estes itens não aparecem no seu perfil público.
              </p>
            )}
            {myContent.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border p-3",
                  feats.materialUpload ? "border-neutral-100" : "border-neutral-200 bg-neutral-50 opacity-70"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-neutral-900">{c.title}</p>
                  <p className="inline-flex items-center gap-1 text-body-sm text-neutral-600">
                    <Link2 className="h-3.5 w-3.5" /> {[c.panel, c.speaker, c.company].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {feats.materialUpload ? (
                  <Badge tone="primary">{c.format}</Badge>
                ) : (
                  <Badge tone="neutral">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Fora da cota
                    </span>
                  </Badge>
                )}
              </div>
            ))}
            {myContent.length === 0 && (
              <p className="text-body-sm text-neutral-600">Nenhum conteúdo publicado ainda.</p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={salvando || carregando}>
          {salvando ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>

      {/* Exclusão de conta — separada do resto para não competir com "Salvar" */}
      <div className="pt-4">
        <DeleteAccount />
      </div>
    </div>
  );
}
