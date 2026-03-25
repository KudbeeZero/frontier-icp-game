import { AuthClient } from "@dfinity/auth-client";
import { useCallback, useState } from "react";
import { useGameStore } from "../store/gameStore";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<string | null>(null);
  const setAuth = useGameStore((s) => s.setAuth);

  const login = useCallback(async () => {
    const client = await AuthClient.create();
    await client.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: () => {
        const identity = client.getIdentity();
        const p = identity.getPrincipal().toString();
        setPrincipal(p);
        setIsAuthenticated(true);
        setAuth(p);
      },
    });
  }, [setAuth]);

  const logout = useCallback(async () => {
    const client = await AuthClient.create();
    await client.logout();
    setPrincipal(null);
    setIsAuthenticated(false);
    setAuth(null);
  }, [setAuth]);

  return { login, logout, isAuthenticated, principal };
}
