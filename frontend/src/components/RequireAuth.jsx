import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Spinner from "./Spinner";

// Guard: tunggu bootstrap sesi; bila belum login -> /login.
export default function RequireAuth({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner className="h-6 w-6" />
        <span className="ml-3 text-sm">Memuat sesi…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
