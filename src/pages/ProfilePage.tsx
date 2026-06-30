import { useState } from "react";
import { UserCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Avatar, Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/roles";
import { SEED_USERS, type AdminUser } from "@/data/users";

interface Profile {
  headline: string;
  company: string;
  bio: string;
  interests: string[]; // definidos no cadastro; preservados aqui
}
const DEFAULT: Profile = { headline: "", company: "", bio: "", interests: [] };

export default function ProfilePage() {
  const { user } = useAuth();
  const [stored, setStored] = usePersistentState<Profile>("sf_profile", DEFAULT);
  const [form, setForm] = useState<Profile>(stored);
  const [toast, setToast] = useState(false);

  // Selo injetado pelo Admin: lê o registro do usuário (sf_users) pelo e-mail.
  const [adminUsers] = usePersistentState<AdminUser[]>("sf_users", SEED_USERS);
  const myTag = adminUsers.find((u) => u.email.toLowerCase() === user.email.toLowerCase())?.tag;

  const save = () => {
    setStored(form); // mantém os interesses já definidos no cadastro
    setToast(true);
    window.setTimeout(() => setToast(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Meu perfil" subtitle="Seus dados básicos" icon={UserCircle} />

      {toast && (
        <div className="flex items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500">
          <CheckCircle2 className="h-5 w-5" /> Perfil salvo com sucesso.
        </div>
      )}

      {/* Identidade (read-only — vem da conta) */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-h3 text-neutral-900">{user.name}</p>
            <p className="text-body text-neutral-600">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {myTag && myTag !== "—" && <Badge tone="secondary">{myTag}</Badge>}
            <Badge tone="primary">{ROLE_LABEL[user.role]}</Badge>
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
                placeholder="Ex.: Analista ESG"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-h5 text-neutral-900">Empresa</label>
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Ex.: Fintech Verde"
                className="h-10 w-full rounded-md border border-neutral-200 bg-white px-4 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-h5 text-neutral-900">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              placeholder="Conte um pouco sobre você para o networking…"
              className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save}>
          Salvar perfil
        </Button>
      </div>
    </div>
  );
}
