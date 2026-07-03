import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";

import LoginPage from "@/views/LoginPage";
import RegisterPage from "@/views/RegisterPage";
import ParticipantDashboard from "@/views/ParticipantDashboard";
import CredentialPage from "@/views/CredentialPage";
import CertificatePage from "@/views/CertificatePage";
import VoucherCheckout from "@/views/VoucherCheckout";
import CuratorDashboard from "@/views/CuratorDashboard";
import HomePage from "@/views/HomePage";
import ContentHub from "@/views/ContentHub";
import StreamingPage from "@/views/StreamingPage";
import MapPage from "@/views/MapPage";
import Networking from "@/views/Networking";
import NetworkingProfile from "@/views/NetworkingProfile";
import OperatorPanel from "@/views/OperatorPanel";
import AdminDashboard from "@/views/AdminDashboard";
import ProgrammingPage from "@/views/ProgrammingPage";
import UsersAdmin from "@/views/admin/UsersAdmin";
import ModuleCrud from "@/views/admin/ModuleCrud";
import InterestsAdmin from "@/views/admin/InterestsAdmin";
import ReportsAdmin from "@/views/admin/ReportsAdmin";
import SessionsAdmin from "@/views/admin/SessionsAdmin";
import PermissionsAdmin from "@/views/admin/PermissionsAdmin";
import ProfilePage from "@/views/ProfilePage";

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
        <Route path="/" element={<Navigate to="/inicio" replace />} />

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

        {/* Certificado de participação (pós-evento) — geral, palestrante, curador */}
        <Route
          path="/certificado"
          element={
            <RoleGuard capability="view:certificate">
              <CertificatePage />
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
        <Route
          path="/networking/:id"
          element={
            <AcquireGuard capability="view:networking">
              <NetworkingProfile />
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

        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Route>
    </Routes>
  );
}
