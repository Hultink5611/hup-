# Changelog — Hup!

## v2.1 — Database uitgebreid naar 109 uitjes
- 71 extra geverifieerde gezinsuitjes toegevoegd (research juni 2026, met bronnen),
  verdeeld over Zwolle/Kampen/Steenwijkerland, Twente, Salland & Vechtdal en de
  populaire grensregio (zuidwest-Drenthe, Noord-Veluwe, Achterhoek-rand).
- Dubbele vermeldingen ontdubbeld (De Flierefluiter, Dondertman).
- Het 2–6 gezin komt nu op ~69 matches binnen 75 km (was 25).
- Service Worker → `hup-v4`.

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
