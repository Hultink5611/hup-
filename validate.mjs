import { readFileSync } from 'fs';
const src = readFileSync('app.js','utf8');
const s = src.indexOf('const ACTIVITIES = [');
const e = src.indexOf('\n];', s);
const arr = src.slice(src.indexOf('[', s), e+2); // [ ... ]
const A = (0, eval)('(' + arr + ')');
const CATS = ['natuur','speeltuin','dieren','museum','binnenpret','water','avontuur','eten','cultuur','wellness','uitgaan','bezienswaardigheid'];
const COMP = ['gezin','partner','vrienden','senioren','alleen'];
const errs = [];
const ids = new Set();
for (const a of A) {
  const id = a.id;
  const bad = (m)=>errs.push(`#${id} ${a.name}: ${m}`);
  if (ids.has(id)) bad('dubbele id'); ids.add(id);
  if (!a.name || !a.plaats) bad('mist naam/plaats');
  if (!CATS.includes(a.category)) bad('onbekende categorie: '+a.category);
  if (a.audience && !a.audience.every(x=>COMP.includes(x))) bad('ongeldige audience: '+a.audience);
  if (!(a.min_age>=0 && a.max_age<=99 && a.min_age<=a.max_age)) bad(`leeftijd raar: ${a.min_age}-${a.max_age}`);
  if (typeof a.prijs!=='number' || a.prijs<0) bad('prijs raar: '+a.prijs);
  if (!(a.lat>50.5 && a.lat<53.8 && a.lng>3 && a.lng<7.6)) bad(`coord buiten NL: ${a.lat},${a.lng}`);
  if (!(a.rating>=0 && a.rating<=5)) bad('rating raar: '+a.rating);
  if (!a.duur || !a.emoji || !a.desc) bad('mist duur/emoji/desc');
}
console.log('Totaal activiteiten:', A.length);
const byCat = {}; A.forEach(a=>byCat[a.category]=(byCat[a.category]||0)+1);
console.log('Per categorie:', JSON.stringify(byCat));
if (errs.length) { console.log('FOUTEN ('+errs.length+'):'); errs.forEach(x=>console.log(' - '+x)); process.exit(1); }
else console.log('✅ Geen datafouten gevonden.');
