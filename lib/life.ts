import { z } from "zod";
const title = z.string().trim().min(1).max(160);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const lifeSchemas = {
  focusProgress: z.object({ date: dateSchema, goal: z.enum(["tfg", "work"]) }),
  event: z
    .object({
      title,
      date: dateSchema,
      time,
      endTime: time,
      category: z.enum([
        "Trabajo",
        "Personal",
        "Deporte",
        "Casa",
        "Cumpleaños",
      ]),
      repeatWeekdays: z.boolean().optional().default(false),
      enabled: z.boolean().optional().default(true),
    })
    .refine((e) => e.endTime > e.time, {
      message: "La hora de fin debe ser posterior al inicio.",
    }),
  deadline: z.object({
    title,
    date: dateSchema,
    notes: z.string().max(1000),
    done: z.boolean(),
  }),
  subscription: z.object({
    name: title,
    amount: z.number().min(0).max(1e7),
    nextDate: dateSchema,
    cycle: z.enum(["monthly", "yearly"]),
    active: z.boolean(),
  }),
  habit: z.object({
    name: title,
    targetPerWeek: z.number().int().min(1).max(7),
  }),
  habitlog: z.object({ habitId: z.string().min(1).max(100), date: dateSchema }),
  health: z
    .object({
      date: dateSchema,
      weight: z.number().min(20).max(400).nullable(),
      sleep: z.number().min(0).max(24).nullable(),
      steps: z.number().int().min(0).max(200000).nullable(),
    })
    .refine((d) => d.weight !== null || d.sleep !== null || d.steps !== null),
  lifeSettings: z.object({
    budget: z.number().min(0).max(1e9),
    weeklyFocus: z.string().max(250),
  }),
};
export type LifeRecord = {
  id: string;
  kind: string;
  data: any;
  createdAt: string;
};
export const todayMadrid = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );
export function shiftDay(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dayDiff = (a: string, b: string) =>
  Math.round(
    (Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5,
  );
export function weekDates(date: string) {
  const d = new Date(date + "T12:00:00Z");
  const monday = shiftDay(date, -((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}
export function renewDate(date: string, cycle: string) {
  const d = new Date(date + "T12:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  if (cycle === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function habitStreak(
  logs: LifeRecord[],
  habitId: string,
  today: string,
) {
  const days = new Set(
    logs
      .filter(
        (r) =>
          r.kind === "habitlog" &&
          r.data.habitId === habitId &&
          r.data.date <= today,
      )
      .map((r) => r.data.date),
  );
  let day = days.has(today) ? today : shiftDay(today, -1),
    count = 0;
  while (days.has(day)) {
    count++;
    day = shiftDay(day, -1);
  }
  return count;
}
export function monthBudget(
  records: LifeRecord[],
  today: string,
  budget: number,
) {
  const month = today.slice(0, 7),
    day = Number(today.slice(-2)),
    days = new Date(
      Number(today.slice(0, 4)),
      Number(today.slice(5, 7)),
      0,
    ).getDate(),
    remainingDays = days - day + 1;
  const movements = records.filter(
    (r) =>
      r.kind === "movement" &&
      r.data.date.startsWith(month) &&
      r.data.date <= today,
  );
  const expense = movements
      .filter((r) => r.data.type === "expense")
      .reduce((s, r) => s + r.data.amount, 0),
    income = movements
      .filter((r) => r.data.type === "income")
      .reduce((s, r) => s + r.data.amount, 0);
  return {
    expense,
    income,
    days,
    day,
    remainingDays,
    remaining: budget - expense,
    daily: (budget - expense) / remainingDays,
    forecast: (expense / day) * days,
  };
}
export function daySegments(
  events: LifeRecord[],
  startMinute = 480,
  endMinute = 1320,
) {
  const minute = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const busy = events
    .map((r) => ({
      start: Math.max(startMinute, minute(r.data.time)),
      end: Math.min(endMinute, minute(r.data.endTime)),
      names: [r.data.title],
      category: r.data.category,
    }))
    .filter((e) => e.end > e.start)
    .sort((a, b) => a.start - b.start);
  const merged: typeof busy = [];
  for (const e of busy) {
    const last = merged.at(-1);
    if (last && e.start < last.end) {
      last.end = Math.max(last.end, e.end);
      last.names.push(...e.names);
    } else merged.push({ ...e });
  }
  let cursor = startMinute;
  const segments: any[] = [];
  for (const e of merged) {
    if (e.start > cursor)
      segments.push({ start: cursor, end: e.start, free: true });
    segments.push({ ...e, free: false });
    cursor = e.end;
  }
  if (cursor < endMinute)
    segments.push({ start: cursor, end: endMinute, free: true });
  return {
    segments,
    freeMinutes:
      Math.max(0, endMinute - startMinute) -
      merged.reduce((s, e) => s + e.end - e.start, 0),
  };
}

export const srSchedule = {
  title: "Trabajo",
  date: "2026-11-16",
  time: "09:00",
  endTime: "17:00",
  category: "Trabajo",
  repeatWeekdays: true,
  enabled: true,
};
export function calendarEvents(
  records: LifeRecord[],
  from: string,
  to: string,
) {
  const output: LifeRecord[] = [];
  for (const r of records.filter(
    (r) => r.kind === "event" && r.data.enabled !== false,
  )) {
    if (!r.data.repeatWeekdays) {
      output.push(r);
      continue;
    }
    for (let date = from; date <= to; date = shiftDay(date, 1)) {
      const day = new Date(date + "T12:00:00Z").getUTCDay();
      if (date >= r.data.date && day >= 1 && day <= 5)
        output.push({
          ...r,
          data: { ...r.data, date },
          source: r,
        } as LifeRecord);
    }
  }
  return output.sort((a, b) =>
    (a.data.date + a.data.time).localeCompare(b.data.date + b.data.time),
  );
}

export function remainingDay(events: LifeRecord[], clock: string) {
  const now = Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
  const startMinute = Math.min(1320, Math.max(480, now));
  const remainingEvents = events.filter((r) => r.data.endTime > clock);
  return {
    remainingEvents,
    startMinute,
    periodEnded: now >= 1320,
    ...daySegments(events, startMinute, 1320),
  };
}
export function madridClock(now = new Date()) {
  return {
    today: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Madrid",
    }).format(now),
    clock: new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now),
  };
}
