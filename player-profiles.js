(() => {
  "use strict";
  const dialog = document.querySelector("#player-profile");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const TEAM_ID = "BAED154A-5E0F-4C57-BD3E-9A4D02FE7072";
  const api = document.currentScript?.dataset.api || "https://berkut-games.jevg-pika.workers.dev/players";
  const cards = [];
  let playersById = new Map();
  let selected = null;
  let loadState = "loading";
  let pending = false;
  let receivedPhotos = false;
  const find = id => document.getElementById(id);

  function photoUrl(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value.replace("[size]", "cropped_md"));
      return url.protocol === "https:" && url.hostname === "prod-hms-wootera.s3.eu-central-1.amazonaws.com"
        ? url.href : null;
    } catch { return null; }
  }

  function paintPortrait(container, card, large = false) {
    const url = photoUrl(playersById.get(card.id)?.photo);
    const key = `${card.name}|${url || ""}`;
    if (container.dataset.portrait === key) return;
    container.dataset.portrait = key;
    const initials = document.createElement("span");
    initials.className = "player-initials";
    initials.textContent = card.name.split(/\s+/).map(word => word[0]).slice(0, 2).join("");
    initials.setAttribute("aria-hidden", "true");
    container.replaceChildren(initials);
    if (!url) return;
    const image = document.createElement("img");
    image.alt = large ? `Fotografie: ${card.name}` : "";
    image.width = 320;
    image.height = 360;
    image.loading = "eager";
    image.decoding = "async";
    image.hidden = true;
    image.addEventListener("load", () => { image.hidden = false; initials.hidden = true; }, { once: true });
    image.addEventListener("error", () => { image.remove(); initials.hidden = false; }, { once: true });
    container.append(image);
    image.src = url;
  }

  function stat(value) {
    if (value === null || value === undefined || String(value).trim() === "") return "–";
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? String(number) : "–";
  }

  function updateProfile() {
    if (!selected) return;
    const card = selected;
    const player = playersById.get(card.id);
    find("profile-name").textContent = card.name;
    find("profile-meta").textContent = [card.number === "#" ? "" : card.number, card.position, card.captain ? "Kapitán" : ""].filter(Boolean).join(" · ");
    paintPortrait(find("profile-portrait"), card, true);
    const goalie = card.position === "Brankář";
    find("profile-stats").hidden = goalie;
    dialog.querySelector(".profile-stats-title").textContent = goalie ? "Brankářské statistiky" : "Statistiky sezóny 2026/27";
    for (const key of ["games", "goals", "assists", "points"]) {
      find(`profile-${key}`).textContent = !goalie && player ? stat(player[key]) : "–";
    }
    find("profile-status").textContent = loadState === "loading" ? "Načítání dat z PHM…"
      : loadState === "error" ? "Statistiky PHM se nyní nepodařilo načíst. Zkus to později."
      : goalie ? "Tento zdroj PHM neposkytuje brankářské statistiky."
      : !player ? "Statistiky tohoto hráče zatím nejsou v PHM dostupné."
      : "Zdroj: PHM · Základní část · Aktualizace každých 5 minut.";
  }

  for (const li of document.querySelectorAll(".roster-grid > li")) {
    const number = li.querySelector(".player-number");
    const card = {
      id: li.dataset.playerId || "", name: li.dataset.playerName,
      number: number?.textContent.trim() || "#", position: li.dataset.position,
      captain: Boolean(li.querySelector(".captain-badge")),
    };
    if (!card.name) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-card-button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", dialog.id);
    button.setAttribute("aria-label", `Otevřít profil: ${card.name}`);
    const portrait = document.createElement("div");
    portrait.className = "player-card-portrait";
    const info = document.createElement("span");
    info.className = "player-card-info";
    info.append(...Array.from(li.childNodes));
    const action = document.createElement("span");
    action.className = "player-card-action";
    action.textContent = "Profil hráče ↗";
    action.setAttribute("aria-hidden", "true");
    info.append(action);
    button.append(portrait, info);
    li.append(button);
    li.classList.add("has-player-profile");
    card.portrait = portrait;
    paintPortrait(portrait, card);
    button.addEventListener("click", () => {
      selected = card;
      updateProfile();
      dialog.showModal();
      document.body.classList.add("player-profile-open");
    });
    cards.push(card);
  }

  dialog.querySelector(".profile-close").addEventListener("click", () => dialog.close());
  // Click outside the visible panel to close; native dialog handles Escape and focus trapping.
  let outsidePress = false;
  dialog.addEventListener("pointerdown", event => { outsidePress = event.target === dialog; });
  dialog.addEventListener("click", event => {
    if (outsidePress && event.target === dialog) dialog.close();
    outsidePress = false;
  });
  dialog.addEventListener("close", () => { document.body.classList.remove("player-profile-open"); selected = null; });

  async function refresh() {
    if (pending) return;
    pending = true;
    try {
      const response = await fetch(api, { signal: AbortSignal.timeout(15000), cache: "no-cache" });
      if (!response.ok) throw new Error("PHM unavailable");
      const data = await response.json();
      if (!Array.isArray(data.players)) throw new Error("Invalid PHM player data");
      const players = data.players.filter(player => player.teamId === TEAM_ID);
      playersById = new Map(players.map(player => [player.id, player]));
      receivedPhotos = players.some(player => Object.hasOwn(player, "photo"));
      loadState = "ready";
      for (const card of cards) paintPortrait(card.portrait, card);
      find("roster-status").textContent = receivedPhotos ? "" : "Fotografie budou dostupné po aktualizaci datového Workeru.";
    } catch {
      // Keep successfully loaded data if a later refresh fails.
      if (loadState !== "ready") {
        loadState = "error";
        find("roster-status").textContent = "Data PHM se nyní nepodařilo načíst. Profily můžeš otevřít i bez nich.";
      }
    } finally {
      pending = false;
      if (dialog.open) updateProfile();
    }
  }
  refresh();
  setInterval(refresh, 300000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
