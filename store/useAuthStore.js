// store/useAuthStore.js

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      isHydrated: false,
      login: (token) => {
        console.log("Setting token:", token);
        set({ token });
      },
      logout: () => {
        console.log("Logging out");
        set({ token: null });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      get user() {
        const { token } = get();
        if (!token) {
          console.log("No token found");
          return null;
        }
        console.log("Token to decode:", token);
        try {
          const decoded = jwtDecode(token);
          console.log("Decoded token:", decoded);
          return decoded;
        } catch (err) {
          console.error("Failed to decode token:", err);
          return null;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          console.log("Auth store rehydrated");
        }
      },
    }
  )
);

export default useAuthStore;
