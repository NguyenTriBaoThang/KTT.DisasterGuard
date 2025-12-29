export function saveToken(token: string) {
  localStorage.setItem("jwt", token);
}

export function getToken(): string | null {
  return localStorage.getItem("jwt");
}

export function clearToken() {
  localStorage.removeItem("jwt");
}

// ===== JWT decode (không cần thư viện) =====
function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;

    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRoleFromToken(): string | null {
  const t = getToken();
  if (!t) return null;
  const p = decodeJwtPayload(t);
  if (!p) return null;

  return (
    p.role ||
    p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    null
  );
}

export function getUserIdFromToken(): string | null {
  const t = getToken();
  if (!t) return null;
  const p = decodeJwtPayload(t);
  if (!p) return null;

  return (
    p.sub ||
    p["nameid"] ||
    p["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    null
  );
}