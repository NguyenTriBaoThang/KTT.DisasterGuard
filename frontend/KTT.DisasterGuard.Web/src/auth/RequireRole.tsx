import { Navigate } from "react-router-dom";
import { getRoleFromToken, getToken } from "./auth";

export default function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: JSX.Element;
}) {
  const token = getToken();
  if (!token) return <Navigate to="/auth" replace />;

  const role = (getRoleFromToken() || "").toUpperCase();
  const allowed = roles.map((r) => r.toUpperCase());

  if (!allowed.includes(role)) return <Navigate to="/sos" replace />;

  return children;
}