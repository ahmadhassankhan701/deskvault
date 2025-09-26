
"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A simple mock for auth state persistence
const checkInitialAuth = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem("isAuthenticated") === "true";
    }
    return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(checkInitialAuth());
  const router = useRouter();

  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(isAuth);
  }, []);

  const login = async (email: string, pass: string) => {
    return new Promise<void>((resolve, reject) => {
        // Mock API call
        setTimeout(() => {
            if (email === "admin@deskvault.com" && pass === "password123") {
                localStorage.setItem("isAuthenticated", "true");
                setIsAuthenticated(true);
                resolve();
            } else {
                reject(new Error("Invalid email or password"));
            }
        }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
