import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ParticipantDashboard from "@/pages/ParticipantDashboard";
import CredentialPage from "@/pages/CredentialPage";
import VoucherCheckout from "@/pages/VoucherCheckout";
import CuratorDashboard from "@/pages/CuratorDashboard";
import HomePage from "@/pages/HomePage";
import ContentHub from "@/pages/ContentHub";
import StreamingPage from "@/pages/StreamingPage";
import MapPage from "@/pages/MapPage";
import Networking from "@/pages/Networking";
import OperatorPanel from "@/pages/OperatorPanel";
import AdminDashboard from "@/pages/AdminDashboard";
import ProgrammingPage from "@/pages/ProgrammingPage";
import UsersAdmin from "@/pages/admin/UsersAdmin";
import ModuleCrud from "@/pages/admin/ModuleCrud";
import InterestsAdmin from "@/pages/admin/InterestsAdmin";
import ReportsAdmin from "@/pages/admin/ReportsAdmin";
import SessionsAdmin from "@/pages/admin/SessionsAdmin";
import PermissionsAdmin from "@/pages/admin/PermissionsAdmin";
import ProfilePage from "@/pages/ProfilePage";

/** Layout autenticado: protege as rotas e envolve no AppShell. */
function ShellLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Guard de aquisição: acesso total se tiver a capacidade; o Não Pago entra em
 * modo PREVIEW (a própria página renderiza a amostra). Demais perfis sem a
 * capacidade são redirecionados.
 */
function AcquireGuard({ capability, children }: { capability: Parameters<ReturnType<typeof useAuth>["can"]>[0]; children: React.ReactNode }) {
  const { can, user } = useAuth();
  if (can(capability) || user.role === "guest") return <>{children}</>;
  return <Navigate to="/conteudos" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Login & Cadastro — standalone, sem o shell do app */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      {/* Rotas internas dentro do AppShell */}
      <Route element={<ShellLayout />}>
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* Início — home de boas-vindas + preview da agenda */}
        <Route path="/inicio" element={<HomePage />} />

        {/* Participante / Palestrante (Não Pago vê em preview limitado) */}
        <Route
          path="/app"
          element={
            <AcquireGuard capability="manage:personal-agenda">
              <ParticipantDashboard />
            </AcquireGuard>
          }
        />
        <Route
          path="/credencial"
          element={
            <AcquireGuard capability="view:ticket-qr">
              <CredentialPage />
            </AcquireGuard>
          }
        />

        {/* Streaming ao vivo — livre para todos (inclusive Não Pago) */}
        <Route
          path="/streaming"
          element={
            <RoleGuard capability="view:streaming">
              <StreamingPage />
            </RoleGuard>
          }
        />

        {/* Mapa do evento (Não Pago vê em preview limitado) */}
        <Route
          path="/mapa"
          element={
            <AcquireGuard capability="view:event-map">
              <MapPage />
            </AcquireGuard>
          }
        />

        {/* Ingressos — aba independente do fluxo de compra/voucher */}
        <Route
          path="/ingressos"
          element={
            <RoleGuard capability="view:public-content">
              <VoucherCheckout />
            </RoleGuard>
          }
        />
        <Route path="/adquirir" element={<Navigate to="/ingressos" replace />} />
        <Route path="/checkout" element={<Navigate to="/ingressos" replace />} />

        {/* Curador */}
        <Route
          path="/curador"
          element={
            <RoleGuard capability="view:curator-dashboard">
              <CuratorDashboard />
            </RoleGuard>
          }
        />

        {/* Conteúdos (público; trava premium é interna) */}
        <Route path="/conteudos" element={<ContentHub />} />

        {/* Perfil — disponível a todos os autenticados */}
        <Route path="/perfil" element={<ProfilePage />} />

        {/* Networking (Não Pago vê em preview limitado) */}
        <Route
          path="/networking"
          element={
            <AcquireGuard capability="view:networking">
              <Networking />
            </AcquireGuard>
          }
        />

        {/* Operador */}
        <Route
          path="/operacao"
          element={
            <RoleGuard capability="operate:checkin">
              <OperatorPanel />
            </RoleGuard>
          }
        />

        {/* Admin — painel + módulos de gestão */}
        <Route
          path="/admin"
          element={
            <RoleGuard capability="manage:platform">
              <AdminDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <RoleGuard capability="manage:platform">
              <UsersAdmin />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/interesses"
          element={
            <RoleGuard capability="manage:platform">
              <InterestsAdmin />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/relatorios"
          element={
            <RoleGuard capability="manage:platform">
              <ReportsAdmin />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/programacao-admin"
          element={
            <RoleGuard capability="manage:platform">
              <SessionsAdmin />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/permissoes"
          element={
            <RoleGuard capability="manage:platform">
              <PermissionsAdmin />
            </RoleGuard>
          }
        />
        <Route
          path="/admin/:module"
          element={
            <RoleGuard capability="manage:platform">
              <ModuleCrud />
            </RoleGuard>
          }
        />

        {/* Programação completa (visível a todos; favoritar exige permissão) */}
        <Route
          path="/programacao"
          element={
            <RoleGuard capability="view:public-content">
              <ProgrammingPage />
            </RoleGuard>
          }
        />

        {/* Alias ainda não implementado */}
        <Route path="/empresa" element={<Navigate to="/networking" replace />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
    </Routes>
  );
}
