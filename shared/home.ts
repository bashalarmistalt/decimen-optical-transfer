import QRCode from "qrcode";
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}


function initQrShare(): void {
  const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
  const shareBtn = document.getElementById("share-btn") as HTMLButtonElement | null;
  if (!canvas || !shareBtn) return;

  const shareUrl = canvas.getAttribute("data-share-url") ?? "";
  if (!shareUrl) return;

  try {
    QRCode.toCanvas(canvas, shareUrl, {
      margin: 2,
      width: 124,
      color: { dark: "#070a11", light: "#ffffff" },
    });
  } catch (err) {
    console.warn("Failed to render share QR code:", err);
  }
  let resetTimer: number | undefined;
  const originalHTML = shareBtn.innerHTML;

  shareBtn.addEventListener("click", () => {
    const url = shareBtn.getAttribute("data-share-url") ?? shareUrl;
    const title = "Decimen Optical Transfer";
    const text =
      "Send files or text between devices with light. No network required.";

    try {
      if (typeof navigator.share === "function") {
        void navigator.share({ title, text, url }).catch((err) => {
          console.warn("Share failed:", err);
        });
        return;
      }
    } catch (err) {
      console.warn("navigator.share error:", err);
    }

    try {
      void navigator.clipboard
        .writeText(url)
        .then(() => {
          shareBtn.textContent = "Link copied!";
          window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            shareBtn.innerHTML = originalHTML;
            resetTimer = undefined;
          }, 2000);
        })
        .catch((err) => {
          console.warn("Clipboard write failed:", err);
        });
    } catch (err) {
      console.warn("Fallback clipboard copy failed:", err);
    }
  });
}

function initPwaInstall(): void {
  const installBtn = document.getElementById("install-btn") as HTMLButtonElement | null;
  if (!installBtn) return;

  const nav = window.navigator;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in nav && nav.standalone === true);
  if (isStandalone) {
    installBtn.hidden = true;
    return;
  }

  let deferredPrompt: BeforeInstallPromptEvent | undefined;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
    deferredPrompt = undefined;
  });

  installBtn.addEventListener("click", () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = undefined;
    installBtn.disabled = true;

    void promptEvent
      .prompt()
      .then(() => promptEvent.userChoice)
      .then((choice) => {
        if (choice.outcome === "accepted") {
          installBtn.hidden = true;
        } else {
          installBtn.disabled = false;
          deferredPrompt = promptEvent;
        }
      })
      .catch((err) => {
        console.warn("PWA install prompt error:", err);
        installBtn.disabled = false;
      });
  });
}

function initHome(): void {
  initQrShare();
  initPwaInstall();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHome);
} else {
  initHome();
}
