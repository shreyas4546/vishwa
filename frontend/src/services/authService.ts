import api from "./api";
import type { ApiResponse } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "citizen" | "admin" | "ngo" | "validator";
}

interface AuthResult {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = "vishwas_token";
const USER_KEY = "vishwas_user";

export const authService = {
  async signup(data: { name: string; email: string; phone?: string; password: string }) {
    const res = (await api.post("/auth/signup", data)) as ApiResponse<AuthResult>;
    this.persistAuth(res.data);
    return res.data;
  },

  async login(email: string, password: string) {
    const res = (await api.post("/auth/login", { email, password })) as ApiResponse<AuthResult>;
    this.persistAuth(res.data);
    return res.data;
  },

  async adminLogin(email: string, password: string) {
    const res = (await api.post("/auth/admin-login", { email, password })) as ApiResponse<AuthResult>;
    this.persistAuth(res.data);
    return res.data;
  },

  logout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isAdmin(): boolean {
    return this.getUser()?.role === "admin";
  },

  persistAuth(result: AuthResult) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  },
};
