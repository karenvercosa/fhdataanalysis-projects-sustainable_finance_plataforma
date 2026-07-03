import { useMemo, useState } from "react";
import { Search, Download, CheckCircle2, UserCheck, IdCard } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout/AppShell";
import { useCheckin } from "@/context/CheckinContext";
import { type Attendee } from "@/data/mock";
import { cn } from "@/lib/utils";

const EVENT = "Sustainable Finance 2026";
const EVENT_INFO = "04 de setembro de 2026 · Goiânia — GO";

// Dispara o download de um arquivo gerado no cliente.
function downloadBlob(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OperatorPanel() {
  // Store compartilhado: cada check reflete nos Relatórios do Admin.
  const { attendees: list, toggle, stats } = useCheckin();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Busca por Nome, E-mail, CPF ou Código.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => [a.name, a.email, a.cpf, a.code].some((f) => f.toLowerCase().includes(q)));
  }, [list, query]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const onToggle = (a: Attendee) => {
    toggle(a.id);
    flash(a.status === "Credenciado" ? `↩️ Check de ${a.name} removido.` : `✅ ${a.name} marcado(a) como bipado(a).`);
  };

  // Baixa a credencial de um participante (HTML pronto para imprimir/salvar).
  const downloadCredential = (a: Attendee) => {
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Credencial — ${a.name}</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#F5F7F8;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{width:340px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12)}
.top{background:#1E8E5A;color:#fff;padding:20px 24px}.top small{opacity:.85}
.body{padding:24px;text-align:center}.name{font-size:24px;font-weight:700;color:#1F2933;margin:4px 0}
.company{color:#616E7C;margin-bottom:16px}.code{font-family:monospace;letter-spacing:3px;font-size:20px;color:#1E8E5A;background:#EAF6EF;border-radius:8px;padding:10px}
.foot{color:#9AA5B1;font-size:12px;margin-top:16px}</style></head>
<body><div class="card"><div class="top"><strong>${EVENT}</strong><br><small>${EVENT_INFO}</small></div>
<div class="body"><div class="company">Credencial de participação</div><div class="name">${a.name}</div>
<div class="company">${a.company}</div><div class="code">${a.code}</div>
<div class="foot">${a.email} · ${a.cpf}</div></div></div></body></html>`;
    downloadBlob(`credencial-${a.code}.html`, html, "text/html;charset=utf-8");
    flash(`⬇️ Credencial de ${a.name} baixada.`);
  };

  // Exporta a lista completa em CSV.
  const exportCsv = () => {
    const head = ["Nome", "Empresa", "E-mail", "CPF", "Código", "Bipou"];
    const rows = list.map((a) => [a.name, a.company, a.email, a.cpf, a.code, a.status === "Credenciado" ? "Sim" : "Não"]);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    downloadBlob("participantes-sustainable-finance.csv", "﻿" + csv, "text/csv;charset=utf-8");
    flash("⬇️ Relatório CSV baixado.");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Credenciamento" subtitle="Operação no dia do evento" icon={UserCheck} />

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
            <p className="text-body-sm text-neutral-600">Bipados</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <p className="text-h1 text-secondary-600">{stats.pending}</p>
            <p className="text-body-sm text-neutral-600">Pendentes</p>
          </CardBody>
        </Card>
      </div>

      {/* Busca */}
      <Input
        placeholder="Buscar por nome, e-mail, CPF ou código…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rightSlot={<Search className="h-4 w-4" />}
      />

      {/* Lista de participantes */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-h4 text-neutral-900">Participantes ({filtered.length})</p>
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv}>
            Relatório CSV
          </Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-body text-neutral-600">
              Nenhum participante encontrado para “{query}”.
            </p>
          ) : (
            filtered.map((a) => {
              const checked = a.status === "Credenciado";
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium text-neutral-900">{a.name}</p>
                    <p className="text-body-sm text-neutral-600">{a.company} · {a.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={checked ? "success" : "warning"}>{checked ? "Bipou" : "Pendente"}</Badge>

                    {/* Check de bipagem (feita fora da plataforma) — só ícone */}
                    <button
                      onClick={() => onToggle(a)}
                      aria-pressed={checked}
                      aria-label={checked ? "Bipou — clique para desmarcar" : "Marcar como bipado"}
                      title={checked ? "Bipou — clique para desmarcar" : "Marcar como bipado"}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md border transition-colors",
                        checked
                          ? "border-success-500 bg-success-50 text-success-500"
                          : "border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
                      )}
                    >
                      <CheckCircle2 className={cn("h-5 w-5", checked && "fill-current text-success-500")} />
                    </button>

                    {/* Download da credencial do participante — só ícone */}
                    <button
                      onClick={() => downloadCredential(a)}
                      aria-label={`Baixar credencial de ${a.name}`}
                      title="Baixar credencial"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
                    >
                      <IdCard className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
