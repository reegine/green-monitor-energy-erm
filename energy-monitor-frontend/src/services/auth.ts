import {
  authMe,
  authRefreshToken,
  authSignIn,
  authSignOut,
  authSignUp,
  configureBackendAuth,
  isUnauthorizedError,
} from "./backend";

type User = {
  id?: number;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const LS_KEY = "em_auth_session";
const SS_KEY = "em_auth_session_temporary";
const LS_REMEMBER = "em_auth_remember";

let memorySession: AuthSession | null = null;
let refreshInFlight: Promise<string | null> | null = null;

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [first, ...rest] = trimmed.split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

function toDisplayName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}) {
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  if (full) return full;
  if (user.username) return user.username;
  return user.email ?? "User";
}

function mapUser(payload: {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}): User {
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email ?? "",
    firstName: payload.first_name ?? "",
    lastName: payload.last_name ?? "",
    name: toDisplayName(payload),
  };
}

function readStored(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getRememberFlag() {
  return localStorage.getItem(LS_REMEMBER) === "1";
}

function setRememberFlag(value: boolean) {
  localStorage.setItem(LS_REMEMBER, value ? "1" : "0");
}

function loadSession(): AuthSession | null {
  if (memorySession) return memorySession;
  const persistent = readStored(localStorage.getItem(LS_KEY));
  const temporary = readStored(sessionStorage.getItem(SS_KEY));
  memorySession = persistent ?? temporary;
  return memorySession;
}

function storeSession(session: AuthSession, remember: boolean) {
  memorySession = session;
  const serialized = JSON.stringify(session);
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(SS_KEY);
  if (remember) {
    localStorage.setItem(LS_KEY, serialized);
  } else {
    sessionStorage.setItem(SS_KEY, serialized);
  }
  setRememberFlag(remember);
}

function clearSession() {
  memorySession = null;
  refreshInFlight = null;
  localStorage.removeItem(LS_KEY);
  sessionStorage.removeItem(SS_KEY);
}

async function refreshAccessTokenInternal(): Promise<string | null> {
  const current = loadSession();
  if (!current?.refreshToken) return null;

  try {
    const refreshed = await authRefreshToken(current.refreshToken);
    const updated: AuthSession = {
      ...current,
      accessToken: refreshed.access,
      refreshToken: refreshed.refresh ?? current.refreshToken,
    };
    storeSession(updated, getRememberFlag());
    return updated.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

configureBackendAuth({
  getAccessToken: () => loadSession()?.accessToken ?? null,
  refreshAccessToken: async () => {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessTokenInternal().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },
  onUnauthorized: () => {
    clearSession();
  },
});

async function resolveUserFromBackend(fallbackUser: User): Promise<User> {
  try {
    const me = await authMe();
    return mapUser(me);
  } catch {
    return fallbackUser;
  }
}

function usernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  return localPart.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 50) || `user${Date.now()}`;
}

export const auth = {
  getUser(): User | null {
    return loadSession()?.user ?? null;
  },

  getAccessToken(): string | null {
    return loadSession()?.accessToken ?? null;
  },

  async refreshProfile() {
    const current = loadSession();
    if (!current) return null;

    try {
      const me = await authMe();
      const next = { ...current, user: mapUser(me) };
      storeSession(next, getRememberFlag());
      return next.user;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearSession();
      }
      return current.user;
    }
  },

  async signIn(emailOrUsername: string, password: string, remember = true) {
    const identity = emailOrUsername.trim();
    if (!identity || password.length < 3) {
      throw new Error("Username/email and password are required.");
    }

    const attempts = identity.includes("@")
      ? [identity, usernameFromEmail(identity)]
      : [identity];

    let lastError: unknown = null;
    for (const username of attempts) {
      try {
        const tokenPayload = await authSignIn({ username, password });
        const embeddedUser = tokenPayload.user
          ? mapUser(tokenPayload.user)
          : {
              email: identity.includes("@") ? identity : "",
              username,
              name: username,
            };

        const hydratedUser = await resolveUserFromBackend(embeddedUser);

        storeSession(
          {
            accessToken: tokenPayload.access,
            refreshToken: tokenPayload.refresh,
            user: hydratedUser,
          },
          remember
        );

        return hydratedUser;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error("Failed to sign in.");
  },

  async signUp(input: { name: string; username: string; email: string; password: string; remember?: boolean }) {
    const name = input.name.trim();
    const username = input.username.trim();
    const email = input.email.trim();
    const password = input.password;
    const remember = input.remember ?? true;

    if (name.length < 2) throw new Error("Name is too short.");
    if (!username) throw new Error("Username is required.");
    if (!email.includes("@")) throw new Error("Invalid email.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const parts = splitName(name);
    const response = await authSignUp({
      username,
      email,
      password,
      confirm_password: password,
      first_name: parts.firstName,
      last_name: parts.lastName,
    });

    const tokens = response.tokens;
    if (!tokens?.access || !tokens?.refresh) {
      // If backend returns no tokens, fallback to login flow.
      return this.signIn(username, password, remember);
    }

    const embeddedUser = response.user
      ? mapUser(response.user)
      : tokens.user
      ? mapUser(tokens.user)
      : {
          username,
          email,
          name,
        };

    storeSession(
      {
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        user: embeddedUser,
      },
      remember
    );

    const hydrated = await resolveUserFromBackend(embeddedUser);
    const current = loadSession();
    if (current) {
      storeSession({ ...current, user: hydrated }, remember);
    }

    return hydrated;
  },

  async signOut() {
    const current = loadSession();
    clearSession();

    if (!current?.refreshToken) return;

    try {
      await authSignOut(current.refreshToken);
    } catch {
      // Ignore signout API failures to keep UX smooth.
    }
  },
};

export type { User };