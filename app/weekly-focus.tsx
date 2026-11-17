"use client";
import { useEffect, useRef } from "react";
import { Check, Circle, Dumbbell, Pencil, Plus, Target } from "lucide-react";
import { type LifeRecord, weekDates } from "../lib/life";
import { dailyQuotes, weeklyProgress, type FocusGoal } from "../lib/focus";

type Props = {
  records: LifeRecord[];
  today: string;
  loading: boolean;
  busy: boolean;
  onRefresh: () => Promise<void>;
  mark: (goal: FocusGoal) => void;
  edit: () => void;
};
const weekLabel = (date: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(new Date(date + "T12:00:00Z"));

export default function WeeklyFocus({
  records,
  today,
  loading,
  busy,
  onRefresh,
  mark,
  edit,
}: Props) {
  const monday = weekDates(today)[0];
  const progress = weeklyProgress(records, monday, today);
  const entry = records.find(
    (r) => r.kind === "dailyQuote" && r.data.date === today,
  );
  const quote = dailyQuotes.find((q) => q.key === entry?.data.key);
  const refreshed = useRef("");
  useEffect(() => {
    if (!loading && !entry && refreshed.current !== today) {
      refreshed.current = today;
      void onRefresh();
    }
  }, [today, loading, entry, onRefresh]);
  const history = new Set<string>();
  for (const { kind, data } of records) {
    if (
      (kind === "workout" || kind === "focusProgress") &&
      data.date &&
      data.date < monday
    )
      history.add(weekDates(data.date)[0]);
  }
  return (
    <div className="focus-layout">
      <section className="focus-panel" aria-label="Foco de la semana">
        <header>
          <h2>
            <Target size={15} />
            Foco de la semana
          </h2>
          <button
            type="button"
            className="focus-edit"
            aria-label="Editar prioridades"
            onClick={edit}
          >
            <Pencil size={13} />
          </button>
        </header>
        {loading ? (
          <p>Cargando tus objetivos…</p>
        ) : (
          <>
            <div className="focus-row">
              <Dumbbell size={16} />
              <b>Gimnasio</b>
              <span>{progress.days}/4 días</span>
              <small>
                {progress.left === 0
                  ? "Objetivo cumplido"
                  : progress.left === 1
                    ? "Te queda 1 día"
                    : "Te quedan " + progress.left + " días"}
              </small>
            </div>
            {(["tfg", "work"] as const).map((goal) => {
              const title = goal === "tfg" ? "TFG" : "Trabajo";
              return (
                <div className="focus-row" key={goal}>
                  {progress[goal] ? (
                    <Check size={16} className="focus-check" />
                  ) : (
                    <Circle size={14} />
                  )}
                  <b>{title}</b>
                  <span>
                    {progress[goal] ? "Avance registrado" : "Pendiente"}
                  </span>
                  {!progress[goal] && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={"Registrar avance en " + title}
                      onClick={() => mark(goal)}
                    >
                      <Plus size={12} />
                      Registrar avance
                    </button>
                  )}
                </div>
              );
            })}
            {history.size > 0 && (
              <details className="focus-history">
                <summary>Semanas anteriores</summary>
                {[...history]
                  .sort()
                  .reverse()
                  .map((start) => {
                    const past = weeklyProgress(
                      records,
                      start,
                      weekDates(start)[6],
                    );
                    return (
                      <p key={start}>
                        <b>{weekLabel(start)}</b> · Gimnasio {past.days}/4 · TFG{" "}
                        {past.tfg ? "✓" : "pendiente"} · Trabajo{" "}
                        {past.work ? "✓" : "pendiente"}
                      </p>
                    );
                  })}
              </details>
            )}
          </>
        )}
      </section>
      {quote && (
        <aside className="focus-quote" aria-label="Cita del día">
          <h2>Cita del día</h2>
          <blockquote>«{quote.words}»</blockquote>
          <p>{quote.author}</p>
          <a href={quote.url} target="_blank" rel="noopener noreferrer">
            {quote.source} ↗
          </a>
        </aside>
      )}
    </div>
  );
}
