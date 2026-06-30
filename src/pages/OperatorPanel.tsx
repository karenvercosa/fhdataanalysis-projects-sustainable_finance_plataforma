import { useMemo, useState } from "react";
import { ScanLine, Search, Download, Printer, CheckCircle2, UserCheck } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useCheckin } from "@/context/CheckinContext";

export default function OperatorPanel() {
  // Store compartilhado: cada credenciamento reflete nos Relatórios do Admin.
  const { attendees: list, credential: doCredential, stats } = useCheckin();
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Busca fallback: Nome, E-mail, CPF ou Código (Heurística 7: eficiência).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      [a.name, a.email, a.cpf, a.code].some((f) => f.toLowerCase().includes(q))
    );
  }, [list, query]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const credential = (id: string) => {
    const target = list.find((a) => a.id === id);
    doCredential(id);
    if (target) flash(`✅ ${target.name} credenciado(a)!`);
  };

  // Bipagem simulada: pega o próximo confirmado e credencia (Heurística 1: feedback).
  const simulateScan = () => {
    setScanning(true);
    window.setTimeout(() => {
      const next = list.find((a) => a.status === "Confirmado");
      setScanning(false);
      if (next) credential(next.id);
      else flash("Nenhum participante pendente para bipar.");
    }, 900);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Credenciamento" subtitle="Operação no dia do evento" icon={UserCheck} />

      {/* Feedback de status do sistema */}
      {toast && (
        <div className="flex items-center gap-2 rounded-md bg-success-50 px-4 py-3 text-body text-success-500">
          <CheckCircle2 className="h-5 w-5" /> {toast}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="space-y-1">
            <p className="text-h1 text-neutral-900">{stats.total}</p>
            <p className="text-body-sm text-neutral-600">Total</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-h1 text-primary-600">{stats.credentialed}</p>
            <p className="text-body-sm text-neutral-600">Credenciados</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-h1 text-secondary-600">{stats.pending}</p>
            <p className="text-body-sm text-neutral-600">Pendentes</p>
          </CardBody>
        </Card>
      </div>

      {/* Ações principais */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" leftIcon={<ScanLine className="h-5 w-5" />} loading={scanning} onClick={simulateScan}>
          {scanning ? "Lendo QR…" : "Bipar QR Code"}
        </Button>
        <div className="flex-1">
          <Input
            placeholder="Busca fallback: nome, e-mail, CPF ou código…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rightSlot={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Lista de participantes */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-h4 text-neutral-900">Participantes ({filtered.length})</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Relatório CSV
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Printer className="h-4 w-4" />}>
              PDF crachá
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-body text-neutral-600">
              Nenhum participante encontrado para “{query}”.
            </p>
          ) : (
            filtered.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 p-3"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-neutral-900">{a.name}</p>
                  <p className="text-body-sm text-neutral-600">
                    {a.company} · {a.code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={a.status === "Credenciado" ? "success" : "warning"}>{a.status}</Badge>
                  {a.status === "Confirmado" ? (
                    <Button size="sm" onClick={() => credential(a.id)}>
                      Credenciar
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      Feito
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
