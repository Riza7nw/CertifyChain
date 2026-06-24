import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../auth/auth";

// Route guard sederhana: bila belum login (tidak ada token), alihkan ke /login.
// Menyimpan lokasi asal di state agar bisa kembali setelah login berhasil.
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
