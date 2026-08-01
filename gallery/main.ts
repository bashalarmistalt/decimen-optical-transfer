import { LOGO_SVG, icon } from "../shared/icons";
import { loadEntries } from "../shared/gallery";
import { fsReader, makeOpen, renderCards } from "../shared/gallery-ui";
import { installErrorGuard } from "../shared/errorguard";

const KEYS = { received: "decimen.rx.v1", sent: "decimen.tx.v1" } as const;
type Scope = keyof typeof KEYS;

installErrorGuard();
const main = document.querySelector(".gallery-main")!;
document.getElementById("logo")!.innerHTML = LOGO_SVG;
for (const el of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  el.innerHTML = icon(el.dataset.icon!);
}

const panes: Record<Scope, { cards: HTMLElement; empty: HTMLElement }> = {
  received: buildPane("received"),
  sent: buildPane("sent"),
};
document.getElementById("cards")!.remove();
document.getElementById("empty")!.remove();

function buildPane(scope: Scope): { cards: HTMLElement; empty: HTMLElement } {
  const wrap = document.createElement("div");
  wrap.className = "gallery-pane";
  wrap.dataset.scope = scope;
  const cards = document.createElement("div");
  cards.className = "cards";
  const empty = document.createElement("p");
  empty.className = "empty hint";
  empty.textContent = scope === "received" ? "Nothing received on this device yet." : "Nothing streamed from this device yet.";
  wrap.append(cards, empty);
  main.append(wrap);
  return { cards, empty };
}

let scope: Scope = location.hash === "#sent" ? "sent" : "received";

function render(s: Scope): void {
  const { cards, empty } = panes[s];
  renderCards(cards, empty, localStorage, KEYS[s], loadEntries(localStorage, KEYS[s]), s === "received", () => render(s), s === "received" ? makeOpen(fsReader()) : undefined);
}

function show(s: Scope): void {
  scope = s;
  for (const key of Object.keys(panes) as Scope[]) {
    (main.querySelector(`.gallery-pane[data-scope="${key}"]`) as HTMLElement).hidden = key !== s;
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>(".seg-btn")) {
    b.classList.toggle("active", b.dataset.scope === s);
  }
  render(s);
}

for (const btn of document.querySelectorAll<HTMLButtonElement>(".seg-btn")) {
  btn.addEventListener("click", () => {
    if (btn.dataset.scope !== scope) show(btn.dataset.scope as Scope);
  });
}

render("received");
render("sent");
show(scope);
