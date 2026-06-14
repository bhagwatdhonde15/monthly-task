import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const update = () => {
      setAvailable(!!deferred);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(standalone);
    };
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return choice.outcome;
  };

  return { available, installed, promptInstall };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}
