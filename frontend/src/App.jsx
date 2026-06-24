import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OrgsPage from "./pages/OrgsPage";
import OrgDashboard from "./pages/OrgDashboard";
import IssueCert from "./pages/IssueCert";
import VerifyCertificate from "./pages/VerifyCertificate";
import PublicVerify from "./pages/PublicVerify";
import ScanVerify from "./pages/ScanVerify";

// Routing multi-tenant (Langkah 2).
// - PUBLIK: /login, /register, /scan, /verify/:id (target QR).
// - DASHBOARD (RequireAuth + Layout): /, /orgs/:orgId, /orgs/:orgId/issue, /verify.
function Protected({ children }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Publik (tanpa login) */}
      <Route path="/scan" element={<PublicLayout><ScanVerify /></PublicLayout>} />
      <Route path="/verify/:id" element={<PublicLayout><PublicVerify /></PublicLayout>} />

      {/* Dashboard (butuh login) */}
      <Route path="/" element={<Protected><OrgsPage /></Protected>} />
      <Route path="/orgs/:orgId" element={<Protected><OrgDashboard /></Protected>} />
      <Route path="/orgs/:orgId/issue" element={<Protected><IssueCert /></Protected>} />
      <Route path="/verify" element={<Protected><VerifyCertificate /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
