/* Hup! — Spontane Uitjes
 * Pure React (in-browser Babel, classic runtime). Geen build-stap.
 * Offline-first PWA. Database geverifieerd (zie CHANGELOG); prijzen,
 * tijden en ratings zijn indicatief — check altijd de website.
 */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ---------------------------------------------------------------- consts */
const HARDENBERG = { name: "Hardenberg", lat: 52.5752, lng: 6.6177 };
const FAV_KEY = "hup.favorites.v1";
const PREFS_KEY = "hup.prefs.v2";
const SOUND_KEY = "hup.sound.v1";
const DONE_KEY = "hup.done.v1";
const WEATHER_KEY = "hup.weather.v1";
const SEEN_KEY = "hup.seen.v1";
const ROLLS_KEY = "hup.rolls.v1";

async function fetchWeather(lat, lng) {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_probability_max,weathercode,temperature_2m_max&timezone=auto&forecast_days=1`;
    const r = await fetch(u);
    if (!r.ok) throw new Error("weather");
    const d = await r.json();
    const prob = d.daily?.precipitation_probability_max?.[0] ?? 0;
    const code = d.daily?.weathercode?.[0] ?? 0;
    const tmax = d.daily?.temperature_2m_max?.[0];
    return { ok: true, rainy: prob >= 50 || code >= 51, prob, code, tmax };
  } catch {
    return { ok: false };
  }
}

const CAT = {
  natuur:    { label: "Natuur",     g: ["#34d399", "#0d9488"] },
  speeltuin: { label: "Speeltuin",  g: ["#fbbf24", "#f97316"] },
  dieren:    { label: "Dieren",     g: ["#fb923c", "#ef4444"] },
  museum:    { label: "Museum",     g: ["#818cf8", "#6366f1"] },
  binnenpret:{ label: "Binnenpret", g: ["#f472b6", "#db2777"] },
  water:     { label: "Water",      g: ["#38bdf8", "#0ea5e9"] },
  avontuur:  { label: "Avontuur",   g: ["#f87171", "#e11d48"] },
  eten:      { label: "Eten & drinken", g: ["#fcd34d", "#f59e0b"] },
  cultuur:   { label: "Cultuur",    g: ["#c084fc", "#7c3aed"] },
  wellness:  { label: "Wellness",   g: ["#2dd4bf", "#0e7490"] },
  uitgaan:   { label: "Uitgaan",    g: ["#e879f9", "#a21caf"] },
  bezienswaardigheid: { label: "Bezienswaardig", g: ["#fbbf24", "#b45309"] },
};

// Voor wie is een uitje? "Met wie?"-modus stuurt de suggesties.
const COMPANIES = [
  ["gezin",    "Gezin",     "users"],
  ["partner",  "Partner",   "heart"],
  ["vrienden", "Vrienden",  "party-popper"],
  ["senioren", "Opa & oma", "flower"],
  ["alleen",   "Alleen",    "user"],
];
const COMPANY_LABEL = Object.fromEntries(COMPANIES.map(([k, l]) => [k, l]));
// Welke gezelschappen passen bij een categorie (fallback als een uitje geen audience heeft).
const CATEGORY_AUDIENCE = {
  natuur: ["gezin", "partner", "vrienden", "senioren", "alleen"],
  water: ["gezin", "vrienden", "partner", "alleen"],
  dieren: ["gezin", "senioren", "partner", "vrienden"],
  speeltuin: ["gezin"],
  binnenpret: ["gezin", "vrienden"],
  avontuur: ["gezin", "partner", "vrienden", "alleen"],
  museum: ["gezin", "partner", "senioren", "alleen", "vrienden"],
  cultuur: ["partner", "vrienden", "senioren", "alleen", "gezin"],
  eten: ["gezin", "partner", "vrienden", "senioren", "alleen"],
  wellness: ["partner", "vrienden", "senioren", "alleen"],
  uitgaan: ["partner", "vrienden", "alleen", "gezin"],
  bezienswaardigheid: ["gezin", "partner", "senioren", "vrienden", "alleen"],
};
function audienceOf(a) { return a.audience || CATEGORY_AUDIENCE[a.category] || []; }

/* ---------------------------------------------------------------- helpers */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const euro = (n) => (n === 0 ? "Gratis" : "€" + n);
function priceTier(p) { return p === 0 ? "gratis" : p <= 10 ? "low" : p <= 25 ? "mid" : "high"; }

// Startlocaties die je kunt kiezen (naast 'Mijn locatie' via GPS).
const TOWNS = [
  { name: "Hardenberg", lat: 52.5752, lng: 6.6177 },
  { name: "Ommen", lat: 52.5183, lng: 6.4186 },
  { name: "Dalfsen", lat: 52.5100, lng: 6.2550 },
  { name: "Zwolle", lat: 52.5168, lng: 6.0830 },
  { name: "Kampen", lat: 52.5550, lng: 5.9110 },
  { name: "Steenwijk", lat: 52.7870, lng: 6.1190 },
  { name: "Meppel", lat: 52.6940, lng: 6.1970 },
  { name: "Raalte", lat: 52.3880, lng: 6.2760 },
  { name: "Deventer", lat: 52.2550, lng: 6.1600 },
  { name: "Nijverdal", lat: 52.3650, lng: 6.4640 },
  { name: "Rijssen", lat: 52.3060, lng: 6.5210 },
  { name: "Almelo", lat: 52.3570, lng: 6.6680 },
  { name: "Hengelo", lat: 52.2650, lng: 6.7930 },
  { name: "Enschede", lat: 52.2200, lng: 6.8900 },
  { name: "Oldenzaal", lat: 52.3130, lng: 6.9280 },
  { name: "Coevorden", lat: 52.6600, lng: 6.7400 },
  { name: "Emmen", lat: 52.7850, lng: 6.8970 },
];

// Seizoens-/openingsindicatie (indicatief). id → [startmaand, eindmaand, label].
// Alleen duidelijk seizoensgebonden uitjes; de rest is 'Hele jaar'.
const SEASON_OVERRIDE = {
  5: [4, 10, "Apr–okt"], 10: [4, 10, "Apr–okt"], 16: [4, 10, "Apr–okt"], 25: [3, 10, "Mrt–okt"],
  58: [4, 10, "Apr–okt"], 95: [4, 10, "Apr–okt"], 98: [4, 10, "Apr–okt"], 100: [4, 10, "Apr–okt"],
  7: [5, 9, "Mei–sep"], 34: [4, 10, "Apr–okt"],
  17: [5, 9, "Mei–sep"], 50: [5, 9, "Mei–sep"], 51: [5, 9, "Mei–sep"], 52: [5, 9, "Mei–sep"],
  54: [5, 9, "Mei–sep"], 56: [5, 9, "Mei–sep"], 86: [5, 9, "Mei–sep"],
  31: [7, 9, "Jul–sep"], 53: [7, 9, "Jul–sep"],
  30: [3, 10, "Mrt–okt"], 37: [3, 10, "Mrt–okt"], 62: [3, 10, "Mrt–okt"], 75: [3, 10, "Mrt–okt"],
  103: [3, 10, "Mrt–okt"], 108: [3, 10, "Mrt–okt"], 109: [3, 10, "Mrt–okt"],
};
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
function seasonInfo(a) {
  const o = SEASON_OVERRIDE[a.id];
  if (!o) return { label: "Hele jaar", open: true, seasonal: false };
  const m = new Date().getMonth() + 1;
  return { label: o[2], open: m >= o[0] && m <= o[1], seasonal: true };
}
function searchUrl(a) { return "https://www.google.com/search?q=" + encodeURIComponent(a.name + " " + a.plaats); }
function reviewsUrl(a) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a.name + " " + a.plaats); }
function mapEmbedUrl(a) { return "https://maps.google.com/maps?q=" + encodeURIComponent(a.name + " " + a.plaats) + "&output=embed"; }

const CONTACT = "markhultink@live.com";
function appUrl() { return location.origin + location.pathname; }
function activityLink(a) { return appUrl() + "?a=" + a.id; }
function shareActivity(a) {
  const url = activityLink(a);
  const text = `${a.emoji} ${a.name} in ${a.plaats} — ${euro(a.prijs)} · ${a.duur}. Zin om te gaan? 🎉 Gevonden met Hup!`;
  vibrate(10);
  if (navigator.share) { navigator.share({ title: "Hup! · " + a.name, text, url }).catch(() => {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(text + "\n" + url).then(() => alert("Link gekopieerd — plak 'm in een berichtje!")); }
  else { window.prompt("Kopieer de link:", url); }
}
function shareApp() {
  const url = appUrl();
  const text = "Geen inspiratie voor een uitje? Met Hup! tik je en krijg je meteen een passend uitje. 🎉";
  if (navigator.share) { navigator.share({ title: "Hup! — Spontane Uitjes", text, url }).catch(() => {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(text + "\n" + url).then(() => alert("Link gekopieerd!")); }
  else { window.prompt("Kopieer de link:", url); }
}
function shareFavorites(list) {
  if (!list.length) return;
  const lines = list.slice(0, 15).map((a) => `• ${a.emoji} ${a.name} (${a.plaats})`).join("\n");
  const text = "Mijn favoriete uitjes in Hup!:\n" + lines + "\n\nOntdek je eigen uitje 👉 " + appUrl();
  if (navigator.share) { navigator.share({ title: "Mijn Hup!-favorieten", text }).catch(() => {}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => alert("Lijst gekopieerd!")); }
  else { window.prompt("Kopieer de lijst:", text); }
}
function tipMail() {
  location.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent("Hup! — tip voor een uitje") +
    "&body=" + encodeURIComponent("Ik mis dit uitje in Hup!:\n\nNaam:\nPlaats:\nWaarom leuk:\nWebsite:\n");
}
function reportMail(a) {
  location.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent("Hup! — melding: " + a.name) +
    "&body=" + encodeURIComponent("Er klopt iets niet bij '" + a.name + "' (" + a.plaats + "):\n\n");
}
function calendarUrl(a) {
  const text = "Uitje: " + a.name;
  const details = (a.desc || "") + "\n\nMeer info: " + searchUrl(a) + "\nOpen in Hup!: " + activityLink(a);
  const loc = a.name + ", " + a.plaats;
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(text) +
    "&details=" + encodeURIComponent(details) + "&location=" + encodeURIComponent(loc);
}
function confettiBurst() {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll("canvas.hup-confetti").forEach((el) => el.remove());
    const c = document.createElement("canvas");
    c.className = "hup-confetti";
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:55";
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    // Harde opruim-garantie, ook als requestAnimationFrame wordt geknepen.
    setTimeout(() => c.remove(), 2600);
    const ctx = c.getContext("2d");
    const colors = ["#14b8a6", "#f59e0b", "#e11d48", "#6366f1", "#22c55e", "#ec4899"];
    const parts = Array.from({ length: 90 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 140, y: innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 9,
      g: 0.28 + Math.random() * 0.16, s: 5 + Math.random() * 6,
      col: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    }));
    let frames = 0, raf;
    const tick = () => {
      frames++;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (frames < 95) raf = requestAnimationFrame(tick);
      else { cancelAnimationFrame(raf); c.remove(); }
    };
    tick();
  } catch {}
}

/* ---------------------------------------------------------------- database
 * Velden: min_age, max_age, prijs(€/p.p. indicatief), indoor_friendly,
 * lat/lng, duur, rating(indicatief), emoji, desc. Startlocatie Hardenberg.
 */
const ACTIVITIES = [
  // — Hardenberg & noordoost-Overijssel —
  { id: 1,  name: "Kinderboerderij Baalder", plaats: "Hardenberg", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.5800, lng: 6.6400, duur: "1–2 uur", rating: 4.3, emoji: "🐐", desc: "Gratis buurtboerderij met geiten, kippen en konijnen in Baalder." },
  { id: 2,  name: "Zwembad De Slag", plaats: "Hardenberg", category: "water", min_age: 0, max_age: 99, prijs: 5, indoor_friendly: true, lat: 52.5700, lng: 6.6150, duur: "2–3 uur", rating: 4.1, emoji: "🏊", desc: "Overdekt zwembad met glijbaan, peuterbad en stroomversnelling." },
  { id: 3,  name: "Knof de Pad — Rheezerbelten", plaats: "Hardenberg", category: "natuur", min_age: 7, max_age: 12, prijs: 7, indoor_friendly: false, lat: 52.5600, lng: 6.5600, duur: "1–2 uur", rating: 4.3, emoji: "🧭", desc: "Speurroute met een rugzak vol opdrachten door bos en heide." },
  { id: 4,  name: "Pannenkoekenboerderij De Ganzenhoeve", plaats: "Holthone", category: "eten", min_age: 0, max_age: 99, prijs: 15, indoor_friendly: true, lat: 52.6500, lng: 6.7200, duur: "1–2 uur", rating: 4.3, emoji: "🥞", desc: "Onbeperkt pannenkoeken met speelhoek, tussen Gramsbergen en Coevorden." },
  { id: 5,  name: "Attractiepark Slagharen", plaats: "Slagharen", category: "avontuur", min_age: 3, max_age: 99, prijs: 30, indoor_friendly: false, lat: 52.6175, lng: 6.5300, duur: "hele dag", rating: 4.1, emoji: "🎢", desc: "Western-attractiepark met achtbanen, ponyshow en waterpret." },
  { id: 6,  name: "Kinderboerderij Dekibo", plaats: "Dedemsvaart", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.5980, lng: 6.4600, duur: "1–2 uur", rating: 4.2, emoji: "🐓", desc: "Gratis kinderboerderij met boerderijdieren en een speelveld." },
  { id: 7,  name: "Hoeve Bosman", plaats: "De Krim", category: "dieren", min_age: 1, max_age: 12, prijs: 5, indoor_friendly: false, lat: 52.6600, lng: 6.5950, duur: "1–2 uur", rating: 4.4, emoji: "🐄", desc: "Melkveeboerderij met speurtocht, dieren en zelfgemaakt ijs (seizoen)." },

  // — Ommen, Salland & Sallandse Heuvelrug —
  { id: 8,  name: "Speelbos Hol van de Leeuw", plaats: "Lemele", category: "natuur", min_age: 4, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.5000, lng: 6.3800, duur: "1–2 uur", rating: 4.4, emoji: "🌲", desc: "Hutten bouwen en klimmen op de bosrijke Lemelerberg." },
  { id: 9,  name: "Speelpark De Flierefluiter", plaats: "Raalte", category: "speeltuin", min_age: 1, max_age: 12, prijs: 13, indoor_friendly: true, lat: 52.4300, lng: 6.2400, duur: "halve dag", rating: 4.2, emoji: "🎠", desc: "Grote binnen- én buitenspeeltuin met overdekte kinderboerderij." },
  { id: 10, name: "Avonturenpark Hellendoorn", plaats: "Hellendoorn", category: "avontuur", min_age: 3, max_age: 99, prijs: 33, indoor_friendly: false, lat: 52.3850, lng: 6.4670, duur: "hele dag", rating: 4.3, emoji: "🎢", desc: "Attractiepark met achtbanen, dwaaltuin en waterattracties." },
  { id: 11, name: "Speelbos Sallandse Heuvelrug", plaats: "Nijverdal", category: "natuur", min_age: 2, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.3450, lng: 6.4300, duur: "1–2 uur", rating: 4.4, emoji: "🌳", desc: "Twee kilometer hutten bouwen, klimmen en slingeren in het bos." },
  { id: 12, name: "Kartplaza Actionworld", plaats: "Nijverdal", category: "binnenpret", min_age: 8, max_age: 99, prijs: 19, indoor_friendly: true, lat: 52.3650, lng: 6.4600, duur: "1–2 uur", rating: 4.1, emoji: "🏎️", desc: "Indoor kartbaan, lasergamen en speelhal onder één dak." },
  { id: 13, name: "Natuurdiorama Holterberg", plaats: "Holten", category: "museum", min_age: 3, max_age: 99, prijs: 9, indoor_friendly: true, lat: 52.2880, lng: 6.4250, duur: "1–2 uur", rating: 4.3, emoji: "🦌", desc: "Duizend dieren in levensechte diorama's, met buitenspeelbos." },
  { id: 14, name: "Speelboerderij Dondertman", plaats: "Holten", category: "speeltuin", min_age: 1, max_age: 12, prijs: 6, indoor_friendly: true, lat: 52.2900, lng: 6.4300, duur: "2–3 uur", rating: 4.6, emoji: "🐮", desc: "Binnen- en buitenspeeltuin met dieren en pannenkoeken." },

  // — Zwolle, Deventer, Hattem, Kampen —
  { id: 15, name: "Ballorig Zwolle", plaats: "Zwolle", category: "binnenpret", min_age: 1, max_age: 11, prijs: 10, indoor_friendly: true, lat: 52.5168, lng: 6.0830, duur: "2–3 uur", rating: 4.0, emoji: "🎈", desc: "Overdekt speelparadijs met glijbanen, klimtoestellen en air-track." },
  { id: 16, name: "Dinoland Zwolle", plaats: "Zwolle", category: "avontuur", min_age: 3, max_age: 12, prijs: 17, indoor_friendly: false, lat: 52.4900, lng: 6.0700, duur: "halve dag", rating: 4.2, emoji: "🦕", desc: "Dinopark met levensechte dino's, fossielen zoeken en speeltuin (seizoen)." },
  { id: 17, name: "Openluchtbad De Vrolijkheid", plaats: "Zwolle", category: "water", min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.4900, lng: 6.1000, duur: "2–3 uur", rating: 4.2, emoji: "🏖️", desc: "Gezellig openluchtzwembad met glijbaan en ligweide (zomer)." },
  { id: 18, name: "Nederlands Bakkerijmuseum", plaats: "Hattem", category: "museum", min_age: 4, max_age: 99, prijs: 12, indoor_friendly: true, lat: 52.4750, lng: 6.0630, duur: "1–2 uur", rating: 4.2, emoji: "🥨", desc: "Zelf koekjes bakken in een levend bakkerijmuseum." },
  { id: 19, name: "Kinderboerderij De Ulebelt", plaats: "Deventer", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.2550, lng: 6.1800, duur: "1–2 uur", rating: 4.5, emoji: "🐑", desc: "Gratis kinderboerderij en natuurtuin met blotevoetenpad." },
  { id: 20, name: "Speelgoedmuseum Deventer", plaats: "Deventer", category: "museum", min_age: 2, max_age: 12, prijs: 9, indoor_friendly: true, lat: 52.2520, lng: 6.1600, duur: "1–2 uur", rating: 4.3, emoji: "🧸", desc: "Historisch speelgoed plus een grote doe-speelzolder." },
  { id: 21, name: "Kinderboerderij Cantecleer", plaats: "Kampen", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.5550, lng: 5.9110, duur: "1–2 uur", rating: 4.2, emoji: "🐔", desc: "Gratis kinderboerderij met dieren en een gezellige speeltuin." },

  // — Twente —
  { id: 22, name: "De Museumfabriek", plaats: "Enschede", category: "museum", min_age: 4, max_age: 99, prijs: 13, indoor_friendly: true, lat: 52.2200, lng: 6.8900, duur: "2–3 uur", rating: 4.3, emoji: "🦣", desc: "Doe-museum met natuur, techniek en een echt mammoetskelet." },
  { id: 23, name: "FunZone Enschede", plaats: "Enschede", category: "binnenpret", min_age: 1, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.2220, lng: 6.8950, duur: "2–3 uur", rating: 4.0, emoji: "🐵", desc: "Overdekt speelparadijs met klimtoestellen, ballenbak en glijbanen." },
  { id: 24, name: "Kinderboerderij De Wesseler", plaats: "Enschede", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.2050, lng: 6.8800, duur: "1–2 uur", rating: 4.3, emoji: "🐰", desc: "Gratis stadsboerderij met knuffeldieren en een speeltuin." },
  { id: 25, name: "Attractiepark De Waarbeek", plaats: "Hengelo", category: "avontuur", min_age: 2, max_age: 99, prijs: 20, indoor_friendly: false, lat: 52.2700, lng: 6.7800, duur: "hele dag", rating: 4.2, emoji: "🎡", desc: "Nostalgisch familiepark met all-in formule, inclusief eten en drinken." },
  { id: 26, name: "You Jump Hengelo", plaats: "Hengelo", category: "avontuur", min_age: 2, max_age: 99, prijs: 13, indoor_friendly: true, lat: 52.2650, lng: 6.7930, duur: "1–2 uur", rating: 4.1, emoji: "🤸", desc: "Trampolinepark met twister en foam pit — mini-jump vanaf 1,5 jr, regulier vanaf 7 jr." },
  { id: 27, name: "Monkey Town Almelo", plaats: "Almelo", category: "binnenpret", min_age: 1, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.3570, lng: 6.6680, duur: "2–3 uur", rating: 4.0, emoji: "🙈", desc: "Grote overdekte speelhal met ballenbak en klimtoestellen, ouders gratis." },
  { id: 28, name: "Kids City", plaats: "Borne", category: "binnenpret", min_age: 1, max_age: 12, prijs: 7, indoor_friendly: true, lat: 52.3000, lng: 6.7520, duur: "2–3 uur", rating: 4.1, emoji: "🏰", desc: "Indoor speelstad met thema-werelden en grote glijbanen." },
  { id: 29, name: "Klein Afrika", plaats: "Oldenzaal", category: "dieren", min_age: 1, max_age: 12, prijs: 3, indoor_friendly: false, lat: 52.3130, lng: 6.9280, duur: "2–3 uur", rating: 4.0, emoji: "🦒", desc: "Klein dierenpark met speeltuin en pannenkoekenrestaurant bij Het Hulsbeek." },
  { id: 30, name: "Recreatieplas 't Hulsbeek", plaats: "Oldenzaal", category: "water", min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.3200, lng: 6.9000, duur: "halve dag", rating: 4.3, emoji: "🏖️", desc: "Gratis strand en zwemwater met speeltuin in recreatiegebied Het Hulsbeek." },
  { id: 31, name: "Klimbos AvaTarZ", plaats: "Deurningen", category: "avontuur", min_age: 6, max_age: 99, prijs: 16, indoor_friendly: false, lat: 52.3000, lng: 6.8600, duur: "2–3 uur", rating: 4.4, emoji: "🌳", desc: "Klimparcoursen door de bomen; laag parcours al vanaf 6 jaar." },
  { id: 32, name: "Het Groot Twentsch Maisdoolhof", plaats: "Fleringen", category: "natuur", min_age: 4, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.3550, lng: 6.7600, duur: "1–2 uur", rating: 4.2, emoji: "🌽", desc: "Verdwalen in een gigantisch maïsdoolhof met speelweide (juli–september)." },
  { id: 33, name: "Bike-Fun Park Het Doesgoor", plaats: "Markelo", category: "avontuur", min_age: 6, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.2430, lng: 6.5100, duur: "1–2 uur", rating: 4.0, emoji: "🚵", desc: "Gratis mountainbike- en pumptrackpark — eigen fiets meenemen." },

  // — Weerribben-Wieden (NW-Overijssel) —
  { id: 34, name: "Fluisterboot huren in Giethoorn", plaats: "Giethoorn", category: "water", min_age: 0, max_age: 99, prijs: 10, indoor_friendly: false, lat: 52.7380, lng: 6.0780, duur: "halve dag", rating: 4.4, emoji: "🛶", desc: "Zelf varen door 'het Venetië van het noorden' — ± €35 per boot (max 4 pers.)." },
  { id: 35, name: "Vlonderpad De Wieden", plaats: "Ossenzijl", category: "natuur", min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.7900, lng: 5.9300, duur: "1–2 uur", rating: 4.5, emoji: "🦆", desc: "Gratis vlonder- en laarzenpad door het moerasnatuurgebied Weerribben-Wieden." },
  { id: 36, name: "Speelnatuur OERRR de Wieden", plaats: "Sint Jansklooster", category: "natuur", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.6600, lng: 5.9850, duur: "1–2 uur", rating: 4.3, emoji: "🌿", desc: "Natuurspeelplek met vlonders, modderkeuken en uitkijktoren (parkeren betaald)." },
  { id: 37, name: "Klimbos Overijssel", plaats: "Paasloo", category: "avontuur", min_age: 6, max_age: 99, prijs: 24, indoor_friendly: false, lat: 52.8080, lng: 5.9850, duur: "2–3 uur", rating: 4.3, emoji: "🧗", desc: "Vier klimparcoursen met hindernissen tot negen meter hoog (reserveren)." },

  // — Grensicoon (net buiten Overijssel, zeer populair) —
  { id: 38, name: "WILDLANDS Adventure Zoo", plaats: "Emmen", category: "dieren", min_age: 0, max_age: 99, prijs: 32, indoor_friendly: true, lat: 52.7850, lng: 6.8970, duur: "hele dag", rating: 4.2, emoji: "🐘", desc: "Belevenis-dierentuin met jungle, savanne en poolwereld." },

  // ===================== Uitbreiding (geverifieerd, juni 2026) =====================
  // — Zwolle, Kampen, Steenwijkerland & NW-Overijssel —
  { id: 39, name: "BinnenPlezier", plaats: "Kampen", category: "binnenpret", min_age: 1, max_age: 12, prijs: 10, indoor_friendly: true, lat: 52.555, lng: 5.910, duur: "2–3 uur", rating: 4.3, emoji: "🏄", desc: "Grote indoor speeltuin met klimmuur, glijbanen en peuterzone." },
  { id: 40, name: "Monkey Town Zwolle", plaats: "Zwolle", category: "binnenpret", min_age: 1, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.516, lng: 6.083, duur: "2–3 uur", rating: 4.2, emoji: "🐵", desc: "2000 m² indoor speelparadijs met trampoline en lasergame." },
  { id: 41, name: "Kinderboerderij Wezenlanden", plaats: "Zwolle", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.508, lng: 6.076, duur: "1–2 uur", rating: 4.4, emoji: "🐐", desc: "Gratis kinderboerderij met geiten, varkens en speeltuin." },
  { id: 42, name: "Kinderboerderij Eekhout", plaats: "Zwolle", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.515, lng: 6.098, duur: "1–2 uur", rating: 4.3, emoji: "🐇", desc: "Gratis boerderij in Park Eekhout met konijnen en speeltuin." },
  { id: 43, name: "ANNO Stadsmuseum", plaats: "Zwolle", category: "museum", min_age: 4, max_age: 14, prijs: 6, indoor_friendly: true, lat: 52.513, lng: 6.096, duur: "1–2 uur", rating: 4.1, emoji: "🏛️", desc: "Stadsmuseum met ontdekhoek, kinderactiviteiten en workshops." },
  { id: 44, name: "Miniatuur Museum Zwolle", plaats: "Zwolle", category: "museum", min_age: 5, max_age: 99, prijs: 10, indoor_friendly: true, lat: 52.513, lng: 6.094, duur: "1–2 uur", rating: 4.2, emoji: "🔍", desc: "Mini-kunst bekijken met vergrootglas — magisch voor iedereen." },
  { id: 45, name: "Doepark Nooterhof", plaats: "Zwolle", category: "natuur", min_age: 2, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.524, lng: 6.065, duur: "1–2 uur", rating: 4.5, emoji: "💧", desc: "Gratis waterspeeltuin, blotevoetenpad en duurzaam Earthship." },
  { id: 46, name: "Kabouterpad Park Stadshoeve", plaats: "Zwolle", category: "natuur", min_age: 2, max_age: 7, prijs: 2, indoor_friendly: false, lat: 52.534, lng: 6.035, duur: "1–2 uur", rating: 4.3, emoji: "🍄", desc: "Negen kabouters zoeken met opdrachtboekje en blotevoetenpad." },
  { id: 47, name: "Stedelijk Museum Kampen", plaats: "Kampen", category: "museum", min_age: 4, max_age: 16, prijs: 0, indoor_friendly: true, lat: 52.556, lng: 5.910, duur: "1–2 uur", rating: 4.0, emoji: "🏰", desc: "Kindvriendelijk stadsmuseum; kinderen gratis." },
  { id: 48, name: "Ger & Ron Bowling", plaats: "Kampen", category: "binnenpret", min_age: 4, max_age: 99, prijs: 7, indoor_friendly: true, lat: 52.558, lng: 5.906, duur: "1–2 uur", rating: 4.0, emoji: "🎳", desc: "Gezellige bowlingbaan, kindvriendelijk met bumpers." },
  { id: 49, name: "Pannenkoekboerderij Steenwijk", plaats: "Steenwijk", category: "eten", min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.787, lng: 6.119, duur: "1–2 uur", rating: 4.4, emoji: "🥞", desc: "Familierestaurant met grote speeltuin, dieren en terras." },
  { id: 50, name: "Zwembad 't Tolhekke", plaats: "Steenwijkerwold", category: "water", min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.776, lng: 6.143, duur: "2–4 uur", rating: 4.2, emoji: "🏊", desc: "Verwarmd openluchtbad met peuterbad en waterslide (zomer)." },
  { id: 51, name: "Zwembad Vollenhove", plaats: "Vollenhove", category: "water", min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.681, lng: 5.962, duur: "2–3 uur", rating: 4.1, emoji: "🌊", desc: "Buitenzwembad met kinderbad, glijbaan en recreatiebad." },
  { id: 52, name: "Zwembad Blokzijl", plaats: "Blokzijl", category: "water", min_age: 0, max_age: 99, prijs: 4, indoor_friendly: false, lat: 52.724, lng: 5.961, duur: "2–3 uur", rating: 4.3, emoji: "☀️", desc: "Verwarmd openluchtbad midden in het groen." },
  { id: 53, name: "Maisdoolhof & Blotevoetenpad Blokzijl", plaats: "Blokzijl", category: "avontuur", min_age: 3, max_age: 14, prijs: 8, indoor_friendly: false, lat: 52.726, lng: 5.955, duur: "2–3 uur", rating: 4.4, emoji: "🌽", desc: "Reusachtig maïsdoolhof met blotevoetenpad en klimwand." },
  { id: 54, name: "Speelvijver De Zwarte Dennen", plaats: "Staphorst", category: "water", min_age: 0, max_age: 14, prijs: 0, indoor_friendly: false, lat: 52.617, lng: 6.218, duur: "2–4 uur", rating: 4.5, emoji: "🏖️", desc: "Gratis zwemplas in het bos met strand en speeltuin." },
  { id: 55, name: "Belevingspad Boswachterij Staphorst", plaats: "Staphorst", category: "natuur", min_age: 3, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.614, lng: 6.220, duur: "1–2 uur", rating: 4.3, emoji: "🌲", desc: "Gratis kinderwandelpad met doolhof, herriehut en kleurenkamer." },
  { id: 56, name: "Bad Hesselingen", plaats: "Meppel", category: "water", min_age: 0, max_age: 99, prijs: 7, indoor_friendly: false, lat: 52.694, lng: 6.197, duur: "2–4 uur", rating: 4.2, emoji: "🎢", desc: "Zwempark met glijbanen, airtrampoline, kabelbaan en minigolf." },
  { id: 57, name: "Boerderij De Huppe", plaats: "Zwolle", category: "dieren", min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.535, lng: 6.048, duur: "1–2 uur", rating: 4.1, emoji: "🌻", desc: "Kaasboerderij met pluktuin, dieren en terras; vrij toegankelijk." },

  // — Twente —
  { id: 58, name: "Speelpark Hoge Boekel", plaats: "Enschede", category: "avontuur", min_age: 2, max_age: 14, prijs: 10, indoor_friendly: false, lat: 52.218, lng: 6.847, duur: "2–3 uur", rating: 4.3, emoji: "🎡", desc: "Pretpark met attracties, trampolines en midgetgolf." },
  { id: 59, name: "Bounce Valley", plaats: "Enschede", category: "binnenpret", min_age: 3, max_age: 16, prijs: 10, indoor_friendly: true, lat: 52.222, lng: 6.895, duur: "1–2 uur", rating: 4.4, emoji: "🪂", desc: "Grootste luchtkussenpark van Nederland — springen en klimmen." },
  { id: 60, name: "Ballorig Enschede", plaats: "Enschede", category: "binnenpret", min_age: 0, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.205, lng: 6.888, duur: "2–3 uur", rating: 4.2, emoji: "🧸", desc: "Overdekt speelparadijs met trampoline, autocircuit en klimtoestellen." },
  { id: 61, name: "Recreatiepark Het Rutbeek", plaats: "Enschede", category: "water", min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.198, lng: 6.826, duur: "2–4 uur", rating: 4.3, emoji: "🏖️", desc: "Gratis recreatieplas met strand, speeltuin en klimbos." },
  { id: 62, name: "Klimbos Rutbeek (Vallei 53)", plaats: "Enschede", category: "avontuur", min_age: 6, max_age: 99, prijs: 17, indoor_friendly: false, lat: 52.197, lng: 6.825, duur: "2–3 uur", rating: 4.4, emoji: "🧗", desc: "Klimbos met laag en hoog parcours plus ziplines (mrt–okt)." },
  { id: 63, name: "Oyfo Techniekmuseum", plaats: "Hengelo", category: "museum", min_age: 4, max_age: 17, prijs: 10, indoor_friendly: true, lat: 52.270, lng: 6.792, duur: "2–3 uur", rating: 4.5, emoji: "🔬", desc: "Hands-on techniekmuseum: experimenteren, bouwen en ontdekken." },
  { id: 64, name: "Zwemparadijs Riviera (Preston Palace)", plaats: "Almelo", category: "water", min_age: 0, max_age: 99, prijs: 12, indoor_friendly: true, lat: 52.363, lng: 6.676, duur: "2–4 uur", rating: 4.2, emoji: "🌴", desc: "Subtropisch zwemparadijs met glijbanen en kinderbad." },
  { id: 65, name: "Recreatiepark Het Lageveld", plaats: "Wierden", category: "water", min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.361, lng: 6.593, duur: "2–4 uur", rating: 4.3, emoji: "🏊", desc: "Gratis recreatieplas met peutervijver, strand en speelbos." },
  { id: 66, name: "Ballorig Nijverdal", plaats: "Nijverdal", category: "binnenpret", min_age: 0, max_age: 12, prijs: 13, indoor_friendly: true, lat: 52.365, lng: 6.464, duur: "2–3 uur", rating: 4.2, emoji: "🎪", desc: "Overdekt speelparadijs met trampoline en autocircuit." },
  { id: 67, name: "Kinderboerderij Het Kukelnest", plaats: "Goor", category: "dieren", min_age: 0, max_age: 12, prijs: 3, indoor_friendly: false, lat: 52.389, lng: 6.579, duur: "1–2 uur", rating: 4.3, emoji: "🐑", desc: "Speel- en kinderboerderij met dieren en speelweide (feb–nov)." },
  { id: 68, name: "Kinderboerderij Scholtenhagen", plaats: "Haaksbergen", category: "dieren", min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.155, lng: 6.738, duur: "1–2 uur", rating: 4.1, emoji: "🐐", desc: "Gratis kinderboerderij met zeldzame rassen en speeltuin." },
  { id: 69, name: "Speeltuin Morskieft", plaats: "Reutum", category: "binnenpret", min_age: 2, max_age: 12, prijs: 5, indoor_friendly: true, lat: 52.393, lng: 6.936, duur: "2–3 uur", rating: 4.3, emoji: "🎯", desc: "Binnen- en buitenspeeltuin met blacklight minigolf en escaperoom." },
  { id: 70, name: "Openluchtmuseum Ootmarsum", plaats: "Ootmarsum", category: "museum", min_age: 4, max_age: 99, prijs: 9, indoor_friendly: false, lat: 52.411, lng: 6.906, duur: "2–3 uur", rating: 4.4, emoji: "🏡", desc: "Authentiek openluchtdorp met kinderboerderij en schatzoektocht." },
  { id: 71, name: "Landgoed Het Rheins", plaats: "Enter", category: "avontuur", min_age: 2, max_age: 14, prijs: 5, indoor_friendly: false, lat: 52.313, lng: 6.562, duur: "2–3 uur", rating: 4.2, emoji: "⛳", desc: "Midgetgolf, airtrampoline, kinderboerderij en speeltuinen." },
  { id: 72, name: "DIJK59", plaats: "Losser", category: "eten", min_age: 2, max_age: 14, prijs: 0, indoor_friendly: false, lat: 52.249, lng: 7.001, duur: "1–2 uur", rating: 4.2, emoji: "🌳", desc: "Restaurant met speeltuin, kabelbaan, trampoline en springkussen." },
  { id: 73, name: "Monkey Town Enschede", plaats: "Enschede", category: "binnenpret", min_age: 1, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.207, lng: 6.877, duur: "2–3 uur", rating: 4.2, emoji: "🐒", desc: "Binnenspeelparadijs met klimhuis, trampolinezone en voetbalkooi." },

  // — Salland & Vechtdal —
  { id: 74, name: "Giga Konijnenhol", plaats: "Beerze", category: "binnenpret", min_age: 1, max_age: 12, prijs: 14, indoor_friendly: true, lat: 52.563, lng: 6.551, duur: "2–4 uur", rating: 4.5, emoji: "🐰", desc: "Groot indoor speelparadijs met Mollenhol, Carrot Valley en theater." },
  { id: 75, name: "NuNature Klimbos Arena", plaats: "Ommen", category: "avontuur", min_age: 8, max_age: 99, prijs: 16, indoor_friendly: false, lat: 52.516, lng: 6.419, duur: "1–2 uur", rating: 4.3, emoji: "🧗", desc: "Klimbos met 30+ hindernissen op 4, 7 en 10 meter hoogte." },
  { id: 76, name: "Rederij Peters Rondvaart", plaats: "Ommen", category: "natuur", min_age: 1, max_age: 99, prijs: 8, indoor_friendly: false, lat: 52.516, lng: 6.423, duur: "1–2 uur", rating: 4.2, emoji: "⛵", desc: "Kindvriendelijke rondvaart over de Vecht met activiteitenpakket." },
  { id: 77, name: "Boerderij Roke's Erf", plaats: "Ommen", category: "dieren", min_age: 3, max_age: 12, prijs: 5, indoor_friendly: false, lat: 52.518, lng: 6.430, duur: "1–3 uur", rating: 4.2, emoji: "🌽", desc: "Speelboerderij met maisdoolhof, klompengolf en pannenkoekenroute." },
  { id: 78, name: "Aardbeienboerderij RozemArrie", plaats: "Arriën", category: "eten", min_age: 2, max_age: 12, prijs: 6, indoor_friendly: false, lat: 52.498, lng: 6.405, duur: "1–2 uur", rating: 4.3, emoji: "🍓", desc: "Aardbeien plukken, pannenkoeken bakken en spelen in de strooischuur." },
  { id: 79, name: "Kinderboerderij Ommen", plaats: "Ommen", category: "dieren", min_age: 1, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.518, lng: 6.420, duur: "1–2 uur", rating: 4.1, emoji: "🐐", desc: "Gratis kinderboerderij met geiten, herten en zandspeeltuin." },
  { id: 80, name: "Aan 't Zandeinde Doehoerderij", plaats: "Lemele", category: "dieren", min_age: 2, max_age: 12, prijs: 5, indoor_friendly: false, lat: 52.538, lng: 6.387, duur: "1–2 uur", rating: 4.0, emoji: "🐷", desc: "Biologische boerderij: biggetjes knuffelen en moestuintje." },
  { id: 81, name: "Hiawatha Actief Kanoën", plaats: "Dalfsen", category: "avontuur", min_age: 5, max_age: 99, prijs: 18, indoor_friendly: false, lat: 52.508, lng: 6.260, duur: "2–4 uur", rating: 4.4, emoji: "🛶", desc: "Gezinsvriendelijke kanotochten over de Vecht." },
  { id: 82, name: "Natuurboerderij Lindehoeve", plaats: "Dalfsen", category: "dieren", min_age: 1, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.494, lng: 6.262, duur: "1–2 uur", rating: 4.2, emoji: "🐑", desc: "Gratis biologische kinderboerderij met geiten, pony's en varkens." },
  { id: 83, name: "Natuuractiviteitencentrum De Koppel", plaats: "Hardenberg", category: "museum", min_age: 4, max_age: 10, prijs: 0, indoor_friendly: true, lat: 52.5752, lng: 6.6179, duur: "1–2 uur", rating: 4.1, emoji: "🔬", desc: "Gratis natuurcentrum met ontdekhoek en blotevoetenpad." },
  { id: 84, name: "Kaasboerderij Heileuver", plaats: "Dalmsholte", category: "eten", min_age: 4, max_age: 99, prijs: 5, indoor_friendly: true, lat: 52.522, lng: 6.458, duur: "1 uur", rating: 4.0, emoji: "🧀", desc: "Rondleiding langs het kaasmaken, proeverij en boerenwinkel." },
  { id: 85, name: "Kinderboerderij Eigen Erf", plaats: "Rijssen", category: "dieren", min_age: 1, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.306, lng: 6.515, duur: "1–2 uur", rating: 4.1, emoji: "🦜", desc: "Gratis kinderboerderij in het Volkspark met wallaby's en roofvogelshow." },
  { id: 86, name: "Borgelerbad", plaats: "Deventer", category: "water", min_age: 1, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.263, lng: 6.166, duur: "2–4 uur", rating: 4.2, emoji: "🏊", desc: "Buitenbad met peuterbad, speelschip, glijbanen en trampolines." },
  { id: 87, name: "Belevingscentrum De Scheg", plaats: "Deventer", category: "water", min_age: 2, max_age: 99, prijs: 7, indoor_friendly: true, lat: 52.253, lng: 6.155, duur: "2–3 uur", rating: 4.3, emoji: "🌊", desc: "Overdekt zwemparadijs met glijbanen en Dave's Treasure Island." },
  { id: 88, name: "Buitensociëteit Bowling", plaats: "Deventer", category: "binnenpret", min_age: 4, max_age: 99, prijs: 13, indoor_friendly: true, lat: 52.270, lng: 6.187, duur: "1–2 uur", rating: 4.1, emoji: "🎳", desc: "Twaalf bowlingbanen met bumpers en discobowling voor kids." },
  { id: 89, name: "Buitencentrum & Sterrenwacht Sallandse Heuvelrug", plaats: "Nijverdal", category: "museum", min_age: 6, max_age: 99, prijs: 4, indoor_friendly: true, lat: 52.358, lng: 6.464, duur: "1–2 uur", rating: 4.2, emoji: "🔭", desc: "Planetariumshow en sterrenwacht, met speelbospad ernaast." },
  { id: 90, name: "Belevingsroute Luttenberg", plaats: "Luttenberg", category: "natuur", min_age: 3, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.389, lng: 6.426, duur: "1–2 uur", rating: 4.0, emoji: "🌲", desc: "Gratis 2,8 km gezinsroute met touwbrug en klimrotsen." },
  { id: 91, name: "Avonturenpad Hop de Wolf", plaats: "Ommen", category: "natuur", min_age: 8, max_age: 99, prijs: 10, indoor_friendly: false, lat: 52.528, lng: 6.396, duur: "1–2 uur", rating: 4.1, emoji: "🐺", desc: "Audiotocht door het Wolfskuilbos met 12 opdrachten via QR." },

  // — Grensregio (net buiten Overijssel, populair & goed bereikbaar) —
  { id: 92, name: "Plopsa Indoor Coevorden", plaats: "Dalen", category: "binnenpret", min_age: 2, max_age: 10, prijs: 28, indoor_friendly: true, lat: 52.670, lng: 6.750, duur: "hele dag", rating: 4.1, emoji: "🎠", desc: "Studio 100-attractiepark met Kabouter Plop en K3." },
  { id: 93, name: "Urban GRND Jump & Playground", plaats: "Emmen", category: "binnenpret", min_age: 3, max_age: 99, prijs: 21, indoor_friendly: true, lat: 52.780, lng: 6.900, duur: "halve dag", rating: 4.3, emoji: "🤸", desc: "Trampolinepark met lasergame, glow golf en indoor activiteiten." },
  { id: 94, name: "Vogelpark Ruinen", plaats: "Ruinen", category: "dieren", min_age: 2, max_age: 99, prijs: 9, indoor_friendly: false, lat: 52.750, lng: 6.370, duur: "halve dag", rating: 4.2, emoji: "🦜", desc: "Gezellig vogelpark met speelweide en terras." },
  { id: 95, name: "Kabouterland", plaats: "Exloo", category: "speeltuin", min_age: 1, max_age: 10, prijs: 11, indoor_friendly: false, lat: 52.870, lng: 6.860, duur: "halve dag", rating: 4.4, emoji: "🍄", desc: "Sprookjesachtig themapark met kabouters, trollen en dieren." },
  { id: 96, name: "Boomkroonpad Drouwen", plaats: "Drouwen", category: "natuur", min_age: 4, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.910, lng: 6.770, duur: "halve dag", rating: 4.5, emoji: "🌳", desc: "Wandelpad 22 meter hoog tussen de boomtoppen op de Hondsrug." },
  { id: 97, name: "Hunebedcentrum", plaats: "Borger", category: "museum", min_age: 4, max_age: 99, prijs: 8, indoor_friendly: true, lat: 52.930, lng: 6.800, duur: "halve dag", rating: 4.3, emoji: "🪨", desc: "Interactief museum over de prehistorie en hunebedden." },
  { id: 98, name: "Sprookjeshof Zuidlaren", plaats: "Zuidlaren", category: "speeltuin", min_age: 2, max_age: 12, prijs: 13, indoor_friendly: true, lat: 53.090, lng: 6.680, duur: "hele dag", rating: 4.3, emoji: "🧚", desc: "Sprookjesbos met indoor speelparadijs en kinderboerderij." },
  { id: 99, name: "Aqua Mundo Parc Sandur", plaats: "Emmen", category: "water", min_age: 2, max_age: 99, prijs: 15, indoor_friendly: true, lat: 52.790, lng: 6.920, duur: "halve dag", rating: 4.1, emoji: "💦", desc: "Subtropisch zwemparadijs met glijbanen en stroomversnelling." },
  { id: 100, name: "Julianatoren", plaats: "Apeldoorn", category: "speeltuin", min_age: 2, max_age: 12, prijs: 31, indoor_friendly: false, lat: 52.220, lng: 5.940, duur: "hele dag", rating: 4.5, emoji: "🎡", desc: "Kinderpretpark met Kabouterwonderland en 60+ attracties." },
  { id: 101, name: "Veluwsche Stoomtrein", plaats: "Beekbergen", category: "museum", min_age: 2, max_age: 99, prijs: 11, indoor_friendly: false, lat: 52.170, lng: 5.970, duur: "halve dag", rating: 4.4, emoji: "🚂", desc: "Historische stoomtrein door de Veluwse bossen." },
  { id: 102, name: "Paleis Het Loo — Juniorpaleis", plaats: "Apeldoorn", category: "museum", min_age: 3, max_age: 12, prijs: 10, indoor_friendly: true, lat: 52.240, lng: 5.940, duur: "halve dag", rating: 4.4, emoji: "👑", desc: "Koninklijk paleis met een ondergronds Juniorpaleis voor kinderen." },
  { id: 103, name: "Klimbos Apeldoorn", plaats: "Apeldoorn", category: "avontuur", min_age: 6, max_age: 99, prijs: 24, indoor_friendly: false, lat: 52.220, lng: 5.970, duur: "halve dag", rating: 4.4, emoji: "🧗", desc: "Klimpark in de Veluwse bossen met 9 routes." },
  { id: 104, name: "Zandverhalen Elburg", plaats: "Elburg", category: "museum", min_age: 4, max_age: 99, prijs: 15, indoor_friendly: true, lat: 52.450, lng: 5.830, duur: "halve dag", rating: 4.3, emoji: "🏺", desc: "Werelds grootste overdekte zandsculpturen-expositie." },
  { id: 105, name: "De Koperen Ezel", plaats: "Epe", category: "dieren", min_age: 1, max_age: 10, prijs: 5, indoor_friendly: false, lat: 52.350, lng: 5.990, duur: "halve dag", rating: 4.3, emoji: "🫏", desc: "Kinderboerderij met 40+ ezels, alpaca's en grote speeltuin." },
  { id: 106, name: "Monkey Town Apeldoorn", plaats: "Apeldoorn", category: "binnenpret", min_age: 1, max_age: 12, prijs: 11, indoor_friendly: true, lat: 52.220, lng: 5.960, duur: "halve dag", rating: 4.2, emoji: "🐒", desc: "Indoor speelparadijs met klimtorens en zacht speelgoed." },
  { id: 107, name: "Hof van Eckberge", plaats: "Eibergen", category: "dieren", min_age: 2, max_age: 12, prijs: 10, indoor_friendly: true, lat: 52.100, lng: 6.650, duur: "halve dag", rating: 4.2, emoji: "🦥", desc: "Belevingspark met dierentuin, speeltuin en Peruaans thema." },
  { id: 108, name: "Klimbos Ruurlo", plaats: "Ruurlo", category: "avontuur", min_age: 6, max_age: 99, prijs: 21, indoor_friendly: false, lat: 51.990, lng: 6.450, duur: "halve dag", rating: 4.3, emoji: "🌲", desc: "Klimpark met 9 routes en continu veiligheidssysteem." },
  { id: 109, name: "Klimbos Survival Winterswijk", plaats: "Winterswijk", category: "avontuur", min_age: 4, max_age: 99, prijs: 22, indoor_friendly: false, lat: 51.970, lng: 6.720, duur: "halve dag", rating: 4.2, emoji: "🪂", desc: "Zipline- en survivalpark met kindvriendelijk mini-parcours." },

  // ===== Uitbreiding: bredere categorieën + audience (juni 2026) =====
  { id: 110, name: "De Tuinkamer in Priona", plaats: "Schuinesloot", category: "eten", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 65, indoor_friendly: true, lat: 52.636, lng: 6.598, duur: "2–3 uur", rating: 4.7, emoji: "🌿", desc: "Fine dining in serre midden in tuinen, voormalig sterrenchef" },
  { id: 111, name: "Restaurant Ember", plaats: "Zwolle", category: "eten", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 55, indoor_friendly: true, lat: 52.511, lng: 6.092, duur: "2–3 uur", rating: 4.6, emoji: "🔥", desc: "Comfort fine dining op open vuur in monumentaal pand" },
  { id: 112, name: "Bierbrouwerij Mommeriete", plaats: "Gramsbergen", category: "eten", audience: ["vrienden", "partner", "senioren"], min_age: 18, max_age: 99, prijs: 23, indoor_friendly: true, lat: 52.61, lng: 6.655, duur: "1–2 uur", rating: 4.3, emoji: "🍺", desc: "Lokale brouwerij met rondleiding, proeverij en biertuin" },
  { id: 113, name: "De Rheezer Kamer Theehuis", plaats: "Rheeze", category: "eten", audience: ["partner", "senioren", "alleen"], min_age: 0, max_age: 99, prijs: 12, indoor_friendly: false, lat: 52.546, lng: 6.578, duur: "1–2 uur", rating: 4.4, emoji: "🫖", desc: "Theehuis op authentieke brink aan de Vecht, taart en scones" },
  { id: 114, name: "Restaurant Vinck & Wijngaard", plaats: "Geesteren", category: "eten", audience: ["partner", "vrienden", "senioren"], min_age: 16, max_age: 99, prijs: 45, indoor_friendly: true, lat: 52.353, lng: 6.78, duur: "2–3 uur", rating: 4.5, emoji: "🍷", desc: "Dineren tussen Twentse wijnvelden, eigen wijnmakerij en proeverij" },
  { id: 115, name: "Othmar Bierbrouwerij & Proeflokaal", plaats: "Ootmarsum", category: "eten", audience: ["vrienden", "partner", "senioren"], min_age: 18, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.397, lng: 7.039, duur: "1–2 uur", rating: 4.4, emoji: "🍺", desc: "Ambachtelijke brouwerij met tour en proeflokaal vol speciaalbier" },
  { id: 116, name: "Gasterij Oatmössche", plaats: "Ootmarsum", category: "eten", audience: ["partner", "vrienden", "senioren"], min_age: 12, max_age: 99, prijs: 38, indoor_friendly: true, lat: 52.398, lng: 7.041, duur: "2–3 uur", rating: 4.4, emoji: "🍽️", desc: "Restaurant met eigen bier en uitzicht op historisch plein" },
  { id: 117, name: "Huttenkloas Brouwerij", plaats: "Albergen", category: "eten", audience: ["vrienden", "partner"], min_age: 18, max_age: 99, prijs: 11, indoor_friendly: true, lat: 52.388, lng: 6.848, duur: "1–2 uur", rating: 4.2, emoji: "🍺", desc: "Kleine Twentse brouwerij met rondleiding en proeverij" },
  { id: 118, name: "Grolsch Brouwerij Tour", plaats: "Enschede", category: "eten", audience: ["vrienden", "partner", "senioren"], min_age: 18, max_age: 99, prijs: 23, indoor_friendly: true, lat: 52.199, lng: 6.896, duur: "2–3 uur", rating: 4.3, emoji: "🍺", desc: "Uitgebreide brouwerijrondleiding bij Grolsch inclusief proeverij" },
  { id: 119, name: "Twentsche Foodhal", plaats: "Enschede", category: "eten", audience: ["vrienden", "gezin", "partner", "alleen"], min_age: 0, max_age: 99, prijs: 20, indoor_friendly: true, lat: 52.224, lng: 6.895, duur: "1–2 uur", rating: 4.1, emoji: "🌍", desc: "Acht wereldkeukens onder één dak in oude fabriekshal" },
  { id: 120, name: "Rigtersbier Brouwerij", plaats: "Haaksbergen", category: "eten", audience: ["vrienden", "partner"], min_age: 18, max_age: 99, prijs: 10, indoor_friendly: true, lat: 52.157, lng: 6.735, duur: "1–2 uur", rating: 4.2, emoji: "🍺", desc: "Lokale speciaalbierbrouwerij met rondleiding en proeflokaal" },
  { id: 121, name: "IJsboerderij Ôans", plaats: "Holten", category: "eten", audience: ["gezin", "senioren", "partner", "alleen"], min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.285, lng: 6.424, duur: "0–1 uur", rating: 4.3, emoji: "🍦", desc: "Boerderijijs van eigen koeienmelk op een melkveehouderij" },
  { id: 122, name: "IJsboerderij 'n Mors", plaats: "Wierden", category: "eten", audience: ["gezin", "senioren", "partner", "alleen"], min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.356, lng: 6.593, duur: "0–1 uur", rating: 4.2, emoji: "🍦", desc: "Ambachtelijk ijs in de Reggevallei, met dieren en speelplaats" },
  { id: 123, name: "Theehuis Landgoed de Uitkijk", plaats: "Hellendoorn", category: "eten", audience: ["partner", "senioren", "vrienden"], min_age: 0, max_age: 99, prijs: 28, indoor_friendly: true, lat: 52.39, lng: 6.45, duur: "1–2 uur", rating: 4.3, emoji: "🫖", desc: "Theehuis uit 1929 op de Sallandse Heuvelrug met uitzicht over heide" },
  { id: 124, name: "Landgoed Het Laer High Tea", plaats: "Ommen", category: "eten", audience: ["partner", "senioren", "vrienden"], min_age: 10, max_age: 99, prijs: 27, indoor_friendly: true, lat: 52.529, lng: 6.428, duur: "1–2 uur", rating: 4.3, emoji: "🫖", desc: "Engelse high tea op 17e-eeuws landgoed met verse scones" },
  { id: 125, name: "De Barones Dalfsen", plaats: "Dalfsen", category: "eten", audience: ["partner", "senioren", "vrienden"], min_age: 0, max_age: 99, prijs: 30, indoor_friendly: true, lat: 52.507, lng: 6.264, duur: "1–2 uur", rating: 4.2, emoji: "🏡", desc: "Restaurant in voormalig landhuis, midden in bos en natuur" },
  { id: 126, name: "De Maargies Hoeve Theeschenkerij", plaats: "Kallenkote", category: "eten", audience: ["senioren", "partner", "gezin", "vrienden"], min_age: 0, max_age: 99, prijs: 16, indoor_friendly: true, lat: 52.719, lng: 6.037, duur: "1–2 uur", rating: 4.1, emoji: "🫖", desc: "Theeschenkerij op melkveehouderij met high tea en boerenwinkel" },
  { id: 127, name: "Kaatje bij de Sluis", plaats: "Blokzijl", category: "eten", audience: ["partner", "senioren", "vrienden"], min_age: 14, max_age: 99, prijs: 70, indoor_friendly: true, lat: 52.728, lng: 5.964, duur: "2–3 uur", rating: 4.6, emoji: "⭐", desc: "Michelin-restaurant aan de sluisbrug in pittoresk Blokzijl" },
  { id: 128, name: "Restaurant Bird Deventer", plaats: "Deventer", category: "eten", audience: ["partner", "vrienden", "alleen"], min_age: 16, max_age: 99, prijs: 35, indoor_friendly: true, lat: 52.253, lng: 6.163, duur: "1–2 uur", rating: 4.4, emoji: "🏙️", desc: "Modern Aziatisch shared dining met dakterras over de IJssel" },
  { id: 129, name: "Brouwhoes Bier Experience Erve Kots", plaats: "Lievelde", category: "eten", audience: ["vrienden", "partner", "gezin", "senioren"], min_age: 6, max_age: 99, prijs: 14, indoor_friendly: true, lat: 51.974, lng: 6.588, duur: "1–2 uur", rating: 4.3, emoji: "🍺", desc: "Interactieve bierervaring op historisch erf met herberg" },
  { id: 130, name: "Stadsbrouwerij De Borghman", plaats: "Bredevoort", category: "eten", audience: ["vrienden", "partner", "senioren"], min_age: 18, max_age: 99, prijs: 15, indoor_friendly: true, lat: 51.954, lng: 6.635, duur: "1–2 uur", rating: 4.2, emoji: "🍺", desc: "Stadsbrouwerij in boekenstad Bredevoort met terras en proeverij" },
  { id: 131, name: "Museum de Fundatie", plaats: "Zwolle", category: "museum", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 12, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.515, lng: 6.092, duur: "1–2 uur", rating: 4.5, emoji: "🎨", desc: "Eigenzinnig kunstmuseum met spectaculaire koepel op het dak" },
  { id: 132, name: "Kasteel Het Nijenhuis Beeldentuin", plaats: "Heino", category: "bezienswaardigheid", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 10, max_age: 99, prijs: 17, indoor_friendly: false, lat: 52.436, lng: 6.229, duur: "2–3 uur", rating: 4.4, emoji: "🏰", desc: "Kasteel met grootste beeldentuin van Nederland" },
  { id: 133, name: "Rijksmuseum Twenthe", plaats: "Enschede", category: "museum", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 14, max_age: 99, prijs: 17, indoor_friendly: true, lat: 52.219, lng: 6.884, duur: "1–2 uur", rating: 4.4, emoji: "🖼️", desc: "Rijke kunstcollectie van Middeleeuwen tot heden" },
  { id: 134, name: "Wilminktheater", plaats: "Enschede", category: "cultuur", audience: ["partner", "vrienden", "senioren"], min_age: 12, max_age: 99, prijs: 22, indoor_friendly: true, lat: 52.222, lng: 6.895, duur: "2–3 uur", rating: 4.3, emoji: "🎭", desc: "Groot theater met honderden voorstellingen per seizoen" },
  { id: 135, name: "Concordia Film & Theater", plaats: "Enschede", category: "cultuur", audience: ["partner", "vrienden", "alleen", "senioren"], min_age: 12, max_age: 99, prijs: 12, indoor_friendly: true, lat: 52.221, lng: 6.892, duur: "1–2 uur", rating: 4.2, emoji: "🎬", desc: "Arthouse filmtheater aan de Oude Markt met kunst" },
  { id: 136, name: "Schouwburg Hengelo", plaats: "Hengelo", category: "cultuur", audience: ["partner", "vrienden", "senioren", "gezin"], min_age: 6, max_age: 99, prijs: 19, indoor_friendly: true, lat: 52.265, lng: 6.793, duur: "2–3 uur", rating: 4.2, emoji: "🎭", desc: "Schouwburg met theater, cabaret, dans en film" },
  { id: 137, name: "Deventer Schouwburg", plaats: "Deventer", category: "cultuur", audience: ["partner", "vrienden", "senioren"], min_age: 12, max_age: 99, prijs: 30, indoor_friendly: true, lat: 52.254, lng: 6.162, duur: "2–3 uur", rating: 4.3, emoji: "🎭", desc: "Historisch schouwburg in Hanzestad met breed aanbod" },
  { id: 138, name: "Museum De Waag", plaats: "Deventer", category: "museum", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 10, max_age: 99, prijs: 0, indoor_friendly: true, lat: 52.252, lng: 6.16, duur: "1–2 uur", rating: 4.2, emoji: "⚖️", desc: "Gratis museum in oudste waaggebouw, Hanzegeschiedenis" },
  { id: 139, name: "Bergkerk Deventer", plaats: "Deventer", category: "bezienswaardigheid", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 10, max_age: 99, prijs: 0, indoor_friendly: true, lat: 52.251, lng: 6.162, duur: "1 uur", rating: 4.3, emoji: "⛪", desc: "Romaanse kruisbasiliek uit 1198 met concerten en exposities" },
  { id: 140, name: "Bolwerksmolen", plaats: "Deventer", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "gezin"], min_age: 6, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.258, lng: 6.163, duur: "1 uur", rating: 4.1, emoji: "⚙️", desc: "Enige windhoutzaagmolen van Overijssel, draait wekelijks" },
  { id: 141, name: "Zwolse Theaters Odeon & De Spiegel", plaats: "Zwolle", category: "cultuur", audience: ["partner", "vrienden", "senioren", "gezin"], min_age: 6, max_age: 99, prijs: 25, indoor_friendly: true, lat: 52.514, lng: 6.093, duur: "2–3 uur", rating: 4.3, emoji: "🎭", desc: "Twee theaterzalen met honderden voorstellingen per jaar" },
  { id: 142, name: "Peperbus Onze Lieve Vrouwetoren", plaats: "Zwolle", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 8, max_age: 75, prijs: 4, indoor_friendly: false, lat: 52.514, lng: 6.089, duur: "1 uur", rating: 4.4, emoji: "🗼", desc: "Iconische 14e-eeuwse toren beklimmen voor panorama over Zwolle" },
  { id: 143, name: "Filmtheater Fraterhuis", plaats: "Zwolle", category: "cultuur", audience: ["partner", "alleen", "vrienden", "senioren"], min_age: 12, max_age: 99, prijs: 9, indoor_friendly: true, lat: 52.514, lng: 6.094, duur: "2 uur", rating: 4.2, emoji: "🎬", desc: "Arthouse filmtheater met internationale en onafhankelijke films" },
  { id: 144, name: "Landgoed Anningahof Beeldentuin", plaats: "Zwolle", category: "bezienswaardigheid", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 8, max_age: 99, prijs: 13, indoor_friendly: false, lat: 52.498, lng: 6.118, duur: "1–2 uur", rating: 4.3, emoji: "🗿", desc: "Beeldentuin op landgoed met hedendaagse sculpturen" },
  { id: 145, name: "Drents Museum", plaats: "Assen", category: "museum", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 12, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.993, lng: 6.565, duur: "2–3 uur", rating: 4.6, emoji: "🏺", desc: "Topmuseum met veenlijken en wisselende internationale exposities" },
  { id: 146, name: "Stedelijk Museum Coevorden", plaats: "Coevorden", category: "museum", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 10, max_age: 99, prijs: 9, indoor_friendly: true, lat: 52.662, lng: 6.742, duur: "1–2 uur", rating: 4, emoji: "🏰", desc: "Regionaal museum in voormalig kasteel van Coevorden" },
  { id: 147, name: "Van Gogh Huis Drenthe", plaats: "Nieuw-Amsterdam", category: "museum", audience: ["partner", "senioren", "alleen", "vrienden"], min_age: 14, max_age: 99, prijs: 9, indoor_friendly: true, lat: 52.726, lng: 6.869, duur: "1 uur", rating: 4.2, emoji: "🌻", desc: "Enige woning in Nederland waar Van Gogh werkelijk woonde" },
  { id: 148, name: "Kunstwegen Vechtdal", plaats: "Vechtdal", category: "bezienswaardigheid", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 12, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.52, lng: 6.4, duur: "2–4 uur", rating: 4.2, emoji: "🚴", desc: "Openluchtmuseum: kunstwerken fietsend langs de Vecht" },
  { id: 149, name: "HistorieKamer Hardenberg", plaats: "Hardenberg", category: "museum", audience: ["senioren", "partner", "alleen"], min_age: 10, max_age: 99, prijs: 0, indoor_friendly: true, lat: 52.574, lng: 6.619, duur: "1 uur", rating: 3.9, emoji: "🏛️", desc: "Gratis regionaal museum met Vechtdal-archeologie en streekhistorie" },
  { id: 150, name: "Saré Thermen & Beauty", plaats: "Deurningen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 40, indoor_friendly: true, lat: 52.328, lng: 6.892, duur: "hele dag", rating: 4.4, emoji: "🧖", desc: "Grootste thermen van Overijssel met 12 sauna's en hammam" },
  { id: 151, name: "Sauna & Beauty Ommen", plaats: "Ommen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 18, max_age: 99, prijs: 28, indoor_friendly: true, lat: 52.517, lng: 6.424, duur: "hele dag", rating: 4.1, emoji: "♨️", desc: "Intiem saunacomplex midden in Overijssel" },
  { id: 152, name: "Sauna & Beauty Kontrast", plaats: "Dalfsen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 30, indoor_friendly: true, lat: 52.508, lng: 6.262, duur: "hele dag", rating: 4, emoji: "🛁", desc: "Saunacomplex in Sallandse natuur met zwembad en stoom" },
  { id: 153, name: "Sauna Thermen Zuidwolde", plaats: "Zuidwolde", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 25, indoor_friendly: true, lat: 52.672, lng: 6.415, duur: "hele dag", rating: 4.2, emoji: "♨️", desc: "Betaalbare sauna in Drenthe met diverse sauna's en terras" },
  { id: 154, name: "Thermen Anholts", plaats: "Schoonebeek", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 18, max_age: 99, prijs: 33, indoor_friendly: true, lat: 52.665, lng: 6.892, duur: "hele dag", rating: 4.2, emoji: "🌿", desc: "Familiebedrijf met sauna's, thermen en beautycenter" },
  { id: 155, name: "Spabron Hesselerbrug", plaats: "Oosterhesselen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 27, indoor_friendly: true, lat: 52.712, lng: 6.658, duur: "hele dag", rating: 4.3, emoji: "🧖", desc: "Saunahotel met acht sauna's, panorama- en filmsauna" },
  { id: 156, name: "Wellnessresort de Waterlelie", plaats: "Zevenhuizen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 43, indoor_friendly: true, lat: 53.121, lng: 6.361, duur: "hele dag", rating: 4.3, emoji: "💧", desc: "Resort met 9 sauna's, waterval en twee zwembaden" },
  { id: 157, name: "SpaWell Peize", plaats: "Peize", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 43, indoor_friendly: true, lat: 53.147, lng: 6.488, duur: "hele dag", rating: 4.2, emoji: "🌊", desc: "Wellnessresort met 9 sauna's en verwarmde buitenbaden" },
  { id: 158, name: "Veluwse Bron", plaats: "Emst", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 52, indoor_friendly: true, lat: 52.33, lng: 5.98, duur: "hele dag", rating: 4.5, emoji: "🌲", desc: "Luxe wellnessresort op de Veluwe in bosrijke omgeving" },
  { id: 159, name: "Zwaluwhoeve", plaats: "Hierden", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 46, indoor_friendly: true, lat: 52.362, lng: 5.777, duur: "hele dag", rating: 4.4, emoji: "🌿", desc: "Saunaresort op de Veluwe met hammam en buitentuin" },
  { id: 160, name: "Sauna Beautycenter Nijverdal", plaats: "Nijverdal", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 25, indoor_friendly: true, lat: 52.362, lng: 6.464, duur: "halve dag", rating: 3.9, emoji: "🛁", desc: "Sauna- en beautycentrum met stoombad, bubbelbad en buitenbad" },
  { id: 161, name: "Sauna Keizer", plaats: "Oldenzaal", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.314, lng: 6.928, duur: "halve dag", rating: 4, emoji: "♨️", desc: "Betaalbare sauna met drie Finse sauna's en stoombad" },
  { id: 162, name: "Hamam Het Oosten", plaats: "Hengelo", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 40, indoor_friendly: true, lat: 52.268, lng: 6.793, duur: "halve dag", rating: 4.3, emoji: "🕌", desc: "Authentieke hammam met scrub, stoom, sauna en whirlpool" },
  { id: 163, name: "Wellness Bad Boekelo", plaats: "Haaksbergen", category: "wellness", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 16, max_age: 99, prijs: 35, indoor_friendly: true, lat: 52.163, lng: 6.755, duur: "halve dag", rating: 4.1, emoji: "🌿", desc: "Wellness met massage- en saunabehandelingen" },
  { id: 164, name: "Floaten & Zoutkamer Zwolle", plaats: "Zwolle", category: "wellness", audience: ["partner", "vrienden", "alleen"], min_age: 16, max_age: 99, prijs: 49, indoor_friendly: true, lat: 52.516, lng: 6.083, duur: "2–3 uur", rating: 4.4, emoji: "🫧", desc: "Float in zoutwatercabine en halotherapie voor ontspanning" },
  { id: 165, name: "Floatcentrum 't Cocon", plaats: "Deventer", category: "wellness", audience: ["partner", "vrienden", "alleen"], min_age: 16, max_age: 99, prijs: 40, indoor_friendly: true, lat: 52.254, lng: 6.158, duur: "2–3 uur", rating: 4.3, emoji: "🫧", desc: "Floatcentrum in monumentaal pand in hartje Deventer" },
  { id: 166, name: "Linds Wellness", plaats: "Overdinkel", category: "wellness", audience: ["partner", "vrienden", "alleen"], min_age: 16, max_age: 99, prijs: 28, indoor_friendly: true, lat: 52.245, lng: 7.023, duur: "halve dag", rating: 4, emoji: "🧖", desc: "Privésaunacomplex met infrarood, bubbelbad en hamam" },
  { id: 167, name: "Health- en Float Spa Twente", plaats: "Boekelo", category: "wellness", audience: ["partner", "alleen", "senioren"], min_age: 16, max_age: 99, prijs: 55, indoor_friendly: true, lat: 52.217, lng: 6.793, duur: "2–3 uur", rating: 4.2, emoji: "🫧", desc: "Specialist in floaten, infrarood en zuurstoftherapie" },
  { id: 168, name: "Escape Room Hardenberg", plaats: "Hardenberg", category: "uitgaan", audience: ["vrienden", "partner", "gezin"], min_age: 12, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.574, lng: 6.618, duur: "1–2 uur", rating: 4.1, emoji: "🔐", desc: "Meerdere themarooms voor 2–24 personen in Hardenberg" },
  { id: 169, name: "Escaperoom Coevorden Mission Mars", plaats: "Coevorden", category: "uitgaan", audience: ["vrienden", "partner", "gezin"], min_age: 12, max_age: 99, prijs: 20, indoor_friendly: true, lat: 52.66, lng: 6.743, duur: "1–2 uur", rating: 4.3, emoji: "🚀", desc: "High-tech escaperoom met tablets en audiovisuele effecten" },
  { id: 170, name: "Plaza Sportz Coevorden", plaats: "Coevorden", category: "uitgaan", audience: ["vrienden", "gezin", "senioren"], min_age: 6, max_age: 99, prijs: 10, indoor_friendly: true, lat: 52.66, lng: 6.744, duur: "1–3 uur", rating: 4, emoji: "🎳", desc: "Hyperbowling, padel en jeu de boules onder één dak" },
  { id: 171, name: "The Great Escape Zwolle", plaats: "Zwolle", category: "uitgaan", audience: ["vrienden", "partner", "gezin"], min_age: 10, max_age: 99, prijs: 22, indoor_friendly: true, lat: 52.516, lng: 6.083, duur: "1–2 uur", rating: 4.6, emoji: "🔐", desc: "Vijf escaperooms én een bier-escape in Zwolle" },
  { id: 172, name: "Swolland Escape", plaats: "Zwolle", category: "uitgaan", audience: ["vrienden", "partner"], min_age: 12, max_age: 99, prijs: 23, indoor_friendly: true, lat: 52.517, lng: 6.084, duur: "1–2 uur", rating: 4.5, emoji: "🔐", desc: "Premium escaperooms met geavanceerde mechanische puzzels" },
  { id: 173, name: "Kobalt Zwolle Karten & VR", plaats: "Zwolle", category: "avontuur", audience: ["vrienden", "gezin", "partner"], min_age: 10, max_age: 99, prijs: 20, indoor_friendly: true, lat: 52.51, lng: 6.076, duur: "1–2 uur", rating: 4.2, emoji: "🏎️", desc: "Indoor e-karten op 380m baan plus VR-experiences" },
  { id: 174, name: "Bowlen & Zo Zwolle", plaats: "Zwolle", category: "uitgaan", audience: ["vrienden", "gezin", "partner", "senioren"], min_age: 6, max_age: 99, prijs: 16, indoor_friendly: true, lat: 52.516, lng: 6.082, duur: "1–3 uur", rating: 4.1, emoji: "🎳", desc: "Bowling, glowgolf, poolen en karaoke" },
  { id: 175, name: "Boulderhal Roest", plaats: "Zwolle", category: "avontuur", audience: ["vrienden", "partner", "alleen"], min_age: 8, max_age: 99, prijs: 14, indoor_friendly: true, lat: 52.508, lng: 6.076, duur: "2–3 uur", rating: 4.4, emoji: "🧗", desc: "Moderne boulderhal met gezellige bar in Zwolle" },
  { id: 176, name: "Deventer Escape", plaats: "Deventer", category: "uitgaan", audience: ["vrienden", "partner", "gezin"], min_age: 12, max_age: 99, prijs: 18, indoor_friendly: true, lat: 52.255, lng: 6.161, duur: "1–2 uur", rating: 4.2, emoji: "🔐", desc: "Drie escaperooms waaronder De Vliegende Hollander" },
  { id: 177, name: "Bowlen & Zo Deventer", plaats: "Deventer", category: "uitgaan", audience: ["vrienden", "gezin", "partner", "senioren"], min_age: 6, max_age: 99, prijs: 15, indoor_friendly: true, lat: 52.255, lng: 6.16, duur: "1–3 uur", rating: 4, emoji: "🎳", desc: "Glowgolf, bowling en pool in Deventer" },
  { id: 178, name: "Lasergame Hengelo De Tapperij", plaats: "Hengelo", category: "uitgaan", audience: ["vrienden", "partner", "gezin"], min_age: 8, max_age: 99, prijs: 11, indoor_friendly: true, lat: 52.265, lng: 6.793, duur: "1–2 uur", rating: 4.1, emoji: "🔫", desc: "Lasergame én poolen op acht biljarttafels" },
  { id: 179, name: "ZERO55 Enschede Karten & Lasertag", plaats: "Enschede", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 10, max_age: 99, prijs: 19, indoor_friendly: true, lat: 52.225, lng: 6.897, duur: "1–3 uur", rating: 4.3, emoji: "🏎️", desc: "E-karten, lasertag, escape en VR-racing bij FC Twente" },
  { id: 180, name: "Starworld Enschede Lasergame", plaats: "Enschede", category: "uitgaan", audience: ["vrienden", "gezin", "partner"], min_age: 8, max_age: 99, prijs: 12, indoor_friendly: true, lat: 52.224, lng: 6.897, duur: "1–2 uur", rating: 4.2, emoji: "🔫", desc: "Grote indoor lasergame- en reball-arena" },
  { id: 181, name: "Cube Bouldergym Enschede", plaats: "Enschede", category: "avontuur", audience: ["vrienden", "partner", "alleen"], min_age: 8, max_age: 99, prijs: 13, indoor_friendly: true, lat: 52.221, lng: 6.892, duur: "2–3 uur", rating: 4.4, emoji: "🧗", desc: "Boulderhal met 200 routes op diverse wanden" },
  { id: 182, name: "GlowGolf Enschede", plaats: "Enschede", category: "uitgaan", audience: ["vrienden", "gezin", "partner"], min_age: 6, max_age: 99, prijs: 10, indoor_friendly: true, lat: 52.224, lng: 6.896, duur: "1–2 uur", rating: 4.2, emoji: "⛳", desc: "18-holes glow-in-the-dark midgetgolf met 3D-bril" },
  { id: 183, name: "Bowling Go Planet Enschede", plaats: "Enschede", category: "uitgaan", audience: ["vrienden", "gezin", "partner", "senioren"], min_age: 6, max_age: 99, prijs: 13, indoor_friendly: true, lat: 52.225, lng: 6.896, duur: "1–2 uur", rating: 4.1, emoji: "🎳", desc: "16 moderne bowlingbanen met interactieve animaties" },
  { id: 184, name: "Axe Throwing 't Twents Kwartiertje", plaats: "Diepenheim", category: "avontuur", audience: ["vrienden", "partner"], min_age: 18, max_age: 99, prijs: 25, indoor_friendly: true, lat: 52.271, lng: 6.556, duur: "1–2 uur", rating: 4.5, emoji: "🪓", desc: "Indoor bijlgooien op vier banen, primeur in Oost-Nederland" },
  { id: 185, name: "Nationaal Park Weerribben-Wieden", plaats: "Sint Jansklooster", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.7333, lng: 6.0167, duur: "2–4 uur", rating: 4.7, emoji: "🛶", desc: "Grootste laagveengebied met riet, kanalen en vogels" },
  { id: 186, name: "Nationaal Park Sallandse Heuvelrug", plaats: "Holten", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.2833, lng: 6.4167, duur: "2–3 uur", rating: 4.6, emoji: "🌿", desc: "Heide, vennen en panoramapunt met zicht tot Deventer" },
  { id: 187, name: "Uitkijktoren Besthmenerberg", plaats: "Lemele", category: "natuur", audience: ["partner", "vrienden", "senioren", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.475, lng: 6.3833, duur: "1–3 uur", rating: 4.4, emoji: "🗼", desc: "18 meter hoge toren met weids uitzicht over het Vechtdal" },
  { id: 188, name: "Landgoed Twickel", plaats: "Ambt Delden", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.2667, lng: 6.7167, duur: "2–3 uur", rating: 4.7, emoji: "🏰", desc: "Grootste erfgoedlandgoed van Overijssel met wandelpaden" },
  { id: 189, name: "Uitkijktoren IJhorst Reestdal", plaats: "IJhorst", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.5833, lng: 6.2333, duur: "1–2 uur", rating: 4.5, emoji: "🔭", desc: "17 meter hoge houten toren met uitzicht over de Reest" },
  { id: 190, name: "Ootmarsum Kunstenaarsstadje", plaats: "Ootmarsum", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.4083, lng: 6.9, duur: "1–2 uur", rating: 4.5, emoji: "🎨", desc: "Middeleeuwse vakwerkhuizen, galeries, molen en kerk" },
  { id: 191, name: "Watermolen Singraven", plaats: "Denekamp", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: true, lat: 52.3833, lng: 7, duur: "1–2 uur", rating: 4.4, emoji: "⚙️", desc: "Werkende koren- en zaagmolen op landgoed sinds 1448" },
  { id: 192, name: "Blokzijl Vestingstad", plaats: "Blokzijl", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.725, lng: 5.9667, duur: "1–2 uur", rating: 4.5, emoji: "⚓", desc: "Schilderachtige haven, grachten en Gouden Eeuw-gevels" },
  { id: 193, name: "Hasselt Hanzestad", plaats: "Hasselt", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.5917, lng: 6.0917, duur: "1–2 uur", rating: 4.3, emoji: "🏛️", desc: "Vestingstadje met kalkoven, grachten en 70+ monumenten" },
  { id: 194, name: "Rondvaart Hasselt De Otter", plaats: "Hasselt", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden"], min_age: 0, max_age: 99, prijs: 12, indoor_friendly: false, lat: 52.5917, lng: 6.0918, duur: "1–2 uur", rating: 4.4, emoji: "🚢", desc: "Elektrische boot langs vestingwerk en het Zwarte Water" },
  { id: 195, name: "Vesting Coevorden", plaats: "Coevorden", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.6583, lng: 6.7417, duur: "1–2 uur", rating: 4.3, emoji: "🏰", desc: "Oudste stad van Drenthe met grachten en stervormige vesting" },
  { id: 196, name: "Arboretum Poort Bulten", plaats: "De Lutte", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.3167, lng: 7, duur: "1–2 uur", rating: 4.5, emoji: "🌳", desc: "2500 bomen uit 1000 soorten, rolstoeltoegankelijke paden" },
  { id: 197, name: "Wierdense Veld Hoogveen", plaats: "Wierden", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.3583, lng: 6.4583, duur: "1–2 uur", rating: 4.4, emoji: "🌾", desc: "Zeldzaam levend hoogveen met heide en wollegras" },
  { id: 198, name: "Kasteel Rechteren & Vechtdal", plaats: "Dalfsen", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.5, lng: 6.2917, duur: "2–3 uur", rating: 4.5, emoji: "🦢", desc: "Middeleeuws kasteel met vrij toegankelijk landgoed" },
  { id: 199, name: "Nationaal Park Drents-Friese Wold", plaats: "Diever", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.85, lng: 6.3167, duur: "2–4 uur", rating: 4.6, emoji: "🌲", desc: "Groot aaneengesloten bos met heide en uitkijktoren" },
  { id: 200, name: "Hattem Hanzestad", plaats: "Hattem", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.475, lng: 6.0583, duur: "1–2 uur", rating: 4.4, emoji: "🎭", desc: "Schilderachtige Hanzestad met Anton Pieck Museum" },
  { id: 201, name: "Elburg Vestingstadje", plaats: "Elburg", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.45, lng: 5.8333, duur: "1–2 uur", rating: 4.5, emoji: "⚓", desc: "Intact middeleeuws stratenplan, stadspoort en vestingwal" },
  { id: 202, name: "Landgoed De Wiersse Tuinen", plaats: "Vorden", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 12, max_age: 99, prijs: 8, indoor_friendly: false, lat: 52.1, lng: 6.3167, duur: "1–2 uur", rating: 4.6, emoji: "🌸", desc: "Monumentale historische tuin van 16 hectare" },
  { id: 203, name: "Staphorst Lintdorp", plaats: "Staphorst", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.6333, lng: 6.2, duur: "1–2 uur", rating: 4.1, emoji: "👘", desc: "Uniek lint met historische boerderijen en klederdracht" },
  { id: 204, name: "Lemelerberg Heide & Bos", plaats: "Lemele", category: "natuur", audience: ["partner", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.4667, lng: 6.3583, duur: "2–3 uur", rating: 4.4, emoji: "🥾", desc: "Eindeloze heide, zandvlaktes en loofbos in het Vechtdal" },
  { id: 205, name: "Landgoederenwandeling Hoonhorst", plaats: "Hoonhorst", category: "natuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.525, lng: 6.2583, duur: "2–3 uur", rating: 4.4, emoji: "🌿", desc: "Wandeling langs zeven landgoederen met lanen en beekdalen" },
  { id: 206, name: "Total Outdoor Kanovaren Vechtdal", plaats: "Hardenberg", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 8, max_age: 99, prijs: 25, indoor_friendly: false, lat: 52.576, lng: 6.617, duur: "halve dag", rating: 4.4, emoji: "🛶", desc: "Canadese kano op de Vecht door het schilderachtige Vechtdal" },
  { id: 207, name: "NuNature Kano & SUP Vecht", plaats: "Ommen", category: "avontuur", audience: ["vrienden", "partner", "gezin", "alleen"], min_age: 10, max_age: 99, prijs: 20, indoor_friendly: false, lat: 52.516, lng: 6.426, duur: "halve dag", rating: 4.3, emoji: "🏄", desc: "Kano, kayak of SUP huren op de Regge en Vecht" },
  { id: 208, name: "Kanoverhuur Salland", plaats: "Wijhe", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 8, max_age: 99, prijs: 15, indoor_friendly: false, lat: 52.391, lng: 6.135, duur: "halve dag", rating: 4.2, emoji: "🛶", desc: "Kano of SUP over het Overijssels kanaal door groen Salland" },
  { id: 209, name: "WeerribbenSUP", plaats: "Ossenzijl", category: "avontuur", audience: ["vrienden", "partner", "alleen"], min_age: 14, max_age: 99, prijs: 23, indoor_friendly: false, lat: 52.761, lng: 5.924, duur: "halve dag", rating: 4.6, emoji: "🏄", desc: "SUP-board door de rietlanden van Nationaal Park Weerribben" },
  { id: 210, name: "Kanoverhuur Oost Berkel", plaats: "Almen", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 8, max_age: 99, prijs: 17, indoor_friendly: false, lat: 52.126, lng: 6.258, duur: "halve dag", rating: 4.2, emoji: "🛶", desc: "Canadese kano op de Berkel door het Achterhoekse landschap" },
  { id: 211, name: "Adventure Eefde Klimbos & Karten", plaats: "Eefde", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 6, max_age: 99, prijs: 22, indoor_friendly: false, lat: 52.166, lng: 6.216, duur: "halve dag", rating: 4.3, emoji: "🏎️", desc: "Groot klimbos plus kartbaan en survival in de Achterhoek" },
  { id: 212, name: "Paintball Twente Hengelo", plaats: "Hengelo", category: "avontuur", audience: ["vrienden", "partner"], min_age: 12, max_age: 99, prijs: 23, indoor_friendly: false, lat: 52.262, lng: 6.793, duur: "halve dag", rating: 4.3, emoji: "🎯", desc: "Grootste outdoor paintballveld van Twente, al 25 jaar" },
  { id: 213, name: "Paintball Drenthe Havelte", plaats: "Havelte", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 6, max_age: 99, prijs: 23, indoor_friendly: false, lat: 52.776, lng: 6.229, duur: "halve dag", rating: 4.2, emoji: "🎯", desc: "Outdoor paintball in het bos met professionele marshalls" },
  { id: 214, name: "Paintball Center Coevorden", plaats: "Coevorden", category: "avontuur", audience: ["vrienden", "partner"], min_age: 12, max_age: 99, prijs: 25, indoor_friendly: true, lat: 52.663, lng: 6.747, duur: "halve dag", rating: 4.2, emoji: "🎯", desc: "Indoor en outdoor paintball op 9000 m² met bunkers" },
  { id: 215, name: "Waterskibaan Ermerstrand", plaats: "Erm", category: "avontuur", audience: ["vrienden", "partner", "alleen"], min_age: 10, max_age: 99, prijs: 33, indoor_friendly: false, lat: 52.764, lng: 6.642, duur: "halve dag", rating: 4.4, emoji: "🤿", desc: "Kabelski voor wakeboard en waterski (mei–sept)" },
  { id: 216, name: "Waterski Twente Rutbeek", plaats: "Enschede", category: "avontuur", audience: ["vrienden", "partner", "alleen"], min_age: 10, max_age: 99, prijs: 30, indoor_friendly: false, lat: 52.223, lng: 6.861, duur: "halve dag", rating: 4.5, emoji: "🏄", desc: "Kabelski met 14 obstacles op recreatieplas het Rutbeek" },
  { id: 217, name: "Pitch & Putt Golf Lemele", plaats: "Lemele", category: "avontuur", audience: ["vrienden", "partner", "senioren", "gezin"], min_age: 8, max_age: 99, prijs: 18, indoor_friendly: false, lat: 52.492, lng: 6.381, duur: "halve dag", rating: 4.3, emoji: "⛳", desc: "18-holes pitch & putt aan de voet van de Lemelerberg" },
  { id: 218, name: "GPS-tocht Beuseberg Holten", plaats: "Holten", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 10, max_age: 99, prijs: 15, indoor_friendly: false, lat: 52.289, lng: 6.424, duur: "2 uur", rating: 4.2, emoji: "📍", desc: "GPS-schattenjacht van 3,5 km over de Beuseberg" },
  { id: 219, name: "Geocaching Vechtdal Ommen", plaats: "Ommen", category: "avontuur", audience: ["vrienden", "partner", "gezin"], min_age: 8, max_age: 99, prijs: 12, indoor_friendly: false, lat: 52.516, lng: 6.427, duur: "2 uur", rating: 4.3, emoji: "📍", desc: "GPS-speurtocht naar de Big Five van het Vechtdal" },
  { id: 220, name: "Mountainbikeverhuur Ruinen", plaats: "Ruinen", category: "avontuur", audience: ["vrienden", "partner", "alleen", "senioren"], min_age: 10, max_age: 99, prijs: 16, indoor_friendly: false, lat: 52.758, lng: 6.358, duur: "dag", rating: 4.2, emoji: "🚵", desc: "Topklasse mountainbikes huren in Drenthe, helm inbegrepen" },
  { id: 221, name: "Hawe Tweewielers Fietsverhuur", plaats: "Hardenberg", category: "avontuur", audience: ["vrienden", "partner", "alleen", "gezin", "senioren"], min_age: 8, max_age: 99, prijs: 18, indoor_friendly: false, lat: 52.576, lng: 6.619, duur: "dag", rating: 4.2, emoji: "🚵", desc: "MTB en e-bike huren met bezorgservice op je adres" },
  { id: 222, name: "Stal de Eik Buitenrit Holterberg", plaats: "Holten", category: "avontuur", audience: ["vrienden", "partner", "senioren"], min_age: 14, max_age: 99, prijs: 35, indoor_friendly: false, lat: 52.286, lng: 6.42, duur: "2 uur", rating: 4.4, emoji: "🐴", desc: "Begeleide bosrit over de Sallandse Heuvelrug" },
  { id: 223, name: "Manege Les Chevaux Buitenrit", plaats: "Buinen", category: "avontuur", audience: ["vrienden", "partner", "senioren"], min_age: 14, max_age: 99, prijs: 35, indoor_friendly: false, lat: 52.842, lng: 6.826, duur: "2 uur", rating: 4.3, emoji: "🐴", desc: "Uurtje paardrijden op de Drentse Hondsrug" },
  { id: 224, name: "Manege Gasselte Bosrit", plaats: "Gasselte", category: "avontuur", audience: ["vrienden", "partner", "senioren"], min_age: 14, max_age: 99, prijs: 30, indoor_friendly: false, lat: 52.967, lng: 6.778, duur: "2 uur", rating: 4.4, emoji: "🐴", desc: "Dagelijkse bosritten en speciale vollemaan-rit in Drenthe" },

  // ===== Uitbreiding ronde 4: dunne categorieen + kids (juni 2026) =====
  { id: 225, name: "De Wolventuin", plaats: "Stegeren", category: "binnenpret", audience: ["gezin"], min_age: 0, max_age: 12, prijs: 7, indoor_friendly: true, lat: 52.535, lng: 6.432, duur: "2–3 uur", rating: 4.3, emoji: "🐺", desc: "Indoor speelparadijs met restaurant, pumptrack en adventure golf" },
  { id: 226, name: "Dierenpark Taman Indonesia", plaats: "Kallenkote", category: "dieren", audience: ["gezin", "partner", "senioren"], min_age: 1, max_age: 12, prijs: 13, indoor_friendly: false, lat: 52.764, lng: 6.071, duur: "2–3 uur", rating: 4.1, emoji: "🦜", desc: "Exotisch park met honderden Indonesische vogels en zoogdieren" },
  { id: 227, name: "MegaPret", plaats: "Lievelde", category: "binnenpret", audience: ["gezin"], min_age: 0, max_age: 12, prijs: 13, indoor_friendly: true, lat: 51.976, lng: 6.577, duur: "2–4 uur", rating: 4.3, emoji: "🎡", desc: "Binnen- en buitenspeelpark met rodelbaan, spraypark en tractorbaan" },
  { id: 228, name: "Kinderboerderij Samenzóo", plaats: "Staphorst", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.642, lng: 6.199, duur: "1–2 uur", rating: 4.2, emoji: "🐑", desc: "Gratis kinderboerderij in Staphorst met allerlei boerderijdieren" },
  { id: 229, name: "Griendtsveenpark", plaats: "Schoonebeek", category: "dieren", audience: ["gezin", "senioren"], min_age: 0, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.66, lng: 6.887, duur: "1–2 uur", rating: 4.3, emoji: "🦌", desc: "Gratis park met herten, alpaca's, lama's en speeltuinen" },
  { id: 230, name: "Teun's Hoeve", plaats: "Balkbrug", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.572, lng: 6.322, duur: "1–2 uur", rating: 4.1, emoji: "🐴", desc: "Educatieve kinderboerderij met zintuigentuin en natuurspeelplaats" },
  { id: 231, name: "Natuurlijk Heidepark", plaats: "Lemelerveld", category: "avontuur", audience: ["gezin"], min_age: 2, max_age: 12, prijs: 5, indoor_friendly: false, lat: 52.456, lng: 6.348, duur: "2–4 uur", rating: 4.5, emoji: "🏕️", desc: "Kabouterspeeltuin, klimbos en natuurzwemplas midden in de natuur" },
  { id: 232, name: "Speelbos Lorken", plaats: "Drouwen", category: "avontuur", audience: ["gezin"], min_age: 3, max_age: 12, prijs: 0, indoor_friendly: false, lat: 52.901, lng: 6.756, duur: "1–2 uur", rating: 4.3, emoji: "🌲", desc: "Gratis avontuurlijk speelbos naast Boomkroonpad met klimtoestellen" },
  { id: 233, name: "FunZone Hoogeveen", plaats: "Hoogeveen", category: "binnenpret", audience: ["gezin"], min_age: 0, max_age: 12, prijs: 10, indoor_friendly: true, lat: 52.727, lng: 6.47, duur: "2–3 uur", rating: 4.1, emoji: "🏟️", desc: "Indoor speelhal voor 0–12 jaar met klimtorens en horeca" },
  { id: 234, name: "Ballorig Hattem", plaats: "Hattem", category: "binnenpret", audience: ["gezin"], min_age: 0, max_age: 12, prijs: 10, indoor_friendly: true, lat: 52.479, lng: 6.063, duur: "2–3 uur", rating: 4.2, emoji: "🎠", desc: "Overdekt kinderspeelparadijs met peuterhoek en klimstructuren" },
  { id: 235, name: "Kinderspeelboerderij 't Höfke", plaats: "Bentelo", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 12, prijs: 5, indoor_friendly: true, lat: 52.286, lng: 6.693, duur: "2–3 uur", rating: 4.3, emoji: "🐄", desc: "Speelboerderij met indoor speelschuur, trampolines en scootertrack" },
  { id: 236, name: "Stadsboerderij Beeklust", plaats: "Almelo", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.354, lng: 6.662, duur: "1–2 uur", rating: 4.2, emoji: "🐖", desc: "Gratis stadsboerderij met paarden, koeien, varkens en ponykar" },
  { id: 237, name: "Kinderboerderij Wijhe", plaats: "Wijhe", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.39, lng: 6.139, duur: "1–2 uur", rating: 4, emoji: "🐰", desc: "Gratis kinderboerderij met schapen, geiten, kippen en watervogels" },
  { id: 238, name: "Speelnatuur OERRR Oud Groevenbeek", plaats: "Ermelo", category: "speeltuin", audience: ["gezin"], min_age: 2, max_age: 12, prijs: 2, indoor_friendly: false, lat: 52.299, lng: 5.621, duur: "1–2 uur", rating: 4.4, emoji: "🌿", desc: "Inclusieve natuurspeeltuin met water, zand en modder" },
  { id: 239, name: "Kinderboerderij Nijverdal", plaats: "Nijverdal", category: "dieren", audience: ["gezin"], min_age: 0, max_age: 10, prijs: 0, indoor_friendly: false, lat: 52.369, lng: 6.463, duur: "1–2 uur", rating: 4, emoji: "🐎", desc: "Gratis kinderboerderij met pony's, schapen, geiten en speeltuin" },
  { id: 240, name: "Kinepolis Enschede", plaats: "Enschede", category: "cultuur", audience: ["partner", "vrienden", "senioren", "alleen", "gezin"], min_age: 6, max_age: 99, prijs: 14, indoor_friendly: true, lat: 52.232, lng: 6.857, duur: "2–3 uur", rating: 4.2, emoji: "🎬", desc: "Grote bioscoop met 10 zalen en IMAX naast de Grolsch Veste" },
  { id: 241, name: "Bovenkerk Kampen", plaats: "Kampen", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 8, max_age: 99, prijs: 0, indoor_friendly: true, lat: 52.557, lng: 5.913, duur: "1–2 uur", rating: 4.5, emoji: "⛪", desc: "Gotische kruisbasiliek met beroemd orgel en exposities" },
  { id: 242, name: "Nieuwe Toren Kampen", plaats: "Kampen", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 10, max_age: 75, prijs: 3, indoor_friendly: false, lat: 52.557, lng: 5.912, duur: "1–2 uur", rating: 4.4, emoji: "🗼", desc: "65m hoge stadstoren beklimmen voor panorama over Kampen" },
  { id: 243, name: "Kamper Kogge & Koggewerf", plaats: "Kampen", category: "cultuur", audience: ["partner", "senioren", "vrienden", "gezin"], min_age: 6, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.555, lng: 5.915, duur: "1–2 uur", rating: 4.2, emoji: "⚓", desc: "Enige varende kogge van Nederland, werf op donderdag open" },
  { id: 244, name: "Kasteel Warmelo", plaats: "Diepenheim", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden"], min_age: 6, max_age: 99, prijs: 8, indoor_friendly: false, lat: 52.264, lng: 6.566, duur: "1–2 uur", rating: 4.3, emoji: "🏰", desc: "Eeuwenoud landgoed met 7 ha historische tuin en terras" },
  { id: 245, name: "Noordmolen Twickel", plaats: "Ambt Delden", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 8, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.264, lng: 6.692, duur: "1–2 uur", rating: 4.4, emoji: "⚙️", desc: "650 jaar oude watermolen met olie-persdemonstraties" },
  { id: 246, name: "Hildo Krop Museum", plaats: "Steenwijk", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 12, max_age: 99, prijs: 11, indoor_friendly: true, lat: 52.787, lng: 6.119, duur: "1–2 uur", rating: 4.2, emoji: "🗿", desc: "Beeldhouwkunst van Hildo Krop in Art Nouveau-villa" },
  { id: 247, name: "Galerie & Beeldentuin Beeldschoon", plaats: "De Pol", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 10, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.751, lng: 6.053, duur: "1–2 uur", rating: 4.3, emoji: "🖼️", desc: "Gratis galerie en beeldentuin, zaterdag en zondag open" },
  { id: 248, name: "Beelden in Gees", plaats: "Gees", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 10, max_age: 99, prijs: 13, indoor_friendly: false, lat: 52.674, lng: 6.729, duur: "2–3 uur", rating: 4.6, emoji: "🎨", desc: "7 ha beeldenpark met 200+ werken (apr–nov)" },
  { id: 249, name: "Nationaal Gevangenismuseum", plaats: "Veenhuizen", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen", "gezin"], min_age: 10, max_age: 99, prijs: 15, indoor_friendly: true, lat: 52.942, lng: 6.427, duur: "2–3 uur", rating: 4.5, emoji: "🔒", desc: "UNESCO-erfgoed: authentieke gevangenis met boevenbus en rondleiding" },
  { id: 250, name: "Olie- en Korenmolen Woldzigt", plaats: "Roderwolde", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 6, max_age: 99, prijs: 3, indoor_friendly: false, lat: 53.094, lng: 6.448, duur: "1–2 uur", rating: 4.4, emoji: "🌾", desc: "Werkende industriemolen uit 1852 met olie- en graanmuseum" },
  { id: 251, name: "Historisch Museum Ommen", plaats: "Ommen", category: "cultuur", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 8, max_age: 99, prijs: 7, indoor_friendly: true, lat: 52.519, lng: 6.422, duur: "1–2 uur", rating: 4.1, emoji: "🏛️", desc: "Vechtdal-erfgoed in molen Den Oordt, di t/m vr open" },
  { id: 252, name: "Rondvaart Zwolle", plaats: "Zwolle", category: "water", audience: ["partner", "senioren", "vrienden", "alleen", "gezin"], min_age: 0, max_age: 99, prijs: 9, indoor_friendly: false, lat: 52.514, lng: 6.081, duur: "1–2 uur", rating: 4.3, emoji: "🚢", desc: "Vaartocht door de historische grachten van Zwolle" },
  { id: 253, name: "Tuindorpbad Hengelo", plaats: "Hengelo", category: "water", audience: ["partner", "vrienden", "senioren", "gezin"], min_age: 0, max_age: 99, prijs: 4, indoor_friendly: false, lat: 52.266, lng: 6.782, duur: "2–3 uur", rating: 4.3, emoji: "🏖️", desc: "Oudste natuurzwembad van Nederland (1923), zonder chloor" },
  { id: 254, name: "Recreatieplas De Oldemeijer", plaats: "Rheeze", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.545, lng: 6.674, duur: "2–3 uur", rating: 4.3, emoji: "🏝️", desc: "Gratis bosplassen bij Hardenberg met eilandje en zandstrand" },
  { id: 255, name: "Bosbad Zwinderen", plaats: "Zwinderen", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 6, indoor_friendly: false, lat: 52.689, lng: 6.773, duur: "2–3 uur", rating: 4.4, emoji: "🌊", desc: "Mooiste openluchtbad van Drenthe met drie bassins (apr–sep)" },
  { id: 256, name: "Heuveltjesbosbad", plaats: "Balkbrug", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 5, indoor_friendly: false, lat: 52.606, lng: 6.287, duur: "2–3 uur", rating: 4.5, emoji: "🌿", desc: "Tweemaal verkozen mooiste openluchtbad in bosrijk Reestdal" },
  { id: 257, name: "Openluchtzwembad Gerner", plaats: "Dalfsen", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 4, indoor_friendly: false, lat: 52.5, lng: 6.264, duur: "2–3 uur", rating: 4.2, emoji: "💦", desc: "Openluchtbad aan de Vechtoevers (apr–sep)" },
  { id: 258, name: "Openluchtzwembad De Meule", plaats: "Nieuwleusen", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 4, indoor_friendly: false, lat: 52.587, lng: 6.271, duur: "1–2 uur", rating: 4.1, emoji: "🏊", desc: "Gemeentelijk openluchtbad met twee bassins en peuterbad" },
  { id: 259, name: "Zwemparadijs De Wilder", plaats: "Haaksbergen", category: "water", audience: ["gezin", "partner", "vrienden", "senioren"], min_age: 0, max_age: 99, prijs: 8, indoor_friendly: true, lat: 52.153, lng: 6.737, duur: "2–3 uur", rating: 4.2, emoji: "🌀", desc: "Subtropisch zwemparadijs met 80m glijbaan en draaikolk" },
  { id: 260, name: "Steenwijk Vestingstad", plaats: "Steenwijk", category: "bezienswaardigheid", audience: ["partner", "senioren", "vrienden", "alleen"], min_age: 0, max_age: 99, prijs: 0, indoor_friendly: false, lat: 52.787, lng: 6.118, duur: "1–2 uur", rating: 4.2, emoji: "🏰", desc: "15e-eeuwse vestingwallen en een gezellige binnenstad" },
];

/* ----------------------------------------------------- leeftijdssync */
function ageWindow(ages) { return ages.length ? { low: Math.min(...ages), high: Math.max(...ages) } : null; }
function matchesAges(a, ages) { return ages.length === 0 ? true : ages.every((x) => x >= a.min_age && x <= a.max_age); }
function fitScore(a, ages) {
  const w = ageWindow(ages); if (!w) return 0;
  const span = Math.max(1, a.max_age - a.min_age);
  const familySpan = Math.max(1, w.high - w.low);
  const tightness = familySpan / span;
  const centered = 1 - Math.abs((a.min_age + a.max_age) / 2 - (w.low + w.high) / 2) / 50;
  return Math.max(0, tightness * 0.6 + centered * 0.4);
}

/* ----------------------------------------------------- storage */
function loadJSON(k, f) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ----------------------------------------------------- audio (Web Audio) */
const Sound = (function () {
  let ctx = null;
  let enabled = loadJSON(SOUND_KEY, true);
  function ac() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(c, freq, t0, dur, type, peak) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  return {
    get enabled() { return enabled; },
    set(v) { enabled = v; saveJSON(SOUND_KEY, v); if (v) ac(); },
    unlock() { if (enabled) ac(); },
    tick() { if (!enabled) return; const c = ac(); if (!c) return; tone(c, 560 + Math.random() * 160, c.currentTime, 0.06, "triangle", 0.045); },
    whoosh() {
      if (!enabled) return; const c = ac(); if (!c) return; const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(680, t + 0.18);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.24);
    },
    ding() {
      if (!enabled) return; const c = ac(); if (!c) return; const t = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.085, 0.55, "sine", 0.16));
    },
    blip() { if (!enabled) return; const c = ac(); if (!c) return; tone(c, 660, c.currentTime, 0.09, "sine", 0.08); },
  };
})();

function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} }

/* ----------------------------------------------------- Lucide icon */
function Icon({ name, size = 22, className = "", stroke = 2.2 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = "";
      ref.current.setAttribute("data-lucide", name);
      window.lucide.createIcons({ attrs: { "stroke-width": stroke }, nameAttr: "data-lucide" });
    }
  });
  return <i ref={ref} data-lucide={name} style={{ width: size, height: size, display: "inline-flex" }} className={className} />;
}

/* ----------------------------------------------------- stars */
function Stars({ value, size = 16 }) {
  const star = (state, i) => {
    const id = "g" + i + "_" + Math.round(value * 10);
    return (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {state === "half" && (
          <defs><linearGradient id={id}><stop offset="50%" stopColor="#F5A623" /><stop offset="50%" stopColor="#E6E6E6" /></linearGradient></defs>
        )}
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"
          fill={state === "full" ? "#F5A623" : state === "half" ? "url(#" + id + ")" : "#E2E8E5"} />
      </svg>
    );
  };
  const full = Math.floor(value), half = value - full >= 0.4;
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => star(i < full ? "full" : i === full && half ? "half" : "empty", i))}
      <span className="ml-1.5 text-sm font-bold text-ink">{value.toFixed(1)}</span>
    </div>
  );
}

/* ----------------------------------------------------- visual hero */
// Sfeervolle, per-categorie SVG-scène achter de emoji. Wit/zwart met opacity
// zodat het op elke categorie-gradient elegant oogt.
function HeroScene({ category, seed = 0 }) {
  const W = "rgba(255,255,255,0.22)", D = "rgba(0,0,0,0.10)", L = "rgba(255,255,255,0.42)";
  // Deterministische pseudo-random per uitje → elk uitje een eigen variant.
  const rnd = (n) => { const x = Math.sin((seed + 1) * (n + 1) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const flip = rnd(7) > 0.5;
  const tree = (x, s) => <g transform={`translate(${x},155) scale(${s})`} fill={D}><rect x="-3" y="0" width="6" height="22" /><path d="M0 -30 L20 6 H-20 Z" /><path d="M0 -48 L16 -16 H-16 Z" /></g>;
  const scenes = {
    natuur: <g><circle cx="330" cy="46" r="24" fill={L} /><path d="M0 150 Q100 116 210 140 T400 132 V200 H0 Z" fill={W} /><path d="M0 178 Q130 152 270 172 T400 168 V200 H0 Z" fill={D} />{tree(60, 1)}{tree(110, 0.8)}</g>,
    water: <g><circle cx="330" cy="46" r="22" fill={L} /><path d="M0 150 Q50 138 100 150 T200 150 T300 150 T400 150 V200 H0 Z" fill={W} /><path d="M0 168 Q50 156 100 168 T200 168 T300 168 T400 168 V200 H0 Z" fill={D} /><path d="M0 186 Q50 176 100 186 T200 186 T300 186 T400 186 V200 H0 Z" fill={W} /></g>,
    dieren: <g><path d="M0 172 H400 V200 H0 Z" fill={D} /><g fill={W}>{[40, 80, 120].map((x, i) => <g key={i}><circle cx={x} cy={140 + (i % 2) * 14} r="7" /><circle cx={x - 7} cy={132 + (i % 2) * 14} r="3" /><circle cx={x + 7} cy={132 + (i % 2) * 14} r="3" /></g>)}</g><circle cx="330" cy="48" r="22" fill={L} /></g>,
    speeltuin: <g><path d="M0 178 H400 V200 H0 Z" fill={D} /><path d="M120 110 L120 175 M120 110 Q150 110 160 175" stroke={W} strokeWidth="8" fill="none" /><circle cx="300" cy="150" r="20" fill={W} /><path d="M300 130 a20 20 0 0 1 0 40" fill={D} /></g>,
    binnenpret: <g>{[[70, 70], [120, 50], [300, 60], [340, 90]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="16" ry="20" fill={i % 2 ? W : L} /><path d={`M${x} ${y + 20} q6 14 0 28`} stroke={D} strokeWidth="2" fill="none" /></g>)}</g>,
    avontuur: <g><path d="M0 175 L90 90 L160 175 Z" fill={D} /><path d="M120 175 L230 70 L340 175 Z" fill={W} /><path d="M230 70 L255 96 L240 100 Z" fill={L} /><line x1="40" y1="60" x2="380" y2="120" stroke={W} strokeWidth="3" /></g>,
    museum: <g><rect x="90" y="100" width="220" height="80" fill={W} /><path d="M80 100 L200 50 L320 100 Z" fill={D} />{[110, 150, 190, 230, 270].map((x) => <rect key={x} x={x} y="110" width="12" height="70" fill={D} />)}</g>,
    cultuur: <g><path d="M150 0 L60 200 H0 V0 Z" fill={W} opacity="0.5" /><path d="M250 0 L340 200 H400 V0 Z" fill={W} opacity="0.5" /><path d="M200 70 l9 19 21 2 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -2 Z" fill={L} /></g>,
    eten: <g><ellipse cx="200" cy="165" rx="95" ry="22" fill={D} /><ellipse cx="200" cy="158" rx="78" ry="16" fill={W} />{[170, 200, 230].map((x) => <path key={x} d={`M${x} 80 q-8 16 0 32 q8 -16 0 -32`} stroke={L} strokeWidth="3" fill="none" />)}</g>,
    wellness: <g><g fill={W}><ellipse cx="200" cy="170" rx="44" ry="13" /><ellipse cx="200" cy="150" rx="34" ry="11" /><ellipse cx="200" cy="133" rx="24" ry="9" /></g>{[160, 200, 240].map((x) => <path key={x} d={`M${x} 110 q-10 -14 0 -28 q10 14 0 28`} stroke={L} strokeWidth="3" fill="none" />)}</g>,
    uitgaan: <g><circle cx="200" cy="80" r="40" fill={W} /><g stroke={D} strokeWidth="1.5">{[-40, -20, 0, 20, 40].map((d) => <line key={"h" + d} x1="160" y1={80 + d} x2="240" y2={80 + d} />)}{[-40, -20, 0, 20, 40].map((d) => <line key={"v" + d} x1={200 + d} y1="40" x2={200 + d} y2="120" />)}</g><g fill={L}><circle cx="80" cy="50" r="3" /><circle cx="320" cy="60" r="3" /><circle cx="300" cy="30" r="2" /></g></g>,
    bezienswaardigheid: <g><path d="M180 40 H220 V60 L235 70 V180 H165 V70 L180 60 Z" fill={W} /><rect x="190" y="100" width="20" height="80" fill={D} /><path d="M0 180 H400 V200 H0 Z" fill={D} /><circle cx="200" cy="34" r="6" fill={L} /></g>,
    natuur2: <g><circle cx="318" cy="50" r="19" fill={L} /><path d="M0 140 Q140 118 290 138 T400 134 V200 H0 Z" fill={W} /><path d="M0 162 H400 V200 H0 Z" fill={D} />{[56, 92, 300, 332].map((x, i) => <path key={i} d={`M${x} 162 q-2 -24 0 -38`} stroke={W} strokeWidth="3" fill="none" />)}{tree(150, 0.7)}{tree(210, 0.6)}</g>,
    avontuur2: <g><path d="M0 172 L110 86 L220 172 Z" fill={D} /><path d="M200 172 L300 100 L400 172 Z" fill={W} /><path d="M150 176 L185 126 L220 176 Z" fill={W} /><line x1="185" y1="126" x2="185" y2="176" stroke={D} strokeWidth="2" /><circle cx="320" cy="46" r="18" fill={L} /></g>,
  };
  // Variatie-laag: wolken, vogels of sterren — verschilt per uitje.
  const extras = [];
  const nClouds = Math.floor(rnd(2) * 3); // 0–2 wolken
  for (let i = 0; i < nClouds; i++) {
    const cx = 40 + rnd(i * 3 + 1) * 320, cy = 22 + rnd(i * 3 + 2) * 36, s = 0.55 + rnd(i * 3 + 3) * 0.7;
    extras.push(<g key={"c" + i} transform={`translate(${cx},${cy}) scale(${s})`} fill={W}><ellipse cx="0" cy="0" rx="22" ry="11" /><ellipse cx="-14" cy="3" rx="13" ry="8" /><ellipse cx="14" cy="3" rx="13" ry="8" /></g>);
  }
  if (rnd(5) > 0.62) extras.push(<g key="b" stroke={D} strokeWidth="2" fill="none">{[0, 1, 2].map((i) => { const bx = 110 + i * 42 + rnd(i + 9) * 20, by = 38 + rnd(i + 11) * 22; return <path key={i} d={`M${bx} ${by} q6 -6 12 0 q6 -6 12 0`} />; })}</g>);
  else if (rnd(3) > 0.6) extras.push(<g key="s" fill={L}>{[0, 1, 2, 3].map((i) => <circle key={i} cx={50 + rnd(i + 20) * 300} cy={20 + rnd(i + 21) * 40} r={1 + rnd(i + 22) * 2} />)}</g>);
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <g transform={flip ? "translate(400,0) scale(-1,1)" : undefined}>{(rnd(11) > 0.5 && scenes[category + "2"]) ? scenes[category + "2"] : (scenes[category] || null)}</g>
      {extras}
    </svg>
  );
}

function Hero({ a, h = 200, rounded = "rounded-t-[26px]" }) {
  const c = CAT[a.category];
  return (
    <div className={"relative overflow-hidden " + rounded} style={{ height: h, background: `linear-gradient(135deg, ${c.g[0]}, ${c.g[1]})` }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.5) 1.5px, transparent 0)", backgroundSize: "22px 22px" }} />
      <HeroScene category={a.category} seed={a.id} />
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[84px] drop-shadow-md select-none" aria-hidden="true">{a.emoji}</span>
      </div>
      <span className="absolute top-3 left-3 text-[11px] font-extrabold uppercase tracking-wider bg-white/85 text-ink px-2.5 py-1 rounded-full">{c.label}</span>
      <span className="absolute top-3 right-3 text-[11px] font-bold bg-black/25 text-white px-2.5 py-1 rounded-full flex items-center gap-1">
        <Icon name={a.indoor_friendly ? "home" : "sun"} size={12} stroke={2.6} /> {a.indoor_friendly ? "Binnen" : "Buiten"}
      </span>
    </div>
  );
}

/* ----------------------------------------------------- small bits */
function MetaTile({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 flex-1">
      <Icon name={icon} size={20} className="text-teal-600" stroke={2.2} />
      <span className="text-[15px] font-extrabold text-ink leading-none">{value}</span>
      <span className="text-[11px] text-muted font-semibold uppercase tracking-wide">{label}</span>
    </div>
  );
}

function MiniMap({ a, onOpen }) {
  return (
    <button onClick={onOpen} className="relative w-full h-28 rounded-2xl overflow-hidden border border-line group" aria-label="Open route in kaart">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#dff0ec,#c7e6df)" }} />
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <g stroke="#a9d6cc" strokeWidth="2" fill="none">
          <path d="M-10 40 Q120 10 260 60 T520 30" /><path d="M-10 90 Q140 70 280 100 T520 80" />
          <path d="M60 -10 Q90 80 50 200" /><path d="M210 -10 Q240 90 200 200" /><path d="M360 -10 Q330 80 380 200" />
        </g>
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <Icon name="map-pin" size={34} className="text-teal-600 drop-shadow" stroke={2.6} />
      </div>
      <span className="absolute bottom-2 right-2 bg-white/90 text-ink text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
        <Icon name="navigation" size={12} stroke={2.6} /> {a.plaats}
      </span>
    </button>
  );
}

function mapsUrl(a) { return "https://www.google.com/maps/dir/?api=1&destination=" + a.lat + "," + a.lng + "&travelmode=driving"; }

/* ----------------------------------------------------- detail screen */
function DetailView({ a, isFav, onFav, onBack, onNext, isDone, onDone, company, rainy }) {
  const se = seasonInfo(a);
  const reasons = [];
  if (rainy && a.indoor_friendly) reasons.push("☔ Binnen — fijn met dit weer");
  if (company && company !== "gezin") reasons.push("Leuk met " + (COMPANY_LABEL[company] || "").toLowerCase());
  if (a.distance < 20) reasons.push("📍 Lekker dichtbij");
  if (a.prijs === 0) reasons.push("Gratis");
  else if (a.prijs <= 10) reasons.push("Budgetvriendelijk");
  if (a.rating >= 4.5) reasons.push("⭐ Toppertje");
  const [showReviews, setShowReviews] = useState(false);
  return (
    <div className="fixed inset-0 z-40 bg-mint flex flex-col fade">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-11 h-11 grid place-items-center rounded-full bg-white shadow-card active:scale-95 transition" aria-label="Terug">
          <Icon name="chevron-left" size={24} stroke={2.6} />
        </button>
        <h1 className="font-display font-extrabold tracking-tight text-ink">Activiteit</h1>
        <div className="flex items-center gap-2">
          <button onClick={onDone} aria-pressed={isDone} aria-label="Markeer als geweest"
            className={"w-10 h-10 grid place-items-center rounded-full shadow-card active:scale-95 transition " + (isDone ? "bg-teal-500 text-white" : "bg-white text-ink")}>
            <Icon name={isDone ? "check-circle-2" : "circle-check"} size={20} stroke={2.4} />
          </button>
          <button onClick={() => shareActivity(a)} aria-label="Delen"
            className="w-10 h-10 grid place-items-center rounded-full bg-white text-ink shadow-card active:scale-95 transition">
            <Icon name="share-2" size={19} stroke={2.4} />
          </button>
          <button onClick={onFav} aria-pressed={isFav} aria-label="Bewaar favoriet"
            className={"w-10 h-10 grid place-items-center rounded-full shadow-card active:scale-95 transition " + (isFav ? "bg-rose-500 text-white" : "bg-white text-ink")}>
            <Icon name="heart" size={20} stroke={isFav ? 0 : 2.4} className={isFav ? "fill-current" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32">
        <div className="bg-white rounded-[28px] shadow-soft overflow-hidden pop">
          <Hero a={a} />
          <div className="p-5">
            <h2 className="font-display text-[26px] leading-tight font-extrabold text-ink">{a.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-muted font-semibold">
              <Icon name="map-pin" size={15} /> {a.plaats}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Stars value={a.rating} />
              <button onClick={() => setShowReviews(true)} className="text-[12px] font-bold text-teal-700 inline-flex items-center gap-1">· reviews op Google</button>
            </div>

            {reasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reasons.slice(0, 3).map((r) => (
                  <span key={r} className="text-[12px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-1">{r}</span>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-stretch gap-2 bg-mint rounded-2xl p-3">
              <MetaTile icon="route" label="Afstand" value={a.distance.toFixed(0) + " km"} />
              <div className="w-px bg-line" />
              <MetaTile icon="badge-euro" label="Prijs" value={euro(a.prijs)} />
              <div className="w-px bg-line" />
              <MetaTile icon="clock" label="Duur" value={a.duur} />
              <div className="w-px bg-line" />
              <MetaTile icon="users" label="Leeftijd" value={a.min_age + "–" + a.max_age} />
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{a.desc}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink bg-mint rounded-full px-3 py-1.5">
                <Icon name="calendar" size={15} className="text-teal-600" /> Seizoen: {se.label}
              </span>
              {se.seasonal && !se.open && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-3 py-1.5" style={{ background: "#FEF3C7", color: "#B45309" }}>
                  <Icon name="alert-triangle" size={15} /> Mogelijk gesloten in {MAANDEN[new Date().getMonth()]}
                </span>
              )}
            </div>

            <div className="mt-4"><MiniMap a={a} onOpen={() => window.open(mapsUrl(a), "_blank", "noopener")} /></div>

            <button onClick={() => setShowReviews(true)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-amber-50 text-amber-700 font-bold py-3 rounded-2xl border border-amber-100 active:scale-[.98] transition">
              <Icon name="star" size={18} stroke={2.4} className="fill-current" /> Reviews op Google
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={searchUrl(a)} target="_blank" rel="noopener"
                className="inline-flex items-center justify-center gap-2 bg-mint text-teal-700 font-bold py-3 rounded-2xl active:scale-[.98] transition text-[14px]">
                <Icon name="search" size={17} stroke={2.4} /> Openingstijden
              </a>
              <a href={calendarUrl(a)} target="_blank" rel="noopener"
                className="inline-flex items-center justify-center gap-2 bg-white text-ink font-bold py-3 rounded-2xl border border-line active:scale-[.98] transition text-[14px]">
                <Icon name="calendar-plus" size={17} stroke={2.4} className="text-teal-600" /> Agenda
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
          <button onClick={() => shareActivity(a)} className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"><Icon name="share-2" size={15} stroke={2.4} /> Deel dit uitje</button>
          <span className="text-muted/40">·</span>
          <button onClick={() => reportMail(a)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted"><Icon name="flag" size={14} /> Klopt iets niet?</button>
        </div>
        <p className="text-center text-[11px] text-muted/80 mt-3">Prijs, duur, seizoen en beoordeling zijn indicatief — check de website.</p>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-mint via-mint to-transparent">
        <div className="flex gap-3 max-w-md mx-auto">
          <a href={mapsUrl(a)} target="_blank" rel="noopener"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-500 text-white font-display font-extrabold py-4 rounded-2xl shadow-card active:scale-[.98] transition">
            <Icon name="navigation" size={20} stroke={2.6} /> Route
          </a>
          <button onClick={onNext}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-ink font-display font-extrabold py-4 rounded-2xl shadow-card active:scale-[.98] transition border border-line">
            <Icon name="shuffle" size={20} stroke={2.6} /> Volgende
          </button>
        </div>
      </div>

      {showReviews && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" onClick={() => setShowReviews(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(18,58,52,0.5)" }} />
          <div className="sheet-in relative bg-white rounded-t-[28px] overflow-hidden flex flex-col" style={{ height: "82dvh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-line shrink-0">
              <div className="min-w-0">
                <p className="font-display font-extrabold text-ink truncate flex items-center gap-1.5"><Icon name="star" size={15} className="text-amber fill-current" /> {a.name}</p>
                <p className="text-xs text-muted">Live rating & reviews via Google</p>
              </div>
              <button onClick={() => setShowReviews(false)} className="w-9 h-9 grid place-items-center rounded-full bg-mint shrink-0" aria-label="Sluiten"><Icon name="x" size={18} stroke={2.6} /></button>
            </div>
            <iframe title="Google kaart en reviews" src={mapEmbedUrl(a)} className="flex-1 w-full" style={{ border: 0 }} loading="lazy" />
            <div className="p-3 border-t border-line shrink-0">
              <a href={reviewsUrl(a)} target="_blank" rel="noopener" className="w-full inline-flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-3 rounded-2xl active:scale-[.98] transition">
                <Icon name="external-link" size={18} stroke={2.4} /> Open alle reviews op Google
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- roulette carrousel */
function RouletteCard({ a, center }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: center ? "0 14px 34px -8px rgba(15,118,110,.5)" : "0 6px 16px -8px rgba(0,0,0,.3)" }}>
      <div className="relative" style={{ height: 88, background: `linear-gradient(135deg, ${CAT[a.category].g[0]}, ${CAT[a.category].g[1]})` }}>
        <HeroScene category={a.category} seed={a.id} />
        <div className="absolute inset-0 grid place-items-center"><span className="text-4xl drop-shadow">{a.emoji}</span></div>
      </div>
      <div className="px-2 py-2 text-center">
        <p className="font-display font-extrabold text-ink text-[12px] leading-tight truncate">{a.name}</p>
        <p className="text-[10px] text-muted truncate">{a.plaats}</p>
      </div>
    </div>
  );
}

function RouletteOverlay({ spin }) {
  const { pool, idx } = spin;
  const len = pool.length;
  const at = (p) => pool[((p % len) + len) % len];
  const spacing = 100, W = 150;
  const window = [];
  for (let o = -3; o <= 3; o++) window.push(idx + o);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center fade" style={{ background: "rgba(18,58,52,0.55)", backdropFilter: "blur(3px)" }}>
      <div className="text-center w-full">
        <div className="relative w-full overflow-hidden" style={{ height: 180 }}>
          {/* midden-markering */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: W + 14, height: 152, borderRadius: 22, boxShadow: "0 0 0 3px rgba(255,255,255,.85)" }} />
          {window.map((p) => {
            const o = p - idx, d = Math.min(Math.abs(o), 3);
            return (
              <div key={p} style={{
                position: "absolute", left: "50%", top: "50%", width: W,
                transform: `translate(-50%,-50%) translateX(${o * spacing}px) scale(${1 - 0.2 * d})`,
                opacity: Math.max(0, 1 - 0.34 * d), zIndex: 20 - d,
                transition: "transform .2s cubic-bezier(.2,.7,.3,1), opacity .2s ease",
              }}>
                <RouletteCard a={at(p)} center={o === 0} />
              </div>
            );
          })}
        </div>
        <p className="mt-6 font-display font-extrabold text-white text-lg tracking-wide flex items-center justify-center gap-2 drop-shadow">
          <Icon name="sparkles" size={20} /> We kiezen een uitje…
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- filters sheet */
function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={"px-4 py-2 rounded-full text-sm font-bold border transition active:scale-95 " +
        (active ? "bg-teal-500 text-white border-teal-500 shadow-card" : "bg-white text-ink border-line")}>
      {children}
    </button>
  );
}

function FiltersSheet({ open, onClose, prefs, setPrefs, count }) {
  if (!open) return null;
  const ages = prefs.ages;
  const setAge = (i, v) => { const n = ages.slice(); n[i] = Math.max(0, Math.min(17, v)); setPrefs({ ...prefs, ages: n }); };
  const addChild = () => setPrefs({ ...prefs, ages: [...ages, 4].slice(0, 6) });
  const delChild = (i) => setPrefs({ ...prefs, ages: ages.filter((_, x) => x !== i) });
  const toggleArr = (key, val) => {
    const cur = prefs[key]; const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    setPrefs({ ...prefs, [key]: next });
  };
  const budgets = [["gratis", "Gratis"], ["low", "€1–10"], ["mid", "€11–25"], ["high", "€26+"]];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink/40 fade" onClick={onClose} />
      <div className="sheet-in relative bg-mint rounded-t-[28px] max-h-[90dvh] flex flex-col">
        <div className="pt-3 flex justify-center"><div className="w-12 h-1.5 rounded-full bg-ink/15" /></div>
        <header className="px-5 py-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold flex items-center gap-2"><Icon name="sliders-horizontal" size={22} stroke={2.6} /> Instellingen</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-white shadow-card active:scale-95" aria-label="Sluiten"><Icon name="x" size={18} stroke={2.6} /></button>
        </header>

        <div className="px-5 pb-4 overflow-y-auto no-scrollbar space-y-6">
          {/* Afstand */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted">Afstand</h3>
              <span className="font-display font-extrabold text-ink">{prefs.radius} km</span>
            </div>
            <input type="range" min="2" max="100" value={prefs.radius}
              style={{ "--p": ((prefs.radius - 2) / 98) * 100 + "%" }}
              onChange={(e) => setPrefs({ ...prefs, radius: +e.target.value })} />
            <div className="flex justify-between text-[11px] text-muted font-semibold mt-1"><span>2 km</span><span>100 km</span></div>
          </section>

          {/* Budget */}
          <section>
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-2">Budget <span className="font-semibold normal-case tracking-normal text-muted/70">· per persoon</span></h3>
            <div className="flex flex-wrap gap-2">
              {budgets.map(([v, l]) => <Chip key={v} active={prefs.budgets.includes(v)} onClick={() => toggleArr("budgets", v)}>{l}</Chip>)}
            </div>
          </section>

          {/* Met wie */}
          <section>
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-2">Met wie?</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {COMPANIES.map(([key, label, icon]) => (
                <button key={key} onClick={() => setPrefs({ ...prefs, company: key })}
                  className={"inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold border transition active:scale-95 " + (prefs.company === key ? "bg-teal-500 text-white border-teal-500 shadow-card" : "bg-white text-ink border-line")}>
                  <Icon name={icon} size={14} stroke={2.4} /> {label}
                </button>
              ))}
            </div>

            {prefs.company === "gezin" ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-ink flex items-center gap-2"><Icon name="baby" size={18} /> Kinderen & leeftijd</span>
                  <button onClick={addChild} disabled={ages.length >= 6} className="text-sm font-bold text-teal-700 flex items-center gap-1 disabled:opacity-40"><Icon name="plus" size={15} stroke={3} /> Kind</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ages.length === 0 && (
                    <div className="text-sm font-semibold text-muted bg-white rounded-full px-4 py-2.5 shadow-card flex items-center gap-2">
                      <Icon name="users" size={16} className="text-teal-600" /> Zonder kinderen — uitjes voor volwassenen
                    </div>
                  )}
                  {ages.map((age, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-full pl-3 pr-1.5 py-1.5 shadow-card">
                      <button onClick={() => setAge(i, age - 1)} className="w-7 h-7 rounded-full bg-mint grid place-items-center font-black active:scale-90" aria-label="Jonger">−</button>
                      <span className="font-display font-extrabold w-8 text-center tabular-nums">{age}<span className="text-[10px] text-muted">jr</span></span>
                      <button onClick={() => setAge(i, age + 1)} className="w-7 h-7 rounded-full bg-mint grid place-items-center font-black active:scale-90" aria-label="Ouder">+</button>
                      <button onClick={() => delChild(i)} className="w-7 h-7 grid place-items-center text-muted hover:text-rose-500" aria-label="Verwijder kind"><Icon name="x" size={15} stroke={2.6} /></button>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-muted mt-2">We zoeken de overlap zodat het uitje voor iederéén leuk is.</p>
              </>
            ) : (
              <p className="text-[12px] text-muted">Geen leeftijdsfilter — we tonen uitjes die passen bij {COMPANY_LABEL[prefs.company].toLowerCase()}.</p>
            )}
          </section>

          {/* Soort uitje */}
          <section>
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-2">Soort uitje</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CAT).map((k) => <Chip key={k} active={!prefs.excludeCats.includes(k)} onClick={() => toggleArr("excludeCats", k)}>{CAT[k].label}</Chip>)}
            </div>
          </section>

          {/* Alleen binnen + verberg gedaan */}
          <section className="space-y-3">
            <button onClick={() => setPrefs({ ...prefs, indoorOnly: !prefs.indoorOnly })} className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card">
              <span className="font-bold text-ink flex items-center gap-2"><Icon name="home" size={18} /> Alleen binnen</span>
              <span className="switch" data-on={prefs.indoorOnly}><span className="knob" /></span>
            </button>
            <button onClick={() => setPrefs({ ...prefs, hideDone: !prefs.hideDone })} className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card">
              <span className="font-bold text-ink flex items-center gap-2"><Icon name="circle-check" size={18} /> Verberg wat we al deden</span>
              <span className="switch" data-on={prefs.hideDone}><span className="knob" /></span>
            </button>
            <button onClick={() => setPrefs({ ...prefs, hideClosed: !prefs.hideClosed })} className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card">
              <span className="font-bold text-ink flex items-center gap-2"><Icon name="calendar-check" size={18} /> Alleen wat nu open is</span>
              <span className="switch" data-on={prefs.hideClosed}><span className="knob" /></span>
            </button>
          </section>
        </div>

        <div className="p-4 border-t border-line bg-mint">
          <button onClick={onClose} className="w-full bg-teal-500 text-white font-display font-extrabold py-4 rounded-2xl shadow-card active:scale-[.98] transition">
            Toon {count} {count === 1 ? "uitje" : "uitjes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- list card (favorites) */
function ListCard({ a, onOpen, onRemove }) {
  return (
    <div className="rise bg-white rounded-3xl shadow-card overflow-hidden flex">
      <div className="w-24 shrink-0 relative" style={{ background: `linear-gradient(135deg, ${CAT[a.category].g[0]}, ${CAT[a.category].g[1]})` }}>
        <div className="absolute inset-0 grid place-items-center text-4xl">{a.emoji}</div>
      </div>
      <button onClick={onOpen} className="flex-1 text-left p-3.5">
        <h3 className="font-display font-extrabold text-ink leading-tight">{a.name}</h3>
        <div className="text-[13px] text-muted font-semibold flex items-center gap-1 mt-0.5"><Icon name="map-pin" size={13} /> {a.plaats} · {a.distance.toFixed(0)} km</div>
        <div className="mt-1.5 flex items-center gap-3 text-[13px] font-bold text-ink">
          <span className="flex items-center gap-1"><Icon name="badge-euro" size={13} className="text-teal-600" /> {euro(a.prijs)}</span>
          <span className="flex items-center gap-1"><Icon name="star" size={13} className="text-amber" /> {a.rating.toFixed(1)}</span>
        </div>
      </button>
      <button onClick={onRemove} className="px-3 text-muted hover:text-rose-500 self-stretch" aria-label="Verwijder favoriet"><Icon name="trash-2" size={18} /></button>
    </div>
  );
}

/* ----------------------------------------------------- browse / ontdek */
function MapView({ items, onOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    const L = window.L;
    if (!L || !ref.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    const pts = [];
    items.forEach((a) => {
      const color = CAT[a.category].g[1];
      const html = `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:15px;line-height:1">${a.emoji}</span></div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [30, 30], iconAnchor: [15, 30] });
      const m = L.marker([a.lat, a.lng], { icon, title: a.name }).addTo(map);
      m.on("click", () => onOpen(a));
      pts.push([a.lat, a.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [36, 36], maxZoom: 12 });
    else map.setView([52.5, 6.4], 9);
    setTimeout(() => map.invalidateSize(), 120);
    return () => map.remove();
  }, [items]);
  return <div ref={ref} className="w-full rounded-3xl overflow-hidden shadow-card border border-line" style={{ height: "calc(100dvh - 250px)", minHeight: 320 }} />;
}

function BrowseView({ items, totalAll, query, setQuery, sort, setSort, favIds, onOpen, onFav, onFilters }) {
  const sorts = [["afstand", "Dichtbij"], ["prijs", "Prijs"], ["rating", "Beste"]];
  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("list");
  return (
    <div className="px-5 pt-6 fade">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><Icon name="compass" size={24} /> Ontdek</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-full shadow-card p-1">
            <button onClick={() => setView("list")} className={"w-9 h-9 grid place-items-center rounded-full transition " + (view === "list" ? "bg-teal-500 text-white" : "text-muted")} aria-label="Lijst"><Icon name="list" size={18} stroke={2.4} /></button>
            <button onClick={() => setView("kaart")} className={"w-9 h-9 grid place-items-center rounded-full transition " + (view === "kaart" ? "bg-teal-500 text-white" : "text-muted")} aria-label="Kaart"><Icon name="map" size={18} stroke={2.4} /></button>
          </div>
          <button onClick={onFilters} className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-card active:scale-95" aria-label="Filters"><Icon name="sliders-horizontal" size={20} stroke={2.4} /></button>
        </div>
      </div>

      <div className="mt-4 relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={18} /></span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op naam of plaats…"
          className="w-full bg-white rounded-2xl shadow-card pl-11 pr-10 py-3.5 font-semibold text-ink placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-teal-400" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Wissen"><Icon name="x" size={18} /></button>}
      </div>

      {view === "list" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted mr-1">Sorteer</span>
          {sorts.map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)}
              className={"px-3.5 py-1.5 rounded-full text-sm font-bold transition active:scale-95 " + (sort === v ? "bg-teal-500 text-white shadow-card" : "bg-white text-ink shadow-card")}>{l}</button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[13px] text-muted font-semibold">
        {items.length} {items.length === 1 ? "uitje" : "uitjes"} · van {totalAll} in totaal
        {items.length < totalAll && <button onClick={onFilters} className="text-teal-700 ml-1">· filters aanpassen</button>}
      </p>

      {view === "kaart" ? (
        <div className="mt-3"><MapView items={items} onOpen={onOpen} /></div>
      ) : (
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-2">🔍</div>
            <p className="font-display font-extrabold text-lg text-ink">Niks gevonden</p>
            <p className="text-sm text-muted mt-1">Probeer een andere zoekterm of verruim je filters.</p>
          </div>
        ) : items.map((a) => {
          const open = openId === a.id;
          const se = seasonInfo(a);
          return (
          <div key={a.id} className="rise bg-white rounded-3xl shadow-card overflow-hidden">
            <div className="flex">
              <button onClick={() => onOpen(a)} className="w-20 shrink-0 relative" style={{ background: `linear-gradient(135deg, ${CAT[a.category].g[0]}, ${CAT[a.category].g[1]})` }} aria-label={"Open " + a.name}>
                <div className="absolute inset-0 grid place-items-center text-3xl">{a.emoji}</div>
              </button>
              <button onClick={() => setOpenId(open ? null : a.id)} className="flex-1 text-left p-3 min-w-0" aria-expanded={open}>
                <h3 className="font-display font-extrabold text-ink leading-tight text-[15px] truncate">{a.name}</h3>
                <div className="text-[12px] text-muted font-semibold flex items-center gap-1 mt-0.5"><Icon name="map-pin" size={12} /> {a.plaats} · {a.distance.toFixed(0)} km</div>
                <div className="mt-1 flex items-center gap-3 text-[12px] font-bold text-ink">
                  <span className="flex items-center gap-1"><Icon name="badge-euro" size={12} className="text-teal-600" /> {euro(a.prijs)}</span>
                  <span className="flex items-center gap-1"><Icon name="clock" size={12} className="text-teal-600" /> {a.duur}</span>
                  <span className="flex items-center gap-1"><Icon name="star" size={12} className="text-amber" /> {a.rating.toFixed(1)}</span>
                </div>
              </button>
              <div className="flex flex-col items-center justify-center gap-1.5 pr-3">
                <button onClick={() => onFav(a.id)} className={favIds.includes(a.id) ? "text-rose-500" : "text-muted"} aria-label="Bewaar favoriet">
                  <Icon name="heart" size={20} stroke={favIds.includes(a.id) ? 0 : 2.2} className={favIds.includes(a.id) ? "fill-current" : ""} />
                </button>
                <button onClick={() => setOpenId(open ? null : a.id)} className="text-muted" aria-label={open ? "Inklappen" : "Meer info"}>
                  <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><Icon name="chevron-down" size={20} /></span>
                </button>
              </div>
            </div>

            {open && (
              <div className="px-4 pb-4 pt-1 border-t border-line">
                <p className="text-[14px] leading-relaxed text-ink/80 mt-3">{a.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-bold">
                  <span className="inline-flex items-center gap-1 bg-mint rounded-full px-2.5 py-1 text-ink"><Icon name="users" size={12} className="text-teal-600" /> {a.min_age}–{a.max_age} jr</span>
                  <span className="inline-flex items-center gap-1 bg-mint rounded-full px-2.5 py-1 text-ink"><Icon name={a.indoor_friendly ? "home" : "sun"} size={12} className="text-teal-600" /> {a.indoor_friendly ? "Binnen" : "Buiten"}</span>
                  <span className="inline-flex items-center gap-1 bg-mint rounded-full px-2.5 py-1 text-ink"><Icon name="calendar" size={12} className="text-teal-600" /> {se.label}</span>
                  {se.seasonal && !se.open && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "#FEF3C7", color: "#B45309" }}><Icon name="alert-triangle" size={12} /> Mogelijk gesloten</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={mapsUrl(a)} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-1.5 bg-teal-500 text-white font-bold text-[13px] py-2.5 rounded-xl active:scale-95"><Icon name="navigation" size={15} stroke={2.4} /> Route</a>
                  <a href={searchUrl(a)} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-1.5 bg-mint text-teal-700 font-bold text-[13px] py-2.5 rounded-xl active:scale-95"><Icon name="search" size={15} stroke={2.4} /> Info</a>
                  <button onClick={() => onOpen(a)} className="inline-flex items-center justify-center gap-1.5 bg-white text-ink font-bold text-[13px] py-2.5 rounded-xl border border-line active:scale-95"><Icon name="maximize-2" size={15} stroke={2.4} /> Kaart</button>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------- onboarding */
function IntroOverlay({ onClose }) {
  const rows = [
    ["users", "Kies met wie — gezin, partner, vrienden of oma"],
    ["sliders-horizontal", "Stel afstand, budget en soort uitje in"],
    ["share-2", "Bewaar favorieten en deel met vrienden"],
  ];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6 fade" style={{ background: "rgba(234,247,244,0.96)", backdropFilter: "blur(4px)" }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500 grid place-items-center text-white shadow-card mb-4"><Icon name="sparkles" size={30} stroke={2.4} /></div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Welkom bij Hup!</h1>
        <p className="text-muted mt-2 leading-relaxed">Geen idee wat je gaat doen? Tik op <b className="text-ink">Hup!</b> en we kiezen een uitje dat precies past.</p>
        <div className="mt-5 space-y-2 text-left">
          {rows.map(([ic, t]) => (
            <div key={t} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card">
              <Icon name={ic} size={18} className="text-teal-600" /> <span className="text-sm font-semibold text-ink">{t}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-6 w-full bg-teal-500 text-white font-display font-extrabold py-4 rounded-2xl shadow-card active:scale-95">Aan de slag 🎉</button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- App */
function App() {
  const [tab, setTab] = useState("home");
  const [prefs, setPrefs] = useState(() => {
    const defaults = { company: "gezin", ages: [2, 6], adults: 2, radius: 75, budgets: ["gratis", "low", "mid", "high"], excludeCats: [], indoorOnly: false, hideDone: false, hideClosed: false, origin: HARDENBERG };
    return { ...defaults, ...loadJSON(PREFS_KEY, {}) };
  });
  const [favIds, setFavIds] = useState(() => loadJSON(FAV_KEY, []));
  const [detail, setDetail] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [spin, setSpin] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [soundOn, setSoundOn] = useState(Sound.enabled);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("afstand");
  const [doneIds, setDoneIds] = useState(() => loadJSON(DONE_KEY, []));
  const [weatherOn, setWeatherOn] = useState(() => loadJSON(WEATHER_KEY, false));
  const [weather, setWeather] = useState(null);
  const [showIntro, setShowIntro] = useState(() => !loadJSON(SEEN_KEY, false));
  const [installEvt, setInstallEvt] = useState(null);
  const [favTab, setFavTab] = useState("fav");
  const [rolls, setRolls] = useState(() => loadJSON(ROLLS_KEY, 0));
  const lastId = useRef(null);
  useEffect(() => saveJSON(ROLLS_KEY, rolls), [rolls]);

  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs]);
  useEffect(() => saveJSON(FAV_KEY, favIds), [favIds]);
  useEffect(() => saveJSON(DONE_KEY, doneIds), [doneIds]);
  useEffect(() => saveJSON(WEATHER_KEY, weatherOn), [weatherOn]);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  useEffect(() => {
    if (!weatherOn) { setWeather(null); return; }
    if (loadJSON("hup.debugRain", false)) { setWeather({ ok: true, rainy: true, tmax: 12, prob: 90 }); return; }
    let alive = true;
    fetchWeather((prefs.origin || HARDENBERG).lat, (prefs.origin || HARDENBERG).lng).then((wx) => { if (alive) setWeather(wx); });
    return () => { alive = false; };
  }, [weatherOn, prefs.origin]);

  const origin = prefs.origin || HARDENBERG;
  const withMeta = (a) => ({ ...a, distance: haversine(origin.lat, origin.lng, a.lat, a.lng) });

  // Deep links: ?a=<id> opent een uitje; ?tab= en ?start=hup voor snelkoppelingen.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const p = q.get("a");
    if (p) {
      const found = ACTIVITIES.find((x) => String(x.id) === p);
      if (found) setDetail(withMeta(found));
    }
    const t = q.get("tab");
    if (t && ["home", "ontdek", "favorites", "profile"].includes(t)) setTab(t);
    if (q.get("start") === "hup") setTimeout(() => roll(), 350);
  }, []); // eslint-disable-line
  const useMyLocation = () => {
    if (!navigator.geolocation) { alert("Locatie is niet beschikbaar op dit apparaat."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPrefs({ ...prefs, origin: { name: "Mijn locatie", lat: pos.coords.latitude, lng: pos.coords.longitude } }); Sound.blip(); },
      () => alert("Kon je locatie niet ophalen. Kies anders een plaats uit de lijst."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const candidates = useMemo(() => ACTIVITIES.map(withMeta)
    .filter((a) => prefs.company === "gezin" ? matchesAges(a, prefs.ages) : audienceOf(a).includes(prefs.company))
    .filter((a) => a.distance <= prefs.radius)
    .filter((a) => prefs.budgets.includes(priceTier(a.prijs)))
    .filter((a) => !prefs.excludeCats.includes(a.category))
    .filter((a) => (prefs.indoorOnly ? a.indoor_friendly : true))
    .filter((a) => (prefs.hideDone ? !doneIds.includes(a.id) : true))
    .filter((a) => (prefs.hideClosed ? seasonInfo(a).open : true))
    .map((a) => ({ ...a, fit: fitScore(a, prefs.ages) })), [prefs, doneIds]);

  const rainyActive = weatherOn && weather?.ok && weather.rainy;

  const weightedPick = useCallback((poolIn) => {
    const base = poolIn && poolIn.length ? poolIn : candidates;
    const pool = base.filter((c) => c.id !== lastId.current);
    const draw = pool.length ? pool : base;
    const bag = [];
    draw.forEach((c) => { const w = 1 + Math.round(c.fit * 3); for (let i = 0; i < w; i++) bag.push(c); });
    return bag[Math.floor(Math.random() * bag.length)];
  }, [candidates]);

  const roll = useCallback(() => {
    if (rolling) return;
    if (!candidates.length) { setEmpty(true); setDetail(null); return; }
    const indoorPool = candidates.filter((c) => c.indoor_friendly);
    const rollPool = rainyActive && indoorPool.length ? indoorPool : candidates;
    // Kies vooraf — de carrousel schuift continu en landt exact in het midden op dít uitje.
    const chosen = weightedPick(rollPool); lastId.current = chosen.id;
    const chosenIdx = Math.max(0, rollPool.indexOf(chosen));
    setEmpty(false); Sound.unlock(); Sound.whoosh(); vibrate(12); setRolling(true);
    const total = 18;
    let idx = chosenIdx - total; // zodat idx na 'total' stappen exact op chosenIdx staat
    setSpin({ pool: rollPool, idx });
    let i = 0;
    const step = () => {
      i++; idx += 1;
      setSpin({ pool: rollPool, idx });
      Sound.tick();
      if (i < total) setTimeout(step, 28 + i * i * 0.7);
      else {
        vibrate(20);
        setTimeout(() => {
          setRolling(false); setSpin(null); setDetail(chosen); setTab("home");
          setRolls((n) => n + 1);
          Sound.ding(); vibrate([18, 40, 18]); confettiBurst();
        }, 550);
      }
    };
    step();
  }, [rolling, candidates, weightedPick, rainyActive]);

  const browse = useMemo(() => {
    let list = candidates.slice();
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.plaats.toLowerCase().includes(q));
    list.sort((a, b) =>
      sort === "prijs" ? a.prijs - b.prijs : sort === "rating" ? b.rating - a.rating : a.distance - b.distance
    );
    return list;
  }, [candidates, query, sort]);

  const toggleFav = (id) => setFavIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleDone = (id) => setDoneIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const dismissIntro = () => { setShowIntro(false); saveJSON(SEEN_KEY, true); };
  const w = ageWindow(prefs.ages);
  const favs = ACTIVITIES.filter((a) => favIds.includes(a.id)).map(withMeta);
  const doneList = ACTIVITIES.filter((a) => doneIds.includes(a.id)).map(withMeta);

  return (
    <div className="relative mx-auto max-w-md min-h-[100dvh] pb-24">
      <p className="sr-only" aria-live="polite">{detail ? "Gekozen uitje: " + detail.name + " in " + detail.plaats : ""}</p>

      {/* ---------- HOME ---------- */}
      {tab === "home" && (
        <div className="px-5 pt-6 fade">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500 grid place-items-center shadow-card">
                <Icon name="sparkles" size={20} className="text-white" stroke={2.6} />
              </div>
              <span className="font-display text-2xl font-extrabold tracking-tight">Hup!</span>
            </div>
            <button onClick={() => setFiltersOpen(true)} className="flex flex-col items-center text-muted active:scale-95" aria-label="Filters">
              <div className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-card"><Icon name="sliders-horizontal" size={20} stroke={2.4} /></div>
            </button>
          </header>

          <div className="text-center mt-8">
            <p className="inline-block text-xs font-extrabold uppercase tracking-[.18em] text-teal-700 bg-teal-100/70 px-3 py-1.5 rounded-full">
              {prefs.company === "gezin" ? "Voor het hele gezin" : "Met " + COMPANY_LABEL[prefs.company].toLowerCase()}
            </p>
            <h1 className="font-display text-[clamp(2.2rem,9vw,3rem)] font-extrabold leading-[1.05] tracking-tight mt-4 text-ink">Geen inspiratie?</h1>
            <p className="mt-3 text-[15px] text-muted leading-relaxed max-w-xs mx-auto">Eén tik en we kiezen een uitje dat precies past{prefs.company === "gezin" ? " bij jouw gezin." : "."}</p>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
            {COMPANIES.map(([key, label, icon]) => (
              <button key={key} onClick={() => { setPrefs({ ...prefs, company: key }); Sound.blip(); }}
                className={"shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition active:scale-95 " + (prefs.company === key ? "bg-teal-500 text-white border-teal-500 shadow-card" : "bg-white text-ink border-line")}>
                <Icon name={icon} size={15} stroke={2.4} /> {label}
              </button>
            ))}
          </div>

          {weatherOn && weather?.ok && (
            <div className="mt-5 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-bold"
              style={weather.rainy ? { background: "#E0F2FE", color: "#075985" } : { background: "#FEF3C7", color: "#92400E" }}>
              <Icon name={weather.rainy ? "cloud-rain" : "sun"} size={18} />
              {weather.rainy
                ? "Regen verwacht — we kiezen binnen-uitjes ☔"
                : `Mooi weer${weather.tmax != null ? ` (${Math.round(weather.tmax)}°)` : ""} — top om eropuit te gaan! ☀️`}
            </div>
          )}

          <div className="flex flex-col items-center mt-8">
            <button onClick={roll} disabled={rolling}
              className="hup-btn hup-pulse relative w-52 h-52 rounded-full bg-teal-500 text-white grid place-items-center shadow-soft active:shadow-card"
              aria-label="Kies een uitje">
              <div className="flex flex-col items-center">
                <Icon name="sparkles" size={26} className="text-white/90 mb-1" stroke={2.4} />
                <span className="font-display text-6xl font-extrabold tracking-tight">Hup!</span>
              </div>
            </button>
            <p className="mt-7 text-[13px] font-semibold text-muted flex items-center gap-1.5">
              <Icon name="users" size={14} /> {prefs.company === "gezin"
                ? (prefs.ages.length === 0 ? "Volwassenen" : `${prefs.ages.length} ${prefs.ages.length === 1 ? "kind" : "kinderen"} · overlap ${w.low}–${w.high} jr`)
                : `Met ${COMPANY_LABEL[prefs.company].toLowerCase()}`} · {candidates.length} {candidates.length === 1 ? "match" : "matches"}
            </p>
          </div>

          {empty && (
            <div className="rise mt-8 bg-white rounded-3xl shadow-card p-5 text-center">
              <div className="text-4xl mb-2">🧭</div>
              <p className="font-display font-extrabold text-lg text-ink">Niks gevonden</p>
              <p className="text-sm text-muted mt-1">Geen uitje matcht deze filters. Verruim de straal of het budget.</p>
              <button onClick={() => setFiltersOpen(true)} className="mt-3 inline-flex items-center gap-2 text-teal-700 font-bold"><Icon name="sliders-horizontal" size={16} /> Pas filters aan</button>
            </div>
          )}

          {detail && !empty && (
            <button onClick={() => setDetail(detail)} className="rise mt-8 w-full bg-white rounded-3xl shadow-card overflow-hidden flex text-left">
              <div className="w-24 shrink-0 relative" style={{ background: `linear-gradient(135deg, ${CAT[detail.category].g[0]}, ${CAT[detail.category].g[1]})` }}>
                <div className="absolute inset-0 grid place-items-center text-4xl">{detail.emoji}</div>
              </div>
              <div className="flex-1 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Laatst gekozen</p>
                <h3 className="font-display font-extrabold text-ink leading-tight mt-0.5">{detail.name}</h3>
                <div className="text-[13px] text-muted font-semibold flex items-center gap-1 mt-0.5"><Icon name="map-pin" size={13} /> {detail.plaats} · {detail.distance.toFixed(0)} km</div>
              </div>
              <div className="self-center pr-4 text-muted"><Icon name="chevron-right" size={22} /></div>
            </button>
          )}
        </div>
      )}

      {/* ---------- ONTDEK ---------- */}
      {tab === "ontdek" && (
        <BrowseView items={browse} totalAll={ACTIVITIES.length} query={query} setQuery={setQuery} sort={sort} setSort={setSort}
          favIds={favIds} onOpen={(a) => setDetail(a)} onFav={toggleFav} onFilters={() => setFiltersOpen(true)} />
      )}

      {/* ---------- FAVORITES ---------- */}
      {tab === "favorites" && (
        <div className="px-5 pt-6 fade">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><Icon name="heart" size={24} className="text-rose-500 fill-current" stroke={0} /> Bewaard</h1>
            {favTab === "fav" && favs.length > 0 && (
              <button onClick={() => shareFavorites(favs)} className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-card active:scale-95" aria-label="Deel mijn favorieten"><Icon name="share-2" size={19} stroke={2.4} /></button>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setFavTab("fav")} className={"flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition " + (favTab === "fav" ? "bg-teal-500 text-white shadow-card" : "bg-white text-ink shadow-card")}>
              <Icon name="heart" size={15} stroke={2.4} /> Favorieten {favs.length > 0 && <span className="opacity-80">{favs.length}</span>}
            </button>
            <button onClick={() => setFavTab("done")} className={"flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition " + (favTab === "done" ? "bg-teal-500 text-white shadow-card" : "bg-white text-ink shadow-card")}>
              <Icon name="circle-check" size={15} stroke={2.4} /> Geweest {doneList.length > 0 && <span className="opacity-80">{doneList.length}</span>}
            </button>
          </div>

          {favTab === "fav" ? (
            favs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-3">📌</div>
                <p className="font-display text-xl font-extrabold text-ink">Nog niks bewaard</p>
                <p className="text-muted mt-1 text-sm">Tik op het hartje bij een uitje om het hier te bewaren.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {favs.map((a) => <ListCard key={a.id} a={a} onOpen={() => setDetail(a)} onRemove={() => toggleFav(a.id)} />)}
              </div>
            )
          ) : (
            doneList.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-3">✅</div>
                <p className="font-display text-xl font-extrabold text-ink">Nog niks afgevinkt</p>
                <p className="text-muted mt-1 text-sm">Markeer een uitje als 'geweest' om je avonturen bij te houden.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {doneList.map((a) => <ListCard key={a.id} a={a} onOpen={() => setDetail(a)} onRemove={() => toggleDone(a.id)} />)}
              </div>
            )
          )}
        </div>
      )}

      {/* ---------- PROFILE ---------- */}
      {tab === "profile" && (
        <div className="px-5 pt-6 fade">
          <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><Icon name="user" size={24} /> Profiel</h1>

          <div className="mt-5 bg-white rounded-3xl shadow-card p-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-500 grid place-items-center text-white shadow-card"><Icon name="sparkles" size={26} stroke={2.4} /></div>
              <div>
                <p className="font-display font-extrabold text-lg text-ink">Hup! Gezin</p>
                <p className="text-sm text-muted">Startlocatie {origin.name}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["🎉", rolls, "keer Hup!"], ["❤️", favIds.length, favIds.length === 1 ? "favoriet" : "favorieten"], ["✅", doneIds.length, "geweest"]].map(([e, n, l]) => (
              <div key={l} className="bg-white rounded-3xl shadow-card py-4 text-center">
                <div className="text-2xl">{e}</div>
                <div className="font-display text-2xl font-extrabold text-ink tabular-nums mt-1">{n}</div>
                <div className="text-[11px] text-muted font-semibold">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-white rounded-3xl shadow-card p-5">
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-1 flex items-center gap-2"><Icon name="map-pin" size={16} className="text-teal-600" /> Startlocatie</h3>
            <p className="text-sm text-muted mb-3">Afstanden worden vanaf hier berekend. Nu: <b className="text-ink">{origin.name}</b>.</p>
            <button onClick={useMyLocation} className="w-full inline-flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-3 rounded-2xl shadow-card active:scale-[.98] transition mb-3">
              <Icon name="locate-fixed" size={18} stroke={2.4} /> Gebruik mijn locatie
            </button>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1">Of kies een plaats</label>
            <div className="relative">
              <select
                value={TOWNS.some((t) => t.name === origin.name) ? origin.name : ""}
                onChange={(e) => { const t = TOWNS.find((x) => x.name === e.target.value); if (t) { setPrefs({ ...prefs, origin: t }); Sound.blip(); } }}
                className="w-full appearance-none bg-mint rounded-2xl px-4 py-3 pr-10 font-semibold text-ink outline-none focus:ring-2 focus:ring-teal-400">
                {!TOWNS.some((t) => t.name === origin.name) && <option value="">{origin.name}</option>}
                {TOWNS.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><Icon name="chevron-down" size={18} /></span>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-3xl shadow-card divide-y divide-line">
            <button onClick={() => { const v = !soundOn; setSoundOn(v); Sound.set(v); if (v) Sound.blip(); }} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name={soundOn ? "volume-2" : "volume-x"} size={20} className="text-teal-600" /> Geluid</span>
              <span className="switch" data-on={soundOn}><span className="knob" /></span>
            </button>
            <button onClick={() => setWeatherOn(!weatherOn)} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="cloud-sun" size={20} className="text-teal-600" /> Weer slim <span className="text-xs font-semibold text-muted">regen → binnen</span></span>
              <span className="switch" data-on={weatherOn}><span className="knob" /></span>
            </button>
            <button onClick={() => setFiltersOpen(true)} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="sliders-horizontal" size={20} className="text-teal-600" /> Filters & gezin</span>
              <Icon name="chevron-right" size={20} className="text-muted" />
            </button>
            <button onClick={() => { if (doneIds.length && confirm("'Al gedaan'-lijst wissen?")) setDoneIds([]); }} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="circle-check" size={20} className="text-teal-600" /> Al gedaan</span>
              <span className="text-sm text-muted font-bold">{doneIds.length}</span>
            </button>
            <button onClick={() => { if (confirm("Alle favorieten verwijderen?")) setFavIds([]); }} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="trash-2" size={20} className="text-teal-600" /> Favorieten wissen</span>
              <span className="text-sm text-muted font-bold">{favIds.length}</span>
            </button>
          </div>

          {installEvt && (
            <button onClick={async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch {} setInstallEvt(null); }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-white text-ink font-bold py-4 rounded-3xl shadow-card active:scale-[.98] transition border border-line">
              <Icon name="download" size={20} className="text-teal-600" /> Installeer Hup! op je telefoon
            </button>
          )}

          <button onClick={shareApp} className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-teal-500 text-white font-display font-extrabold py-4 rounded-3xl shadow-card active:scale-[.98] transition">
            <Icon name="share-2" size={20} stroke={2.5} /> Deel Hup! met vrienden
          </button>

          <div className="mt-4 bg-white rounded-3xl shadow-card divide-y divide-line">
            <button onClick={tipMail} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="lightbulb" size={20} className="text-teal-600" /> Tip een uitje</span>
              <Icon name="chevron-right" size={20} className="text-muted" />
            </button>
          </div>

          <div className="mt-4 bg-white/60 rounded-3xl p-5 text-sm text-muted leading-relaxed">
            <p className="font-bold text-ink mb-1">{ACTIVITIES.length} uitjes in de buurt</p>
            Database gericht op Overijssel. Prijzen, openingstijden en beoordelingen zijn <b>indicatief</b> — controleer altijd de officiële website voordat je gaat. Afstanden zijn hemelsbreed (Haversine).
          </div>
          <p className="text-center text-[11px] text-muted/70 mt-4">Hup! · Spontane Uitjes · PWA</p>
        </div>
      )}

      {/* ---------- bottom nav ---------- */}
      <nav className="fixed bottom-0 inset-x-0 z-30">
        <div className="max-w-md mx-auto bg-white shadow-nav rounded-t-[24px] px-3 py-2.5 flex items-center justify-around" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
          {[["home", "home", "Home"], ["ontdek", "compass", "Ontdek"], ["favorites", "heart", "Favorieten"], ["profile", "user", "Profiel"]].map(([id, ic, label]) => (
            <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 py-1 px-2.5 relative">
              <Icon name={ic} size={23} className={tab === id ? "text-teal-600" : "text-muted"} stroke={tab === id ? 2.6 : 2.2} />
              <span className={"text-[11px] font-bold " + (tab === id ? "text-teal-700" : "text-muted")}>{label}</span>
              {id === "favorites" && favIds.length > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 grid place-items-center text-[9px] font-black bg-rose-500 text-white rounded-full">{favIds.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ---------- overlays ---------- */}
      {rolling && spin && <RouletteOverlay spin={spin} />}
      {detail && !rolling && (
        <DetailView a={detail} isFav={favIds.includes(detail.id)} onFav={() => toggleFav(detail.id)} onBack={() => setDetail(null)} onNext={roll} isDone={doneIds.includes(detail.id)} onDone={() => toggleDone(detail.id)} company={prefs.company} rainy={rainyActive} />
      )}
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} prefs={prefs} setPrefs={setPrefs} count={candidates.length} />
      {showIntro && !detail && <IntroOverlay onClose={dismissIntro} />}
    </div>
  );
}

/* ----------------------------------------------------- error boundary */
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { console.error("Hup! render-fout:", err); } catch {} }
  async hardReset() {
    try {
      if ("serviceWorker" in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    } catch {}
    location.reload();
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[100dvh] grid place-items-center p-6 text-center">
          <div className="max-w-sm">
            <div className="text-5xl mb-3">🛠️</div>
            <h1 className="font-display text-2xl font-extrabold text-ink">Er ging iets mis</h1>
            <p className="text-muted mt-2">De app liep vast. Probeer te herladen — of wis de cache als het probleem blijft.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={() => location.reload()} className="bg-teal-500 text-white font-bold py-3 rounded-2xl shadow-card active:scale-95">Herladen</button>
              <button onClick={() => this.hardReset()} className="bg-white text-ink font-bold py-3 rounded-2xl shadow-card active:scale-95 border border-line">Cache wissen & herladen</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
