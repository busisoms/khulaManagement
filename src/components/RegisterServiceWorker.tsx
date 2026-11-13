"use client";

import { useEffect } from "react";

// Registers the app-shell cache (public/sw.js) in production builds only.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
