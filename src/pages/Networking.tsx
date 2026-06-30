import { Users, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, Badge, Card, CardBody, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { PreviewLock } from "@/components/PreviewLock";

const PEOPLE = [
  { name: "Helena Vasquez", role: "Head de ESG", company: "FundCo", tags: ["ESG", "Regulação"] },
  { name: "Rafael Lima", role: "Gestor", company: "CarbonX", tags: ["Carbono", "Investimentos"] },
  { name: "Diego Rocha", role: "Investidor-anjo", company: "Solo", tags: ["Startups"] }
];

export default function Networking() {
  const { can } = useAuth();
  const locked = !can("view:networking");

  const body = (
    <div className="space-y-4">
      <PageHeader title="Conexões" subtitle="Descubra participantes e empresas" icon={Users} />
      <Input placeholder="Buscar por nome, cargo ou setor…" rightSlot={<Search className="h-4 w-4" />} className="lg:max-w-md" />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PEOPLE.map((p) => (
          <li key={p.name}>
            <Card>
              <CardBody className="flex items-center gap-3">
                <Avatar name={p.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-h4 text-neutral-900">{p.name}</p>
                  <p className="text-body-sm text-neutral-600">{p.role} · {p.company}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Badge key={t} tone="primary">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );

  return locked ? (
    <PreviewLock message="Veja uma amostra dos participantes. Adquira seu ingresso para conectar e ver contatos.">
      {body}
    </PreviewLock>
  ) : (
    body
  );
}
