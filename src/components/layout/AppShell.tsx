import { NavLink, useNavigate } from "react-router-dom";
import {
  CalendarDays, QrCode, Users, UserCog, BookOpen, LayoutDashboard, TrendingUp, ScanLine,
  Settings, LogOut, Lock, Ticket, Tv, Home, Map as MapIcon, UserCircle, Award
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL, HOME_BY_ROLE, type Role, type Capability } from "@/lib/roles";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

const ALL_ROLES: Role[] = ["guest", "attendee", "speaker", "curator", "operator", "admin"];

// Navegação principal. `cap` = capacidade exigida; `acquirable` = item que o
// Não Pago vê BLOQUEADO até adquirir acesso; `highlight` = CTA de aquisição.
interface NavEntry {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  cap: Capability;
  acquirable?: boolean;
  highlight?: boolean;
}
const NAV: NavEntry[] = [
  // "Painel" (Admin) fica em primeiro — só o Administrador tem manage:platform.
  { to: "/admin", label: "Painel", icon: Settings, cap: "manage:platform" },
  // Admin: "Programação" leva à página de timeline + gestão (mesma do card do painel).
  { to: "/admin/programacao-admin", label: "Programação", icon: CalendarDays, cap: "manage:platform" },
  { to: "/credencial", label: "Credencial", icon: QrCode, cap: "view:ticket-qr", acquirable: true },
  { to: "/networking", label: "Networking", icon: Users, cap: "view:networking", acquirable: true },
  { to: "/conteudos", label: "Conteúdos", icon: BookOpen, cap: "view:public-content" },
  { to: "/mapa", label: "Mapa", icon: MapIcon, cap: "view:event-map" },
  { to: "/streaming", label: "Ao Vivo", icon: Tv, cap: "view:streaming" },
  { to: "/curador", label: "Curador", icon: TrendingUp, cap: "view:curator-dashboard" },
  { to: "/operacao", label: "Operação", icon: ScanLine, cap: "operate:checkin" },
  { to: "/ingressos", label: "Ingressos", icon: Ticket, cap: "purchase:ticket", highlight: true }
];

type NavState = "normal" | "locked" | "highlight";
interface ComputedNav {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: NavState;
}

// Árvore de navegação dedicada do Participante Não Pago.
const GUEST_ITEMS: ComputedNav[] = [
  { to: "/inicio", label: "Início", icon: Home, state: "normal" },
  { to: "/streaming", label: "Ao Vivo", icon: Tv, state: "normal" },
  { to: "/conteudos", label: "Conteúdos", icon: BookOpen, state: "normal" },
  { to: "/programacao", label: "Programação", icon: CalendarDays, state: "normal" },
  { to: "/networking", label: "Networking", icon: Users, state: "locked" },
  { to: "/mapa", label: "Mapa", icon: MapIcon, state: "locked" },
  { to: "/ingressos", label: "Ingressos", icon: Ticket, state: "normal" }
];

// Participante Geral (e Palestrante, que herda): mesma estrutura do Não Pago,
// porém com TUDO liberado. A Credencial só entra para quem tem ingresso
// Presencial (via voucher); o ingresso Online é digital e não gera credencial.
const ATTENDEE_BASE: ComputedNav[] = [
  { to: "/inicio", label: "Início", icon: Home, state: "normal" },
  { to: "/streaming", label: "Ao Vivo", icon: Tv, state: "normal" },
  { to: "/conteudos", label: "Conteúdos", icon: BookOpen, state: "normal" },
  { to: "/programacao", label: "Programação", icon: CalendarDays, state: "normal" },
  { to: "/networking", label: "Networking", icon: Users, state: "normal" },
  { to: "/mapa", label: "Mapa", icon: MapIcon, state: "normal" },
  { to: "/certificado", label: "Certificado", icon: Award, state: "normal" }
];
const CREDENTIAL_ITEM: ComputedNav = { to: "/credencial", label: "Credencial", icon: QrCode, state: "normal" };

// Palestrante: herda o Participante Geral + "Meu Perfil Público" (bio, foto, selo).
const SPEAKER_ITEMS: ComputedNav[] = [
  ...ATTENDEE_BASE,
  CREDENTIAL_ITEM,
  { to: "/perfil", label: "Meu Perfil Público", icon: UserCircle, state: "normal" }
];

// Curador: "Início" é o painel; conteúdos em uma única aba; gestão de
// palestrantes/empresas; compra de ingressos em lote; perfil público.
const CURATOR_ITEMS: ComputedNav[] = [
  { to: "/curador", label: "Painel", icon: Home, state: "normal" },
  { to: "/programacao", label: "Programação", icon: CalendarDays, state: "normal" },
  { to: "/networking", label: "Networking", icon: Users, state: "normal" },
  { to: "/mapa", label: "Mapa", icon: MapIcon, state: "normal" },
  CREDENTIAL_ITEM,
  { to: "/certificado", label: "Certificado", icon: Award, state: "normal" },
  { to: "/conteudos", label: "Conteúdos", icon: BookOpen, state: "normal" },
  { to: "/ingressos", label: "Ingressos", icon: Ticket, state: "normal" },
  { to: "/perfil", label: "Meu Perfil Público", icon: UserCircle, state: "normal" }
];

// Operador: foco total no credenciamento — sem "Ao Vivo" nem "Conteúdos".
const OPERATOR_ITEMS: ComputedNav[] = [
  { to: "/operacao", label: "Operação", icon: ScanLine, state: "normal" }
];

// Administrador: "Painel" primeiro + gestão de programação e navegação essencial.
const ADMIN_ITEMS: ComputedNav[] = [
  { to: "/admin", label: "Painel", icon: Settings, state: "normal" },
  { to: "/admin/usuarios", label: "Usuários", icon: UserCog, state: "normal" },
  { to: "/admin/programacao-admin", label: "Programação", icon: CalendarDays, state: "normal" },
  { to: "/networking", label: "Networking", icon: Users, state: "normal" },
  { to: "/conteudos", label: "Conteúdos", icon: BookOpen, state: "normal" },
  { to: "/mapa", label: "Mapa", icon: MapIcon, state: "normal" }
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-500 font-heading text-white">
        SF
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-h5 text-neutral-900">Sustainable Finance</p>
          <p className="text-body-sm text-neutral-600">04/09/2026 · Goiânia</p>
        </div>
      )}
    </div>
  );
}

function NavItems({ items, orientation }: { items: ComputedNav[]; orientation: "row" | "col" }) {
  const navigate = useNavigate();
  const base =
    orientation === "col"
      ? "flex items-center gap-3 rounded-md px-3 py-2.5 text-body transition-colors"
      : "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] transition-colors";

  return (
    <>
      {items.map((it) => {
        const Icon = it.icon;
        const iconEl =
          it.state === "locked" ? (
            <span className="relative">
              <Icon className="h-5 w-5" />
              <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3" />
            </span>
          ) : (
            <Icon className="h-5 w-5 shrink-0" />
          );

        // Item bloqueado (Não Pago): abre a página em PREVIEW limitado.
        if (it.state === "locked") {
          return (
            <button
              key={it.label}
              onClick={() => navigate(it.to)}
              title="Pré-visualização — adquira para liberar"
              className={cn(base, orientation === "col" && "w-full text-left", "text-neutral-400 hover:bg-neutral-100")}
            >
              {iconEl}
              <span className={orientation === "row" ? "truncate" : ""}>{it.label}</span>
            </button>
          );
        }

        // CTA de aquisição — botão de destaque na cor primária do evento.
        if (it.state === "highlight") {
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={cn(
                base,
                orientation === "col"
                  ? "mt-2 justify-center bg-primary-500 font-medium text-white hover:bg-primary-600"
                  : "text-primary-600"
              )}
            >
              {iconEl}
              <span className={orientation === "row" ? "truncate" : ""}>{it.label}</span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                base,
                isActive
                  ? orientation === "col"
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-primary-600"
                  : "text-neutral-600 hover:bg-neutral-100"
              )
            }
          >
            {iconEl}
            <span className={orientation === "row" ? "truncate" : ""}>{it.label}</span>
          </NavLink>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, setRole, can, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Não Pago e Participante Geral/Palestrante têm árvores próprias; demais seguem o RBAC.
  const items: ComputedNav[] =
    user.role === "guest"
      ? GUEST_ITEMS
      : user.role === "speaker"
      ? SPEAKER_ITEMS
      : user.role === "curator"
      ? CURATOR_ITEMS
      : user.role === "operator"
      ? OPERATOR_ITEMS
      : user.role === "admin"
      ? ADMIN_ITEMS
      : user.role === "attendee"
      ? // Online (hasCredential === false) não tem Credencial; demais têm.
        user.hasCredential === false
        ? ATTENDEE_BASE
        : [...ATTENDEE_BASE, CREDENTIAL_ITEM]
      : NAV.flatMap((n) => {
          if (can(n.cap)) {
            if (n.highlight && user.isPaid) return []; // já adquiriu → some o CTA
            return [{ to: n.to, label: n.label, icon: n.icon, state: n.highlight ? "highlight" : "normal" }];
          }
          return [];
        });

  const RoleSelect = (
    <div className="flex items-center gap-2">
      <span className="hidden text-body-sm text-neutral-600 sm:inline">Perfil:</span>
      <select
        value={user.role}
        onChange={(e) => {
          const r = e.target.value as Role;
          setRole(r);
          navigate(HOME_BY_ROLE[r]);
        }}
        className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-body-sm"
        aria-label="Trocar perfil (protótipo)"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white px-4 py-6 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          <NavItems items={items} orientation="col" />
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-md border border-neutral-100 p-3">
          <NavLink to="/perfil" className="flex min-w-0 flex-1 items-center gap-3 rounded-md hover:opacity-80">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-neutral-900">{user.name}</p>
              <p className="truncate text-body-sm text-neutral-600">{ROLE_LABEL[user.role]}</p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-error-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:px-8">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="hidden text-body text-neutral-600 lg:block">
            Olá, <span className="font-medium text-neutral-900">{user.name.split(" ")[0]}</span> 👋
          </div>
          <div className="flex items-center gap-3">
            {RoleSelect}
            <NavLink to="/perfil" className="lg:hidden" aria-label="Meu perfil">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </NavLink>
          </div>
        </header>

        {/* Conteúdo — centralizado e com largura máxima no desktop */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile/tablet (adapta-se à quantidade de itens do perfil) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white lg:hidden">
        <div className="flex">
          <NavItems items={items} orientation="row" />
        </div>
      </nav>
    </div>
  );
}

/** Cabeçalho de página padronizado. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon = LayoutDashboard
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-h2 text-neutral-900 lg:text-h1">{title}</h1>
        {subtitle && <p className="text-body text-neutral-600">{subtitle}</p>}
      </div>
    </div>
  );
}
