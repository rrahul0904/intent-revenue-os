export type ActorRole = "owner" | "admin" | "member";

export interface Actor {
  userId: string;
  name: string;
  mode: "demo" | "trusted-header";
}

export class AuthenticationError extends Error {
  status = 401;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function getAuthMode(): "demo" | "trusted-header" {
  return process.env.AUTH_MODE === "trusted-header" ? "trusted-header" : "demo";
}

export async function requireActor(request?: Request): Promise<Actor> {
  const mode = getAuthMode();

  if (mode === "trusted-header") {
    const userId = request?.headers.get("x-authenticated-user-id")?.trim();
    if (!userId) {
      throw new AuthenticationError();
    }

    return {
      userId,
      name: request?.headers.get("x-authenticated-user-name")?.trim() || userId,
      mode,
    };
  }

  const productionDemoAllowed = process.env.ALLOW_DEMO_AUTH_IN_PRODUCTION === "true";
  if (process.env.NODE_ENV === "production" && !productionDemoAllowed) {
    throw new AuthenticationError(
      "Demo authentication is disabled in production. Configure a trusted auth adapter.",
    );
  }

  return {
    userId: process.env.DEMO_USER_ID || "demo-founder",
    name: process.env.DEMO_USER_NAME || "Demo Founder",
    mode,
  };
}
