import { UserAccount } from "../types";
import { db, DB_PATHS } from "../firebase";
import { ref, set } from "firebase/database";

export const COOKIE_NAMES = {
  SECTION_ID: "spro_section_id",
  SESSION_TOKEN: "spro_session_token",
  USER_ID: "spro_user_id",
  SUBDOMAIN_AUTH: "spro_code_subdomain_auth"
};

export const CODING_SUBDOMAIN = "https://code.espro.online";

/**
 * Generate a unique Section ID for the user session / coding section setup.
 * Format: sec_code_<timestamp_base36>_<random_hex>
 */
export function generateSectionId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `sec_code_${timestamp}_${randomStr}`;
}

/**
 * Generate a secure Session Token for authentication cross-domain.
 */
export function generateSessionToken(): string {
  const rand1 = Math.random().toString(36).substring(2, 12);
  const rand2 = Math.random().toString(36).substring(2, 12);
  return `tok_spro_${rand1}${rand2}`;
}

/**
 * Helper to get cookie root domain for subdomains like code.espro.online
 */
function getCookieDomain(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname;
  
  if (hostname.endsWith("espro.online")) {
    return ".espro.online";
  }
  if (hostname.endsWith("sprocoder.online")) {
    return ".sprocoder.online";
  }
  return ""; // default to current domain (e.g. localhost or cloud run)
}

/**
 * Set a browser cookie with cross-subdomain compatibility where applicable.
 */
export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const expiresStr = `; expires=${expires.toUTCString()}`;

  const domain = getCookieDomain();
  const domainStr = domain ? `; domain=${domain}` : "";

  document.cookie = `${name}=${encodeURIComponent(value)}${expiresStr}${domainStr}; path=/; SameSite=Lax`;
}

/**
 * Get cookie value by name.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const nameEQ = `${name}=`;
  const ca = document.cookie.split(";");

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Delete cookie by name.
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;

  const domain = getCookieDomain();
  const domainStr = domain ? `; domain=${domain}` : "";

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainStr}; path=/; SameSite=Lax`;
}

/**
 * Initialize and assign Section ID & Session Token for an authenticated user.
 * Stores in Cookies, LocalStorage, and Firebase Realtime Database.
 */
export async function initUserSectionSession(user: UserAccount): Promise<{
  updatedUser: UserAccount;
  sectionId: string;
  sessionToken: string;
}> {
  // Use existing sectionId if present, otherwise generate a new one
  const sectionId = user.sectionId || generateSectionId();
  const sessionToken = generateSessionToken();

  const updatedUser: UserAccount = {
    ...user,
    sectionId,
    sessionToken,
    lastLogin: new Date().toLocaleString()
  };

  // 1. Store in Browser Cookies (Key requirement)
  setCookie(COOKIE_NAMES.SECTION_ID, sectionId, 365);
  setCookie(COOKIE_NAMES.SESSION_TOKEN, sessionToken, 365);
  setCookie(COOKIE_NAMES.USER_ID, user.id, 365);
  
  // Store payload string for code.espro.online subdomain single sign-on
  const authPayload = JSON.stringify({
    userId: user.id,
    sectionId,
    sessionToken,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role || "reader",
    issuedAt: new Date().toISOString()
  });
  setCookie(COOKIE_NAMES.SUBDOMAIN_AUTH, authPayload, 365);

  // 2. Store in LocalStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("spro_section_id", sectionId);
    localStorage.setItem("spro_session_token", sessionToken);
    localStorage.setItem("spro_user", JSON.stringify(updatedUser));
  }

  // 3. Sync Section ID & Session to Firebase Realtime Database
  try {
    if (user.id) {
      // Update user node
      await set(ref(db, `${DB_PATHS.USERS}/${user.id}/sectionId`), sectionId);
      await set(ref(db, `${DB_PATHS.USERS}/${user.id}/sessionToken`), sessionToken);
      
      // Store active session mapping under /sessions/<sectionId>
      await set(ref(db, `sessions/${sectionId}`), {
        sectionId,
        sessionToken,
        userId: user.id,
        userEmail: user.email,
        username: user.username,
        name: user.name,
        role: user.role || "reader",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        targetSubdomain: CODING_SUBDOMAIN
      });
    }
  } catch (err) {
    console.warn("RTDB session sync notice:", err);
  }

  return {
    updatedUser,
    sectionId,
    sessionToken
  };
}

/**
 * Retrieve active section ID and token from cookies or localStorage.
 */
export function getActiveSectionSession(): {
  sectionId: string | null;
  sessionToken: string | null;
  userId: string | null;
} {
  const cookieSectionId = getCookie(COOKIE_NAMES.SECTION_ID);
  const cookieToken = getCookie(COOKIE_NAMES.SESSION_TOKEN);
  const cookieUserId = getCookie(COOKIE_NAMES.USER_ID);

  let localSectionId = null;
  let localToken = null;

  if (typeof window !== "undefined") {
    localSectionId = localStorage.getItem("spro_section_id");
    localToken = localStorage.getItem("spro_session_token");
  }

  return {
    sectionId: cookieSectionId || localSectionId,
    sessionToken: cookieToken || localToken,
    userId: cookieUserId
  };
}

/**
 * Clear all section cookies and localStorage upon logout.
 */
export function clearSectionSession(): void {
  deleteCookie(COOKIE_NAMES.SECTION_ID);
  deleteCookie(COOKIE_NAMES.SESSION_TOKEN);
  deleteCookie(COOKIE_NAMES.USER_ID);
  deleteCookie(COOKIE_NAMES.SUBDOMAIN_AUTH);

  if (typeof window !== "undefined") {
    localStorage.removeItem("spro_section_id");
    localStorage.removeItem("spro_session_token");
  }
}

/**
 * Build the URL to redirect the user to the VS Code / coding section on code.espro.online
 */
export function getCodingSectionRedirectUrl(sectionId?: string, sessionToken?: string): string {
  const currentSection = sectionId || getCookie(COOKIE_NAMES.SECTION_ID) || "";
  const currentToken = sessionToken || getCookie(COOKIE_NAMES.SESSION_TOKEN) || "";

  if (currentSection) {
    return `${CODING_SUBDOMAIN}?section_id=${encodeURIComponent(currentSection)}&token=${encodeURIComponent(currentToken)}`;
  }
  return CODING_SUBDOMAIN;
}
