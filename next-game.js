 

// Display the redesigned next-game block.
(() => {
  const find = (id) => document.getElementById(id);

  if (!find("hero-matchup")) return;

  const logos = new Map([
    ["Berkut Praha", "Berkut_logo_black.png"],
  ]);

  let calendarGame = null;
  let calendarStart = null;

  function setText(id, value) {
    const element = find(id);

    if (element.textContent !== value) {
      element.textContent = value;
    }
  }

  function setTeam(side, name) {
    setText(`hero-${side}-name`, name);

    const image = find(`hero-${side}-logo`);
    const fallback = find(`hero-${side}-fallback`);

    fallback.textContent = name
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("");

    const url = logos.get(name);

    if (!url) {
      image.hidden = true;
      fallback.hidden = false;
      return;
    }

    if (image.getAttribute("src") === url) return;

    image.hidden = true;
    fallback.hidden = false;

    image.onload = () => {
      image.hidden = false;
      fallback.hidden = true;
    };

    image.onerror = () => {
      image.hidden = true;
      fallback.hidden = false;
    };

    image.src = url;
  }


  let forms = Object.create(null);
  let formState = "loading";
  let formRequest = false;
  const formViews = new Map();
  const resultNames = { V: "Výhra", R: "Remíza", P: "Prohra" };

  function formView(side) {
    if (formViews.has(side)) return formViews.get(side);
    const name = find(`hero-${side}-name`);
    if (!name) return null;
    const container = document.createElement("div");
    container.className = "team-form";
    const row = document.createElement("div");
    row.className = "team-form-badges";
    row.setAttribute("role", "group");
    const caption = document.createElement("div");
    caption.className = "team-form-caption";
    const detail = document.createElement("div");
    detail.id = `hero-${side}-form-detail`;
    detail.className = "team-form-detail";
    detail.hidden = true;
    container.append(row, caption, detail);
    name.insertAdjacentElement("afterend", container);
    const view = { container, row, caption, detail, signature: "" };
    formViews.set(side, view);
    return view;
  }

  function renderForm(side, team) {
    const view = formView(side);
    if (!view) return;
    const games = Array.isArray(forms[team]) ? forms[team].slice(-5) : [];
    const signature = JSON.stringify([team, formState, games]);
    if (view.signature === signature) return;
    view.signature = signature;
    view.row.replaceChildren();
    view.detail.hidden = true;
    view.row.setAttribute("aria-label", `${team}: poslední výsledky, nejnovější vpravo`);
    view.caption.textContent = games.length
      ? "Nejnovější vpravo"
      : formState === "loading" ? "Načítání formy…"
      : formState === "error" ? "Forma není dostupná" : "Zatím bez výsledků";
    for (let i = games.length; i < 5; i++) {
      const empty = document.createElement("span");
      empty.className = "team-form-badge team-form-empty";
      empty.textContent = "·";
      empty.setAttribute("aria-hidden", "true");
      view.row.append(empty);
    }
    for (const game of games) {
      if (!resultNames[game.result]) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `team-form-badge team-form-${game.result.toLowerCase()}`;
      button.textContent = game.result;
      const parts = String(game.date ?? "").slice(0, 10).split("-");
      const date = parts.length === 3 ? `${Number(parts[2])}.${Number(parts[1])}.${parts[0]}` : "";
      const description = `${date} · ${game.homeTeam} ${game.homeGoals}:${game.awayGoals} ${game.awayTeam} · ${resultNames[game.result]}`;
      button.setAttribute("aria-label", description);
      button.setAttribute("aria-controls", view.detail.id);
      button.setAttribute("aria-expanded", "false");
      button.title = description;
      function close() {
        button.setAttribute("aria-expanded", "false");
        if (view.detail.textContent === description) view.detail.hidden = true;
      }
      button.addEventListener("click", () => {
        const wasOpen = button.getAttribute("aria-expanded") === "true";
        view.row.querySelectorAll("button").forEach(item => item.setAttribute("aria-expanded", "false"));
        button.setAttribute("aria-expanded", String(!wasOpen));
        view.detail.textContent = description;
        view.detail.hidden = wasOpen;
      });
      button.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
      button.addEventListener("blur", close);
      view.row.append(button);
    }
  }

  async function loadForms() {
    if (formRequest) return;
    formRequest = true;
    try {
      const response = await fetch("https://berkut-games.jevg-pika.workers.dev/form", {
        signal: AbortSignal.timeout(15000), cache: "no-cache",
      });
      if (!response.ok) throw new Error("Form unavailable.");
      const data = await response.json();
      if (!data.forms || typeof data.forms !== "object" || Array.isArray(data.forms)) {
        throw new Error("Unexpected form response.");
      }
      forms = data.forms;
      formState = "ready";
    } catch (error) {
      // Preserve the last successful results during a temporary connection failure.
      if (formState !== "ready") formState = "error";
    } finally {
      formRequest = false;
      renderHero();
    }
  }

  function renderHero() {
    const game =
      typeof nextGame !== "undefined" ? nextGame : null;

    const start = game ? getGameTimestamp(game) : NaN;
    const ready = Boolean(game && Number.isFinite(start));

    find("hero-matchup").hidden = !ready;
    find("hero-countdown").hidden = !ready;
    find("hero-calendar").hidden = !ready;
    find("hero-message").hidden = ready;

    calendarGame = ready ? game : null;
    calendarStart = ready ? start : null;

    if (!ready) {
      setText(
        "hero-message",
        find("next-opponent").textContent
      );
      return;
    }

    setTeam("home", game.homeTeam || "Domácí tým");
    setTeam("away", game.awayTeam || "Hostující tým");
    renderForm("home", game.homeTeam || "Domácí tým");
    renderForm("away", game.awayTeam || "Hostující tým");

    const total = Math.max(
      0,
      Math.floor((start - Date.now()) / 1000)
    );

    const values = [
      Math.floor(total / 86400),
      Math.floor((total % 86400) / 3600),
      Math.floor((total % 3600) / 60),
      total % 60,
    ];

    ["days", "hours", "minutes", "seconds"].forEach(
      (unit, index) => {
        setText(
          `hero-${unit}`,
          String(values[index]).padStart(2, "0")
        );
      }
    );
  }

  // PHM's standings also contain team logos.
  async function loadLogos() {
    try {
      const response = await fetch(
        "https://berkut-games.jevg-pika.workers.dev/standings"
      );

      if (!response.ok) {
        throw new Error("Team logos unavailable.");
      }

      const data = await response.json();

      if (!Array.isArray(data.standings)) return;

      for (const team of data.standings) {
        const name = team["Team Name"];

        if (name === "Berkut Praha" || !team.TeamLogo) {
          continue;
        }

        const url = team.TeamLogo.replace(
          "[size]",
          "cropped_md"
        );

        if (new URL(url).protocol === "https:") {
          logos.set(name, url);
        }
      }

      renderHero();
    } catch (error) {
      console.info(
        "Using team initials where a logo is unavailable."
      );
    }
  }

  function calendarText(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function calendarDate(timestamp) {
    return new Date(timestamp)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  find("hero-calendar").addEventListener("click", () => {
    if (!calendarGame || calendarStart === null) return;

    const game = calendarGame;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Berkut Praha//Games//CS",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",

      `UID:${calendarText(game.id || calendarStart)}@berkut-praha.jevg-pika.workers.dev`,
      `DTSTAMP:${calendarDate(Date.now())}`,
      `DTSTART:${calendarDate(calendarStart)}`,
      `DTEND:${calendarDate(calendarStart + 2 * 60 * 60 * 1000)}`,

      `SUMMARY:${calendarText(`${game.homeTeam} vs. ${game.awayTeam}`)}`,
      `LOCATION:${calendarText(game.venue)}`,

      `DESCRIPTION:${calendarText(
        "PHM Cup. Předpokládaná délka: 2 hodiny. Aktuální termín ověř na webu Berkut Praha."
      )}`,

      "URL:https://berkut-praha.jevg-pika.workers.dev/",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ];

    const blob = new Blob(
      [lines.join("\r\n")],
      { type: "text/calendar;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `berkut-${game.date}.ics`;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  // React to updates from the existing script.js.
  const observer = new MutationObserver(renderHero);

  for (const id of [
    "countdown",
    "next-opponent",
    "data-status",
  ]) {
    if (!find(id)) continue;
    observer.observe(find(id), {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  renderHero();
  loadLogos();
  loadForms();
  setInterval(loadForms, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadForms();
  });
})();
