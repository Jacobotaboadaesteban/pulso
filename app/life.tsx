"use client";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Wallet,
  Clock3,
  ArrowUpRight,
  ArrowRight,
  Flame,
  Heart,
  Moon,
  Footprints,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Pencil,
  Trash2,
  LoaderCircle,
  Repeat,
  Target,
  Dumbbell,
  Bell,
} from "lucide-react";
import {
  type LifeRecord,
  lifeSchemas,
  todayMadrid,
  shiftDay,
  dayDiff,
  weekDates,
  renewDate,
  habitStreak,
  monthBudget,
  daySegments,
  calendarEvents,
  remainingDay,
  madridClock,
} from "../lib/life";
import WeeklyFocus from "./weekly-focus";
import "./life.css";
const money = (v: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
const n = (v: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(v);
const label = (
  d: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", options);
const color = (category: string) =>
  ({
    Trabajo: "blue",
    Personal: "coral",
    Deporte: "mint",
    Casa: "gold",
    Cumpleaños: "pink",
  })[category] || "blue";
const hh = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
const timeText = (minutes: number) =>
  `${Math.floor(minutes / 60) ? Math.floor(minutes / 60) + " h " : ""}${minutes % 60 ? (minutes % 60) + " min" : ""}`.trim() ||
  "0 min";
export default function Life({
  records,
  onRefresh,
  newMove,
  newTask,
  navigate,
  portfolio,
  result,
  loading,
}: {
  records: LifeRecord[];
  onRefresh: () => Promise<void>;
  newMove: () => void;
  newTask: () => void;
  navigate: (s: string) => void;
  portfolio: number;
  result: number;
  loading: boolean;
}) {
  const [today, setToday] = useState(todayMadrid()),
    [clock, setClock] = useState(""),
    [week, setWeek] = useState(todayMadrid()),
    [modal, setModal] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [showDone, setShowDone] = useState(false);
  useEffect(() => {
    const tick = () => {
      const current = madridClock();
      setToday(current.today);
      setClock(current.clock);
    };
    tick();
    const t = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    setMessage("");
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [modal, busy]);
  const sorted = [...records].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const settings = sorted.filter((r) => r.kind === "lifeSettings").at(-1),
    budget = settings?.data.budget || 0,
    focus = settings?.data.weeklyFocus || "";
  const days = weekDates(week);
  const from = days[0] < today ? days[0] : today,
    to = days[6] > shiftDay(today, 14) ? days[6] : shiftDay(today, 14);
  const events = calendarEvents(records, from, to);
  const daily = events.filter((r) => r.data.date === today),
    timeline = remainingDay(daily, clock || "08:00");
  const deadlines = records
    .filter((r) => r.kind === "deadline" && (showDone || !r.data.done))
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const subscriptions = records
    .filter((r) => r.kind === "subscription")
    .sort((a, b) => a.data.nextDate.localeCompare(b.data.nextDate));
  const habits = records.filter((r) => r.kind === "habit");
  const logs = records.filter((r) => r.kind === "habitlog");
  const tasks = records
    .filter((r) => r.kind === "task" && !r.data.done)
    .sort((a, b) =>
      (a.data.date || "9999").localeCompare(b.data.date || "9999"),
    );
  const health = Array.from(
    new Map(
      sorted.filter((r) => r.kind === "health").map((r) => [r.data.date, r]),
    ).values(),
  )
    .filter((r) => r.data.date <= today)
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const lastWeight = health.filter((r) => r.data.weight !== null).at(-1),
    lastSteps = health.find((r) => r.data.date === today),
    sleepRows = health.filter(
      (r) => r.data.sleep !== null && r.data.date >= shiftDay(today, -13),
    ),
    sleepAvg = sleepRows.length
      ? sleepRows.reduce((s, r) => s + r.data.sleep, 0) / sleepRows.length
      : null;
  const workouts = records.filter((r) => r.kind === "workout"),
    gymWeek = workouts.filter(
      (r) => r.data.date >= weekDates(today)[0] && r.data.date <= today,
    ).length;
  const cash = monthBudget(records, today, budget),
    recent = records
      .filter(
        (r) =>
          r.kind === "movement" &&
          r.data.type === "expense" &&
          r.data.date <= today,
      )
      .sort(
        (a, b) =>
          b.data.date.localeCompare(a.data.date) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  const dueSoon = deadlines.find((r) => !r.data.done),
    nextEvent = events.find(
      (r) =>
        r.data.date > today ||
        (r.data.date === today && r.data.endTime > clock),
    ),
    nowEvent = daily.find(
      (r) => r.data.time <= clock && r.data.endTime > clock,
    );
  const greeting = !clock
    ? "Tu día"
    : Number(clock.slice(0, 2)) < 12
      ? "Buenos días"
      : Number(clock.slice(0, 2)) < 20
        ? "Buenas tardes"
        : "Buenas noches";
  const nextHealthEvent = events.find(
    (r) =>
      r.data.date >= today &&
      /médic|medic|dentista|fisio|anal[ií]tica|consulta/i.test(r.data.title),
  );
  async function persist(kind: string, data: any, id?: string, close = true) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kind, data }),
      });
      const body: any = await r.json();
      if (!r.ok) throw Error(body.error || "No se pudo guardar.");
      await onRefresh();
      if (close) setModal(null);
      setMessage("Guardado en tu espacio privado.");
      return true;
    } catch (e: any) {
      setMessage(e.message || "No se pudo guardar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function remove(r: LifeRecord, close = true) {
    setBusy(true);
    try {
      const res = await fetch("/api/records?id=" + encodeURIComponent(r.id), {
        method: "DELETE",
      });
      if (!res.ok) throw Error("No se pudo eliminar.");
      await onRefresh();
      if (close) setModal(null);
      setMessage("Actualizado.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function add(kind: string, date = today) {
    const defaults: any = {
      event: {
        title: "",
        date,
        time: "09:00",
        endTime: "10:00",
        category: "Personal",
      },
      deadline: { title: "", date, notes: "", done: false },
      subscription: {
        name: "",
        amount: "",
        nextDate: date,
        cycle: "monthly",
        active: true,
      },
      habit: { name: "", targetPerWeek: 7 },
      health: { date, weight: "", sleep: "", steps: "" },
      lifeSettings: { budget, weeklyFocus: focus },
    };
    if (kind === "lifeSettings" && settings) {
      setModal(settings);
      return;
    }
    if (kind === "health") {
      const existing = health.find((r) => r.data.date === date);
      if (existing) {
        setModal(existing);
        return;
      }
    }
    setModal({ kind, data: defaults[kind] });
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (modal.confirmDelete) {
      await remove(modal);
      return;
    }
    const f = new FormData(e.currentTarget),
      v = (s: string) => String(f.get(s) || ""),
      num = (s: string) => Number(f.get(s)),
      optional = (s: string) => (v(s).trim() === "" ? null : num(s));
    let data: any = {};
    switch (modal.kind) {
      case "event":
        data = {
          title: v("title"),
          date: v("date"),
          time: v("time"),
          endTime: v("endTime"),
          category: v("category"),
          repeatWeekdays: f.get("repeatWeekdays") === "on",
          enabled: true,
        };
        break;
      case "deadline":
        data = {
          title: v("title"),
          date: v("date"),
          notes: v("notes"),
          done: modal.data.done,
        };
        break;
      case "subscription":
        data = {
          name: v("name"),
          amount: num("amount"),
          nextDate: v("nextDate"),
          cycle: v("cycle"),
          active: f.get("active") === "on",
        };
        break;
      case "habit":
        data = { name: v("name"), targetPerWeek: num("targetPerWeek") };
        break;
      case "health":
        data = {
          date: v("date"),
          weight: optional("weight"),
          sleep: optional("sleep"),
          steps: optional("steps"),
        };
        break;
      case "lifeSettings":
        data = { budget: num("budget"), weeklyFocus: v("weeklyFocus") };
        break;
    }
    const schema = lifeSchemas[modal.kind as keyof typeof lifeSchemas],
      parsed = schema.safeParse(data);
    if (!parsed.success) {
      setMessage(
        modal.kind === "event"
          ? "Revisa las horas: el fin debe ser posterior al inicio."
          : "Revisa los campos. Completa al menos un valor válido.",
      );
      return;
    }
    if (modal.kind === "health" && data.date > today) {
      setMessage("Registra tu salud con una fecha de hoy o anterior.");
      return;
    }
    await persist(modal.kind, parsed.data, modal.id);
  }
  async function toggleHabit(h: LifeRecord, date = today) {
    if (date > today) return;
    const all = logs.filter(
      (r) => r.data.habitId === h.id && r.data.date === date,
    );
    if (all.length) {
      setBusy(true);
      try {
        for (const log of all) {
          const r = await fetch(
            "/api/records?id=" + encodeURIComponent(log.id),
            { method: "DELETE" },
          );
          if (!r.ok) throw Error("No se pudo actualizar el hábito.");
        }
        await onRefresh();
      } catch (e: any) {
        setMessage(e.message);
      } finally {
        setBusy(false);
      }
    } else await persist("habitlog", { habitId: h.id, date }, undefined, false);
  }
  const categories = Array.from(
    new Set(
      recent
        .filter((r) => r.data.date.startsWith(today.slice(0, 7)))
        .map((r) => r.data.category),
    ),
  )
    .map((category) => ({
      category,
      amount: recent
        .filter(
          (r) =>
            r.data.date.startsWith(today.slice(0, 7)) &&
            r.data.category === category,
        )
        .reduce((s, r) => s + r.data.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  return (
    <div className="life-dashboard">
      <div className="life-masthead">
        <span>
          <i />
          PULSO <b>/</b> PANEL DE VIDA
        </span>
        <span>
          <ShieldCheck size={12} />
          Espacio personal <i className="mast-dot" />{" "}
          {label(today, { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>
      {message && (
        <div className="life-alert" role="status">
          {message}
          <button aria-label="Cerrar aviso" onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <section className="life-hero">
        <div className="hero-overline">
          <span>HOY, CON PERSPECTIVA</span>
          <span>
            {clock || "—"} <i>Madrid</i>
          </span>
        </div>
        <h1>
          {greeting}, <em>Alex.</em>
        </h1>
        <div className="hero-brief">
          <p>
            {!clock || loading ? (
              <>Actualizando tu agenda…</>
            ) : timeline.periodEnded ? (
              <>
                La franja de hoy, de 08:00 a 22:00, ha terminado.
                {timeline.remainingEvents.length > 0 && (
                  <>
                    {" "}
                    Te{" "}
                    {timeline.remainingEvents.length === 1
                      ? "queda"
                      : "quedan"}{" "}
                    <b>
                      {timeline.remainingEvents.length}{" "}
                      {timeline.remainingEvents.length === 1
                        ? "plan"
                        : "planes"}{" "}
                      para esta noche
                    </b>
                    .
                  </>
                )}
              </>
            ) : (
              <>
                Te {timeline.remainingEvents.length === 1 ? "queda" : "quedan"}{" "}
                <b>
                  {timeline.remainingEvents.length}{" "}
                  {timeline.remainingEvents.length === 1 ? "plan" : "planes"} en
                  la agenda
                </b>{" "}
                y <b>{timeText(timeline.freeMinutes)} libres</b>{" "}
                {clock < "08:00"
                  ? "entre las 08:00 y las 22:00"
                  : "desde ahora hasta las 22:00"}
                .
              </>
            )}
          </p>
          {clock && !loading && (
            <p>
              {nowEvent ? (
                <>
                  Ahora: <b>{nowEvent.data.title}</b>.
                </>
              ) : nextEvent ? (
                <>
                  Lo siguiente: <b>{nextEvent.data.title}</b>,{" "}
                  {nextEvent.data.date === today
                    ? "hoy"
                    : label(nextEvent.data.date)}{" "}
                  a las {nextEvent.data.time}.
                </>
              ) : (
                <>Tu agenda está despejada. Haz sitio para lo importante.</>
              )}
            </p>
          )}
          {dueSoon && (
            <p>
              {dayDiff(dueSoon.data.date, today) < 0
                ? "Vencido hace " + Math.abs(dayDiff(dueSoon.data.date, today))
                : dayDiff(dueSoon.data.date, today) + " días"}
              : <b>{dueSoon.data.title}</b>.
            </p>
          )}
        </div>
        {clock && !loading && !timeline.periodEnded && (
          <div className="day-timeline" aria-label="Tiempo que queda de hoy">
            <div className="timeline-row">
              {timeline.segments.map((s, i) => (
                <div
                  key={i}
                  className={
                    "timeline-slot " + (s.free ? "free" : color(s.category))
                  }
                  style={{ flexGrow: s.end - s.start, flexBasis: 0 }}
                  title={`${hh(s.start)}–${hh(s.end)} · ${s.free ? "Libre" : s.names.join(", ")}`}
                >
                  <b>
                    {s.free
                      ? "Libre · " + timeText(s.end - s.start)
                      : s.names.join(" + ")}
                  </b>
                  <small>
                    {hh(s.start)}
                    {!s.free ? " · " + timeText(s.end - s.start) : ""}
                  </small>
                </div>
              ))}
            </div>
            <div className="timeline-hours">
              {Array.from({ length: 5 }, (_, i) =>
                hh(
                  Math.round(
                    timeline.startMinute +
                      ((1320 - timeline.startMinute) * i) / 4,
                  ),
                ),
              ).map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
        )}
        <WeeklyFocus
          records={records}
          today={today}
          loading={loading}
          busy={busy}
          onRefresh={onRefresh}
          mark={(goal) => {
            void persist(
              "focusProgress",
              { goal, date: today },
              undefined,
              false,
            );
          }}
          edit={() => add("lifeSettings")}
        />
        <button
          className="hero-add"
          onClick={() => add("event")}
          disabled={loading}
        >
          <Plus size={16} />
          Añadir a mi día
        </button>
      </section>
      <section className="life-card calendar-card">
        <div className="life-title">
          <h2>
            <CalendarDays size={17} />
            Calendario
          </h2>
          <div className="calendar-actions">
            <span className="manual-source">Agenda manual</span>
            <button
              className="life-icon"
              aria-label="Semana anterior"
              onClick={() => setWeek(shiftDay(week, -7))}
            >
              <ChevronLeft size={16} />
            </button>
            <button className="small-button" onClick={() => setWeek(today)}>
              Hoy
            </button>
            <button
              className="life-icon"
              aria-label="Semana siguiente"
              onClick={() => setWeek(shiftDay(week, 7))}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="small-button"
              onClick={() => add("event")}
              disabled={loading}
            >
              <Plus size={13} />
              Evento
            </button>
          </div>
        </div>
        <div className="calendar-week-label">
          {label(days[0])} —{" "}
          {label(days[6], { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="week-scroll">
          <div className="life-week">
            {days.map((d) => (
              <div
                className={"life-day " + (d === today ? "is-today" : "")}
                key={d}
              >
                <div className="day-label">
                  <span>{label(d, { weekday: "short" }).replace(".", "")}</span>
                  <b>{Number(d.slice(-2))}</b>
                </div>
                <div className="day-events">
                  {events
                    .filter((r) => r.data.date === d)
                    .map((r) => (
                      <button
                        key={r.id + r.data.date}
                        className={"event-chip " + color(r.data.category)}
                        onClick={() => setModal((r as any).source || r)}
                      >
                        <small>
                          {r.data.time} – {r.data.endTime}
                        </small>
                        <b>{r.data.title}</b>
                        {r.data.repeatWeekdays && (
                          <small>Lun–vie · cada semana</small>
                        )}
                      </button>
                    ))}
                  {tasks
                    .filter((r) => r.data.date === d)
                    .map((r) => (
                      <button
                        key={r.id}
                        className="calendar-task"
                        onClick={() => navigate("tasks")}
                      >
                        <Check size={11} />
                        {r.data.title}
                      </button>
                    ))}
                  {!events.some((r) => r.data.date === d) &&
                    !tasks.some((r) => r.data.date === d) && (
                      <span className="no-event">Sin planes</span>
                    )}
                  <button
                    className="add-day"
                    onClick={() => add("event", d)}
                    aria-label={"Añadir evento el " + d}
                    disabled={loading}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="calendar-legend">
          {["Trabajo", "Personal", "Deporte", "Casa", "Cumpleaños"].map((c) => (
            <span key={c}>
              <i className={color(c)} />
              {c}
            </span>
          ))}
          <small>Google Calendar · sin conectar</small>
        </div>
      </section>
      <div className="life-columns">
        <section className="life-card deadlines-card">
          <div className="life-title">
            <h2>
              <Clock3 size={17} />
              Lo que vence
            </h2>
            <button
              className="small-button"
              onClick={() => add("deadline")}
              disabled={loading}
            >
              <Plus size={13} />
              Añadir
            </button>
          </div>
          <div className="deadline-toggle">
            <button onClick={() => setShowDone(!showDone)}>
              {showDone ? "Ocultar completados" : "Ver también completados"}
            </button>
            <span>
              {deadlines.filter((r) => !r.data.done).length} pendientes
            </span>
          </div>
          <div className="deadline-list">
            {deadlines.length ? (
              deadlines.map((r) => {
                const days = dayDiff(r.data.date, today);
                return (
                  <div
                    className={
                      "deadline-item " + (r.data.done ? "is-done" : "")
                    }
                    key={r.id}
                  >
                    <div
                      className={
                        "countdown " +
                        (days <= 7 ? "urgent" : days <= 31 ? "soon" : "later")
                      }
                    >
                      <b>{r.data.done ? "✓" : Math.abs(days)}</b>
                      <small>
                        {r.data.done
                          ? "hecho"
                          : days < 0
                            ? "atraso"
                            : days === 0
                              ? "hoy"
                              : "días"}
                      </small>
                    </div>
                    <button
                      className="deadline-content"
                      onClick={() => setModal(r)}
                    >
                      <b>{r.data.title}</b>
                      {r.data.notes && <span>{r.data.notes}</span>}
                      <small>
                        {label(r.data.date, {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </small>
                    </button>
                    <button
                      className={
                        "life-checkbox " + (r.data.done ? "checked" : "")
                      }
                      aria-label={
                        (r.data.done ? "Reabrir " : "Completar ") + r.data.title
                      }
                      disabled={busy || loading}
                      onClick={() =>
                        persist(
                          "deadline",
                          { ...r.data, done: !r.data.done },
                          r.id,
                          false,
                        )
                      }
                    >
                      <Check size={14} />
                    </button>
                  </div>
                );
              })
            ) : (
              <LifeEmpty
                text="Renovaciones, documentos, garantías… Todo con su fecha a la vista."
                action="Añadir un vencimiento"
                onClick={() => add("deadline")}
              />
            )}
          </div>
        </section>
        <section className="life-card money-card">
          <div className="life-title">
            <h2>
              <Wallet size={17} />
              Dinero · {label(today, { month: "long" })}
            </h2>
            <button
              className="small-button"
              onClick={newMove}
              disabled={loading}
            >
              <Plus size={13} />
              Gasto
            </button>
          </div>
          <div className="money-overview">
            <div className="money-summary">
              <div className="big-money">
                {money(cash.expense)}{" "}
                <span>{budget ? "de " + money(budget) : "gastados"}</span>
              </div>
              <p>
                {budget ? (
                  <>
                    Te {cash.remaining >= 0 ? "quedan" : "excedes en"}{" "}
                    <b>{money(Math.abs(cash.remaining))}</b>
                    {cash.remaining >= 0 ? (
                      <>
                        {" "}
                        para {cash.remainingDays} días:{" "}
                        <b>{money(cash.daily)} al día.</b>
                      </>
                    ) : (
                      "."
                    )}
                  </>
                ) : (
                  <button
                    className="inline-button"
                    onClick={() => add("lifeSettings")}
                  >
                    Define tu presupuesto mensual <Pencil size={12} />
                  </button>
                )}
              </p>
              <span
                className={
                  "budget-chip " +
                  (budget && cash.forecast > budget ? "warning" : "")
                }
              >
                {budget
                  ? "Previsión: " + money(cash.forecast)
                  : "Tu presupuesto, a tu ritmo"}
              </span>
              <small className="forecast-note">
                {budget
                  ? "Estimación según el gasto medio diario hasta hoy."
                  : "Los ingresos y gastos se registran en Finanzas."}
              </small>
              <button
                className="text-button"
                onClick={() => add("lifeSettings")}
              >
                <Pencil size={11} />
                Ajustar presupuesto
              </button>
            </div>
            <SpendChart records={records} today={today} budget={budget} />
          </div>
          <div className="money-lower">
            <div>
              <p className="life-kicker">POR CATEGORÍA</p>
              {categories.length ? (
                categories.slice(0, 6).map((c) => (
                  <div className="category-line" key={c.category}>
                    <span>{c.category}</span>
                    <b>{money(c.amount)}</b>
                    <i
                      style={{
                        width:
                          Math.min(
                            100,
                            (c.amount / Math.max(cash.expense, 1)) * 100,
                          ) + "%",
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="muted-empty">
                  Tus categorías aparecerán al añadir gastos.
                </p>
              )}
            </div>
            <div>
              <p className="life-kicker">ÚLTIMOS MOVIMIENTOS</p>
              {recent.length ? (
                recent.slice(0, 5).map((r, i) => (
                  <div className="recent-line" key={r.id}>
                    <i
                      className={
                        ["coral", "mint", "gold", "blue", "pink"][i % 5]
                      }
                    />
                    <span>
                      {r.data.title}
                      <small>{label(r.data.date)}</small>
                    </span>
                    <b>−{money(r.data.amount)}</b>
                  </div>
                ))
              ) : (
                <p className="muted-empty">
                  Aún no has registrado movimientos.
                </p>
              )}
            </div>
          </div>
          <div className="life-card-foot">
            <span>
              Ingresos este mes: <b>{money(cash.income)}</b>
            </span>
            <button className="text-button" onClick={() => navigate("money")}>
              Ver finanzas
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>
      <div className="life-columns lower-life">
        <section className="life-card">
          <div className="life-title">
            <h2>
              <Flame size={17} />
              Hábitos
            </h2>
            <button
              className="small-button"
              disabled={loading}
              onClick={() => add("habit")}
            >
              <Plus size={13} />
              Hábito
            </button>
          </div>
          {habits.length ? (
            <div className="habit-list">
              {habits.map((h) => {
                const weekDays = weekDates(today),
                  count = new Set(
                    logs
                      .filter(
                        (r) =>
                          r.data.habitId === h.id &&
                          weekDays.includes(r.data.date) &&
                          r.data.date <= today,
                      )
                      .map((r) => r.data.date),
                  ).size;
                return (
                  <div className="habit-item" key={h.id}>
                    <div className="habit-top">
                      <button onClick={() => setModal(h)}>
                        <b>{h.data.name}</b>
                        <small>
                          {count}/{h.data.targetPerWeek} días esta semana
                        </small>
                      </button>
                      <span>
                        <Flame size={12} />
                        {habitStreak(logs, h.id, today)}{" "}
                        {habitStreak(logs, h.id, today) === 1 ? "día" : "días"}
                      </span>
                    </div>
                    <div className="habit-days">
                      {weekDays.map((d) => {
                        const checked = logs.some(
                          (r) => r.data.habitId === h.id && r.data.date === d,
                        );
                        return (
                          <div key={d}>
                            <span>{label(d, { weekday: "narrow" })}</span>
                            <button
                              aria-label={h.data.name + " · " + d}
                              aria-pressed={checked}
                              disabled={busy || loading || d > today}
                              className={checked ? "checked" : ""}
                              onClick={() => toggleHabit(h, d)}
                            >
                              {checked ? (
                                <Check size={13} />
                              ) : d === today ? (
                                <i />
                              ) : null}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <LifeEmpty
              text="Pequeños hábitos, repetidos. Marca cada día y sigue tu racha."
              action="Crear mi primer hábito"
              onClick={() => add("habit")}
            />
          )}
          <div className="life-card-foot">
            <span>Las rachas cuentan días consecutivos.</span>
          </div>
        </section>
        <section className="life-card health-card">
          <div className="life-title">
            <h2>
              <Heart size={17} />
              Salud
            </h2>
            <button
              className="small-button"
              disabled={loading}
              onClick={() => add("health")}
            >
              <Plus size={13} />
              Registro
            </button>
          </div>
          <div className="health-metrics">
            <div>
              <span>
                <Moon size={12} />
                Sueño medio
              </span>
              <b>{sleepAvg === null ? "—" : n(sleepAvg) + " h"}</b>
              <small>
                Últimos 14 días · {sleepRows.length}{" "}
                {sleepRows.length === 1 ? "registro" : "registros"}
              </small>
            </div>
            <div>
              <span>
                <Footprints size={12} />
                Pasos hoy
              </span>
              <b>
                {lastSteps?.data.steps == null ? "—" : n(lastSteps.data.steps)}
              </b>
              <small>Registro manual</small>
            </div>
            <div>
              <span>
                <Heart size={12} />
                Peso
              </span>
              <b>{lastWeight ? n(lastWeight.data.weight) + " kg" : "—"}</b>
              <small>
                {lastWeight ? label(lastWeight.data.date) : "Sin registrar"}
              </small>
            </div>
          </div>
          <div className="health-charts">
            <div>
              <p>Últimas 14 noches</p>
              <div className="sleep-bars">
                {Array.from({ length: 14 }, (_, i) => {
                  const d = shiftDay(today, -13 + i),
                    r = health.find((r) => r.data.date === d),
                    value = r?.data.sleep;
                  return (
                    <button
                      key={d}
                      title={
                        label(d) +
                        ": " +
                        (value == null ? "sin registro" : n(value) + " h")
                      }
                      aria-label={"Editar salud del " + d}
                      className={value == null ? "missing" : ""}
                      onClick={() => add("health", d)}
                    >
                      <i
                        style={{
                          height:
                            value == null
                              ? "3px"
                              : Math.max(3, (value / 12) * 100) + "%",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p>Peso · últimos 30 días</p>
              <WeightChart
                rows={health.filter(
                  (r) =>
                    r.data.weight !== null &&
                    r.data.date >= shiftDay(today, -29),
                )}
              />
            </div>
          </div>
          <div className="health-appointment">
            <CalendarDays size={14} />
            {nextHealthEvent ? (
              <span>
                Próxima cita: <b>{nextHealthEvent.data.title}</b>,{" "}
                {label(nextHealthEvent.data.date)} a las{" "}
                {nextHealthEvent.data.time}
              </span>
            ) : (
              <button onClick={() => add("event")}>
                Añadir una cita a tu agenda <Plus size={12} />
              </button>
            )}
          </div>
          <div className="health-records">
            {health
              .slice(-3)
              .reverse()
              .map((r) => (
                <button key={r.id} onClick={() => setModal(r)}>
                  {label(r.data.date)}
                  <Pencil size={10} />
                </button>
              ))}
          </div>
        </section>
      </div>
      <div className="life-columns lower-life">
        <section className="life-card subscriptions-card">
          <div className="life-title">
            <h2>
              <Repeat size={17} />
              Suscripciones
            </h2>
            <button
              className="small-button"
              disabled={loading}
              onClick={() => add("subscription")}
            >
              <Plus size={13} />
              Añadir
            </button>
          </div>
          <div className="subscription-total">
            <b>
              {money(
                subscriptions
                  .filter((r) => r.data.active)
                  .reduce(
                    (s, r) =>
                      s + r.data.amount / (r.data.cycle === "yearly" ? 12 : 1),
                    0,
                  ),
              )}
            </b>
            <span>/ mes equivalente</span>
          </div>
          {subscriptions.length ? (
            subscriptions.map((r) => (
              <div
                className={
                  "subscription-row " + (!r.data.active ? "inactive" : "")
                }
                key={r.id}
              >
                <button
                  className="subscription-name"
                  onClick={() => setModal(r)}
                >
                  <b>{r.data.name}</b>
                  <small>
                    {r.data.active
                      ? "Próximo cobro: " + label(r.data.nextDate)
                      : "Inactiva"}
                  </small>
                </button>
                <div>
                  <b>{money(r.data.amount)}</b>
                  <small>/{r.data.cycle === "monthly" ? "mes" : "año"}</small>
                </div>
                {r.data.active && (
                  <button
                    className="life-icon"
                    title="Avanzar al siguiente vencimiento (no registra un gasto)"
                    aria-label={"Avanzar renovación de " + r.data.name}
                    disabled={busy || loading}
                    onClick={() => setModal({ ...r, confirmRenew: true })}
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <LifeEmpty
              text="Identifica los gastos que se repiten. Sin cobros automáticos ni acceso a tus cuentas."
              action="Añadir suscripción"
              onClick={() => add("subscription")}
            />
          )}
          <div className="life-card-foot">
            <span>Los cobros se registran por separado en Finanzas.</span>
          </div>
        </section>
        <section className="life-card next-card">
          <div className="life-title">
            <h2>
              <Check size={17} />
              Lo siguiente
            </h2>
            <button
              className="small-button"
              onClick={newTask}
              disabled={loading}
            >
              <Plus size={13} />
              Tarea
            </button>
          </div>
          {tasks.length ? (
            <div className="life-tasks">
              {tasks.slice(0, 4).map((r) => (
                <div key={r.id}>
                  <button
                    className="life-checkbox"
                    disabled={busy || loading}
                    aria-label={"Completar " + r.data.title}
                    onClick={() =>
                      persist("task", { ...r.data, done: true }, r.id, false)
                    }
                  >
                    <Check size={13} />
                  </button>
                  <button
                    className="life-task-name"
                    onClick={() => navigate("tasks")}
                  >
                    <b>{r.data.title}</b>
                    <small>
                      {r.data.date ? label(r.data.date) : "Sin fecha"}
                    </small>
                  </button>
                  <span className={"priority " + r.data.priority.toLowerCase()}>
                    {r.data.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <LifeEmpty
              text="Saca de tu cabeza lo que tienes pendiente."
              action="Añadir tarea"
              onClick={newTask}
            />
          )}
          <div className="life-card-foot">
            <span>{tasks.length} pendientes</span>
            <button className="text-button" onClick={() => navigate("tasks")}>
              Ver tareas
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>
      <div className="life-columns life-bottom">
        <button
          className="life-card mini-portfolio"
          onClick={() => navigate("invest")}
        >
          <div>
            <span className="life-kicker">TUS INVERSIONES</span>
            <b>{money(portfolio)}</b>
            <small>Valoración de ejemplo · precios manuales</small>
          </div>
          <div>
            <span className={result >= 0 ? "positive" : "negative"}>
              {result >= 0 ? "+" : ""}
              {money(result)}
            </span>
            <small>resultado total</small>
            <ArrowUpRight size={20} />
          </div>
        </button>
        <button className="life-card mini-gym" onClick={() => navigate("gym")}>
          <span className="life-mini-icon">
            <Dumbbell size={25} />
          </span>
          <div>
            <span className="life-kicker">TU CONSTANCIA CUENTA</span>
            <b>{gymWeek} entrenamientos esta semana</b>
            <small>Rutinas, series y progresión</small>
          </div>
          <ArrowRight size={19} />
        </button>
      </div>
      {modal && (
        <div className="modal-backdrop">
          <div
            className="modal life-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="life-modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">TU PANEL DE VIDA</p>
                <h2 id="life-modal-title">
                  {modal.confirmRenew
                    ? "Avanzar renovación"
                    : modal.confirmDelete
                      ? "Eliminar registro"
                      : (
                          {
                            event: "Tu agenda",
                            deadline: "Un vencimiento",
                            subscription: "Tu suscripción",
                            habit: "Un pequeño hábito",
                            health: "Tu registro de salud",
                            lifeSettings: "Tus prioridades",
                          } as any
                        )[modal.kind]}
                </h2>
              </div>
              <button
                className="icon"
                aria-label="Cerrar formulario"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={
                modal.confirmRenew
                  ? async (e) => {
                      e.preventDefault();
                      await persist(
                        "subscription",
                        {
                          ...modal.data,
                          nextDate: renewDate(
                            modal.data.nextDate,
                            modal.data.cycle,
                          ),
                        },
                        modal.id,
                      );
                    }
                  : submit
              }
            >
              {modal.confirmDelete ? (
                <p className="delete-confirm">
                  Se eliminará este registro. Esta acción no se puede deshacer.
                </p>
              ) : modal.confirmRenew ? (
                <p className="form-help">
                  La próxima fecha de «{modal.data.name}» pasará a{" "}
                  {label(renewDate(modal.data.nextDate, modal.data.cycle), {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  . Esto no registra un pago ni realiza ningún cobro.
                </p>
              ) : (
                <>
                  {["event", "deadline"].includes(modal.kind) && (
                    <label>
                      Nombre
                      <input
                        autoFocus
                        name="title"
                        required
                        maxLength={160}
                        defaultValue={modal.data.title}
                        placeholder={
                          modal.kind === "event"
                            ? "Por ejemplo, pádel"
                            : "Por ejemplo, renovar el DNI"
                        }
                      />
                    </label>
                  )}
                  {["subscription", "habit"].includes(modal.kind) && (
                    <label>
                      Nombre
                      <input
                        autoFocus
                        name="name"
                        required
                        maxLength={160}
                        defaultValue={modal.data.name}
                        placeholder={
                          modal.kind === "habit"
                            ? "Por ejemplo, leer 20 minutos"
                            : "Por ejemplo, Spotify"
                        }
                      />
                    </label>
                  )}
                  {["event", "deadline", "health"].includes(modal.kind) && (
                    <label>
                      Fecha
                      <input
                        type="date"
                        required
                        name="date"
                        max={modal.kind === "health" ? today : undefined}
                        defaultValue={modal.data.date}
                      />
                    </label>
                  )}
                  {modal.kind === "event" && (
                    <>
                      <div className="form-row">
                        <label>
                          Inicio
                          <input
                            required
                            type="time"
                            name="time"
                            defaultValue={modal.data.time}
                          />
                        </label>
                        <label>
                          Fin
                          <input
                            required
                            type="time"
                            name="endTime"
                            defaultValue={modal.data.endTime}
                          />
                        </label>
                      </div>
                      <label>
                        Categoría
                        <select
                          name="category"
                          defaultValue={modal.data.category}
                        >
                          {[
                            "Trabajo",
                            "Personal",
                            "Deporte",
                            "Casa",
                            "Cumpleaños",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="life-switch">
                        <input
                          type="checkbox"
                          name="repeatWeekdays"
                          defaultChecked={modal.data.repeatWeekdays}
                        />
                        Repetir de lunes a viernes
                      </label>
                      <p className="life-form-note">
                        Si se repite, la fecha indica el inicio de la serie.
                        Editar o eliminar afecta a toda la serie. Horario de
                        Madrid. Guardado solo en Pulso.
                      </p>
                    </>
                  )}
                  {modal.kind === "deadline" && (
                    <label>
                      Notas <small>(opcional)</small>
                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={1000}
                        defaultValue={modal.data.notes}
                        placeholder="Qué necesitas recordar…"
                      />
                    </label>
                  )}
                  {modal.kind === "subscription" && (
                    <>
                      <div className="form-row">
                        <label>
                          Importe (€)
                          <input
                            name="amount"
                            required
                            type="number"
                            min="0"
                            max="10000000"
                            step="0.01"
                            inputMode="decimal"
                            defaultValue={modal.data.amount}
                          />
                        </label>
                        <label>
                          Frecuencia
                          <select name="cycle" defaultValue={modal.data.cycle}>
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Próximo cobro previsto
                        <input
                          required
                          name="nextDate"
                          type="date"
                          defaultValue={modal.data.nextDate}
                        />
                      </label>
                      <label className="life-switch">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={modal.data.active}
                        />
                        Suscripción activa
                      </label>
                    </>
                  )}
                  {modal.kind === "habit" && (
                    <>
                      <label>
                        Objetivo semanal
                        <select
                          name="targetPerWeek"
                          defaultValue={modal.data.targetPerWeek}
                        >
                          {Array.from({ length: 7 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1} {i ? "días" : "día"} por semana
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="life-form-note">
                        Marca los días completados. La racha mide días
                        consecutivos, aunque el objetivo semanal sea menor que
                        siete.
                      </p>
                    </>
                  )}
                  {modal.kind === "health" && (
                    <>
                      <p className="life-form-note">
                        Completa los valores que quieras registrar. Los campos
                        vacíos no cuentan como cero.
                      </p>
                      <div className="form-row">
                        <label>
                          Peso (kg)
                          <input
                            type="number"
                            step="0.1"
                            min="20"
                            max="400"
                            inputMode="decimal"
                            name="weight"
                            defaultValue={modal.data.weight ?? ""}
                          />
                        </label>
                        <label>
                          Sueño (horas)
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="24"
                            inputMode="decimal"
                            name="sleep"
                            defaultValue={modal.data.sleep ?? ""}
                          />
                        </label>
                      </div>
                      <label>
                        Pasos
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="200000"
                          inputMode="numeric"
                          name="steps"
                          defaultValue={modal.data.steps ?? ""}
                        />
                      </label>
                    </>
                  )}
                  {modal.kind === "lifeSettings" && (
                    <>
                      <label>
                        Presupuesto mensual (€)
                        <input
                          required
                          autoFocus
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="1000000000"
                          step="0.01"
                          name="budget"
                          defaultValue={modal.data.budget}
                        />
                      </label>
                      <p className="life-form-note">
                        Usa 0 para no fijar un presupuesto. Es un límite de
                        gasto, independiente de tus ingresos.
                      </p>
                      <label>
                        Foco de la semana
                        <input
                          name="weeklyFocus"
                          maxLength={250}
                          defaultValue={modal.data.weeklyFocus}
                          placeholder="Por ejemplo, terminar la entrega y entrenar cuatro días"
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {message && (
                <p className="life-form-message" role="status">
                  {message}
                </p>
              )}
              <div className="modal-actions">
                {modal.id && !modal.confirmDelete && !modal.confirmRenew && (
                  <button
                    type="button"
                    className="icon delete"
                    aria-label="Eliminar registro"
                    onClick={() => setModal({ ...modal, confirmDelete: true })}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button
                  className={"primary " + (modal.confirmDelete ? "danger" : "")}
                  type="submit"
                  disabled={busy || loading}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Check size={15} />
                  )}{" "}
                  {modal.confirmDelete
                    ? "Eliminar"
                    : modal.confirmRenew
                      ? "Confirmar"
                      : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function LifeEmpty({
  text,
  action,
  onClick,
}: {
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="life-empty">
      <span>✦</span>
      <p>{text}</p>
      <button className="text-button" onClick={onClick}>
        <Plus size={12} />
        {action}
      </button>
    </div>
  );
}
function SpendChart({
  records,
  today,
  budget,
}: {
  records: LifeRecord[];
  today: string;
  budget: number;
}) {
  const cash = monthBudget(records, today, budget),
    daily = Array.from({ length: cash.day }, (_, i) =>
      records
        .filter(
          (r) =>
            r.kind === "movement" &&
            r.data.type === "expense" &&
            r.data.date.startsWith(today.slice(0, 7)) &&
            Number(r.data.date.slice(-2)) <= i + 1,
        )
        .reduce((s, r) => s + r.data.amount, 0),
    );
  const max = Math.max(100, budget, cash.forecast, cash.expense) * 1.1,
    x = (i: number) => 15 + (i / Math.max(cash.days - 1, 1)) * 410,
    y = (v: number) => 145 - (v / max) * 120;
  const points = daily.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <div className="spend-chart">
      <svg
        viewBox="0 0 445 180"
        role="img"
        aria-label="Gasto acumulado del mes y proyección estimada"
      >
        <defs>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f58e77" stopOpacity=".22" />
            <stop offset="100%" stopColor="#f58e77" stopOpacity="0" />
          </linearGradient>
        </defs>
        {budget > 0 && (
          <line
            x1="15"
            x2="425"
            y1={y(budget)}
            y2={y(budget)}
            stroke="#6b6b80"
            strokeDasharray="4 5"
          />
        )}
        <polygon
          points={`15,145 ${points} ${x(cash.day - 1)},145`}
          fill="url(#spend-fill)"
        />
        <polyline
          points={points}
          stroke="#f29885"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        {cash.day < cash.days && (
          <line
            x1={x(cash.day - 1)}
            x2="425"
            y1={y(cash.expense)}
            y2={y(cash.forecast)}
            stroke="#b88285"
            strokeDasharray="3 5"
          />
        )}
        <circle
          cx={x(cash.day - 1)}
          cy={y(cash.expense)}
          r="3.5"
          fill="#f5a08c"
          stroke="#171721"
          strokeWidth="2"
        />
        <text x="15" y="173">
          1 {label(today, { month: "short" })}
        </text>
        <text x="425" y="173" textAnchor="end">
          {cash.days} {label(today, { month: "short" })}
        </text>
      </svg>
      <div className="spend-chart-caption">
        <span>
          <i />
          Gasto real
        </span>
        <span>
          <i />
          Proyección por ritmo diario
        </span>
      </div>
    </div>
  );
}
function WeightChart({ rows }: { rows: LifeRecord[] }) {
  if (!rows.length)
    return <div className="health-chart-empty">Sin registros de peso</div>;
  const values = rows.map((r) => r.data.weight),
    min = Math.min(...values) - 0.5,
    max = Math.max(...values) + 0.5,
    x = (i: number) =>
      rows.length === 1 ? 135 : 10 + (i / (rows.length - 1)) * 250,
    y = (v: number) => 125 - ((v - min) / (max - min)) * 110;
  return (
    <svg
      viewBox="0 0 270 145"
      className="weight-chart"
      role="img"
      aria-label="Evolución del peso en los últimos 30 días"
    >
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="#b8a3f4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {rows.map((r, i) => (
        <circle key={r.id} cx={x(i)} cy={y(r.data.weight)} r="3" fill="#c6b2ff">
          <title>
            {label(r.data.date)}: {n(r.data.weight)} kg
          </title>
        </circle>
      ))}
    </svg>
  );
}
