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

const CAT = {
  natuur:    { label: "Natuur",     g: ["#34d399", "#0d9488"] },
  speeltuin: { label: "Speeltuin",  g: ["#fbbf24", "#f97316"] },
  dieren:    { label: "Dieren",     g: ["#fb923c", "#ef4444"] },
  museum:    { label: "Museum",     g: ["#818cf8", "#6366f1"] },
  binnenpret:{ label: "Binnenpret", g: ["#f472b6", "#db2777"] },
  water:     { label: "Water",      g: ["#38bdf8", "#0ea5e9"] },
  avontuur:  { label: "Avontuur",   g: ["#f87171", "#e11d48"] },
  eten:      { label: "Lekker eten",g: ["#fcd34d", "#f59e0b"] },
};

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
function Hero({ a, h = 200, rounded = "rounded-t-[26px]" }) {
  const c = CAT[a.category];
  return (
    <div className={"relative overflow-hidden " + rounded} style={{ height: h, background: `linear-gradient(135deg, ${c.g[0]}, ${c.g[1]})` }}>
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.55) 1.5px, transparent 0)", backgroundSize: "20px 20px" }} />
      <div className="absolute -right-6 -top-8 w-40 h-40 rounded-full bg-white/15" />
      <div className="absolute -left-10 bottom-[-30px] w-48 h-48 rounded-full bg-black/5" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[84px] drop-shadow-sm select-none" aria-hidden="true">{a.emoji}</span>
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
function DetailView({ a, isFav, onFav, onBack, onNext }) {
  return (
    <div className="fixed inset-0 z-40 bg-mint flex flex-col fade">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-11 h-11 grid place-items-center rounded-full bg-white shadow-card active:scale-95 transition" aria-label="Terug">
          <Icon name="chevron-left" size={24} stroke={2.6} />
        </button>
        <h1 className="font-display font-extrabold tracking-tight text-ink">Activiteit</h1>
        <button onClick={onFav} aria-pressed={isFav} aria-label="Bewaar favoriet"
          className={"w-11 h-11 grid place-items-center rounded-full shadow-card active:scale-95 transition " + (isFav ? "bg-rose-500 text-white" : "bg-white text-ink")}>
          <Icon name="heart" size={22} stroke={isFav ? 0 : 2.4} className={isFav ? "fill-current" : ""} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32">
        <div className="bg-white rounded-[28px] shadow-soft overflow-hidden pop">
          <Hero a={a} />
          <div className="p-5">
            <h2 className="font-display text-[26px] leading-tight font-extrabold text-ink">{a.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-muted font-semibold">
              <Icon name="map-pin" size={15} /> {a.plaats}
            </div>
            <div className="mt-3"><Stars value={a.rating} /></div>

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

            <div className="mt-4"><MiniMap a={a} onOpen={() => window.open(mapsUrl(a), "_blank", "noopener")} /></div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted/80 mt-3">Prijs, duur en beoordeling zijn indicatief — check de website.</p>
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
    </div>
  );
}

/* ----------------------------------------------------- roulette overlay */
function RouletteOverlay({ preview }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-mint/70 backdrop-blur-sm fade">
      <div className="text-center">
        <div className="w-64 h-44 rounded-[28px] bg-white shadow-soft overflow-hidden mx-auto relative">
          {preview && (
            <div key={preview.id} className="win-in h-full flex flex-col">
              <div className="h-24" style={{ background: `linear-gradient(135deg, ${CAT[preview.category].g[0]}, ${CAT[preview.category].g[1]})` }}>
                <div className="h-full grid place-items-center"><span className="text-5xl">{preview.emoji}</span></div>
              </div>
              <div className="flex-1 grid place-items-center px-3">
                <span className="font-display font-extrabold text-ink leading-tight text-[15px]">{preview.name}</span>
              </div>
            </div>
          )}
        </div>
        <p className="mt-5 font-display font-extrabold text-teal-700 text-lg tracking-wide flex items-center justify-center gap-2">
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

          {/* Wie gaat er mee */}
          <section>
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-2">Wie gaat er mee?</h3>
            <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card mb-3">
              <span className="font-bold text-ink flex items-center gap-2"><Icon name="user" size={18} /> Volwassenen</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setPrefs({ ...prefs, adults: Math.max(1, prefs.adults - 1) })} className="w-9 h-9 rounded-full bg-mint grid place-items-center font-black active:scale-90" aria-label="Minder">−</button>
                <span className="font-display font-extrabold text-lg w-6 text-center">{prefs.adults}</span>
                <button onClick={() => setPrefs({ ...prefs, adults: Math.min(8, prefs.adults + 1) })} className="w-9 h-9 rounded-full bg-mint grid place-items-center font-black active:scale-90" aria-label="Meer">+</button>
              </div>
            </div>
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
            <p className="text-[12px] text-muted mt-2">
              {ages.length === 0
                ? "Geen leeftijdsfilter — kies bv. via 'Soort uitje' een wandeling of restaurant."
                : "We zoeken de overlap zodat het uitje voor iederéén leuk is."}
            </p>
          </section>

          {/* Soort uitje */}
          <section>
            <h3 className="font-display font-extrabold uppercase tracking-wide text-sm text-muted mb-2">Soort uitje</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CAT).map((k) => <Chip key={k} active={!prefs.excludeCats.includes(k)} onClick={() => toggleArr("excludeCats", k)}>{CAT[k].label}</Chip>)}
            </div>
          </section>

          {/* Alleen binnen */}
          <section>
            <button onClick={() => setPrefs({ ...prefs, indoorOnly: !prefs.indoorOnly })} className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card">
              <span className="font-bold text-ink flex items-center gap-2"><Icon name="home" size={18} /> Alleen binnen</span>
              <span className="switch" data-on={prefs.indoorOnly}><span className="knob" /></span>
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
function BrowseView({ items, totalAll, query, setQuery, sort, setSort, favIds, onOpen, onFav, onFilters }) {
  const sorts = [["afstand", "Dichtbij"], ["prijs", "Prijs"], ["rating", "Beste"]];
  return (
    <div className="px-5 pt-6 fade">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><Icon name="compass" size={24} /> Ontdek</h1>
        <button onClick={onFilters} className="w-11 h-11 rounded-full bg-white grid place-items-center shadow-card active:scale-95" aria-label="Filters"><Icon name="sliders-horizontal" size={20} stroke={2.4} /></button>
      </div>

      <div className="mt-4 relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={18} /></span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op naam of plaats…"
          className="w-full bg-white rounded-2xl shadow-card pl-11 pr-10 py-3.5 font-semibold text-ink placeholder:text-muted/70 outline-none focus:ring-2 focus:ring-teal-400" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Wissen"><Icon name="x" size={18} /></button>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted mr-1">Sorteer</span>
        {sorts.map(([v, l]) => (
          <button key={v} onClick={() => setSort(v)}
            className={"px-3.5 py-1.5 rounded-full text-sm font-bold transition active:scale-95 " + (sort === v ? "bg-teal-500 text-white shadow-card" : "bg-white text-ink shadow-card")}>{l}</button>
        ))}
      </div>

      <p className="mt-3 text-[13px] text-muted font-semibold">
        {items.length} {items.length === 1 ? "uitje" : "uitjes"} · van {totalAll} in totaal
        {items.length < totalAll && <button onClick={onFilters} className="text-teal-700 ml-1">· filters aanpassen</button>}
      </p>

      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-2">🔍</div>
            <p className="font-display font-extrabold text-lg text-ink">Niks gevonden</p>
            <p className="text-sm text-muted mt-1">Probeer een andere zoekterm of verruim je filters.</p>
          </div>
        ) : items.map((a) => (
          <div key={a.id} className="rise bg-white rounded-3xl shadow-card overflow-hidden flex">
            <button onClick={() => onOpen(a)} className="w-20 shrink-0 relative" style={{ background: `linear-gradient(135deg, ${CAT[a.category].g[0]}, ${CAT[a.category].g[1]})` }} aria-label={a.name}>
              <div className="absolute inset-0 grid place-items-center text-3xl">{a.emoji}</div>
            </button>
            <button onClick={() => onOpen(a)} className="flex-1 text-left p-3 min-w-0">
              <h3 className="font-display font-extrabold text-ink leading-tight text-[15px] truncate">{a.name}</h3>
              <div className="text-[12px] text-muted font-semibold flex items-center gap-1 mt-0.5"><Icon name="map-pin" size={12} /> {a.plaats} · {a.distance.toFixed(0)} km</div>
              <div className="mt-1 flex items-center gap-3 text-[12px] font-bold text-ink">
                <span className="flex items-center gap-1"><Icon name="badge-euro" size={12} className="text-teal-600" /> {euro(a.prijs)}</span>
                <span className="flex items-center gap-1"><Icon name="clock" size={12} className="text-teal-600" /> {a.duur}</span>
                <span className="flex items-center gap-1"><Icon name="star" size={12} className="text-amber" /> {a.rating.toFixed(1)}</span>
              </div>
            </button>
            <button onClick={() => onFav(a.id)} className={"px-3 self-stretch grid place-items-center " + (favIds.includes(a.id) ? "text-rose-500" : "text-muted")} aria-label="Bewaar favoriet">
              <Icon name="heart" size={20} stroke={favIds.includes(a.id) ? 0 : 2.2} className={favIds.includes(a.id) ? "fill-current" : ""} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------- App */
function App() {
  const [tab, setTab] = useState("home");
  const [prefs, setPrefs] = useState(() => loadJSON(PREFS_KEY, {
    ages: [2, 6], adults: 2, radius: 75, budgets: ["gratis", "low", "mid", "high"], excludeCats: [], indoorOnly: false,
  }));
  const [favIds, setFavIds] = useState(() => loadJSON(FAV_KEY, []));
  const [detail, setDetail] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [preview, setPreview] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [soundOn, setSoundOn] = useState(Sound.enabled);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("afstand");
  const lastId = useRef(null);

  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs]);
  useEffect(() => saveJSON(FAV_KEY, favIds), [favIds]);

  const withMeta = (a) => ({ ...a, distance: haversine(HARDENBERG.lat, HARDENBERG.lng, a.lat, a.lng) });

  const candidates = useMemo(() => ACTIVITIES.map(withMeta)
    .filter((a) => matchesAges(a, prefs.ages))
    .filter((a) => a.distance <= prefs.radius)
    .filter((a) => prefs.budgets.includes(priceTier(a.prijs)))
    .filter((a) => !prefs.excludeCats.includes(a.category))
    .filter((a) => (prefs.indoorOnly ? a.indoor_friendly : true))
    .map((a) => ({ ...a, fit: fitScore(a, prefs.ages) })), [prefs]);

  const weightedPick = useCallback(() => {
    const pool = candidates.filter((c) => c.id !== lastId.current);
    const draw = pool.length ? pool : candidates;
    const bag = [];
    draw.forEach((c) => { const w = 1 + Math.round(c.fit * 3); for (let i = 0; i < w; i++) bag.push(c); });
    return bag[Math.floor(Math.random() * bag.length)];
  }, [candidates]);

  const roll = useCallback(() => {
    if (rolling) return;
    if (!candidates.length) { setEmpty(true); setDetail(null); return; }
    setEmpty(false); Sound.unlock(); Sound.whoosh(); vibrate(12); setRolling(true);
    const total = 14; let i = 0;
    const step = () => {
      setPreview(candidates[Math.floor(Math.random() * candidates.length)]);
      Sound.tick(); i++;
      if (i < total) setTimeout(step, 45 + i * i * 1.1);
      else {
        const chosen = weightedPick(); lastId.current = chosen.id;
        setRolling(false); setPreview(null); setDetail(chosen); setTab("home");
        Sound.ding(); vibrate([18, 40, 18]);
      }
    };
    step();
  }, [rolling, candidates, weightedPick]);

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
  const w = ageWindow(prefs.ages);
  const favs = ACTIVITIES.filter((a) => favIds.includes(a.id)).map(withMeta);

  return (
    <div className="relative mx-auto max-w-md min-h-[100dvh] pb-24">
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

          <div className="text-center mt-10">
            <p className="inline-block text-xs font-extrabold uppercase tracking-[.18em] text-teal-700 bg-teal-100/70 px-3 py-1.5 rounded-full">Voor het hele gezin</p>
            <h1 className="font-display text-[clamp(2.2rem,9vw,3rem)] font-extrabold leading-[1.05] tracking-tight mt-4 text-ink">Geen inspiratie?</h1>
            <p className="mt-3 text-[15px] text-muted leading-relaxed max-w-xs mx-auto">Eén tik en we kiezen een uitje dat precies past bij jouw gezin.</p>
          </div>

          <div className="flex flex-col items-center mt-10">
            <button onClick={roll} disabled={rolling}
              className="hup-btn hup-pulse relative w-52 h-52 rounded-full bg-teal-500 text-white grid place-items-center shadow-soft active:shadow-card"
              aria-label="Kies een uitje">
              <div className="flex flex-col items-center">
                <Icon name="sparkles" size={26} className="text-white/90 mb-1" stroke={2.4} />
                <span className="font-display text-6xl font-extrabold tracking-tight">Hup!</span>
              </div>
            </button>
            <p className="mt-7 text-[13px] font-semibold text-muted flex items-center gap-1.5">
              <Icon name="users" size={14} /> {prefs.ages.length === 0 ? "Volwassenen" : `${prefs.ages.length} ${prefs.ages.length === 1 ? "kind" : "kinderen"} · overlap ${w.low}–${w.high} jr`} · {candidates.length} {candidates.length === 1 ? "match" : "matches"}
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
          <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2"><Icon name="heart" size={24} className="text-rose-500 fill-current" stroke={0} /> Favorieten</h1>
          {favs.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-3">📌</div>
              <p className="font-display text-xl font-extrabold text-ink">Nog niks bewaard</p>
              <p className="text-muted mt-1 text-sm">Tik op het hartje bij een uitje om het hier te bewaren.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {favs.map((a) => <ListCard key={a.id} a={a} onOpen={() => setDetail(a)} onRemove={() => toggleFav(a.id)} />)}
            </div>
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
                <p className="text-sm text-muted">Startlocatie {HARDENBERG.name}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-3xl shadow-card divide-y divide-line">
            <button onClick={() => { const v = !soundOn; setSoundOn(v); Sound.set(v); if (v) Sound.blip(); }} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name={soundOn ? "volume-2" : "volume-x"} size={20} className="text-teal-600" /> Geluid</span>
              <span className="switch" data-on={soundOn}><span className="knob" /></span>
            </button>
            <button onClick={() => setFiltersOpen(true)} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="sliders-horizontal" size={20} className="text-teal-600" /> Filters & gezin</span>
              <Icon name="chevron-right" size={20} className="text-muted" />
            </button>
            <button onClick={() => { if (confirm("Alle favorieten verwijderen?")) setFavIds([]); }} className="w-full flex items-center justify-between px-5 py-4">
              <span className="font-bold text-ink flex items-center gap-3"><Icon name="trash-2" size={20} className="text-teal-600" /> Favorieten wissen</span>
              <span className="text-sm text-muted font-bold">{favIds.length}</span>
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
      {rolling && <RouletteOverlay preview={preview} />}
      {detail && !rolling && (
        <DetailView a={detail} isFav={favIds.includes(detail.id)} onFav={() => toggleFav(detail.id)} onBack={() => setDetail(null)} onNext={roll} />
      )}
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} prefs={prefs} setPrefs={setPrefs} count={candidates.length} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
