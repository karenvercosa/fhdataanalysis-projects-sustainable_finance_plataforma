import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { AbaEmConstrucao } from "@/components/AbaEmConstrucao";
import { useAuth } from "@/context/AuthContext";

import LoginPage from "@/views/LoginPage";
import RegisterPage from "@/views/RegisterPage";
import EsqueciSenhaPage from "@/views/EsqueciSenhaPage";
import TrocarSenhaPage from "@/views/TrocarSenhaPage";
import PrimeiroAcessoPage from "@/views/PrimeiroAcessoPage";
import ParticipantDashboard from "@/views/ParticipantDashboard";
import CredentialPage from "@/views/CredentialPage";
import CertificatePage from "@/views/CertificatePage";
import VoucherCheckout from "@/views/VoucherCheckout";
import AssinaturaPage from "@/views/AssinaturaPage";
import CuratorDashboard from "@/views/CuratorDashboard";
import HomePage from "@/views/HomePage";
import OperatorPanel from "@/views/OperatorPanel";
import AdminDashboard from "@/views/AdminDashboard";
import UsersAdmin from "@/views/admin/UsersAdmin";
import VouchersAdmin from "@/views/admin/VouchersAdmin";
import ModuleCrud from "@/views/admin/ModuleCrud";
import InterestsAdmin from "@/views/admin/InterestsAdmin";
import ReportsAdmin from "@/views/admin/ReportsAdmin";
import TierMatrixAdmin from "@/views/admin/TierMatrixAdmin";
import ProfilePage from "@/views/ProfilePage";

/**
 * Abas em construção.
 *
 * As telas correspondentes continuam no repositório e prontas para voltar —
 * `ContentHub`, `StreamingPage`, `MapPage`, `Networking`, `NetworkingProfile`,
 * `ProgrammingPage`, `SessionsAdmin` e o CRUD de Divulgações não foram removidos, apenas
 * deixaram de ser renderizados. Para reativar uma delas, basta importar a view
 * de novo e trocar o `element` da rota.
 *
 * Os guards de capacidade seguem no lugar: quem não podia entrar continua sem
 * entrar, para a regra de acesso não mudar junto com o placeholder.
 */

/** Layout autenticado: protege as rotas e envolve no AppShell. */
function ShellLayout() {
  const { isAuthenticated, senhaProvisoria } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Enquanto a senha for a provisória do e-mail, nenhuma tela do app abre —
  // mesma regra que o Server Component aplica antes de servir a página.
  if (senhaProvisoria) return <Navigate to="/primeiro-acesso" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Telas de autenticação que não fazem sentido para quem já entrou. Espelha o
 * corte do middleware, para a navegação client-side não driblar a regra.
 */
function SomenteDeslogado({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/inicio" replace />;
  return <>{children}</>;
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

/**
 * A aba "Ingressos" tem dois donos.
 *
 * Curador/patrocinador não compra acesso: ele PEDE mais convites ao comercial,
 * e é o `VoucherCheckout` que cuida disso. Todos os outros caem no checkout do
 * Asaas — assinatura anual ou ingresso presencial.
 */
function IngressosPorPapel() {
  const { user } = useAuth();
  return user.role === "curator" ? <VoucherCheckout /> : <AssinaturaPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Login & Cadastro — standalone, sem o shell do app */}
      <Route
        path="/login"
        element={
          <SomenteDeslogado>
            <LoginPage />
          </SomenteDeslogado>
        }
      />
      <Route path="/cadastro" element={<RegisterPage />} />

      {/* Recuperação e troca de senha — também fora do shell.
          `/trocar-senha` depende do token que o e-mail de confirmação
          carrega; sem ele o servidor nem entrega esta rota. */}
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/trocar-senha" element={<TrocarSenhaPage />} />

      {/* Primeiro acesso: única tela liberada enquanto a senha for a
          provisória enviada por e-mail. */}
      <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />

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
              <AbaEmConstrucao titulo="Ao Vivo" />
            </RoleGuard>
          }
        />

        {/* Mapa do evento (Não Pago vê em preview limitado) */}
        <Route
          path="/mapa"
          element={
            <AcquireGuard capability="view:event-map">
              <AbaEmConstrucao titulo="Mapa" />
            </AcquireGuard>
          }
        />

        {/* Ingressos. Curador/patrocinador pede mais convites (VoucherCheckout);
            os demais compram acesso pelo Asaas. */}
        <Route
          path="/ingressos"
          element={
            <RoleGuard capability="view:public-content">
              <IngressosPorPapel />
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
        <Route path="/conteudos" element={<AbaEmConstrucao titulo="Conteúdos" />} />

        {/* Perfil — disponível a todos os autenticados */}
        <Route path="/perfil" element={<ProfilePage />} />

        {/* Networking (Não Pago vê em preview limitado) */}
        <Route
          path="/networking"
          element={
            <AcquireGuard capability="view:networking">
              <AbaEmConstrucao titulo="Networking" />
            </AcquireGuard>
          }
        />
        <Route
          path="/networking/:id"
          element={
            <AcquireGuard capability="view:networking">
              <AbaEmConstrucao titulo="Networking" />
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
        {/* Vouchers têm tela própria (gravam no banco), então precisam vir
            ANTES do `/admin/:module`, que cai no CRUD genérico. */}
        <Route
          path="/admin/vouchers"
          element={
            <RoleGuard capability="manage:platform">
              <VouchersAdmin />
            </RoleGuard>
          }
        />

        {/* Divulgações em construção. A rota também precisa vir antes do
            `/admin/:module` para não cair no CRUD genérico — cuja configuração
            (`CRUD_VOUCHERS_LEGADO` e `divulgacoes`) continua no arquivo. */}
        <Route
          path="/admin/divulgacoes"
          element={
            <RoleGuard capability="manage:platform">
              <AbaEmConstrucao titulo="Divulgações" />
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
          path="/admin/cotas"
          element={
            <RoleGuard capability="manage:platform">
              <TierMatrixAdmin />
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
              <AbaEmConstrucao titulo="Programação" />
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
              <AbaEmConstrucao titulo="Programação" />
            </RoleGuard>
          }
        />

        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Route>
    </Routes>
  );
}
