import { chooseQuote, taskGoal, type FocusGoal } from "../../../lib/focus";
import {
  lifeSchemas,
  srSchedule,
  todayMadrid,
  shiftDay,
  calendarEvents,
} from "../../../lib/life";
import { routineSchema, workoutSchema } from "../../../lib/gym";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { records } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function progressRow(userId: string, goal: FocusGoal, date: string) {
  return {
    id: `progress:${userId}:${date}:${goal}`,
    userId,
    kind: "focusProgress",
    data: JSON.stringify({ date, goal }),
    createdAt: new Date().toISOString(),
  };
}
export async function GET() {
  const u = await getChatGPTUser();
  if (!u) return json({ error: "Inicia sesión para acceder." }, 401);
  try {
    const db = getDb(),
      userId = u.userId,
      today = todayMadrid();
    await db
      .insert(records)
      .values({
        id: "sr-weekdays-v1:" + userId,
        userId,
        kind: "event",
        data: JSON.stringify(srSchedule),
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
    const rows = (
      await db.select().from(records).where(eq(records.userId, userId))
    ).map((r) => ({ ...r, data: JSON.parse(r.data) }));
    const id = "daily-quote:" + userId + ":" + today;
    if (!rows.some((r) => r.id === id)) {
      const key = chooseQuote(
        rows,
        today,
        shiftDay(today, -1),
        calendarEvents(rows, today, today),
      );
      await db
        .insert(records)
        .values({
          id,
          userId,
          kind: "dailyQuote",
          data: JSON.stringify({ date: today, key }),
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing();
      const [saved] = await db
        .select()
        .from(records)
        .where(and(eq(records.id, id), eq(records.userId, userId)));
      rows.push({ ...saved, data: JSON.parse(saved.data) });
    }
    return json(rows);
  } catch {
    return json(
      { error: "No se pudieron cargar tus datos. Vuelve a intentarlo." },
      503,
    );
  }
}
export async function POST(req: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: "Inicia sesión para guardar." }, 401);
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Origen no permitido." }, 403);
  try {
    const body = (await req.json()) as any;
    const { id, kind } = body;
    let data = body.data;
    if (
      ![
        "movement",
        "task",
        "quote",
        "routine",
        "workout",
        ...Object.keys(lifeSchemas),
      ].includes(kind) ||
      !data ||
      typeof data !== "object"
    )
      return json({ error: "Datos inválidos." }, 400);
    if (
      kind === "movement" &&
      (!["income", "expense"].includes(data.type) ||
        !Number.isFinite(data.amount) ||
        data.amount <= 0 ||
        data.amount > 1e9 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        !data.title?.trim() ||
        data.title.length > 200 ||
        typeof data.category !== "string")
    )
      return json({ error: "Revisa el importe, concepto y fecha." }, 400);
    if (
      kind === "task" &&
      (typeof data.title !== "string" ||
        !data.title.trim() ||
        data.title.length > 200 ||
        !["Alta", "Media", "Baja"].includes(data.priority) ||
        typeof data.done !== "boolean" ||
        (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)))
    )
      return json({ error: "Revisa la tarea." }, 400);
    if (
      kind === "quote" &&
      (!["VanEck", "Verallia", "Eli Lilly"].includes(data.asset) ||
        !Number.isFinite(data.price) ||
        data.price <= 0)
    )
      return json({ error: "Precio inválido." }, 400);
    if (kind === "routine" || kind === "workout") {
      const parsed = (
        kind === "routine" ? routineSchema : workoutSchema
      ).safeParse(data);
      if (!parsed.success)
        return json(
          {
            error:
              "Revisa los ejercicios, series, pesos, repeticiones y fecha.",
          },
          400,
        );
      data = parsed.data;
    }
    if (kind in lifeSchemas) {
      const parsed =
        lifeSchemas[kind as keyof typeof lifeSchemas].safeParse(data);
      if (!parsed.success)
        return json(
          { error: "Revisa los campos, fechas y valores del formulario." },
          400,
        );
      data = parsed.data;
    }
    const db = getDb();
    const userId = u.userId,
      today = todayMadrid();
    if (kind === "focusProgress") {
      if (id || data.date > today)
        return json({ error: "Revisa la fecha del avance." }, 400);
      const row = progressRow(userId, data.goal, data.date);
      await db.insert(records).values(row).onConflictDoNothing();
      return json({ id: row.id });
    }
    if (
      kind === "task" &&
      data.focusGoal != null &&
      !["auto", "tfg", "work", "none"].includes(data.focusGoal)
    )
      return json({ error: "Revisa el objetivo de la tarea." }, 400);
    const key = id || crypto.randomUUID();
    const own = and(eq(records.id, key), eq(records.userId, userId));
    let wasDone = false;
    if (id) {
      const [old] = await db.select().from(records).where(own);
      if (!old || old.kind !== kind)
        return json({ error: "Registro no encontrado." }, 404);
      if (kind === "task") wasDone = JSON.parse(old.data).done;
    }
    const write = id
      ? db
          .update(records)
          .set({ data: JSON.stringify(data) })
          .where(own)
      : db.insert(records).values({
          id: key,
          userId,
          kind,
          data: JSON.stringify(data),
          createdAt: new Date().toISOString(),
        });
    const goal =
      kind === "task" && data.done && !wasDone ? taskGoal(data) : undefined;
    if (goal)
      await db.batch([
        write,
        db
          .insert(records)
          .values(progressRow(userId, goal, today))
          .onConflictDoNothing(),
      ]);
    else await write;
    return json({ ok: true, id: key });
  } catch {
    return json(
      { error: "No se pudo guardar. Tus cambios no se han registrado." },
      500,
    );
  }
}
export async function DELETE(req: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: "Inicia sesión." }, 401);
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Origen no permitido." }, 403);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "Falta el registro." }, 400);
  try {
    const db = getDb();
    if (id === "sr-weekdays-v1:" + u.userId) {
      const rows = await db
        .select()
        .from(records)
        .where(and(eq(records.id, id), eq(records.userId, u.userId)));
      if (rows.length)
        await db
          .update(records)
          .set({
            data: JSON.stringify({
              ...JSON.parse(rows[0].data),
              enabled: false,
            }),
          })
          .where(and(eq(records.id, id), eq(records.userId, u.userId)));
    } else
      await db
        .delete(records)
        .where(and(eq(records.id, id), eq(records.userId, u.userId)));
    return json({ ok: true });
  } catch {
    return json({ error: "No se pudo eliminar." }, 500);
  }
}
