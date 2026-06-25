/* Hup! — Spontane Uitjes
 * Pure React (in-browser Babel). Geen build-stap.
 * Geïnspireerd op de dataset-structuur van verras-me-nu.lovable.app:
 * activiteiten met min_age/max_age, prijs, indoor_friendly, lat/lng.
 * Startlocatie: Hardenberg.
 */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ----------------------------------------------------------------------
 * Constants & helpers
 * -------------------------------------------------------------------- */
const HARDENBERG = { name: "Hardenberg", lat: 52.5752, lng: 6.6177 };
const FAV_KEY = "hup.favorites.v1";
const PREFS_KEY = "hup.prefs.v1";

const CATEGORIES = {
  natuur:    { label: "Natuur",       color: "var(--color-teal-500)" },
  speeltuin: { label: "Speeltuin",    color: "var(--color-mond-yellow)" },
  dieren:    { label: "Dieren",       color: "var(--color-mond-red)" },
  museum:    { label: "Museum",       color: "var(--color-mond-blue)" },
  binnenpret:{ label: "Binnenpret",   color: "var(--color-teal-600)" },
  water:     { label: "Water",        color: "var(--color-teal-400)" },
  avontuur:  { label: "Avontuur",     color: "var(--color-mond-red)" },
  eten:      { label: "Lekker eten",  color: "var(--color-mond-yellow)" },
};

// Haversine afstand in kilometers
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const euro = (n) => (n === 0 ? "Gratis" : "€" + n);

/* ----------------------------------------------------------------------
 * De database — Nederlandse gezinsuitjes rond Hardenberg (en breder)
 * -------------------------------------------------------------------- */
const ACTIVITIES = [
  { id: 1,  name: "Kinderboerderij De Klimboom", plaats: "Hardenberg",   category: "dieren",     min_age: 0,  max_age: 12, prijs: 0,  indoor_friendly: false, lat: 52.5750, lng: 6.6010, emoji: "🐐", desc: "Knuffelen met geiten, konijnen en kippen — vlakbij het centrum." },
  { id: 2,  name: "Zwembad De Marsch",            plaats: "Hardenberg",   category: "water",      min_age: 0,  max_age: 99, prijs: 7,  indoor_friendly: true,  lat: 52.5705, lng: 6.6125, emoji: "🏊", desc: "Subtropisch zwemparadijs met glijbaan en peuterbad." },
  { id: 3,  name: "Speelpark De Vechtstreek",     plaats: "Hardenberg",   category: "speeltuin",  min_age: 2,  max_age: 12, prijs: 12, indoor_friendly: false, lat: 52.5810, lng: 6.6240, emoji: "🎠", desc: "Buitenspeelpark met trampolines, kabelbaan en waterspeeltuin." },
  { id: 4,  name: "Strandbad De Oldemeyer",       plaats: "Slagharen",    category: "water",      min_age: 0,  max_age: 99, prijs: 5,  indoor_friendly: false, lat: 52.6020, lng: 6.6780, emoji: "🏖️", desc: "Natuurstrand aan een meertje met ondiep water en speeltoestellen." },
  { id: 5,  name: "Pannenkoekenboerderij",        plaats: "Gramsbergen",  category: "eten",       min_age: 0,  max_age: 99, prijs: 15, indoor_friendly: true,  lat: 52.6230, lng: 6.6510, emoji: "🥞", desc: "Onbeperkt pannenkoeken met binnen- en buitenspeelhoek." },
  { id: 6,  name: "Speeltuin Bosrand",            plaats: "Dedemsvaart",  category: "speeltuin",  min_age: 1,  max_age: 10, prijs: 0,  indoor_friendly: false, lat: 52.6005, lng: 6.4520, emoji: "🛝", desc: "Gratis buurtspeeltuin met zandbak, schommels en klimrek." },
  { id: 7,  name: "Speelboerderij De Hofstee",    plaats: "Ommen",        category: "speeltuin",  min_age: 1,  max_age: 10, prijs: 9,  indoor_friendly: false, lat: 52.5200, lng: 6.4200, emoji: "🚜", desc: "Boerderijspeeltuin met dieren, skelters en stro-hooiberg." },
  { id: 8,  name: "Monkey Town",                  plaats: "Coevorden",    category: "binnenpret", min_age: 1,  max_age: 11, prijs: 9,  indoor_friendly: true,  lat: 52.6600, lng: 6.7400, emoji: "🐵", desc: "Grote overdekte speelhal met ballenbak en klimtoestellen." },
  { id: 9,  name: "Ballorig Indoor Speelparadijs",plaats: "Zwolle",       category: "binnenpret", min_age: 1,  max_age: 11, prijs: 10, indoor_friendly: true,  lat: 52.5168, lng: 6.0830, emoji: "🎈", desc: "Indoor speelparadijs met glijbanen, trampolines en air-track." },
  { id: 10, name: "Ecodrome Natuurpad",           plaats: "Zwolle",       category: "natuur",     min_age: 2,  max_age: 12, prijs: 8,  indoor_friendly: false, lat: 52.5210, lng: 6.0610, emoji: "🌿", desc: "Blotevoetenpad en ontdekroute door de natuur." },
  { id: 11, name: "WILDLANDS Adventure Zoo",      plaats: "Emmen",        category: "dieren",     min_age: 0,  max_age: 99, prijs: 24, indoor_friendly: true,  lat: 52.7850, lng: 6.8970, emoji: "🐘", desc: "Belevenis-dierentuin met jungle, savanne en poolwereld." },
  { id: 12, name: "Sprookjeshof",                 plaats: "Zuidlaren",    category: "speeltuin",  min_age: 2,  max_age: 10, prijs: 13, indoor_friendly: false, lat: 53.1000, lng: 6.6800, emoji: "🏰", desc: "Sprookjespark met speeltuin, dieren en attracties." },
  { id: 13, name: "Avonturenpark Hellendoorn",    plaats: "Hellendoorn",  category: "avontuur",   min_age: 3,  max_age: 99, prijs: 29, indoor_friendly: false, lat: 52.3900, lng: 6.4600, emoji: "🎢", desc: "Attractiepark met achtbanen, dwaaltuin en waterattracties." },
  { id: 14, name: "Nationaal Park Dwingelderveld",plaats: "Ruinen",       category: "natuur",     min_age: 0,  max_age: 99, prijs: 0,  indoor_friendly: false, lat: 52.8100, lng: 6.4000, emoji: "🌾", desc: "Het grootste natte heideveld van Europa — wandelen & speurtochten." },
  { id: 15, name: "Drents Museum (kinderroute)",  plaats: "Assen",        category: "museum",     min_age: 4,  max_age: 99, prijs: 13, indoor_friendly: true,  lat: 52.9950, lng: 6.5630, emoji: "🏛️", desc: "Kindvriendelijke museumroute langs ridders en archeologie." },
  { id: 16, name: "Boomkroonpad Drouwen",         plaats: "Drouwen",      category: "natuur",     min_age: 4,  max_age: 99, prijs: 12, indoor_friendly: false, lat: 52.9600, lng: 6.7800, emoji: "🌳", desc: "Wandel hoog tussen de boomtoppen — 22 meter boven de grond." },
  { id: 17, name: "Klimbos Hardenberg",           plaats: "Hardenberg",   category: "avontuur",   min_age: 6,  max_age: 99, prijs: 18, indoor_friendly: false, lat: 52.5905, lng: 6.6505, emoji: "🧗", desc: "Klimparcours en tokkelbanen door de boomtoppen." },
  { id: 18, name: "Bowlen & Lasergamen",          plaats: "Hardenberg",   category: "binnenpret", min_age: 6,  max_age: 99, prijs: 14, indoor_friendly: true,  lat: 52.5790, lng: 6.6135, emoji: "🎳", desc: "Bowlingbanen en arena-lasergame voor de hele familie." },
  { id: 19, name: "Museumfabriek",                plaats: "Enschede",     category: "museum",     min_age: 4,  max_age: 99, prijs: 15, indoor_friendly: true,  lat: 52.2200, lng: 6.8900, emoji: "🦣", desc: "Doe-museum met natuur, techniek en een echt mammoetskelet." },
  { id: 20, name: "Klimhal Bjoeks",               plaats: "Groningen",    category: "avontuur",   min_age: 6,  max_age: 99, prijs: 16, indoor_friendly: true,  lat: 53.2100, lng: 6.5600, emoji: "🧗‍♀️", desc: "Grote indoor klimhal met routes voor beginners en gevorderden." },
  { id: 21, name: "Kameleondorp",                 plaats: "Terherne",     category: "avontuur",   min_age: 2,  max_age: 12, prijs: 15, indoor_friendly: false, lat: 53.0200, lng: 5.7800, emoji: "⛵", desc: "Beleef de avonturen van Hielke en Sietse in het echte Kameleondorp." },
  { id: 22, name: "Speelbos & Blotevoetenpad",    plaats: "Ommen",        category: "natuur",     min_age: 1,  max_age: 12, prijs: 0,  indoor_friendly: false, lat: 52.5260, lng: 6.4350, emoji: "🐾", desc: "Gratis speelbos met hutten bouwen, modder en een speurtocht." },
  { id: 23, name: "Indoor Karting",               plaats: "Zwolle",       category: "binnenpret", min_age: 6,  max_age: 99, prijs: 22, indoor_friendly: true,  lat: 52.5080, lng: 6.0550, emoji: "🏎️", desc: "Elektrisch karten op een overdekt circuit." },
  { id: 24, name: "De Koemarkt Speeltuin",        plaats: "Hardenberg",   category: "speeltuin",  min_age: 0,  max_age: 9,  prijs: 0,  indoor_friendly: false, lat: 52.5742, lng: 6.6180, emoji: "🎪", desc: "Centrale speeltuin met waterpomp, glijbaan en picknickbankjes." },
];

/* ----------------------------------------------------------------------
 * Leeftijdssynchronisatie-algoritme
 * Een uitje is "gezinsproof" als het leeftijdsbereik van de activiteit
 * de leeftijd van ELK kind omvat — de overlap voor alle kinderen samen.
 * Voor kinderen van 2 én 6 betekent dit: min_age <= 2 EN max_age >= 6.
 * We scoren extra hoog wanneer het bereik strak rond het gezin past.
 * -------------------------------------------------------------------- */
function ageOverlapWindow(ages) {
  if (!ages.length) return null;
  return { low: Math.min(...ages), high: Math.max(...ages) };
}

function matchesFamilyAges(activity, ages) {
  // Elk kind moet binnen [min_age, max_age] vallen.
  return ages.every((a) => a >= activity.min_age && a <= activity.max_age);
}

function familyFitScore(activity, ages) {
  // Hoe strakker het activiteitsbereik om het gezin sluit, hoe beter (0..1).
  const win = ageOverlapWindow(ages);
  if (!win) return 0;
  const span = Math.max(1, activity.max_age - activity.min_age);
  const familySpan = Math.max(1, win.high - win.low);
  // beloon strakke fit, maar straf een veel te ruim "0-99" bereik licht
  const tightness = familySpan / span; // 1 = perfect strak
  const centered =
    1 -
    Math.abs(
      (activity.min_age + activity.max_age) / 2 - (win.low + win.high) / 2
    ) /
      50;
  return Math.max(0, tightness * 0.6 + centered * 0.4);
}

/* ----------------------------------------------------------------------
 * localStorage helpers
 * -------------------------------------------------------------------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/* ----------------------------------------------------------------------
 * Lucide icon component (CDN) — robuust voor re-renders
 * -------------------------------------------------------------------- */
function Icon({ name, size = 22, className = "", strokeWidth = 2.4 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      window.lucide.createIcons({
        attrs: { "stroke-width": strokeWidth },
        nameAttr: "data-lucide",
        icons: window.lucide.icons,
      });
    }
  });
  return (
    <i
      ref={ref}
      data-lucide={name}
      style={{ width: size, height: size, display: "inline-flex" }}
      className={className}
    />
  );
}

/* ----------------------------------------------------------------------
 * UI bits
 * -------------------------------------------------------------------- */
function Segmented({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-3 border-[3px] border-ink hard-shadow-sm bg-white">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={
            "py-3 text-sm font-bold uppercase tracking-wide transition-colors " +
            (i < options.length - 1 ? "border-r-[3px] border-ink " : "") +
            (value === opt.value
              ? "bg-ink text-canvas"
              : "bg-white text-ink hover:bg-teal-50")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <Icon name={icon} size={16} />
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------
 * Result card
 * -------------------------------------------------------------------- */
function ResultCard({ activity, distance, isFav, onToggleFav, onAgain }) {
  const cat = CATEGORIES[activity.category];
  return (
    <div className="pop relative w-full max-w-md mx-auto bg-white border-[3px] border-ink hard-shadow">
      {/* Mondrian colour band */}
      <div className="flex border-b-[3px] border-ink">
        <div
          className="h-3 flex-1"
          style={{ background: cat.color }}
        />
        <div className="h-3 w-10 border-l-[3px] border-ink bg-mond-yellow" />
        <div className="h-3 w-6 border-l-[3px] border-ink bg-mond-red" />
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className="inline-block text-[11px] font-extrabold uppercase tracking-[.15em] px-2 py-1 border-2 border-ink"
              style={{ background: cat.color, color: "#fff" }}
            >
              {cat.label}
            </span>
            <h2 className="font-display text-3xl font-black leading-[1.05] mt-3">
              {activity.name}
            </h2>
          </div>
          <div className="text-5xl leading-none select-none" aria-hidden="true">
            {activity.emoji}
          </div>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          {activity.desc}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-ink">
          <Stat icon="map-pin">
            {activity.plaats} · {distance.toFixed(1)} km
          </Stat>
          <Stat icon="euro">{euro(activity.prijs)}</Stat>
          <Stat icon="users">
            {activity.min_age}–{activity.max_age} jaar
          </Stat>
          <Stat icon={activity.indoor_friendly ? "home" : "sun"}>
            {activity.indoor_friendly ? "Binnen" : "Buiten"}
          </Stat>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onAgain}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-500 text-white font-display font-black uppercase tracking-wide py-3.5 border-[3px] border-ink hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
          >
            <Icon name="shuffle" size={18} strokeWidth={3} />
            Nog een keer
          </button>
          <button
            onClick={onToggleFav}
            aria-pressed={isFav}
            aria-label={isFav ? "Verwijder uit favorieten" : "Bewaar favoriet"}
            className={
              "w-14 grid place-items-center border-[3px] border-ink hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition " +
              (isFav ? "bg-mond-red text-white" : "bg-white text-ink")
            }
          >
            <Icon name="heart" size={22} strokeWidth={isFav ? 0.1 : 2.6} className={isFav ? "fill-current" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * Filter drawer
 * -------------------------------------------------------------------- */
function FilterDrawer({ open, onClose, prefs, setPrefs, resultCount }) {
  if (!open) return null;

  const ages = prefs.ages;

  const setAge = (idx, val) => {
    const next = ages.slice();
    next[idx] = Math.max(0, Math.min(17, val));
    setPrefs({ ...prefs, ages: next });
  };
  const addChild = () =>
    setPrefs({ ...prefs, ages: [...ages, 4].slice(0, 6) });
  const removeChild = (idx) =>
    setPrefs({ ...prefs, ages: ages.filter((_, i) => i !== idx) });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="drawer-in relative w-full max-w-sm h-full bg-canvas border-l-[3px] border-ink overflow-y-auto no-scrollbar">
        <header className="sticky top-0 bg-canvas border-b-[3px] border-ink px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Icon name="sliders-horizontal" size={22} strokeWidth={3} />
            Filters
          </h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="w-10 h-10 grid place-items-center border-[3px] border-ink bg-white hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
          >
            <Icon name="x" size={20} strokeWidth={3} />
          </button>
        </header>

        <div className="px-5 py-6 space-y-8">
          {/* Kinderen / leeftijden */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-black uppercase tracking-wide text-lg">
                Kinderen
              </h3>
              <button
                onClick={addChild}
                disabled={ages.length >= 6}
                className="inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1.5 border-2 border-ink bg-mond-yellow disabled:opacity-40"
              >
                <Icon name="plus" size={14} strokeWidth={3} /> Kind
              </button>
            </div>
            <p className="text-sm text-ink/70 mb-4">
              We zoeken de overlap zodat het uitje voor iederéén leuk is.
            </p>
            <div className="space-y-3">
              {ages.map((age, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-white border-[3px] border-ink px-3 py-2 hard-shadow-sm"
                >
                  <Icon name="baby" size={18} />
                  <span className="text-sm font-bold w-16">Kind {idx + 1}</span>
                  <button
                    onClick={() => setAge(idx, age - 1)}
                    className="w-8 h-8 grid place-items-center border-2 border-ink bg-canvas font-black"
                    aria-label="Jonger"
                  >
                    –
                  </button>
                  <span className="font-display font-black text-xl w-12 text-center tabular-nums">
                    {age}
                  </span>
                  <button
                    onClick={() => setAge(idx, age + 1)}
                    className="w-8 h-8 grid place-items-center border-2 border-ink bg-canvas font-black"
                    aria-label="Ouder"
                  >
                    +
                  </button>
                  <span className="text-xs text-ink/60">jr</span>
                  {ages.length > 1 && (
                    <button
                      onClick={() => removeChild(idx)}
                      className="ml-auto text-ink/50 hover:text-mond-red"
                      aria-label="Verwijder kind"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Straal */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display font-black uppercase tracking-wide text-lg">
                Straal
              </h3>
              <span className="font-display font-black text-xl tabular-nums">
                {prefs.radius} km
              </span>
            </div>
            <p className="text-sm text-ink/70 mb-3">
              Hemelsbrede afstand vanaf {HARDENBERG.name}.
            </p>
            <input
              type="range"
              min="2"
              max="120"
              step="1"
              value={prefs.radius}
              onChange={(e) =>
                setPrefs({ ...prefs, radius: +e.target.value })
              }
            />
          </section>

          {/* Budget */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display font-black uppercase tracking-wide text-lg">
                Budget
              </h3>
              <span className="font-display font-black text-xl tabular-nums">
                {prefs.maxBudget >= 30 ? "€30+" : euro(prefs.maxBudget)}
              </span>
            </div>
            <p className="text-sm text-ink/70 mb-3">Maximale prijs per persoon.</p>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={prefs.maxBudget}
              onChange={(e) =>
                setPrefs({ ...prefs, maxBudget: +e.target.value })
              }
            />
          </section>

          {/* Binnen / buiten */}
          <section>
            <h3 className="font-display font-black uppercase tracking-wide text-lg mb-3">
              Binnen of buiten
            </h3>
            <Segmented
              value={prefs.environment}
              onChange={(v) => setPrefs({ ...prefs, environment: v })}
              options={[
                { value: "all", label: "Alles" },
                { value: "indoor", label: "Binnen" },
                { value: "outdoor", label: "Buiten" },
              ]}
            />
          </section>
        </div>

        <footer className="sticky bottom-0 bg-canvas border-t-[3px] border-ink px-5 py-4">
          <button
            onClick={onClose}
            className="w-full bg-teal-500 text-white font-display font-black uppercase tracking-wide py-3.5 border-[3px] border-ink hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
          >
            Toon {resultCount} {resultCount === 1 ? "uitje" : "uitjes"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * Favorites view
 * -------------------------------------------------------------------- */
function FavoritesView({ favIds, onClose, onRemove }) {
  const favs = ACTIVITIES.filter((a) => favIds.includes(a.id)).map((a) => ({
    ...a,
    distance: haversine(HARDENBERG.lat, HARDENBERG.lng, a.lat, a.lng),
  }));

  return (
    <div className="fixed inset-0 z-40 bg-canvas overflow-y-auto no-scrollbar">
      <header className="sticky top-0 bg-canvas border-b-[3px] border-ink px-5 py-4 flex items-center justify-between z-10">
        <h2 className="font-display text-2xl font-black uppercase tracking-tight flex items-center gap-2">
          <Icon name="heart" size={22} strokeWidth={3} className="text-mond-red fill-current" />
          Favorieten
        </h2>
        <button
          onClick={onClose}
          aria-label="Sluiten"
          className="w-10 h-10 grid place-items-center border-[3px] border-ink bg-white hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
        >
          <Icon name="x" size={20} strokeWidth={3} />
        </button>
      </header>

      <div className="max-w-md mx-auto px-5 py-6">
        {favs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📌</div>
            <p className="font-display text-2xl font-black uppercase">
              Nog niks bewaard
            </p>
            <p className="text-ink/70 mt-2">
              Tik op het hartje bij een uitje om het hier te bewaren.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {favs.map((a) => {
              const cat = CATEGORIES[a.category];
              return (
                <li
                  key={a.id}
                  className="rise bg-white border-[3px] border-ink hard-shadow-sm flex"
                >
                  <div
                    className="w-3 shrink-0"
                    style={{ background: cat.color }}
                  />
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display font-black text-lg leading-tight">
                        {a.emoji} {a.name}
                      </h3>
                      <button
                        onClick={() => onRemove(a.id)}
                        aria-label="Verwijder favoriet"
                        className="text-ink/40 hover:text-mond-red shrink-0"
                      >
                        <Icon name="trash-2" size={18} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-ink/80">
                      <Stat icon="map-pin">
                        {a.plaats} · {a.distance.toFixed(1)} km
                      </Stat>
                      <Stat icon="euro">{euro(a.prijs)}</Stat>
                      <Stat icon="users">
                        {a.min_age}–{a.max_age} jr
                      </Stat>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * App
 * -------------------------------------------------------------------- */
function App() {
  const [prefs, setPrefs] = useState(() =>
    loadJSON(PREFS_KEY, {
      ages: [2, 6], // de kern-overlap: peuter + kleuter
      radius: 50,
      maxBudget: 30,
      environment: "all",
    })
  );
  const [favIds, setFavIds] = useState(() => loadJSON(FAV_KEY, []));
  const [result, setResult] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [emptyHint, setEmptyHint] = useState(false);

  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs]);
  useEffect(() => saveJSON(FAV_KEY, favIds), [favIds]);

  // Gefilterde + leeftijdsgesynchroniseerde kandidaten
  const candidates = useMemo(() => {
    return ACTIVITIES.map((a) => ({
      ...a,
      distance: haversine(HARDENBERG.lat, HARDENBERG.lng, a.lat, a.lng),
    }))
      .filter((a) => matchesFamilyAges(a, prefs.ages))
      .filter((a) => a.distance <= prefs.radius)
      .filter((a) => a.prijs <= prefs.maxBudget || prefs.maxBudget >= 30)
      .filter((a) =>
        prefs.environment === "all"
          ? true
          : prefs.environment === "indoor"
          ? a.indoor_friendly
          : !a.indoor_friendly
      )
      .map((a) => ({ ...a, fit: familyFitScore(a, prefs.ages) }));
  }, [prefs]);

  // Als de huidige keuze buiten de filters valt, wis 'm
  useEffect(() => {
    if (result && !candidates.some((c) => c.id === result.id)) {
      setResult(null);
    }
  }, [candidates]); // eslint-disable-line

  const pick = useCallback(() => {
    if (!candidates.length) {
      setEmptyHint(true);
      setResult(null);
      return;
    }
    setEmptyHint(false);
    setSpinning(true);

    // Gewogen trekking: betere familie-fit krijgt iets meer kans,
    // maar vermijd direct hetzelfde uitje als vorige keer.
    const pool = candidates.filter((c) => !result || c.id !== result.id);
    const draw = pool.length ? pool : candidates;
    const weighted = [];
    draw.forEach((c) => {
      const w = 1 + Math.round(c.fit * 3);
      for (let i = 0; i < w; i++) weighted.push(c);
    });
    const chosen = weighted[Math.floor(Math.random() * weighted.length)];

    window.setTimeout(() => {
      setResult(chosen);
      setSpinning(false);
    }, 420);
  }, [candidates, result]);

  const toggleFav = (id) =>
    setFavIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const win = ageOverlapWindow(prefs.ages);

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col">
      {/* Top bar */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 border-[3px] border-ink grid grid-cols-2 grid-rows-2 overflow-hidden">
            <div className="bg-teal-500" />
            <div className="bg-mond-yellow border-l-[3px] border-ink" />
            <div className="bg-canvas border-t-[3px] border-ink" />
            <div className="bg-mond-red border-l-[3px] border-t-[3px] border-ink" />
          </div>
          <span className="font-display text-2xl font-black tracking-tight">
            Hup!
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFavs(true)}
            aria-label="Favorieten"
            className="relative w-11 h-11 grid place-items-center border-[3px] border-ink bg-white hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
          >
            <Icon name="heart" size={20} strokeWidth={2.6} />
            {favIds.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 grid place-items-center text-xs font-black bg-mond-red text-white border-2 border-ink">
                {favIds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Filters"
            className="w-11 h-11 grid place-items-center border-[3px] border-ink bg-teal-500 text-white hard-shadow-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition"
          >
            <Icon name="sliders-horizontal" size={20} strokeWidth={2.8} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        {!result && (
          <div className="rise text-center max-w-md">
            <p className="inline-block text-xs font-extrabold uppercase tracking-[.2em] px-3 py-1.5 border-2 border-ink bg-mond-yellow mb-6">
              Voor het hele gezin
            </p>
            <h1 className="font-display text-[clamp(2.6rem,11vw,4.5rem)] font-black uppercase leading-[0.9] tracking-tight">
              Geen<br />inspiratie?
            </h1>
            <p className="mt-5 text-lg text-ink/75 leading-relaxed">
              Eén tik en we kiezen een uitje dat precies past bij jouw gezin.
            </p>
          </div>
        )}

        {result && (
          <div className="w-full">
            <ResultCard
              activity={result}
              distance={result.distance}
              isFav={favIds.includes(result.id)}
              onToggleFav={() => toggleFav(result.id)}
              onAgain={pick}
            />
          </div>
        )}

        {emptyHint && !result && (
          <div className="rise mt-8 max-w-md text-center bg-white border-[3px] border-ink hard-shadow-sm p-5">
            <div className="text-4xl mb-2">🤔</div>
            <p className="font-display font-black text-xl uppercase">
              Niks gevonden
            </p>
            <p className="text-ink/70 mt-1 text-sm">
              Geen uitje matcht deze filters. Verruim de straal of het budget in de filters.
            </p>
          </div>
        )}

        {/* De grote Hup-knop */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={pick}
            disabled={spinning}
            className="hup-btn relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-teal-500 text-white grid place-items-center select-none disabled:opacity-90"
            aria-label="Kies een uitje"
          >
            {spinning ? (
              <span className="flex gap-2" aria-hidden="true">
                <span className="w-3 h-3 rounded-full bg-white" style={{ animation: "dotpulse 1s infinite", animationDelay: "0ms" }} />
                <span className="w-3 h-3 rounded-full bg-white" style={{ animation: "dotpulse 1s infinite", animationDelay: "150ms" }} />
                <span className="w-3 h-3 rounded-full bg-white" style={{ animation: "dotpulse 1s infinite", animationDelay: "300ms" }} />
              </span>
            ) : (
              <span className="font-display text-6xl sm:text-7xl font-black tracking-tight -mt-1">
                Hup!
              </span>
            )}
          </button>
          <p className="mt-6 text-sm font-semibold text-ink/60 flex items-center gap-2">
            <Icon name="users" size={15} />
            {prefs.ages.length} {prefs.ages.length === 1 ? "kind" : "kinderen"} ·
            overlap {win.low}–{win.high} jr · {candidates.length}{" "}
            {candidates.length === 1 ? "match" : "matches"}
          </p>
        </div>
      </main>

      <footer className="px-5 py-4 text-center text-xs text-ink/45 font-semibold">
        Startlocatie {HARDENBERG.name} · afstanden hemelsbreed (Haversine)
      </footer>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        prefs={prefs}
        setPrefs={setPrefs}
        resultCount={candidates.length}
      />

      {showFavs && (
        <FavoritesView
          favIds={favIds}
          onClose={() => setShowFavs(false)}
          onRemove={(id) => toggleFav(id)}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
