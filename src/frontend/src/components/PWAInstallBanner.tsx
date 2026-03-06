import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed previously (within last 7 days)
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(20,20,20,0.97)",
        border: "1px solid rgba(255,215,0,0.5)",
        borderRadius: 10,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
        maxWidth: 420,
        width: "90vw",
      }}
    >
      <span style={{ fontSize: 22 }}>📲</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#ffd700", fontWeight: 700, fontSize: 13 }}>
          Install for Offline Use
        </div>
        <div style={{ color: "#ccc", fontSize: 11, marginTop: 2 }}>
          Install this app on your device to use without internet
        </div>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        style={{
          background: "#ffd700",
          color: "#000",
          border: "none",
          borderRadius: 6,
          padding: "5px 12px",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          background: "transparent",
          color: "#888",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 2,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
