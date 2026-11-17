import type { LifeRecord } from "./life";

export type FocusGoal = "tfg" | "work";
export function taskGoal(task: {
  focusGoal?: string;
  title: string;
}): FocusGoal | undefined {
  if (task.focusGoal === "tfg" || task.focusGoal === "work")
    return task.focusGoal;
  if (task.focusGoal === "none") return;
  if (/\btfg\b|trabajo (?:de )?fin de grado/i.test(task.title)) return "tfg";
  if (/\btrabajo\s+sr\b|\bspaulding ridge\b/i.test(task.title)) return "work";
}

export function weeklyProgress(
  records: LifeRecord[],
  monday: string,
  through: string,
) {
  const days = new Set<string>();
  const goals = new Set<FocusGoal>();
  for (const { kind, data } of records) {
    if (!data.date || data.date < monday || data.date > through) continue;
    if (kind === "workout") days.add(data.date);
    if (kind === "focusProgress") goals.add(data.goal);
  }
  return {
    days: days.size,
    left: Math.max(0, 4 - days.size),
    tfg: goals.has("tfg"),
    work: goals.has("work"),
  };
}

const franklin =
  "https://fi.edu/en/science-and-education/benjamin-franklin/famous-quotes";
const quijote =
  "https://cvc.cervantes.es/literatura/clasicos/quijote/edicion/parte2/";
export const dailyQuotes = [
  {
    key: "camino",
    topics: ["gym", "study"],
    words: "Caminante, no hay camino: se hace camino al andar.",
    author: "Antonio Machado",
    source: "Campos de Castilla, XXIX",
    url: "https://www.machado-collioure.fr/campos-de-castilla/",
  },
  {
    key: "hechos",
    topics: ["work", "study"],
    words: "Bien hecho es mejor que bien dicho.",
    author: "Benjamin Franklin",
    source: "Poor Richard’s Almanack, 1737 · traducción",
    url: franklin,
  },
  {
    key: "tiempo",
    topics: ["work", "study"],
    words: "Mientras aplazamos las cosas, la vida pasa.",
    author: "Séneca",
    source: "Cartas a Lucilio, I · traducción",
    url: "https://constitutioncenter.org/the-constitution/historic-document-library/detail/seneca-moral-letters-to-luciliuson-saving-time-ca-65",
  },
  {
    key: "vida",
    topics: ["rest"],
    words: "Desea menos vivir mucho y más vivir bien.",
    author: "Benjamin Franklin",
    source: "Poor Richard’s Almanack, 1738 · traducción",
    url: franklin,
  },
  {
    key: "lucha",
    topics: ["gym"],
    words:
      "El arte de vivir se parece más al arte del luchador que al del bailarín.",
    author: "Marco Aurelio",
    source: "Meditaciones, VII · traducción",
    url: "https://classics.mit.edu/Antoninus/meditations.7.seven.html",
  },
  {
    key: "ventura",
    topics: ["study", "gym", "rest"],
    words: "Cada uno es artífice de su ventura.",
    author: "Miguel de Cervantes",
    source: "Don Quijote de la Mancha, II, LXVI",
    url: quijote + "cap66/default.htm",
  },
  {
    key: "diligencia",
    topics: ["work", "gym"],
    words: "La diligencia es madre de la buena ventura.",
    author: "Miguel de Cervantes",
    source: "Don Quijote de la Mancha, II, XLIII",
    url: quijote + "cap43/default.htm",
  },
  {
    key: "prisa",
    topics: ["rest", "work"],
    words: "Las prisas llevan al desperdicio.",
    author: "Benjamin Franklin",
    source: "Poor Richard’s Almanack, 1753 · traducción",
    url: franklin,
  },
];
export function chooseQuote(
  records: LifeRecord[],
  date: string,
  yesterday: string,
  agenda: LifeRecord[],
) {
  const history = records
    .filter((r) => r.kind === "dailyQuote" && r.data.date <= date)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  const saved = history.find((r) => r.data.date === date);
  if (saved && dailyQuotes.some((q) => q.key === saved.data.key))
    return saved.data.key as string;
  const topics = new Set<string>();
  for (const { kind, data } of records) {
    if (data.date !== date && data.date !== yesterday) continue;
    if (kind === "workout") topics.add("gym");
    if (kind === "focusProgress")
      topics.add(data.goal === "tfg" ? "study" : "work");
    if (kind === "task" && !data.done && data.date === date && taskGoal(data))
      topics.add(taskGoal(data) === "tfg" ? "study" : "work");
  }
  for (const event of agenda) {
    if (event.data.date !== date) continue;
    if (event.data.category === "Trabajo") topics.add("work");
    if (event.data.category === "Deporte") topics.add("gym");
    if (/\btfg\b/i.test(event.data.title)) topics.add("study");
  }
  if (!topics.size) topics.add("rest");
  const latest = new Map<string, string>();
  for (const row of history)
    if (!latest.has(row.data.key)) latest.set(row.data.key, row.data.date);
  const candidates = dailyQuotes.filter((q) => q.key !== history[0]?.data.key);
  const matching = candidates.filter((q) =>
    q.topics.some((t) => topics.has(t)),
  );
  const pool = matching.length ? matching : candidates;
  const day = Math.floor(Date.parse(date + "T12:00:00Z") / 86400000);
  const rotated = pool
    .slice(day % pool.length)
    .concat(pool.slice(0, day % pool.length));
  rotated.sort((a, b) =>
    (latest.get(a.key) ?? "").localeCompare(latest.get(b.key) ?? ""),
  );
  return rotated[0].key;
}
