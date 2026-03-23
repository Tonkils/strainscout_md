// Stub auth hook (replaces Manus OAuth)
// For now, returns a guest user. Replace with real auth later.

import { useState } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  openId: string;
}

export function useAuth() {
  const [user] = useState<User | null>(null);
  const [isLoading] = useState(false);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login: () => {
      window.location.href = "/account";
    },
    logout: () => {
      // Clear session
      window.location.href = "/";
    },
  };
}
