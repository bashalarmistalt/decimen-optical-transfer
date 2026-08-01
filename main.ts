import { createSenderController } from "./send/main";
import { createReceiverController, type ReceiveMode } from "./receive/main";

type AppMode = "send" | ReceiveMode;

const sender = createSenderController();
const receiver = createReceiverController();
const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-mode]")];
const sendPanel = document.getElementById("send-panel")!;
const receivePanel = document.getElementById("receive-panel")!;

let mode: AppMode = "send";

function selectMode(next: AppMode): void {
  if (next === mode && ((next === "send" && !sendPanel.hidden) || !receivePanel.hidden)) return;

  sender.setActive(next === "send");
  receiver.setMode(next === "send" ? null : next);
  sendPanel.hidden = next !== "send";
  receivePanel.hidden = next === "send";

  for (const button of buttons) {
    const active = button.dataset.mode === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  mode = next;
  history.replaceState(null, "", `#${next}`);
}

for (const button of buttons) {
  button.addEventListener("click", () => selectMode(button.dataset.mode as AppMode));
}

sender.setActive(true);
const requestedMode = location.hash.slice(1);
if (requestedMode === "receive" || requestedMode === "duel") selectMode(requestedMode);
