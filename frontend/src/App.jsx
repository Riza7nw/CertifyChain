import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import RequireAuth from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import IssueCertificate from "./pages/IssueCertificate";
import VerifyCertificate from "./pages/VerifyCertificate";
import PublicVerify from "./pages/PublicVerify";
import ScanVerify from "./pages/ScanVerify";
import LoginAdmin from "./pages/LoginAdmin";
import AuditLog from "./pages/AuditLog";
import Institutions from "./pages/Institutions";
import InstitutionDetail from "./pages/InstitutionDetail";
import Statistics from "./pages/Statistics";

// Pusat routing aplikasi.
// - Rute PUBLIK (PublicLayout, tanpa login): /scan dan /verify/:id (target QR Code).
// - Rute LOGIN: /login (form admin, standalone).
// - Rute DASHBOARD (Layout + sidebar, DILINDUNGI RequireAuth): /, /issue, /verify, /audit.

// Bungkus halaman dashboard dengan guard + Layout sekaligus.
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
      {/* ---- Login admin ---- */}
      <Route path="/login" element={<LoginAdmin />} />

      {/* ---- Halaman publik (tanpa login) ---- */}
      <Route
        path="/scan"
        element={
          <PublicLayout>
            <ScanVerify />
          </PublicLayout>
        }
      />
      <Route
        path="/verify/:id"
        element={
          <PublicLayout>
            <PublicVerify />
          </PublicLayout>
        }
      />

      {/* ---- Dashboard (butuh login admin) ---- */}
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/issue"
        element={
          <Protected>
            <IssueCertificate />
          </Protected>
        }
      />
      <Route
        path="/institutions"
        element={
          <Protected>
            <Institutions />
          </Protected>
        }
      />
      <Route
        path="/institutions/:id"
        element={
          <Protected>
            <InstitutionDetail />
          </Protected>
        }
      />
      <Route
        path="/stats"
        element={
          <Protected>
            <Statistics />
          </Protected>
        }
      />
      <Route
        path="/verify"
        element={
          <Protected>
            <VerifyCertificate />
          </Protected>
        }
      />
      <Route
        path="/audit"
        element={
          <Protected>
            <AuditLog />
          </Protected>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
