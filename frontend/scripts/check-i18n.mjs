// Fails when code uses a translation key missing from a messages file, or
// when the language files don't define the same keys.
// Only literal keys are checked: t("a.b") or, for useTranslations("ns"), tNs("key").
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const locales = ["en-US", "fr-FR"];
const messages = Object.fromEntries(
  locales.map((l) => [l, JSON.parse(readFileSync(join(root, "messages", `${l}.json`), "utf8"))]),
);

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const keys = Object.fromEntries(locales.map((l) => [l, new Set(flatten(messages[l]))]));

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

const problems = [];

for (const file of files(join(root, "src"))) {
  const src = readFileSync(file, "utf8");
  const translators = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:useTranslations|await getTranslations)\(\s*(?:["']([\w.]+)["'])?\s*\)/g)) {
    translators.set(m[1], m[2] ?? "");
  }
  for (const [fn, ns] of translators) {
    for (const m of src.matchAll(new RegExp(`\\b${fn}\\(\\s*["']([\\w.]+)["']`, "g"))) {
      const key = ns ? `${ns}.${m[1]}` : m[1];
      for (const l of locales) {
        if (!keys[l].has(key)) problems.push(`${relative(root, file)}: "${key}" is missing from ${l}.json`);
      }
    }
  }
}

const [base, ...others] = locales;
for (const l of others) {
  for (const k of keys[base]) if (!keys[l].has(k)) problems.push(`${l}.json lacks "${k}" (defined in ${base}.json)`);
  for (const k of keys[l]) if (!keys[base].has(k)) problems.push(`${base}.json lacks "${k}" (defined in ${l}.json)`);
}

if (problems.length) {
  console.error([...new Set(problems)].join("\n"));
  console.error(`\n${new Set(problems).size} i18n problem(s)`);
  process.exit(1);
}
console.log("i18n: all keys present");
