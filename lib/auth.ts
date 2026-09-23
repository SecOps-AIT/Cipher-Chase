import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "cipher-chase-default-secret-key-32-chars-long"
);

const TEAM_COOKIE_NAME = "cipher_team_token";
const ADMIN_COOKIE_NAME = "cipher_admin_token";

export interface TeamSessionPayload {
  teamId: string;
  memberId: string;
  memberName: string;
  eventId: string;
  teamName: string;
  joinCode: string;
}

export interface AdminSessionPayload {
  email: string;
  isAdmin: true;
}

// 1. Sign Team JWT
export async function signTeamSession(payload: TeamSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

// 2. Sign Admin JWT
export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET_KEY);
}

// 3. Verify Token
export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as T;
  } catch {
    return null;
  }
}

// 4. Session Setters
export async function setTeamSessionCookie(payload: TeamSessionPayload) {
  const token = await signTeamSession(payload);
  const cookieStore = cookies();
  cookieStore.set(TEAM_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function setAdminSessionCookie(payload: AdminSessionPayload) {
  const token = await signAdminSession(payload);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

// 5. Session Clearers
export async function clearTeamSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TEAM_COOKIE_NAME);
}

export async function clearAdminSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// 6. Get Current Sessions
export async function getTeamSession(): Promise<TeamSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TEAM_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken<TeamSessionPayload>(token);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken<AdminSessionPayload>(token);
}

// 7. Guards
export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session || !session.isAdmin) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return session;
}

export async function requireTeamSession(): Promise<TeamSessionPayload> {
  const session = await getTeamSession();
  if (!session || !session.teamId) {
    throw new Error("UNAUTHORIZED_TEAM");
  }
  return session;
}

function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 8. API Route Validators (for NextRequest)
export async function validateAdminAuth(request: Request): Promise<{
  success: boolean;
  error?: string;
  adminId?: string;
  session?: AdminSessionPayload;
}> {
  try {
    let token: string | undefined | null = null;
    try {
      const cookieStore = cookies();
      token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    } catch {
      // In some route contexts cookies() might throw, fallback to header
    }

    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      token = extractCookie(cookieHeader, ADMIN_COOKIE_NAME);
    }

    if (!token) {
      return { success: false, error: "Admin session not found" };
    }

    const session = await verifyToken<AdminSessionPayload>(token);
    if (!session || !session.isAdmin) {
      return { success: false, error: "Invalid admin session" };
    }

    return { 
      success: true, 
      adminId: session.email,
      session 
    };
  } catch (error) {
    return { success: false, error: "Authentication error" };
  }
}

export async function validateTeamAuth(request: Request): Promise<{
  success: boolean;
  error?: string;
  teamId?: string;
  memberId?: string;
  session?: TeamSessionPayload;
}> {
  try {
    let token: string | undefined | null = null;
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TEAM_COOKIE_NAME)?.value;
    } catch {
      // In some route contexts cookies() might throw, fallback to header
    }

    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      token = extractCookie(cookieHeader, TEAM_COOKIE_NAME);
    }

    if (!token) {
      return { success: false, error: "Team session not found" };
    }

    const session = await verifyToken<TeamSessionPayload>(token);
    if (!session || !session.teamId) {
      return { success: false, error: "Invalid team session" };
    }

    return { 
      success: true, 
      teamId: session.teamId,
      memberId: session.memberId,
      session 
    };
  } catch (error) {
    return { success: false, error: "Authentication error" };
  }
}
