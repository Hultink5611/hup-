# Changelog — Hup!

## v2 — Redesign + geverifieerde database
- Volledig nieuw, zacht teal/mint-design (naar mockup): foto-loze hero-cards per
  categorie, bottom-nav (Home / Favorieten / Profiel), detail-"Activiteit kaart"
  met rating, duur, afstand, prijs, mini-map en ROUTE-knop (Google Maps).
- **Geluid** via Web Audio API: whoosh bij HUP, ticks tijdens het rouleren, een
  ding bij de keuze. Aan/uit in Profiel (localStorage). Haptische trilling waar
  ondersteund.
- **Roulette-animatie**: cyclet door kandidaten voordat het uitje landt.
- **Database geverifieerd** (research, juni 2026) en uitgebreid naar 38 Overijsselse
  uitjes. Prijzen bijgewerkt naar 2026; drie naamswijzigingen (Djambo→Ballorig,
  Avontura→FunZone, Jump XL→You Jump); zes vervangen omdat ze niet bestonden,
  gesloten of niet gezinsgeschikt waren (o.a. Kabouterpad Weerribben → Vlonderpad
  De Wieden, Outdoor Challenge Park → Recreatieplas 't Hulsbeek).
- Velden toegevoegd: `duur`, `rating` (beide indicatief).
- Filters: afstand (Haversine), budget-tiers, leeftijden, soort uitje, alleen binnen.
- Service Worker → `hup-v3` (forceert verse cache bij terugkerende bezoekers).

> Let op: prijzen, openingstijden en beoordelingen zijn indicatief — controleer
> altijd de officiële website. Coördinaten zijn op plaatsniveau (genoeg voor de
> straal-filter, niet voor exacte navigatie).

## v1 — Initiële PWA
- Mondrian-stijl, React + Tailwind v4 + Lucide via CDN, manifest, service worker,
  leeftijdssync-algoritme, Haversine-filter, favorieten in localStorage.
