import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
const date = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
}).format(new Date());
const examples = [
  [
    "settings",
    "lifeSettings",
    {
      budget: 1000,
      weeklyFocus: "Entrenar cuatro días, avanzar el TFG y el trabajo",
    },
  ],
  [
    "expense",
    "movement",
    {
      title: "Compra de ejemplo",
      type: "expense",
      amount: 25,
      category: "Comida",
      date,
    },
  ],
  [
    "income",
    "movement",
    {
      title: "Ingreso de ejemplo",
      type: "income",
      amount: 1200,
      category: "Nómina",
      date,
    },
  ],
  [
    "task",
    "task",
    {
      title: "Revisar bibliografía del TFG",
      date,
      priority: "Alta",
      done: false,
      focusGoal: "tfg",
    },
  ],
  [
    "workout",
    "workout",
    {
      name: "Torso · ejemplo",
      date,
      duration: 55,
      notes: "Sesión ficticia",
      exercises: [
        {
          name: "Press banca",
          sets: [
            { weight: 40, reps: 10 },
            { weight: 40, reps: 8 },
          ],
        },
      ],
    },
  ],
  ["progress", "focusProgress", { date, goal: "tfg" }],
  ["habit", "habit", { name: "Leer", targetPerWeek: 4 }],
];
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const sql = examples
  .map(
    ([id, kind, data]) =>
      `INSERT OR IGNORE INTO records (id,user_id,kind,data,created_at) VALUES (${[id, "local_seedy", kind, JSON.stringify(data), new Date().toISOString()].map(quote).join(",")});`,
  )
  .join("\n");
mkdirSync(".wrangler", { recursive: true });
const file = ".wrangler/demo-seed.sql";
writeFileSync(file, sql);
try {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "pulso-demo",
      "--local",
      "--file",
      file,
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(file, { force: true });
}
