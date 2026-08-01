export function installErrorGuard(): void {
  let box: HTMLElement | null = null;
  const show = (msg: string): void => {
    if (!msg) return;
    if (!box) {
      box = document.createElement("div");
      box.className = "err-overlay glass";
      const close = document.createElement("button");
      close.className = "err-close";
      close.textContent = "\u00d7";
      close.onclick = () => {
        box?.remove();
        box = null;
      };
      const body = document.createElement("pre");
      body.className = "err-body";
      box.append(close, body);
      document.body.append(box);
    }
    const body = box.querySelector(".err-body")!;
    body.textContent = `${body.textContent ? body.textContent + "\n" : ""}${msg}`.slice(-2000);
  };
  window.addEventListener("error", (e) => show(e.message || "script error"));
  window.addEventListener("unhandledrejection", (e) => {
    const r: unknown = e.reason;
    show(r instanceof Error ? r.message : String(r));
  });
}
