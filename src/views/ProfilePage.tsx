import { useState } from "react";
import { Link } from "react-router-dom";
import { UserCircle, CheckCircle2, Award, Camera, Trash2, Link2, Sparkles, ImageIcon, Linkedin, Phone, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInterests } from "@/context/InterestsContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Avatar, Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/roles";
import { SEED_USERS, type AdminUser } from "@/data/users";
import { BRAND_KEY, BRAND_SEED, type BrandContent } from "@/data/brandContent";
import { cn } from "@/lib/utils";

interface Profile {
  headline: string; // cargo
  company: string; // empresa
  bio: string; // "sobre"
  photo?: string; // data URL da foto de perfil
  cover?: string; // data URL da foto de capa (banner horizontal do perfil público)
  linkedin?: string;
  phone?: string; // contato (celular)
  email?: string;
  interests: string[];
}
const DEFAULT: Profile = { headline: "", company: "", bio: "", interests: [] };

export default function ProfilePage() {
  const { user } = useAuth();
  const isSpeaker = user.role === "speaker";
  const isPublic = isSpeaker || user.role === "curator"; // perfil público (aparece em Conexões)
  const [stored, setStored] = usePersistentState<Profile>("sf_profile", DEFAULT);
  const [form, setForm] = useState<Profile>(stored);
  const [toast, setToast] = useState(false);

  // Selo injetado pelo Admin: lê o registro do usuário (sf_users) pelo e-mail.
  const [adminUsers] = usePersistentState<AdminUser[]>("sf_users_v2", SEED_USERS);
  const myTag = adminUsers.find((u) => u.email.toLowerCase() === user.email.toLowerCase())?.tag;

  // Conteúdos publicados (exibidos no perfil público do curador).
  const isCurator = user.role === "curator";
  const [brand] = usePersistentState<BrandContent[]>(BRAND_KEY, BRAND_SEED);
  const myContent = brand.filter((c) => c.ownerId === "cur_1");

  // Nuvem de interesses (mesma do cadastro) — escolhida no perfil público.
  const { interests: interestCatalog } = useInterests();
  const toggleInterest = (tag: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag]
    }));

  // Lê um arquivo de imagem para data URL e grava no campo indicado (foto/capa).
  const onImage = (key: "photo" | "cover") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  const onPhoto = onImage("photo");

  const save = () => {
    setStored(form); // mantém os interesses já definidos no cadastro
    setToast(true);
    window.setTimeout(() => setToast(false), 2500);
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

      {/* Foto de capa — vista pelo público como banner horizontal do perfil */}
      {isPublic && (
        <Card className="overflow-hidden">
          <div className="relative">
            {form.cover ? (
              <img src={form.cover} alt="Foto de capa do perfil" className="h-36 w-full object-cover sm:h-44" />
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
                <Camera className="h-4 w-4" /> {form.cover ? "Trocar capa" : "Adicionar capa"}
                <input type="file" accept="image/*" className="hidden" onChange={onImage("cover")} />
              </label>
              {form.cover && (
                <button
                  onClick={() => setForm((f) => ({ ...f, cover: undefined }))}
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
          <Avatar name={user.name} src={form.photo || user.avatarUrl} size="lg" className="h-20 w-20 text-h2" />
          <div className="min-w-0 flex-1">
            <p className="text-h3 text-neutral-900">{user.name}</p>
            <p className="text-body text-neutral-600">{user.email}</p>
            {/* Edição de foto */}
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-body-sm text-neutral-700 hover:bg-neutral-50">
                <Camera className="h-4 w-4" /> Alterar foto
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
              {form.photo && (
                <button
                  onClick={() => setForm((f) => ({ ...f, photo: undefined }))}
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
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="Ex.: Head de ESG"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Empresa</label>
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Ex.: FundCo"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
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
        </CardBody>
      </Card>

      {/* Contato — exibido no perfil público (curador/palestrante) */}
      {isPublic && (
        <Card>
          <CardHeader>
            <p className="text-h4 text-neutral-900">Contato</p>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Linkedin className="h-4 w-4 text-primary-600" /> LinkedIn</label>
              <input
                value={form.linkedin ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                placeholder="linkedin.com/in/seu-perfil"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Phone className="h-4 w-4 text-primary-600" /> Contato (celular)</label>
              <input
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+55 62 99999-0000"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="inline-flex items-center gap-1.5 text-h5 text-neutral-900"><Mail className="h-4 w-4 text-primary-600" /> E-mail</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={user.email}
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
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
              {interestCatalog.map((tag) => {
                const active = form.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-body-sm transition-colors",
                      active
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-neutral-200 text-neutral-700 hover:border-primary-300"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <p className="text-body-sm text-neutral-500">
              {form.interests.length > 0
                ? `${form.interests.length} interesse(s) selecionado(s).`
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
            {myContent.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-neutral-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-neutral-900">{c.title}</p>
                  <p className="inline-flex items-center gap-1 text-body-sm text-neutral-600">
                    <Link2 className="h-3.5 w-3.5" /> {[c.panel, c.speaker, c.company].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Badge tone="primary">{c.format}</Badge>
              </div>
            ))}
            {myContent.length === 0 && (
              <p className="text-body-sm text-neutral-600">Nenhum conteúdo publicado ainda.</p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={save}>
          Salvar perfil
        </Button>
      </div>
    </div>
  );
}
