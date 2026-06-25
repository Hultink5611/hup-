# Changelog — Hup!

## v2.6 — Ontdek: inline dropdown
- Kaartjes in Ontdek klappen nu **inline uit** (tik = open) met omschrijving,
  leeftijd, binnen/buiten en seizoen — zónder naar een vol scherm te springen.
- Per uitgeklapt uitje: **Route** (kaart), **Info** (web-zoek voor actuele
  prijzen/openingstijden) en **Kaart** (volledige detailkaart).
- Hybride aanpak: stabiele info in-app (snel, offline), volatiele data via
  doorverwijzing naar de officiële site.
- Service Worker → `hup-v10`.

## v2.5 — Vertrouwen & locatie
- **Instelbare startlocatie**: "Gebruik mijn locatie" (GPS) of kies een plaats
  uit de lijst (Profiel). Alle afstanden worden vanaf dáár berekend, niet meer
  vast vanaf Hardenberg. Keuze blijft bewaard.
- **Seizoen-/openingsindicatie** op de detailkaart (indicatief): toont het
  seizoen en waarschuwt "mogelijk gesloten in <maand>" voor duidelijk
  seizoensgebonden uitjes (buitenbaden, pretparken, klimbos, maisdoolhof…).
- **"Check openingstijden & actuele info"-knop**: opent een web-zoekopdracht
  naar het uitje — altijd actueel, nooit verouderde data.
- **Error-boundary**: bij een onverwachte fout krijg je nu een nette
  herstel-pagina (Herladen / Cache wissen) i.p.v. een wit scherm.
- Service Worker → `hup-v9`.

## v2.4 — Bugfix: app bleef leeg door oude cache
- **Root cause:** de service worker serveerde `app.js` cache-first. Wie ooit een
  oude/kapotte versie in cache had (o.a. de korte kapotte eerste deploy), bleef
  daarop hangen — witte/lege pagina, ook na herladen.
- **Fix:** kern-bestanden (`index.html`, `app.js`) nu **network-first** — verse
  code wint altijd online, cache is enkel offline-fallback. Plus auto-herstel:
  de pagina herlaadt één keer zodra een nieuwe service worker het overneemt.
- `install` gebruikt nu best-effort caching (één mislukte asset blokkeert de
  update niet meer). Service Worker → `hup-v8`.

## v2.3 — Volwassenen-modus (0 kinderen)
- Je kunt nu álle kinderen weghalen (geen verplicht kind meer). Zonder kinderen
  vervalt het leeftijdsfilter: ideaal voor een uitje met z'n tweeën of met
  vrienden (bv. een wandeling). Home toont dan "Volwassenen · N matches".
- Service Worker → `hup-v6`.

## v2.2 — Ontdek-tab
- Nieuwe vierde tab "Ontdek": doorzoekbare (naam/plaats), filterbare en
  sorteerbare (afstand / prijs / beoordeling) lijst van alle uitjes.
- Tikken opent de detailkaart; hartje bewaart direct als favoriet.
- Respecteert de gezinsinstellingen uit het filter-paneel.
- Service Worker → `hup-v5`.

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
