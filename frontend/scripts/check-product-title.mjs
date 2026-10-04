// Checks parseProductTitle on real barcode lookup titles. Node strips the
// TypeScript types itself (Node 23.6+): `npm run check:product-title`
import assert from "node:assert/strict";
import { parseProductTitle } from "../src/lib/tmdb-utils.ts";

const cases = [
  ["Inception (Blu-ray) [Blu-ray]", { title: "Inception" }],
  ["Inception Steelbook Ultimate Edition Blu-ray - And Sealed", { title: "Inception" }],
  ["Inception [4K Ultra HD Blu-ray/Blu-ray] [2010]", { title: "Inception", year: "2010" }],
  ["Inception (Blu-ray) (Widescreen)", { title: "Inception" }],
  ["The Office: Season 2 [Blu-ray] [2006]", { title: "The Office", year: "2006", season: 2 }],
  ["Breaking Bad - Saison 3 - Coffret Blu-ray", { title: "Breaking Bad", season: 3 }],
  ["Game of Thrones S01 Blu-ray", { title: "Game of Thrones", season: 1 }],
  ["Le Seigneur des Anneaux : La Communauté de l'Anneau - Version Longue", { title: "Le Seigneur des Anneaux : La Communauté de l'Anneau" }],
  ["Amélie - Édition Collector", { title: "Amélie" }],
  ["(500) Days of Summer [DVD]", { title: "(500) Days of Summer" }],
  ["Action Jackson (Blu-ray)", { title: "Action Jackson" }],
  ["Blu-ray", { title: "Blu-ray" }], // nothing left: keep the raw title
];

for (const [raw, want] of cases) {
  assert.deepEqual(parseProductTitle(raw), { year: undefined, season: undefined, ...want }, raw);
}
console.log(`product titles: ${cases.length} cases ok`);
