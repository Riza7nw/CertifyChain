import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/shell/AppShell";
import PublicShell from "./components/shell/PublicShell";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import OrgsPage from "./pages/OrgsPage";
import OrgDashboard from "./pages/OrgDashboard";
import IssueCert from "./pages/IssueCert";
import Templates from "./pages/Templates";
import MyCertificates from "./pages/MyCertificates";
import AdminUsers from "./pages/AdminUsers";
import AdminCertificates from "./pages/AdminCertificates";
import VerifyCertificate from "./pages/VerifyCertificate";
import PublicVerify from "./pages/PublicVerify";
import PublicSearch from "./pages/PublicSearch";
import VerifyFile from "./pages/VerifyFile";
import ScanVerify from "./pages/ScanVerify";

// Routing multi-tenant (Langkah 2).
// - PUBLIK: /login, /register, /scan, /verify/:id (target QR).
// - DASHBOARD (RequireAuth + Layout): /, /orgs/:orgId, /orgs/:orgId/issue, /verify.
function Protected({ children }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Publik (tanpa login) */}
      <Route path="/scan" element={<PublicShell><ScanVerify /></PublicShell>} />
      <Route path="/search" element={<PublicShell><PublicSearch /></PublicShell>} />
      <Route path="/verify-file" element={<PublicShell><VerifyFile /></PublicShell>} />
      <Route path="/verify/:id" element={<PublicShell><PublicVerify /></PublicShell>} />

      {/* Dashboard (butuh login) */}
      <Route path="/" element={<Protected><OrgsPage /></Protected>} />
      <Route path="/orgs/:orgId" element={<Protected><OrgDashboard /></Protected>} />
      <Route path="/orgs/:orgId/issue" element={<Protected><IssueCert /></Protected>} />
      <Route path="/orgs/:orgId/templates" element={<Protected><Templates /></Protected>} />
      <Route path="/me/certificates" element={<Protected><MyCertificates /></Protected>} />
      <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
      <Route path="/admin/certificates" element={<Protected><AdminCertificates /></Protected>} />
      <Route path="/verify" element={<Protected><VerifyCertificate /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
