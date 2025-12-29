export function saveToken(token: string) {
  localStorage.setItem("jwt", token);
}

export function getToken(): string | null {
  return localStorage.getItem("jwt");
}

export function clearToken() {
  localStorage.removeItem("jwt");
}

function parseJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

const NAME_ID_URI = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function getUserIdFromToken(): string {
  const t = getToken();
  if (!t) return "";
  const p = parseJwt(t);

  return (
    p?.nameid ||          // đôi khi libs map như vậy
    p?.sub ||             // JwtRegisteredClaimNames.Sub
    p?.[NAME_ID_URI] ||   // ClaimTypes.NameIdentifier
    ""
  );
}

export function getRoleFromToken(): string {
  const t = getToken();
  if (!t) return "";
  const p = parseJwt(t);

  return (
    p?.role ||      // đôi khi ra role
    p?.[ROLE_URI] || // ClaimTypes.Role
    ""
  );
}
