import { useEffect, useState } from "react";

/**
 * Tracks live network availability. Starts from `navigator.onLine` and
 * updates on the browser's `online` / `offline` events, so anything that
 * renders it re-renders when the connection comes or goes.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
