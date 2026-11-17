"use client";
import { useEffect, useRef, useState } from "react";
import {
  Dumbbell,
  Plus,
  ArrowRight,
  Play,
  Check,
  X,
  Trash2,
  Pencil,
  Clock3,
  CalendarDays,
  ChartNoAxesCombined,
  Save,
  Timer,
  RotateCcw,
  Pause,
  ChevronDown,
  ChevronUp,
  Copy,
  LoaderCircle,
} from "lucide-react";
import {
  type GymRecord,
  type Workout,
  type Routine,
  workoutSchema,
  routineSchema,
  workoutVolume,
  setCount,
  weekStart,
  progression,
  exerciseKey,
} from "../lib/gym";
import "./gym.css";
const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );
const shortDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
const suggestions = [
  "Press banca con barra",
  "Press inclinado con mancuernas",
  "Aperturas en polea",
  "Dominadas",
  "Jalón al pecho",
  "Remo con barra",
  "Remo en polea",
  "Press militar",
  "Elevaciones laterales",
  "Curl de bíceps",
  "Extensión de tríceps",
  "Sentadilla con barra",
  "Prensa de piernas",
  "Peso muerto rumano",
  "Curl femoral",
  "Extensión de cuádriceps",
  "Elevación de gemelos",
  "Hip thrust",
];
type DraftSet = { id: string; weight: string; reps: string; done: boolean };
type DraftExercise = {
  id: string;
  name: string;
  restSeconds: number;
  sets: DraftSet[];
};
type Draft = {
  id?: string;
  name: string;
  date: string;
  duration: string;
  notes: string;
  startedAt: number;
  exercises: DraftExercise[];
};
const uid = () => crypto.randomUUID();
const newSet = (reps = "") => ({ id: uid(), weight: "", reps, done: false });
const newExercise = (name = ""): DraftExercise => ({
  id: uid(),
  name,
  restSeconds: 90,
  sets: [newSet(), newSet(), newSet()],
});
const newRoutine = (): Routine => ({
  name: "",
  exercises: [{ name: "", sets: 3, reps: 10, restSeconds: 90 }],
});
const draftKey = "pulso:gym:draft:v1";
function workoutDraft(r: GymRecord): Draft {
  return {
    id: r.id,
    name: r.data.name,
    date: r.data.date,
    duration: String(r.data.duration),
    notes: r.data.notes,
    startedAt: Date.now(),
    exercises: r.data.exercises.map((e: any) => ({
      id: uid(),
      name: e.name,
      restSeconds: 90,
      sets: e.sets.map((t: any) => ({
        id: uid(),
        weight: String(t.weight),
        reps: String(t.reps),
        done: true,
      })),
    })),
  };
}
export function GymHome({
  records,
  onOpen,
}: {
  records: GymRecord[];
  onOpen: () => void;
}) {
  const list = records
    .filter((r) => r.kind === "workout")
    .sort(
      (a, b) =>
        b.data.date.localeCompare(a.data.date) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const week = weekStart(today()),
    count = list.filter(
      (r) => r.data.date >= week && r.data.date <= today(),
    ).length;
  return (
    <section className="gym-home">
      <div className="gym-home-symbol">
        <Dumbbell size={23} />
      </div>
      <div>
        <span className="section-kicker">TU CONSTANCIA CUENTA</span>
        <h3>
          {count
            ? `${count} ${count === 1 ? "entrenamiento" : "entrenamientos"} esta semana`
            : "Un espacio para tu próximo entrenamiento"}
        </h3>
        <p>
          {list.length
            ? `Último registro: ${list[0].data.name} · ${shortDate(list[0].data.date)}`
            : "Crea tus rutinas y sigue tu progresión, serie a serie."}
        </p>
      </div>
      <button className="secondary" onClick={onOpen}>
        Ir al gimnasio <ArrowRight size={15} />
      </button>
    </section>
  );
}
export default function Gym({
  records,
  onRefresh,
  loading,
}: {
  records: GymRecord[];
  onRefresh: () => Promise<void>;
  loading: boolean;
}) {
  const [tab, setTab] = useState("Entrenar"),
    [draft, setDraft] = useState<Draft | null>(null),
    [draftReady, setDraftReady] = useState(false),
    [routineEditor, setRoutineEditor] = useState<{
      id?: string;
      data: Routine;
    } | null>(null),
    [confirm, setConfirm] = useState<{
      type: string;
      record?: GymRecord;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(""),
    [historyMonth, setHistoryMonth] = useState(""),
    [expanded, setExpanded] = useState<string | null>(null),
    [timerEnd, setTimerEnd] = useState<number | null>(null),
    [seconds, setSeconds] = useState(0),
    [timerTarget, setTimerTarget] = useState(90),
    [storageError, setStorageError] = useState(false);
  const sessionRef = useRef<HTMLDivElement>(null);
  const routines = records
    .filter((r) => r.kind === "routine")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const workouts = records
    .filter((r) => r.kind === "workout")
    .sort(
      (a, b) =>
        b.data.date.localeCompare(a.data.date) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const week = weekStart(today()),
    thisWeek = workouts.filter(
      (r) => r.data.date >= week && r.data.date <= today(),
    ),
    thisMonth = workouts.filter(
      (r) =>
        r.data.date.startsWith(today().slice(0, 7)) && r.data.date <= today(),
    );
  const exerciseNames = Array.from(
    new Map(
      workouts.flatMap((r) =>
        (r.data as Workout).exercises.map(
          (e) => [exerciseKey(e.name), e.name] as const,
        ),
      ),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const exercise = exerciseNames.includes(selected)
    ? selected
    : exerciseNames[0] || "";
  const points = progression(records, exercise),
    latest = points.at(-1),
    best = points.length ? Math.max(...points.map((p) => p.weight)) : 0;
  const dates = Array.from(
    new Set(workouts.map((r) => r.data.date.slice(0, 7))),
  )
    .sort()
    .reverse();
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (
          d &&
          typeof d.name === "string" &&
          Array.isArray(d.exercises) &&
          d.exercises.length <= 30 &&
          d.exercises.every(
            (e: any) =>
              typeof e.name === "string" &&
              Array.isArray(e.sets) &&
              e.sets.length <= 20 &&
              e.sets.every(
                (s: any) =>
                  typeof s.weight === "string" &&
                  typeof s.reps === "string" &&
                  typeof s.done === "boolean",
              ),
          )
        )
          setDraft(d);
      }
    } catch {
      setStorageError(true);
    }
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    try {
      if (draft) localStorage.setItem(draftKey, JSON.stringify(draft));
      else localStorage.removeItem(draftKey);
    } catch {
      setStorageError(true);
    }
  }, [draft, draftReady]);
  useEffect(() => {
    if (!timerEnd) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setSeconds(s);
      if (s === 0) {
        setTimerEnd(null);
        setMessage("Descanso terminado. Puedes continuar cuando estés listo.");
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [timerEnd]);
  useEffect(() => {
    if (!routineEditor && !confirm) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setRoutineEditor(null);
        setConfirm(null);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [routineEditor, confirm, busy]);
  async function persist(kind: string, data: any, id?: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, data, id }),
      });
      const body: any = await r.json();
      if (!r.ok) throw Error(body.error || "No se pudo guardar.");
      await onRefresh();
      setMessage(
        kind === "routine"
          ? "Rutina guardada en tu espacio privado."
          : "Entrenamiento guardado. Un paso más.",
      );
      return true;
    } catch (e: any) {
      setMessage(e.message || "No se pudo guardar. Conservamos tu borrador.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function deleteRecord(r: GymRecord) {
    setBusy(true);
    try {
      const res = await fetch("/api/records?id=" + encodeURIComponent(r.id), {
        method: "DELETE",
      });
      if (!res.ok) throw Error("No se pudo eliminar el registro.");
      await onRefresh();
      setConfirm(null);
      setMessage("Registro eliminado.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function start(r?: Routine) {
    if (draft) {
      setTab("Entrenar");
      setMessage(
        "Tienes una sesión en curso. Guárdala o descártala antes de empezar otra.",
      );
      return;
    }
    setDraft({
      name: r?.name || "Entrenamiento libre",
      date: today(),
      duration: "",
      notes: "",
      startedAt: Date.now(),
      exercises: r
        ? r.exercises.map((e) => ({
            id: uid(),
            name: e.name,
            restSeconds: e.restSeconds,
            sets: Array.from({ length: e.sets }, () => newSet(String(e.reps))),
          }))
        : [newExercise()],
    });
    setTab("Entrenar");
    setMessage("");
  }
  function updateExercise(id: string, fn: (e: DraftExercise) => DraftExercise) {
    setDraft((d) =>
      d
        ? { ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }
        : d,
    );
  }
  function updateSet(eid: string, sid: string, field: string, value: any) {
    updateExercise(eid, (e) => ({
      ...e,
      sets: e.sets.map((s) =>
        s.id === sid
          ? {
              ...s,
              [field]: value,
              ...(field !== "done" ? { done: false } : {}),
            }
          : s,
      ),
    }));
  }
  function completeSet(e: DraftExercise, s: DraftSet) {
    if (
      !s.done &&
      (s.weight.trim() === "" ||
        s.reps.trim() === "" ||
        !Number.isFinite(Number(s.weight)) ||
        Number(s.weight) < 0 ||
        Number(s.weight) > 2000 ||
        !Number.isInteger(Number(s.reps)) ||
        Number(s.reps) < 1 ||
        Number(s.reps) > 100)
    ) {
      setMessage(
        "Introduce un peso válido (0 para peso corporal) y entre 1 y 100 repeticiones.",
      );
      return;
    }
    updateSet(e.id, s.id, "done", !s.done);
    if (!s.done && e.restSeconds) {
      setTimerTarget(e.restSeconds);
      setSeconds(e.restSeconds);
      setTimerEnd(Date.now() + e.restSeconds * 1000);
    }
    setMessage("");
  }
  function previous(e: DraftExercise) {
    return workouts
      .filter(
        (r) => r.id !== draft?.id && r.data.date <= (draft?.date || today()),
      )
      .flatMap((r) => (r.data as Workout).exercises)
      .find((x) => exerciseKey(x.name) === exerciseKey(e.name));
  }
  async function finish() {
    if (!draft) return;
    const data = {
      name: draft.name,
      date: draft.date,
      duration:
        draft.duration.trim() === ""
          ? Math.max(0, Math.round((Date.now() - draft.startedAt) / 60000))
          : Number(draft.duration),
      notes: draft.notes,
      exercises: draft.exercises
        .map((e) => ({
          name: e.name,
          sets: e.sets
            .filter((s) => s.done)
            .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
        }))
        .filter((e) => e.sets.length),
    };
    if (data.date > today()) {
      setMessage("El entrenamiento debe tener una fecha de hoy o anterior.");
      return;
    }
    const parsed = workoutSchema.safeParse(data);
    if (!parsed.success) {
      setMessage(
        "Añade un nombre y al menos una serie completada. Revisa también la fecha y duración.",
      );
      return;
    }
    if (await persist("workout", parsed.data, draft.id)) {
      setDraft(null);
      setTimerEnd(null);
      setSeconds(0);
      setTab("Historial");
    }
  }
  const doneCount =
      draft?.exercises.reduce(
        (n, e) => n + e.sets.filter((s) => s.done).length,
        0,
      ) || 0,
    totalSets = draft?.exercises.reduce((n, e) => n + e.sets.length, 0) || 0;
  const editWorkout = (r: GymRecord) => {
    if (draft) {
      setMessage("Guarda o descarta la sesión en curso antes de editar otra.");
      setTab("Entrenar");
      return;
    }
    setDraft(workoutDraft(r));
    setTab("Entrenar");
    setMessage(
      "Editando un registro guardado. Tus cambios se aplicarán al guardar.",
    );
  };
  return (
    <div className="gym">
      <datalist id="gym-exercises">
        {Array.from(new Set([...suggestions, ...exerciseNames])).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="stat-grid">
        <GymStat
          title="Esta semana"
          value={String(thisWeek.length)}
          detail="Entrenamientos · de lunes a hoy"
          icon={<Dumbbell size={18} />}
        />
        <GymStat
          title="Este mes"
          value={String(thisMonth.length)}
          detail="Sesiones registradas"
          icon={<CalendarDays size={18} />}
        />
        <GymStat
          title="Series este mes"
          value={String(thisMonth.reduce((s, r) => s + setCount(r.data), 0))}
          detail="Solo series completadas"
          icon={<Check size={18} />}
        />
        <GymStat
          title="Tiempo este mes"
          value={
            fmt(thisMonth.reduce((s, r) => s + r.data.duration, 0)) + " min"
          }
          detail="Duración de tus sesiones"
          icon={<Clock3 size={18} />}
        />
      </div>
      <div className="gym-tabbar">
        <div className="tabs">
          {["Entrenar", "Rutinas", "Progreso", "Historial"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t}
              {t === "Entrenar" && draft && <span className="gym-live-dot" />}
            </button>
          ))}
        </div>
        <button
          className="secondary"
          onClick={() => start()}
          disabled={loading || busy}
        >
          <Plus size={15} />
          Entrenamiento libre
        </button>
      </div>
      {message && (
        <div className="gym-message" role="status">
          <span>{message}</span>
          <button
            className="icon"
            onClick={() => setMessage("")}
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {tab === "Entrenar" &&
        (!draft ? (
          <>
            <section className="gym-welcome">
              <div>
                <p className="eyebrow">UN ENTRENAMIENTO CADA VEZ</p>
                <h2>Hoy también cuenta.</h2>
                <p>
                  Elige tu rutina o empieza una sesión libre.
                  <br />
                  Tú pones el esfuerzo. Aquí queda el progreso.
                </p>
                <button
                  className="primary"
                  onClick={() => start()}
                  disabled={loading}
                >
                  <Play size={15} />
                  Empezar a entrenar
                </button>
              </div>
              <div className="gym-welcome-art" aria-hidden="true">
                <div>
                  <Dumbbell size={70} strokeWidth={1} />
                </div>
                <span>CONSTANCIA &gt; PRISA</span>
              </div>
            </section>
            <div className="gym-section-heading">
              <div>
                <h2>Tus rutinas</h2>
                <p>Preparadas para que solo tengas que empezar.</p>
              </div>
              <button
                className="text-button"
                onClick={() => setRoutineEditor({ data: newRoutine() })}
                disabled={loading}
              >
                <Plus size={15} />
                Crear rutina
              </button>
            </div>
            {routines.length ? (
              <div className="gym-routine-grid">
                {routines.map((r) => (
                  <RoutineCard
                    key={r.id}
                    r={r}
                    onStart={() => start(r.data)}
                    onEdit={() =>
                      setRoutineEditor({
                        id: r.id,
                        data: structuredClone(r.data),
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <section className="panel gym-empty-routine">
                <div className="gym-empty-icon">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <h3>Tu entrenamiento, a tu manera.</h3>
                  <p>
                    Guarda tus ejercicios, series, repeticiones y descansos para
                    reutilizarlos.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setRoutineEditor({ data: newRoutine() })}
                  disabled={loading}
                >
                  <Plus size={15} />
                  Mi primera rutina
                </button>
              </section>
            )}
          </>
        ) : (
          <div ref={sessionRef} className="gym-session">
            <section className="panel">
              <div className="gym-session-head">
                <div>
                  <span className="gym-session-tag">
                    <i />
                    {draft.id ? "EDITANDO REGISTRO" : "SESIÓN EN CURSO"}
                  </span>
                  <h2>{draft.name || "Tu entrenamiento"}</h2>
                  <p>
                    {doneCount} de {totalSets} series marcadas
                  </p>
                </div>
                <button
                  className="icon delete"
                  onClick={() => setConfirm({ type: "discard" })}
                  aria-label="Descartar sesión"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="gym-session-progress">
                <i
                  style={{
                    width:
                      (totalSets ? (doneCount / totalSets) * 100 : 0) + "%",
                  }}
                />
              </div>
              <div className="gym-session-meta">
                <label>
                  Nombre
                  <input
                    maxLength={100}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fecha
                  <input
                    type="date"
                    max={today()}
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Duración (min)
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    placeholder="Automática"
                    value={draft.duration}
                    onChange={(e) =>
                      setDraft({ ...draft, duration: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="gym-session-help">
                Peso en kg. Usa 0 para peso corporal; en mancuernas, registra el
                peso de cada una. Marca cada serie para incluirla en tu
                progreso.
              </div>
            </section>
            <div className="gym-rest">
              <div>
                <Timer size={19} />
                <span>
                  {timerEnd
                    ? "Descansando"
                    : seconds === 0
                      ? "Descanso"
                      : "Descanso en pausa"}
                </span>
                <b role="timer">
                  {Math.floor(seconds / 60)}:
                  {String(seconds % 60).padStart(2, "0")}
                </b>
              </div>
              <div>
                <button
                  className="icon"
                  aria-label={timerEnd ? "Pausar descanso" : "Iniciar descanso"}
                  onClick={() =>
                    timerEnd
                      ? setTimerEnd(null)
                      : (setSeconds(seconds || timerTarget),
                        setTimerEnd(
                          Date.now() + (seconds || timerTarget) * 1000,
                        ))
                  }
                >
                  {timerEnd ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  className="icon"
                  aria-label="Reiniciar descanso"
                  onClick={() => {
                    setSeconds(timerTarget);
                    setTimerEnd(Date.now() + timerTarget * 1000);
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setTimerEnd(null);
                    setSeconds(0);
                  }}
                >
                  Omitir
                </button>
              </div>
            </div>
            {draft.exercises.map((e, ei) => {
              const prev = previous(e);
              return (
                <section className="panel gym-exercise" key={e.id}>
                  <div className="gym-exercise-head">
                    <span className="gym-exercise-number">
                      {String(ei + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <label className="sr-only" htmlFor={"exercise-" + e.id}>
                        Ejercicio {ei + 1}
                      </label>
                      <input
                        id={"exercise-" + e.id}
                        list="gym-exercises"
                        placeholder="Nombre del ejercicio"
                        maxLength={100}
                        value={e.name}
                        onChange={(ev) =>
                          updateExercise(e.id, (x) => ({
                            ...x,
                            name: ev.target.value,
                          }))
                        }
                      />
                      <label className="gym-rest-select">
                        <Clock3 size={11} />
                        Descanso
                        <select
                          aria-label={"Descanso ejercicio " + (ei + 1)}
                          value={e.restSeconds}
                          onChange={(ev) =>
                            updateExercise(e.id, (x) => ({
                              ...x,
                              restSeconds: Number(ev.target.value),
                            }))
                          }
                        >
                          {[0, 30, 60, 90, 120, 180, 240, 300].map((s) => (
                            <option key={s} value={s}>
                              {s ? s + " s" : "Sin temporizador"}
                            </option>
                          ))}
                          {![0, 30, 60, 90, 120, 180, 240, 300].includes(
                            e.restSeconds,
                          ) && (
                            <option value={e.restSeconds}>
                              {e.restSeconds} s
                            </option>
                          )}
                        </select>
                      </label>
                    </div>
                    <button
                      className="icon subtle"
                      aria-label={"Quitar ejercicio " + (ei + 1)}
                      onClick={() =>
                        setConfirm({
                          type: "exercise",
                          record: {
                            id: e.id,
                            kind: "",
                            createdAt: "",
                            data: { name: e.name },
                          },
                        })
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <div className="gym-sets">
                    <div className="gym-set-labels">
                      <span>SERIE</span>
                      <span>ANTERIOR</span>
                      <span>KG</span>
                      <span>REPS</span>
                      <span>HECHA</span>
                      <span />
                    </div>
                    {e.sets.map((s, si) => (
                      <div
                        key={s.id}
                        className={"gym-set " + (s.done ? "is-done" : "")}
                      >
                        <span className="gym-set-n">{si + 1}</span>
                        <span className="gym-previous">
                          {prev?.sets[si]
                            ? `${fmt(prev.sets[si].weight)} × ${prev.sets[si].reps}`
                            : "—"}
                        </span>
                        <input
                          type="number"
                          aria-label={`Peso ejercicio ${ei + 1} serie ${si + 1}`}
                          inputMode="decimal"
                          min="0"
                          max="2000"
                          step="0.25"
                          placeholder="kg"
                          value={s.weight}
                          onChange={(ev) =>
                            updateSet(e.id, s.id, "weight", ev.target.value)
                          }
                        />
                        <input
                          type="number"
                          aria-label={`Repeticiones ejercicio ${ei + 1} serie ${si + 1}`}
                          inputMode="numeric"
                          min="1"
                          max="100"
                          step="1"
                          placeholder="reps"
                          value={s.reps}
                          onChange={(ev) =>
                            updateSet(e.id, s.id, "reps", ev.target.value)
                          }
                        />
                        <button
                          className="gym-set-check"
                          aria-label={`Completar ejercicio ${ei + 1} serie ${si + 1}`}
                          aria-pressed={s.done}
                          onClick={() => completeSet(e, s)}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="icon subtle"
                          aria-label={`Quitar serie ${si + 1} del ejercicio ${ei + 1}`}
                          onClick={() =>
                            updateExercise(e.id, (x) => ({
                              ...x,
                              sets: x.sets.filter((t) => t.id !== s.id),
                            }))
                          }
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="gym-exercise-foot">
                    <button
                      className="text-button"
                      disabled={e.sets.length >= 20}
                      onClick={() =>
                        updateExercise(e.id, (x) => ({
                          ...x,
                          sets: [...x.sets, newSet(x.sets.at(-1)?.reps || "")],
                        }))
                      }
                    >
                      <Plus size={14} />
                      Añadir serie
                    </button>
                    {prev && (
                      <button
                        className="text-button"
                        onClick={() =>
                          updateExercise(e.id, (x) => ({
                            ...x,
                            sets: prev.sets.map((t) => ({
                              id: uid(),
                              weight: String(t.weight),
                              reps: String(t.reps),
                              done: false,
                            })),
                          }))
                        }
                      >
                        <Copy size={13} />
                        Copiar anterior
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
            <button
              className="gym-add-exercise"
              disabled={draft.exercises.length >= 30}
              onClick={() =>
                setDraft({
                  ...draft,
                  exercises: [...draft.exercises, newExercise()],
                })
              }
            >
              <Plus size={18} />
              Añadir ejercicio
            </button>
            <section className="panel gym-session-notes">
              <label>
                Notas de la sesión
                <textarea
                  maxLength={2000}
                  placeholder="Sensaciones, ajustes o algo para recordar…"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                />
              </label>
              <div className="gym-session-save">
                <p>
                  {storageError
                    ? "No se pudo guardar el borrador en este dispositivo."
                    : "Borrador en este dispositivo. Se sincroniza al guardar."}
                  <br />
                  <b>Solo se guardarán las series marcadas como hechas.</b>
                </p>
                <button
                  className="primary"
                  disabled={busy || loading}
                  onClick={finish}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Guardar entrenamiento
                </button>
              </div>
            </section>
          </div>
        ))}
      {tab === "Rutinas" && (
        <>
          <div className="gym-section-heading">
            <div>
              <h2>Tu plan de entrenamiento</h2>
              <p>
                Plantillas reutilizables. Cada sesión guarda sus propios
                resultados.
              </p>
            </div>
            <button
              className="primary"
              disabled={loading}
              onClick={() => setRoutineEditor({ data: newRoutine() })}
            >
              <Plus size={15} />
              Nueva rutina
            </button>
          </div>
          {routines.length ? (
            <div className="gym-routine-grid">
              {routines.map((r) => (
                <RoutineCard
                  key={r.id}
                  r={r}
                  onStart={() => start(r.data)}
                  onEdit={() =>
                    setRoutineEditor({
                      id: r.id,
                      data: structuredClone(r.data),
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyGym
              title="Una rutina que se adapta a ti"
              text="Añade tus ejercicios y los objetivos de cada serie. Podrás modificar los pesos en cada entrenamiento."
              action="Crear mi primera rutina"
              onClick={() => setRoutineEditor({ data: newRoutine() })}
            />
          )}
        </>
      )}
      {tab === "Progreso" && (
        <>
          {exerciseNames.length ? (
            <>
              <div className="gym-section-heading">
                <div>
                  <h2>Serie a serie, más lejos.</h2>
                  <p>
                    Compara el mismo ejercicio con la misma técnica y equipo.
                  </p>
                </div>
                <select
                  aria-label="Ejercicio para ver progreso"
                  value={exercise}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {exerciseNames.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="gym-progress-stats">
                <div>
                  <span>Mejor peso registrado</span>
                  <b>
                    {fmt(best)} <small>kg</small>
                  </b>
                </div>
                <div>
                  <span>Última mejor serie</span>
                  <b>
                    {fmt(latest?.weight || 0)}{" "}
                    <small>kg × {latest?.reps || 0} reps</small>
                  </b>
                </div>
                <div>
                  <span>Sesiones con este ejercicio</span>
                  <b>{points.length}</b>
                </div>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>{exercise}</h2>
                    <p>Máximo peso por sesión · kg · últimas 12 sesiones</p>
                  </div>
                  <ChartNoAxesCombined size={20} color="#8fa17f" />
                </div>
                <ProgressChart points={points.slice(-12)} />
                <div className="panel-foot">
                  <span>
                    El peso máximo no refleja por sí solo toda la progresión.
                    Revisa también repeticiones y volumen.
                  </span>
                </div>
              </section>
              <section className="panel gym-progress-table">
                <div className="panel-title">
                  <div>
                    <h2>Los números detrás del progreso</h2>
                    <p>
                      Volumen = suma de peso × repeticiones de todas las series
                      del ejercicio.
                    </p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Mejor serie por peso</th>
                        <th>Volumen (kg × reps)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...points].reverse().map((p) => (
                        <tr key={p.id}>
                          <td>
                            {shortDate(p.date)} {p.date.slice(0, 4)}
                          </td>
                          <td>
                            <b>
                              {fmt(p.weight)} kg × {p.reps}
                            </b>
                          </td>
                          <td>{fmt(p.volume)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <EmptyGym
              title="El progreso empieza en la primera serie"
              text="Guarda un entrenamiento y aquí verás la evolución de cada ejercicio con tus datos reales."
              action="Registrar un entrenamiento"
              onClick={() => start()}
            />
          )}
        </>
      )}
      {tab === "Historial" && (
        <>
          <div className="gym-section-heading">
            <div>
              <h2>Todo lo que has entrenado</h2>
              <p>{workouts.length} sesiones guardadas en tu espacio privado.</p>
            </div>
            <select
              aria-label="Mes del historial"
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value)}
            >
              <option value="">Todos los meses</option>
              {dates.map((d) => (
                <option value={d} key={d}>
                  {new Date(d + "-02T12:00:00").toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
          {workouts.length ? (
            <div className="gym-history">
              {workouts
                .filter(
                  (r) => !historyMonth || r.data.date.startsWith(historyMonth),
                )
                .map((r) => (
                  <section className="panel" key={r.id}>
                    <div className="gym-history-head">
                      <span className="gym-history-date">
                        <b>{r.data.date.slice(-2)}</b>
                        <small>
                          {new Date(
                            r.data.date + "T12:00:00",
                          ).toLocaleDateString("es-ES", {
                            month: "short",
                            year: "2-digit",
                          })}
                        </small>
                      </span>
                      <div className="gym-history-title">
                        <h3>{r.data.name}</h3>
                        <p>
                          {r.data.exercises.length} ejercicios ·{" "}
                          {setCount(r.data)} series · {r.data.duration} min
                        </p>
                      </div>
                      <div className="gym-history-volume">
                        <b>{fmt(workoutVolume(r.data))}</b>
                        <small>kg × reps</small>
                      </div>
                      <button
                        className="icon"
                        aria-label={"Editar " + r.data.name}
                        onClick={() => editWorkout(r)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon"
                        aria-label={"Eliminar " + r.data.name}
                        onClick={() =>
                          setConfirm({ type: "delete", record: r })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        className="icon"
                        aria-label={"Detalles de " + r.data.name}
                        aria-expanded={expanded === r.id}
                        onClick={() =>
                          setExpanded(expanded === r.id ? null : r.id)
                        }
                      >
                        {expanded === r.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </div>
                    {expanded === r.id && (
                      <div className="gym-history-detail">
                        {(r.data as Workout).exercises.map((e, i) => (
                          <div key={i}>
                            <b>{e.name}</b>
                            <div>
                              {e.sets.map((s, j) => (
                                <span key={j}>
                                  {fmt(s.weight)} kg × {s.reps}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {r.data.notes && (
                          <p className="gym-history-notes">{r.data.notes}</p>
                        )}
                      </div>
                    )}
                  </section>
                ))}
            </div>
          ) : (
            <EmptyGym
              title="Tu historial todavía está por escribir"
              text="Cada entrenamiento guardado aparecerá aquí. Podrás consultarlo, corregirlo y repetir tus rutinas."
              action="Empezar mi primera sesión"
              onClick={() => start()}
            />
          )}
        </>
      )}
      {routineEditor && (
        <div className="modal-backdrop">
          <div
            className="modal gym-routine-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">TU PLAN, A TU MANERA</p>
                <h2 id="routine-title">
                  {routineEditor.id ? "Editar rutina" : "Crear rutina"}
                </h2>
              </div>
              <button
                className="icon"
                disabled={busy}
                onClick={() => setRoutineEditor(null)}
                aria-label="Cerrar rutina"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async (ev) => {
                ev.preventDefault();
                const parsed = routineSchema.safeParse(routineEditor.data);
                if (!parsed.success) {
                  setMessage(
                    "Revisa los nombres, series, repeticiones y descansos de la rutina.",
                  );
                  return;
                }
                if (await persist("routine", parsed.data, routineEditor.id))
                  setRoutineEditor(null);
              }}
            >
              <label>
                Nombre de la rutina
                <input
                  required
                  autoFocus
                  maxLength={100}
                  placeholder="Por ejemplo, torso A"
                  value={routineEditor.data.name}
                  onChange={(e) =>
                    setRoutineEditor({
                      ...routineEditor,
                      data: { ...routineEditor.data, name: e.target.value },
                    })
                  }
                />
              </label>
              <p className="gym-routine-help">
                Define tus objetivos. En cada sesión podrás ajustar las series,
                el peso y las repeticiones reales.
              </p>
              {routineEditor.data.exercises.map((e, i) => {
                const update = (field: string, value: any) =>
                  setRoutineEditor({
                    ...routineEditor,
                    data: {
                      ...routineEditor.data,
                      exercises: routineEditor.data.exercises.map((x, j) =>
                        j === i ? { ...x, [field]: value } : x,
                      ),
                    },
                  });
                return (
                  <div className="gym-routine-exercise" key={i}>
                    <div>
                      <span>Ejercicio {i + 1}</span>
                      <button
                        className="icon subtle"
                        type="button"
                        aria-label={"Eliminar ejercicio " + (i + 1)}
                        onClick={() =>
                          setRoutineEditor({
                            ...routineEditor,
                            data: {
                              ...routineEditor.data,
                              exercises: routineEditor.data.exercises.filter(
                                (_, j) => j !== i,
                              ),
                            },
                          })
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <input
                      required
                      aria-label={"Nombre del ejercicio " + (i + 1)}
                      list="gym-exercises"
                      maxLength={100}
                      placeholder="Escribe o elige un ejercicio"
                      value={e.name}
                      onChange={(ev) => update("name", ev.target.value)}
                    />
                    <div className="gym-routine-fields">
                      <label>
                        Series
                        <input
                          required
                          type="number"
                          min="1"
                          max="20"
                          step="1"
                          value={e.sets || ""}
                          onChange={(ev) =>
                            update("sets", Number(ev.target.value))
                          }
                        />
                      </label>
                      <label>
                        Reps objetivo
                        <input
                          required
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={e.reps || ""}
                          onChange={(ev) =>
                            update("reps", Number(ev.target.value))
                          }
                        />
                      </label>
                      <label>
                        Descanso (s)
                        <input
                          required
                          type="number"
                          min="0"
                          max="600"
                          step="1"
                          value={e.restSeconds}
                          onChange={(ev) =>
                            update("restSeconds", Number(ev.target.value))
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="gym-add-exercise"
                disabled={routineEditor.data.exercises.length >= 30}
                onClick={() =>
                  setRoutineEditor({
                    ...routineEditor,
                    data: {
                      ...routineEditor.data,
                      exercises: [
                        ...routineEditor.data.exercises,
                        { name: "", sets: 3, reps: 10, restSeconds: 90 },
                      ],
                    },
                  })
                }
              >
                <Plus size={16} />
                Añadir ejercicio
              </button>
              {message && (
                <p className="gym-form-message" role="status">
                  {message}
                </p>
              )}
              <div className="modal-actions">
                {routineEditor.id && (
                  <button
                    type="button"
                    className="icon delete"
                    aria-label="Eliminar rutina"
                    onClick={() => {
                      const r = records.find((r) => r.id === routineEditor.id);
                      if (r) {
                        setRoutineEditor(null);
                        setConfirm({ type: "delete", record: r });
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setRoutineEditor(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || loading}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Guardar rutina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gym-confirm-title"
          >
            <div className="modal-heading">
              <h2 id="gym-confirm-title">
                {confirm.type === "discard"
                  ? "¿Descartar esta sesión?"
                  : confirm.type === "exercise"
                    ? "¿Quitar este ejercicio?"
                    : "¿Eliminar este registro?"}
              </h2>
              <button
                className="icon"
                aria-label="Cerrar confirmación"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                <X size={19} />
              </button>
            </div>
            <p className="delete-confirm">
              {confirm.type === "discard"
                ? draft?.id
                  ? "Se descartarán las modificaciones. El entrenamiento guardado seguirá en el historial."
                  : "Se perderán las series de esta sesión que todavía no has guardado."
                : confirm.type === "exercise"
                  ? "Se quitarán el ejercicio y sus series de esta sesión."
                  : `Se eliminará «${confirm.record?.data.name}». ${confirm.record?.kind === "routine" ? "Los entrenamientos ya guardados se conservarán." : "Su progreso dejará de aparecer en los gráficos."}`}
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="primary danger"
                disabled={busy}
                onClick={() => {
                  if (confirm.type === "discard") {
                    setDraft(null);
                    setTimerEnd(null);
                    setSeconds(0);
                    setConfirm(null);
                  } else if (confirm.type === "exercise") {
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            exercises: d.exercises.filter(
                              (e) => e.id !== confirm.record?.id,
                            ),
                          }
                        : d,
                    );
                    setConfirm(null);
                  } else if (confirm.record) deleteRecord(confirm.record);
                }}
              >
                {busy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Trash2 size={15} />
                )}{" "}
                {confirm.type === "discard"
                  ? "Descartar"
                  : confirm.type === "exercise"
                    ? "Quitar"
                    : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function GymStat({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="stat">
      <div>
        <span>{title}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}
function EmptyGym({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <section className="panel gym-empty">
      <span className="gym-empty-icon">
        <Dumbbell size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="primary" onClick={onClick}>
        <Plus size={15} />
        {action}
      </button>
    </section>
  );
}
function RoutineCard({
  r,
  onStart,
  onEdit,
}: {
  r: GymRecord;
  onStart: () => void;
  onEdit: () => void;
}) {
  const d = r.data as Routine;
  return (
    <section className="panel gym-routine-card">
      <div className="gym-routine-top">
        <span className="gym-empty-icon">
          <Dumbbell size={21} />
        </span>
        <button
          className="icon"
          aria-label={"Editar rutina " + d.name}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
      </div>
      <h3>{d.name}</h3>
      <p>
        {d.exercises.length} ejercicios ·{" "}
        {d.exercises.reduce((s, e) => s + e.sets, 0)} series objetivo
      </p>
      <ul>
        {d.exercises.slice(0, 4).map((e, i) => (
          <li key={i}>
            <span>{e.name}</span>
            <small>
              {e.sets} × {e.reps}
            </small>
          </li>
        ))}
        {d.exercises.length > 4 && (
          <li className="gym-more">
            + {d.exercises.length - 4} ejercicios más
          </li>
        )}
      </ul>
      <button className="secondary" onClick={onStart}>
        <Play size={14} />
        Empezar rutina
        <ArrowRight size={14} />
      </button>
    </section>
  );
}
function ProgressChart({ points }: { points: ReturnType<typeof progression> }) {
  const max = Math.max(10, ...points.map((p) => p.weight)) * 1.1;
  const x = (i: number) =>
    points.length === 1 ? 350 : 65 + (i / (points.length - 1)) * 600;
  const y = (v: number) => 200 - (v / max) * 155;
  const coords = points.map((p, i) => `${x(i)},${y(p.weight)}`).join(" ");
  return (
    <div className="gym-chart">
      <svg
        role="img"
        aria-label="Evolución del máximo peso por sesión. Valores detallados en la tabla inferior."
        viewBox="0 0 710 250"
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <text x="47" y={y(max * t) + 3} textAnchor="end">
              {fmt(max * t)}
            </text>
            <line
              x1="65"
              x2="665"
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="#e6ecdf"
              strokeDasharray="4 4"
            />
          </g>
        ))}
        {points.length > 1 && (
          <>
            <polygon points={`65,200 ${coords} 665,200`} fill="#eaf1e3" />
            <polyline
              points={coords}
              fill="none"
              stroke="#678c53"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </>
        )}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={x(i)}
              cy={y(p.weight)}
              r="4"
              fill="#50793f"
              stroke="#fff"
              strokeWidth="2"
            >
              <title>
                {shortDate(p.date)}: {fmt(p.weight)} kg × {p.reps} reps
              </title>
            </circle>
            {(i === 0 || i === points.length - 1 || points.length <= 6) && (
              <text x={x(i)} y="229" textAnchor="middle">
                {shortDate(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {points.length === 1 && (
        <p>
          Tu primer punto de partida. La curva aparecerá con la siguiente
          sesión.
        </p>
      )}
    </div>
  );
}
