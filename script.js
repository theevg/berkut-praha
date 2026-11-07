const API_URL = "https://berkut-games.jevg-pika.workers.dev/";
const BERKUT_TEAM_ID = "BAED154A-5E0F-4C57-BD3E-9A4D02FE7072";

// Next-game card.
const statusMessage = document.querySelector("#data-status");
const opponent = document.querySelector("#next-opponent");
const dateElement = document.querySelector("#next-date");
const timeElement = document.querySelector("#next-time");
const venueElement = document.querySelector("#next-venue");
const countdown = document.querySelector("#countdown");
const arenaMap = document.querySelector("#arena-map");

// Match cards and full schedule.
const gameList = document.querySelector("#game-list");
const futureButton = document.querySelector("#show-future");
const pastButton = document.querySelector("#show-past");
const matchHighlights = document.querySelector("#match-highlights");
const fullSchedule = document.querySelector("#full-schedule");
const toggleGamesButton = document.querySelector("#toggle-games");

// League standings.
const standingsStatus = document.querySelector("#standings-status");
const standingsBody = document.querySelector("#standings-body");

// Team/player table controls.
const teamsButton = document.querySelector("#show-teams");
const playersButton = document.querySelector("#show-players");
const teamsPanel = document.querySelector("#teams-panel");
const playersPanel = document.querySelector("#players-panel");

// Player statistics.
const playersFilter = document.querySelector("#players-filter");
const playersStatus = document.querySelector("#players-status");
const playersBody = document.querySelector("#players-body");
const morePlayersButton = document.querySelector("#more-players");
const playerPositionHeading =
  document.querySelector("#player-position-heading");

// Page state.
let games = [];
let nextGame = null;
let scheduleView = "future";
let standingsLoaded = false;
let playerStats = [];
let playersLoaded = false;
let showAllPlayers = false;

// Convert the game's Prague date and time into a timestamp.
function getGameTimestamp(game) {
  if (!game.date || !game.time) return NaN;

  const time = game.time.slice(0, 8);
  const reference = new Date(`${game.date}T12:00:00Z`);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    timeZoneName: "longOffset",
  }).formatToParts(reference);

  const zone = parts.find(
    (part) => part.type === "timeZoneName"
  ).value;

  const offset = zone === "GMT"
    ? "+00:00"
    : zone.replace("GMT", "");

  return Date.parse(`${game.date}T${time}${offset}`);
}

// Find the earliest upcoming game and display its details.
function updateNextGame() {
  const now = Date.now();

  nextGame = games
    .filter((game) =>
      game.status === "NOT PLAYED" &&
      getGameTimestamp(game) > now
    )
    .sort((a, b) =>
      getGameTimestamp(a) - getGameTimestamp(b)
    )[0] ?? null;

  if (!nextGame) {
    arenaMap.hidden = true;

    opponent.textContent =
      "Žádný další zápas s potvrzeným termínem.";

    dateElement.textContent = "Bude doplněno";
    dateElement.removeAttribute("datetime");
    timeElement.textContent = "Bude doplněno";
    venueElement.textContent = "Bude doplněno";
    countdown.textContent = "";
    return;
  }

  opponent.textContent =
    `${nextGame.homeTeam} vs. ${nextGame.awayTeam}`;

  const [year, month, day] = nextGame.date.split("-");

  dateElement.textContent = `${day}.${month}.${year}`;
  dateElement.dateTime =
    new Date(getGameTimestamp(nextGame)).toISOString();

  timeElement.textContent = nextGame.time.slice(0, 5);
  venueElement.textContent = nextGame.venue || "Bude doplněno";

  if (nextGame.venue) {
    const query = encodeURIComponent(`${nextGame.venue}, Praha`);

    arenaMap.href =
      `https://www.google.com/maps/search/?api=1&query=${query}`;

    arenaMap.hidden = false;
  } else {
    arenaMap.hidden = true;
    arenaMap.removeAttribute("href");
  }

  updateCountdown();
}

// Update the countdown every second.
function updateCountdown() {
  if (!nextGame) return;

  const remaining = getGameTimestamp(nextGame) - Date.now();

  if (remaining <= 0) {
    updateNextGame();
    renderSchedule();
    return;
  }

  const totalSeconds = Math.floor(remaining / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  countdown.textContent =
    `Do zápasu: ${days}\u00A0d · ${hours}\u00A0h · ${minutes}\u00A0min · ${seconds}\u00A0s`;
}

// Show the last completed game and the next two scheduled games.
function renderMatchHighlights() {
  const now = Date.now();

  const lastGame = games
    .filter((game) =>
      game.status === "FINISHED" && game.date
    )
    .sort((a, b) =>
      `${b.date}T${b.time || ""}`.localeCompare(
        `${a.date}T${a.time || ""}`
      )
    )[0];

  const upcoming = games
    .filter((game) =>
      game.status === "NOT PLAYED" &&
      getGameTimestamp(game) > now
    )
    .sort((a, b) =>
      getGameTimestamp(a) - getGameTimestamp(b)
    )
    .slice(0, 2);

  matchHighlights.replaceChildren(
    createMatchCard(lastGame, "Poslední zápas", true),
    createMatchCard(upcoming[0], "Příští zápas", false),
    createMatchCard(upcoming[1], "Následující zápas", false)
  );
}

// Build one match card.
function createMatchCard(game, label, completed) {
  const card = document.createElement("article");

  card.className =
    "match-card" + (completed ? " match-card-result" : "");

  const title = document.createElement("h3");
  title.className = "match-card-label";
  title.textContent = label;
  card.append(title);

  if (!game) {
    const empty = document.createElement("p");

    empty.textContent = completed
      ? "Zatím žádný dokončený zápas."
      : "Další termín bude doplněn.";

    card.append(empty);
    return card;
  }

  const date = document.createElement("p");
  date.className = "match-card-date";

  const [year, month, day] = game.date.split("-");
  const faceoff = game.time
    ? game.time.slice(0, 5)
    : "Čas bude doplněn";

  date.textContent = `${day}.${month}.${year} · ${faceoff}`;
  card.append(date);

  const teams = document.createElement("div");
  teams.className = "match-card-teams";

  for (const name of [game.homeTeam, game.awayTeam]) {
    const team = document.createElement("p");
    team.textContent = name || "Soupeř bude doplněn";

    if (name === "Berkut Praha") {
      team.className = "match-card-berkut";
    }

    teams.append(team);
  }

  card.append(teams);

  if (completed) {
    const score = document.createElement("p");
    score.className = "match-card-score";

    score.textContent =
      `${game.homeGoals ?? "?"} : ${game.awayGoals ?? "?"}`;

    score.setAttribute(
      "aria-label",
      `Výsledek: ${score.textContent}`
    );

    card.append(score);
  }

  const venue = document.createElement("p");
  venue.className = "match-card-venue";
  venue.textContent = game.venue || "Stadion bude doplněn";
  card.append(venue);

  if (game.id) {
    const detail = document.createElement("a");
    detail.className = "match-card-link";
    detail.textContent = "Detail zápasu ↗";

    detail.href =
      `https://prod.hms.wootera.net/embed/game?gameId=${encodeURIComponent(game.id)}&lang=cs`;

    detail.target = "_blank";
    detail.rel = "noopener noreferrer";

    card.append(detail);
  }

  return card;
}

// Display the full upcoming or previous schedule.
function renderSchedule() {
  const now = Date.now();

  const selectedGames = games
    .filter((game) => {
      const timestamp = getGameTimestamp(game);

      if (!Number.isFinite(timestamp)) return false;

      return scheduleView === "future"
        ? timestamp > now && game.status === "NOT PLAYED"
        : timestamp <= now;
    })
    .sort((a, b) => {
      const difference =
        getGameTimestamp(a) - getGameTimestamp(b);

      return scheduleView === "future"
        ? difference
        : -difference;
    });

  futureButton.setAttribute(
    "aria-pressed",
    String(scheduleView === "future")
  );

  pastButton.setAttribute(
    "aria-pressed",
    String(scheduleView === "past")
  );

  renderMatchHighlights();
  gameList.replaceChildren();

  if (selectedGames.length === 0) {
    gameList.textContent = "Žádné zápasy k zobrazení.";
    return;
  }

  for (const game of selectedGames) {
    const row = document.createElement("article");
    row.className = "game-row";

    const heading = document.createElement("h3");

    heading.textContent =
      `${game.homeTeam} vs. ${game.awayTeam}`;

    const details = document.createElement("p");
    const [year, month, day] = game.date.split("-");

    details.textContent =
      `${day}.${month}.${year} · ${game.time.slice(0, 5)}` +
      ` · ${game.venue || "Stadion bude doplněn"}`;

    row.append(heading, details);

    if (game.status === "FINISHED") {
      const score = document.createElement("p");

      score.textContent =
        `Výsledek: ${game.homeGoals} : ${game.awayGoals}`;

      row.append(score);
    }

    gameList.append(row);
  }
}

// Load games from your Cloudflare Worker.
async function loadGames() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Could not load games.");
    }

    const data = await response.json();

    if (!Array.isArray(data.games)) {
      throw new Error("Unexpected data format.");
    }

    games = data.games;

    updateNextGame();
    renderSchedule();

    statusMessage.textContent =
      document.getElementById("data-status").textContent = "";
  } catch (error) {
    statusMessage.textContent = games.length
      ? "Aktualizace selhala. Zobrazeny jsou poslední načtené údaje."
      : "Data z PHM se nepodařilo načíst.";

    if (!games.length) {
      opponent.textContent =
        "Údaje o zápasu nejsou dostupné.";

      dateElement.textContent = "";
      timeElement.textContent = "";
      venueElement.textContent = "";
      countdown.textContent = "";
      arenaMap.hidden = true;

      gameList.textContent =
        "Rozpis se nepodařilo načíst. Obnov stránku a zkus to znovu.";

      matchHighlights.textContent =
        "Zápasy se nepodařilo načíst. Zkus obnovit stránku.";
    }

    console.error(error);
  }
}

// Load league standings.
async function loadStandings() {
  try {
    const response = await fetch(
      `${API_URL}standings`
    );

    if (!response.ok) {
      throw new Error("Could not load standings.");
    }

    const data = await response.json();

    if (!Array.isArray(data.standings)) {
      throw new Error("Unexpected standings format.");
    }

    // Teams tied on points retain their source order.
    const teams = [...data.standings].sort(
      (a, b) =>
        Number(b["Total Points"]) - Number(a["Total Points"])
    );

    const rows = document.createDocumentFragment();

    for (const team of teams) {
      const row = document.createElement("tr");

      if (team.TeamId === BERKUT_TEAM_ID) {
        row.className = "berkut-row";
      }

      const values = [
        team["Team Name"],
        team["Total Games"],
        team.Wins,
        team.Draws,
        team.Losses,
        team.Score,
        team["Total Points"],
      ];

      for (const [index, value] of values.entries()) {
        const cell = document.createElement(
          index === 0 ? "th" : "td"
        );

        if (index === 0) {
          cell.scope = "row";
        }

        cell.textContent = value ?? "–";
        row.append(cell);
      }

      rows.append(row);
    }

    standingsBody.replaceChildren(rows);
    standingsLoaded = true;

    standingsStatus.textContent = teams.length
      ? "Zdroj: PHM Cup"
      : "Tabulka zatím neobsahuje žádné týmy.";
  } catch (error) {
    standingsStatus.textContent = standingsLoaded
      ? "Aktualizace selhala. Zobrazena je poslední načtená tabulka."
      : "Tabulku se nepodařilo načíst. Zkus obnovit stránku.";

    console.error(error);
  }
}

// Match names even if accents or extra spaces differ.
function normalizePlayerName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Confirmed Berkut roster positions.
const rosterPositions = new Map();

const positionGroups = {
  "Brankář": [
    "Maxim Kalyayev",
    "Štěpán Švehlák",
    "Rasim Muftiev",
  ],
  "Obránce": [
    "Daniel Pechr",
    "Jevgenij Pika",
    "Pavel Malyšev",
    "Alexander Avdienko",
    "Danila Hons",
    "Antonín Janků",
    "Václav Hes",
    "Alexander Vorobjev",
  ],
  "Útočník": [
    "Jan Vrba",
    "Alexey Sidorov",
    "Marek Pechr",
    "Matěj Kuracina",
    "Viktor Kasanda",
    "Daniel Bespalchenko",
    "Artyom Arkhipov",
    "Daniel Vlček",
    "Lev Samsonov",
    "Mansur Ischoev",
    "Denis Zverev",
    "Igor Vaishle",
    "Tomáš Novák",
    "Ivan Dunchanka",
    "Alexei Zaharenkov",
  ],
};

for (const [position, names] of Object.entries(positionGroups)) {
  for (const name of names) {
    rosterPositions.set(normalizePlayerName(name), position);
  }
}

// Switch between team standings and player statistics.
function switchTable(view) {
  const showTeams = view === "teams";

  teamsPanel.hidden = !showTeams;
  playersPanel.hidden = showTeams;

  teamsButton.setAttribute(
    "aria-pressed",
    String(showTeams)
  );

  playersButton.setAttribute(
    "aria-pressed",
    String(!showTeams)
  );
}

// Display league or Berkut player statistics.
function renderPlayers() {
  const berkutOnly = playersFilter.value === "berkut";
  playerPositionHeading.hidden = !berkutOnly;

  const filteredPlayers = playerStats
    .filter((player) =>
      playersFilter.value === "league" ||
      player.teamId === BERKUT_TEAM_ID
    )
    .sort((a, b) =>
      Number(b.points ?? 0) - Number(a.points ?? 0) ||
      Number(b.goals ?? 0) - Number(a.goals ?? 0) ||
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "cs"
      )
    );

  const canExpand =
    playersFilter.value === "league" &&
    filteredPlayers.length > 10;

  const visiblePlayers = canExpand && !showAllPlayers
    ? filteredPlayers.slice(0, 10)
    : filteredPlayers;

  morePlayersButton.hidden = !canExpand;

  morePlayersButton.setAttribute(
    "aria-expanded",
    String(canExpand && showAllPlayers)
  );

  morePlayersButton.textContent = showAllPlayers
    ? "Zobrazit pouze 10 hráčů"
    : `Zobrazit všechny hráče (${filteredPlayers.length})`;

  playersBody.replaceChildren();

  for (const player of visiblePlayers) {
    const row = document.createElement("tr");

    if (player.teamId === BERKUT_TEAM_ID) {
      row.className = "berkut-row";
    }

    const fullName =
      `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

    const values = [
      fullName,
      player.team,
    ];

    if (berkutOnly) {
      const position = rosterPositions.get(
        normalizePlayerName(fullName)
      );

      values.push(position ?? "Neuvedeno");
    }

    values.push(
      player.games,
      player.goals,
      player.assists,
      player.points
    );

    for (const [index, value] of values.entries()) {
      const cell = document.createElement(
        index === 0 ? "th" : "td"
      );

      if (index === 0) {
        cell.scope = "row";
      }

      cell.textContent = value ?? "–";
      row.append(cell);
    }

    playersBody.append(row);
  }

  playersStatus.textContent = filteredPlayers.length
    ? `Zdroj: PHM Cup · Počet hráčů: ${filteredPlayers.length}`
    : "Žádní hráči k zobrazení.";
}

// Load player statistics.
async function loadPlayers() {
  try {
    const response = await fetch(
      `${API_URL}players`
    );

    if (!response.ok) {
      throw new Error("Could not load player statistics.");
    }

    const data = await response.json();

    if (!Array.isArray(data.players)) {
      throw new Error("Unexpected player statistics format.");
    }

    playerStats = data.players;
    playersLoaded = true;
    renderPlayers();
  } catch (error) {
    playersStatus.textContent = playersLoaded
      ? "Aktualizace selhala. Zobrazeny jsou poslední načtené údaje."
      : "Statistiky hráčů se nepodařilo načíst.";

    console.error(error);
  }
}

// Full-schedule controls.
futureButton.addEventListener("click", () => {
  scheduleView = "future";
  renderSchedule();
});

pastButton.addEventListener("click", () => {
  scheduleView = "past";
  renderSchedule();
});

toggleGamesButton.addEventListener("click", () => {
  const expanded =
    toggleGamesButton.getAttribute("aria-expanded") !== "true";

  fullSchedule.hidden = !expanded;

  toggleGamesButton.setAttribute(
    "aria-expanded",
    String(expanded)
  );

  toggleGamesButton.textContent = expanded
    ? "Skrýt celý rozpis"
    : "Všechny zápasy";

  if (expanded) {
    renderSchedule();
  }
});

// Standings/player-table controls.
teamsButton.addEventListener("click", () => {
  switchTable("teams");
});

playersButton.addEventListener("click", () => {
  switchTable("players");
});

playersFilter.addEventListener("change", () => {
  showAllPlayers = false;

  if (playersLoaded) {
    renderPlayers();
  }
});

morePlayersButton.addEventListener("click", () => {
  showAllPlayers = !showAllPlayers;
  renderPlayers();
});

// Initial data loading.
loadGames();
loadStandings();
loadPlayers();

// Countdown updates every second.
setInterval(updateCountdown, 1000);

// Data refreshes every five minutes.
setInterval(loadGames, 5 * 60 * 1000);
setInterval(loadStandings, 5 * 60 * 1000);
setInterval(loadPlayers, 5 * 60 * 1000);