type User = {
  email: string;
  name: string;
};

const LS_KEY = "em_user";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const auth = {
  getUser(): User | null {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  async signIn(email: string, password: string) {
    await sleep(500);
    // dummy validation
    if (!email.includes("@") || password.length < 3) {
      throw new Error("Invalid credentials");
    }
    const user: User = { email, name: "Facility Manager" };
    localStorage.setItem(LS_KEY, JSON.stringify(user));
    return user;
  },

  async signUp(name: string, email: string, password: string) {
    await sleep(600);
    if (name.trim().length < 2) throw new Error("Name is too short");
    if (!email.includes("@")) throw new Error("Invalid email");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    const user: User = { email, name };
    localStorage.setItem(LS_KEY, JSON.stringify(user));
    return user;
  },

  signOut() {
    localStorage.removeItem(LS_KEY);
  },
};
export type { User };