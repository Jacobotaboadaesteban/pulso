"use client";
import { useEffect, useState } from "react";
import {
  Home,
  Wallet,
  ChartNoAxesCombined,
  ListTodo,
  Link2,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  X,
  Trash2,
  Pencil,
  Download,
  ShieldCheck,
  Dumbbell,
  CalendarDays,
  Search,
  LoaderCircle,
  RefreshCw,
  CheckCheck,
  MoreHorizontal,
} from "lucide-react";
import Gym from "./gym";
import Life from "./life";
import { operations, basePrices } from "../lib/investments";
type Rec = { id: string; kind: string; data: any; createdAt: string };
const money = (v: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(v);
const num = (v: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 4 }).format(v);
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
const cats = [
  "Comida",
  "Supermercado",
  "Transporte",
  "Ocio",
  "Compras",
  "Hogar",
  "Salud",
  "Formación",
  "Suscripciones",
  "Nómina",
  "Otros",
];
const titles: Record<string, string> = {
  home: "Inicio",
  money: "Finanzas",
  invest: "Inversiones",
  tasks: "Tareas",
  gym: "Gimnasio",
  connect: "Conexiones",
};
export default function Dashboard() {
  const [page, setPage] = useState("home"),
    [records, setRecords] = useState<Rec[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<any>(null),
    [saving, setSaving] = useState(false),
    [month, setMonth] = useState(today().slice(0, 7)),
    [taskFilter, setTaskFilter] = useState("Pendientes"),
    [query, setQuery] = useState(""),
    [moveType, setMoveType] = useState("Todos"),
    [investTab, setInvestTab] = useState("Cartera");
  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/records");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setRecords(d);
      setError("");
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const sync = () => {
      const p = window.location.hash.slice(1);
      if (titles[p]) setPage(p);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!modal) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setModal(null);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [modal, saving]);
  async function save(kind: string, data: any, id?: string) {
    setSaving(true);
    try {
      const r = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, data, id }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setModal(null);
      setNotice("Guardado en tu espacio privado");
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(rec: Rec) {
    setSaving(true);
    try {
      const r = await fetch("/api/records?id=" + encodeURIComponent(rec.id), {
        method: "DELETE",
      });
      if (!r.ok) throw Error("No se pudo eliminar");
      await load();
      setModal(null);
      setNotice("Registro eliminado");
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setSaving(false);
    }
  }
  const movements = records
    .filter((r) => r.kind === "movement")
    .sort(
      (a, b) =>
        b.data.date.localeCompare(a.data.date) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  const tasks = records
    .filter((r) => r.kind === "task")
    .sort(
      (a, b) =>
        a.data.done - b.data.done ||
        (a.data.date || "9999").localeCompare(b.data.date || "9999"),
    );
  const monthly = movements.filter((r) => r.data.date.startsWith(month));
  const income = monthly
      .filter((r) => r.data.type === "income")
      .reduce((s, r) => s + r.data.amount, 0),
    expense = monthly
      .filter((r) => r.data.type === "expense")
      .reduce((s, r) => s + r.data.amount, 0);
  const prices = { ...basePrices };
  records
    .filter((r) => r.kind === "quote")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((r) => (prices[r.data.asset] = r.data.price));
  const assets = Object.keys(prices).map((asset) => {
    const buys = operations.filter(
        (o) => o.asset === asset && o.type === "buy",
      ),
      sells = operations.filter((o) => o.asset === asset && o.type === "sell");
    const cost = buys.reduce((s, o) => s + o.total, 0),
      proceeds = sells.reduce((s, o) => s + o.total, 0),
      quantity = Math.max(
        0,
        buys.reduce((s, o) => s + o.quantity, 0) -
          sells.reduce((s, o) => s + o.quantity, 0),
      );
    const value = quantity * prices[asset],
      result = value + proceeds - cost;
    return {
      asset,
      cost,
      proceeds,
      quantity,
      value,
      result,
      rate: (result / cost) * 100,
    };
  });
  const portfolio = assets.reduce((s, a) => s + a.value, 0),
    result = assets.reduce((s, a) => s + a.result, 0),
    cost = assets.reduce((s, a) => s + a.cost, 0),
    pending = tasks.filter((r) => !r.data.done),
    completed = tasks.filter((r) => r.data.done).length;
  const monthLabel = new Date(month + "-02T12:00:00").toLocaleDateString(
    "es-ES",
    { month: "long", year: "numeric" },
  );
  const newMove = (type = "expense") =>
    setModal({
      kind: "movement",
      data: {
        type,
        title: "",
        amount: "",
        category: type === "income" ? "Nómina" : "Comida",
        date: today(),
      },
    });
  const newTask = () =>
    setModal({
      kind: "task",
      data: { title: "", date: "", priority: "Media", done: false },
    });
  function changeMonth(n: number) {
    const d = new Date(month + "-02T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  function navigate(p: string) {
    setPage(p);
    setQuery("");
    window.location.hash = p;
  }
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            records,
            investmentOperations: operations,
            prices,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = "pulso-" + today() + ".json";
    a.click();
    URL.revokeObjectURL(u);
  };
  const taskRows = (list: Rec[], short = false) => (
    <div className="task-list">
      {list.length ? (
        list.slice(0, short ? 4 : 1000).map((r) => (
          <div className={"task-row " + (r.data.done ? "done" : "")} key={r.id}>
            <button
              className="checkbox"
              aria-label={
                r.data.done
                  ? "Reabrir " + r.data.title
                  : "Completar " + r.data.title
              }
              onClick={() =>
                save("task", { ...r.data, done: !r.data.done }, r.id)
              }
              disabled={saving}
            >
              {r.data.done && <Check size={13} />}
            </button>
            <div className="task-content">
              <b>{r.data.title}</b>
              <small
                className={
                  r.data.date && r.data.date < today() && !r.data.done
                    ? "overdue"
                    : ""
                }
              >
                {r.data.date ? (
                  <>
                    <CalendarDays size={12} />
                    {dateLabel(r.data.date)}
                    {r.data.date < today() && !r.data.done ? " · Vencida" : ""}
                  </>
                ) : (
                  "Sin fecha"
                )}
              </small>
            </div>
            <span className={"priority " + r.data.priority.toLowerCase()}>
              {r.data.priority}
            </span>
            <button
              className="icon subtle"
              aria-label="Editar tarea"
              onClick={() => setModal(r)}
            >
              <Pencil size={14} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty compact">
          <CheckCheck size={27} />
          <b>
            {taskFilter === "Completadas"
              ? "Todavía no hay tareas completadas"
              : "Un poco de espacio mental"}
          </b>
          <p>Añade una tarea y deja que Pulso la recuerde por ti.</p>
          <button className="text-button" onClick={newTask}>
            Crear una tarea <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
  const moveRows = (list: Rec[], short = false) => (
    <div>
      {list.length ? (
        list.slice(0, short ? 5 : 1000).map((r) => (
          <div className="movement" key={r.id}>
            <span className={"movement-icon " + r.data.type}>
              {r.data.type === "income" ? (
                <ArrowDownLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </span>
            <div className="movement-name">
              <b>{r.data.title}</b>
              <small>
                {r.data.category} · {dateLabel(r.data.date)}
              </small>
            </div>
            <strong className={r.data.type === "income" ? "positive" : ""}>
              {r.data.type === "income" ? "+" : "−"}
              {money(r.data.amount)}
            </strong>
            <button
              className="icon subtle"
              aria-label="Editar movimiento"
              onClick={() => setModal(r)}
            >
              <Pencil size={14} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty compact">
          <Wallet size={26} />
          <b>Tu mes empieza aquí</b>
          <p>Registra tu primer ingreso o gasto.</p>
          <button className="text-button" onClick={() => newMove()}>
            Añadir movimiento <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
  const monthlyChart = () => {
    const now = new Date(month + "-02T12:00:00");
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 5 + i);
      const k =
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const list = movements.filter((r) => r.data.date.startsWith(k));
      return {
        label: d
          .toLocaleDateString("es-ES", { month: "short" })
          .replace(".", ""),
        income: list
          .filter((r) => r.data.type === "income")
          .reduce((s, r) => s + r.data.amount, 0),
        expense: list
          .filter((r) => r.data.type === "expense")
          .reduce((s, r) => s + r.data.amount, 0),
      };
    });
    const max = Math.max(100, ...months.flatMap((m) => [m.income, m.expense]));
    return (
      <div className="cash-chart">
        <div className="chart-grid">
          {[1, 0.5, 0].map((t) => (
            <div key={t}>
              <span>{num(max * t)} €</span>
              <i />
            </div>
          ))}
        </div>
        <div className="bar-columns">
          {months.map((m, i) => (
            <div className="bar-month" key={i}>
              <div className="bars">
                <div
                  title={"Ingresos: " + money(m.income)}
                  className="bar income-bar"
                  style={{ height: (m.income / max) * 140 }}
                />
                <div
                  title={"Gastos: " + money(m.expense)}
                  className="bar expense-bar"
                  style={{ height: (m.expense / max) * 140 }}
                />
              </div>
              <small>{m.label}</small>
            </div>
          ))}
        </div>
        {!months.some((m) => m.income || m.expense) && (
          <div className="chart-no-data">
            <b>Todo empieza con un movimiento</b>
            <span>Aquí verás cómo evoluciona tu ahorro.</span>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="app-shell life-theme">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-symbol">
            p<span />
          </span>
          pulso<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span>J</span>
          <div>
            <b>Mi espacio</b>
            <small>Personal & privado</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <p className="nav-label">TU DÍA A DÍA</p>
        <nav>
          {[
            [Home, "home"],
            [Wallet, "money"],
            [ChartNoAxesCombined, "invest"],
            [Dumbbell, "gym"],
            [ListTodo, "tasks"],
          ].map(([Icon, p]: any) => (
            <button
              key={p}
              onClick={() => navigate(p)}
              className={page === p ? "active" : ""}
            >
              <Icon size={19} />
              {titles[p]}
              {p === "tasks" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="personal-note">
            <span className="small-spark">✳</span>
            <b>
              Pequeños pasos.
              <br />
              Una visión más clara.
            </b>
            <p>Un espacio para poner en orden lo que te importa.</p>
          </div>
          <button
            className={
              "connection-nav " + (page === "connect" ? "selected" : "")
            }
            onClick={() => navigate("connect")}
          >
            <Link2 size={18} />
            Conexiones
            <span className="amber-dot" />
          </button>
          <div className="profile">
            <span>AD</span>
            <div>
              <b>Alex Demo</b>
              <small>Tu panel personal</small>
            </div>
            <a
              href="/signout-with-chatgpt?return_to=%2F"
              title="Cerrar sesión"
              target="_top"
            >
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            Mi espacio <span>/</span>
            <b>{titles[page]}</b>
          </div>
          <div className="top-right">
            <span className="privacy">
              <ShieldCheck size={14} />
              Espacio personal
            </span>
            <span className="avatar">AD</span>
          </div>
        </header>
        <main className={page === "home" ? "dashboard-home" : ""}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "home"
                  ? new Date(today() + "T12:00:00").toLocaleDateString(
                      "es-ES",
                      { weekday: "long", day: "numeric", month: "long" },
                    )
                  : "TU ESPACIO PERSONAL"}
              </p>
              <h1>
                {page === "home" ? "Todo en su sitio, Alex." : titles[page]}
              </h1>
              <p>
                {page === "home"
                  ? "Una mirada a lo que tienes, lo que haces y lo que viene."
                  : page === "money"
                    ? "Tus números, con contexto. Un movimiento cada vez."
                    : page === "invest"
                      ? "Una perspectiva clara de tu cartera."
                      : page === "tasks"
                        ? "Menos cosas en la cabeza. Más cosas hechas."
                        : page === "gym"
                          ? "Tu esfuerzo, registrado. Tu progreso, con perspectiva."
                          : "Tus datos y las conexiones que les dan vida."}
              </p>
            </div>
            <div className="heading-actions">
              {(page === "home" || page === "money") && (
                <button className="primary" onClick={() => newMove()}>
                  <Plus size={17} />
                  Añadir movimiento
                </button>
              )}
              {page === "tasks" && (
                <button className="primary" onClick={newTask}>
                  <Plus size={17} />
                  Nueva tarea
                </button>
              )}
              {page === "invest" && (
                <button
                  className="secondary"
                  onClick={() => navigate("connect")}
                >
                  <Link2 size={16} />
                  Ver conexión
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={load}>Reintentar</button>
            </div>
          )}
          {loading && (
            <div className="loading">
              <LoaderCircle size={15} className="spin" />
              Cargando tu espacio…
            </div>
          )}
          {page === "money" && (
            <>
              <div className="section-toolbar">
                <span className="section-kicker">RESUMEN MENSUAL</span>
                <div className="month-picker">
                  <button
                    className="icon"
                    onClick={() => changeMonth(-1)}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>{monthLabel}</span>
                  <button
                    className="icon"
                    onClick={() => changeMonth(1)}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <div className="stat-grid">
                <Stat
                  title="Ingresos del mes"
                  value={money(income)}
                  note="Lo que ha entrado"
                  icon={<ArrowDownLeft size={18} />}
                  positive
                />
                <Stat
                  title="Gastos del mes"
                  value={money(expense)}
                  note={`${monthly.filter((r) => r.data.type === "expense").length} movimientos registrados`}
                  icon={<ArrowUpRight size={18} />}
                />
                <Stat
                  title="Balance del mes"
                  value={money(income - expense)}
                  note="Ingresos menos gastos"
                  icon={<Wallet size={18} />}
                  positive={income >= expense}
                />
                <Stat
                  title="Tasa de ahorro"
                  value={
                    income
                      ? num(((income - expense) / income) * 100) + " %"
                      : "—"
                  }
                  note={
                    income
                      ? "Balance / ingresos"
                      : "Añade ingresos para calcularla"
                  }
                  icon={<ChartNoAxesCombined size={18} />}
                />
              </div>
            </>
          )}
          {page === "home" && (
            <Life
              records={records}
              onRefresh={load}
              newMove={() => newMove()}
              newTask={newTask}
              navigate={navigate}
              portfolio={portfolio}
              result={result}
              loading={loading || !!error}
            />
          )}
          {page === "gym" && (
            <Gym
              records={records}
              onRefresh={load}
              loading={loading || !!error}
            />
          )}
          {page === "money" && (
            <>
              <div className="finance-grid">
                <section className="panel">
                  <PanelTitle
                    title="Ingresos y gastos"
                    subtitle="Últimos 6 meses"
                  >
                    <div className="legend">
                      <span>
                        <i className="green" />
                        Ingresos
                      </span>
                      <span>
                        <i className="pale" />
                        Gastos
                      </span>
                    </div>
                  </PanelTitle>
                  {monthlyChart()}
                </section>
                <section className="panel">
                  <PanelTitle
                    title="¿En qué se va tu dinero?"
                    subtitle={monthLabel}
                  />
                  <div className="categories">
                    {expense ? (
                      cats.map((c, i) => {
                        const amount = monthly
                          .filter(
                            (r) =>
                              r.data.type === "expense" &&
                              r.data.category === c,
                          )
                          .reduce((s, r) => s + r.data.amount, 0);
                        return amount > 0 ? (
                          <div key={c}>
                            <div>
                              <span>{c}</span>
                              <b>{money(amount)}</b>
                            </div>
                            <div className="progress">
                              <i
                                style={{
                                  width: (amount / expense) * 100 + "%",
                                  background: [
                                    "#477461",
                                    "#92a58d",
                                    "#bbad87",
                                    "#8c9baf",
                                  ][i % 4],
                                }}
                              />
                            </div>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="empty compact">
                        <ChartNoAxesCombined size={26} />
                        <b>Todo por descubrir</b>
                        <p>Tus gastos aparecerán agrupados por categoría.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              <section className="panel">
                <PanelTitle
                  title="Movimientos"
                  subtitle="Las inversiones se contabilizan por separado"
                >
                  <div className="filter-tools">
                    <select
                      aria-label="Tipo de movimiento"
                      value={moveType}
                      onChange={(e) => setMoveType(e.target.value)}
                    >
                      <option>Todos</option>
                      <option>Ingresos</option>
                      <option>Gastos</option>
                    </select>
                    <label className="search">
                      <Search size={15} />
                      <input
                        placeholder="Buscar concepto…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                </PanelTitle>
                {moveRows(
                  monthly.filter(
                    (r) =>
                      (moveType === "Todos" ||
                        r.data.type ===
                          (moveType === "Ingresos" ? "income" : "expense")) &&
                      (r.data.title + " " + r.data.category)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  ),
                )}
              </section>
            </>
          )}
          {page === "invest" && (
            <>
              <div className="source-notice">
                <span className="status-dot" />
                <span>
                  Cartera de ejemplo · {operations.length} operaciones · Precios
                  manuales
                </span>
                <button
                  className="text-button"
                  onClick={() => navigate("connect")}
                >
                  Conexión pendiente
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="stat-grid">
                <Stat
                  title="Valor de cartera"
                  value={money(portfolio)}
                  note="Posiciones abiertas"
                  icon={<Wallet size={18} />}
                />
                <Stat
                  title="Resultado total"
                  value={(result >= 0 ? "+" : "") + money(result)}
                  note="Ventas + valoración − compras"
                  positive={result >= 0}
                  icon={<ChartNoAxesCombined size={18} />}
                />
                <Stat
                  title="Resultado / compras"
                  value={num((result / cost) * 100) + " %"}
                  note="Acumulado · no anualizado"
                  positive
                  icon={<ArrowUpRight size={18} />}
                />
                <Stat
                  title="Comisiones"
                  value={money(operations.reduce((s, o) => s + o.fee, 0))}
                  note="Incluidas en el resultado"
                  icon={<ArrowUpRight size={18} />}
                />
              </div>
              <div className="tabs">
                {["Cartera", "Operaciones"].map((t) => (
                  <button
                    className={investTab === t ? "active" : ""}
                    onClick={() => setInvestTab(t)}
                    key={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {investTab === "Cartera" ? (
                <>
                  <section className="panel">
                    <PanelTitle
                      title="Tu cartera, activo a activo"
                      subtitle="Incluye posiciones abiertas y cerradas"
                    />
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Activo</th>
                            <th>Estado</th>
                            <th>Unidades</th>
                            <th>Precio de referencia</th>
                            <th>Valor actual</th>
                            <th>Resultado total</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {assets.map((a, i) => (
                            <tr key={a.asset}>
                              <td>
                                <div className="asset-name">
                                  <span className={"asset-logo a" + i}>
                                    {["V", "V", "L"][i]}
                                  </span>
                                  <div>
                                    <b>
                                      {a.asset === "VanEck"
                                        ? "VanEck Semiconductor"
                                        : a.asset === "Verallia"
                                          ? "Verallia SAS"
                                          : "Eli Lilly"}
                                    </b>
                                    <small>
                                      {i === 0
                                        ? "ETF · Semiconductores"
                                        : "Acciones"}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={
                                    "pill " + (a.quantity > 0 ? "open" : "")
                                  }
                                >
                                  {a.quantity > 0 ? "Abierta" : "Cerrada"}
                                </span>
                              </td>
                              <td>{num(a.quantity)}</td>
                              <td>{money(prices[a.asset])}</td>
                              <td>
                                <b>{money(a.value)}</b>
                              </td>
                              <td
                                className={
                                  a.result >= 0 ? "positive" : "negative"
                                }
                              >
                                <b>
                                  {a.result >= 0 ? "+" : ""}
                                  {money(a.result)}
                                </b>
                                <small>
                                  {a.rate >= 0 ? "+" : ""}
                                  {num(a.rate)} %
                                </small>
                              </td>
                              <td>
                                <button
                                  className="icon"
                                  aria-label={"Actualizar precio " + a.asset}
                                  onClick={() =>
                                    setModal({
                                      kind: "quote",
                                      data: {
                                        asset: a.asset,
                                        price: prices[a.asset],
                                      },
                                    })
                                  }
                                >
                                  <Pencil size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="panel-foot">
                      <span>
                        Precios manuales, sin cotizaciones en directo. Datos de
                        ejemplo; precios ilustrativos.
                      </span>
                    </div>
                  </section>
                  <div className="finance-grid investment-details">
                    <section className="panel">
                      <PanelTitle
                        title="Dónde está invertido"
                        subtitle="Distribución de las posiciones abiertas"
                      />
                      <div className="allocation">
                        <div className="donut">
                          <div>
                            <b>1</b>
                            <small>posición abierta</small>
                          </div>
                        </div>
                        <div>
                          <p>
                            <i className="legend-dot" />
                            Verallia SAS <b>100 %</b>
                          </p>
                          <span>{money(portfolio)} en posiciones abiertas</span>
                        </div>
                      </div>
                    </section>
                    <section className="panel method">
                      <span className="section-kicker">
                        CÓMO LEER TUS NÚMEROS
                      </span>
                      <h3>La misma lógica que tu Excel.</h3>
                      <p>
                        El resultado total suma los ingresos por ventas y el
                        valor de las acciones restantes, y resta el coste de las
                        compras. Las comisiones ya están incluidas.
                      </p>
                      <p>
                        La valoración depende de los precios de referencia. No
                        incluye efectivo del bróker, dividendos ni impuestos no
                        registrados.
                      </p>
                    </section>
                  </div>
                </>
              ) : (
                <section className="panel">
                  <PanelTitle
                    title="Historial de operaciones"
                    subtitle="Datos ficticios de demostración · importes en euros"
                  />
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Activo</th>
                          <th>Operación</th>
                          <th>Unidades</th>
                          <th>Precio</th>
                          <th>Comisión</th>
                          <th>Total neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...operations].reverse().map((o) => (
                          <tr key={o.id}>
                            <td>
                              {dateLabel(o.date)} {o.date.slice(0, 4)}
                            </td>
                            <td>
                              <b>{o.asset}</b>
                            </td>
                            <td>
                              <span
                                className={
                                  "pill " + (o.type === "buy" ? "open" : "")
                                }
                              >
                                {o.type === "buy" ? "Compra" : "Venta"}
                              </span>
                            </td>
                            <td>{num(o.quantity)}</td>
                            <td>{money(o.price)}</td>
                            <td>{money(o.fee)}</td>
                            <td>
                              <b>{money(o.total)}</b>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
          {page === "tasks" && (
            <>
              <div className="task-summary">
                <div>
                  <span className="summary-icon">
                    <ListTodo size={25} />
                  </span>
                  <div>
                    <b>{pending.length}</b>
                    <span>pendientes</span>
                  </div>
                </div>
                <div>
                  <span className="summary-icon light">
                    <CheckCheck size={25} />
                  </span>
                  <div>
                    <b>{completed}</b>
                    <span>completadas</span>
                  </div>
                </div>
                <div className="task-summary-note">
                  Haz sitio para lo importante.
                </div>
              </div>
              <section className="panel">
                <PanelTitle
                  title="Mi lista"
                  subtitle="Organiza tu día a tu manera"
                >
                  <button className="text-button" onClick={newTask}>
                    <Plus size={16} />
                    Añadir tarea
                  </button>
                </PanelTitle>
                <div className="task-toolbar">
                  <div className="tabs">
                    {["Pendientes", "Hoy", "Completadas", "Todas"].map((t) => (
                      <button
                        className={taskFilter === t ? "active" : ""}
                        onClick={() => setTaskFilter(t)}
                        key={t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={15} />
                    <input
                      placeholder="Buscar tarea…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                {taskRows(
                  tasks.filter(
                    (r) =>
                      (taskFilter === "Todas" ||
                        (taskFilter === "Completadas" && r.data.done) ||
                        (taskFilter === "Pendientes" && !r.data.done) ||
                        (taskFilter === "Hoy" &&
                          !r.data.done &&
                          r.data.date === today())) &&
                      r.data.title.toLowerCase().includes(query.toLowerCase()),
                  ),
                )}
              </section>
            </>
          )}
          {page === "connect" && (
            <>
              <section className="panel connection-card">
                <div className="connection-heading">
                  <span className="excel-logo">X</span>
                  <div>
                    <h2>Tu Excel de inversiones</h2>
                    <p>Tu forma de trabajar, con una nueva perspectiva.</p>
                  </div>
                  <span className="pill amber">Conexión pendiente</span>
                </div>
                <div className="connection-stats">
                  <div>
                    <small>ARCHIVO DE ORIGEN</small>
                    <b>inversiones.xlsx</b>
                  </div>
                  <div>
                    <small>DATOS IMPORTADOS</small>
                    <b>5 operaciones ficticias · 3 activos</b>
                  </div>
                  <div>
                    <small>TIPO DE ACTUALIZACIÓN</small>
                    <b>Datos ficticios de ejemplo</b>
                  </div>
                </div>
                <div className="connection-body">
                  <h3>El siguiente paso: guardar el archivo en la nube.</h3>
                  <p>
                    La demo utiliza operaciones ficticias con la estructura del
                    Excel original. Para reflejar nuevas compras o ventas
                    automáticamente, falta mover el archivo a una carpeta
                    sincronizada y autorizar la conexión con ese servicio.
                  </p>
                  <div className="steps">
                    <div>
                      <span>1</span>
                      <div>
                        <b>Elige dónde guardarlo</b>
                        <p>
                          OneDrive o un servicio compatible. Podrás seguir
                          editándolo con Excel en tu ordenador.
                        </p>
                      </div>
                    </div>
                    <div>
                      <span>2</span>
                      <div>
                        <b>Conecta tu cuenta</b>
                        <p>
                          Configuraremos acceso privado al archivo concreto,
                          según el servicio elegido.
                        </p>
                      </div>
                    </div>
                    <div>
                      <span>3</span>
                      <div>
                        <b>Consulta desde cualquier dispositivo</b>
                        <p>
                          La web mostrará los últimos datos sincronizados y su
                          fecha de actualización.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="info-box">
                    Hasta completar la conexión, los cambios en tu archivo local
                    no aparecerán aquí. Los precios de referencia sí se pueden
                    actualizar desde Inversiones.
                  </div>
                </div>
              </section>
              <div className="finance-grid investment-details">
                <section className="panel method">
                  <ShieldCheck size={25} />
                  <h3>Un espacio solo para ti</h3>
                  <p>
                    El acceso está restringido a tu cuenta. Los movimientos,
                    tareas y precios que guardes se conservan en tu espacio
                    privado y se pueden consultar desde otros dispositivos.
                  </p>
                </section>
                <section className="panel method">
                  <Download size={25} />
                  <h3>Tus datos también son tuyos</h3>
                  <p>
                    Descarga una copia en JSON de tus movimientos, tareas y
                    operaciones importadas para conservarla.
                  </p>
                  <button
                    className="secondary"
                    onClick={download}
                    disabled={loading || !!error}
                  >
                    <Download size={16} />
                    Exportar mis datos
                  </button>
                </section>
              </div>
            </>
          )}
          <footer>
            <span className="footer-brand">pulso.</span>
            <span>Un poco más de claridad, cada día.</span>
            <span className="footer-private">
              <ShieldCheck size={12} />
              Espacio privado
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {[
          [Home, "home"],
          [Wallet, "money"],
          [ChartNoAxesCombined, "invest"],
          [Dumbbell, "gym"],
          [ListTodo, "tasks"],
          [Link2, "connect"],
        ].map(([Icon, p]: any) => (
          <button
            key={p}
            className={page === p ? "active" : ""}
            onClick={() => navigate(p)}
          >
            <Icon size={20} />
            <span>{titles[p]}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setModal(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">TU ESPACIO PERSONAL</p>
                <h2 id="modal-title">
                  {modal.kind === "movement"
                    ? modal.id
                      ? "Editar movimiento"
                      : "Un nuevo movimiento"
                    : modal.kind === "task"
                      ? modal.id
                        ? "Editar tarea"
                        : "Sácalo de tu cabeza"
                      : "Actualizar precio"}
                </h2>
              </div>
              <button
                className="icon"
                aria-label="Cerrar"
                disabled={saving}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.confirmDelete) {
                  remove(modal);
                  return;
                }
                const f = new FormData(e.currentTarget);
                const data =
                  modal.kind === "movement"
                    ? {
                        type: f.get("type"),
                        title: String(f.get("title")).trim(),
                        amount: Number(f.get("amount")),
                        category: f.get("category"),
                        date: f.get("date"),
                      }
                    : modal.kind === "task"
                      ? {
                          title: String(f.get("title")).trim(),
                          date: f.get("date"),
                          priority: f.get("priority"),
                          focusGoal: f.get("focusGoal"),
                          done: modal.data.done,
                        }
                      : {
                          asset: modal.data.asset,
                          price: Number(f.get("price")),
                          updatedAt: today(),
                        };
                save(modal.kind, data, modal.id);
              }}
            >
              {modal.confirmDelete ? (
                <p className="delete-confirm">
                  ¿Eliminar «{modal.data.title}»? Esta acción no se puede
                  deshacer.
                </p>
              ) : modal.kind === "movement" ? (
                <>
                  <div className="type-choices">
                    {[
                      ["expense", "Gasto"],
                      ["income", "Ingreso"],
                    ].map(([v, t]) => (
                      <label
                        className={modal.data.type === v ? "selected" : ""}
                        key={v}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={v}
                          checked={modal.data.type === v}
                          onChange={() =>
                            setModal({
                              ...modal,
                              data: { ...modal.data, type: v },
                            })
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  <label>
                    Importe (€)
                    <input
                      autoFocus
                      required
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      placeholder="0,00"
                      defaultValue={modal.data.amount}
                      className="amount-input"
                    />
                  </label>
                  <label>
                    Concepto
                    <input
                      required
                      name="title"
                      maxLength={200}
                      placeholder="Por ejemplo, comida con amigos"
                      defaultValue={modal.data.title}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Categoría
                      <select
                        name="category"
                        defaultValue={modal.data.category}
                      >
                        {cats.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Fecha
                      <input
                        type="date"
                        required
                        name="date"
                        defaultValue={modal.data.date}
                      />
                    </label>
                  </div>
                </>
              ) : modal.kind === "task" ? (
                <>
                  <label>
                    ¿Qué tienes pendiente?
                    <input
                      autoFocus
                      required
                      name="title"
                      maxLength={200}
                      placeholder="Por ejemplo, preparar la entrega del TFG"
                      defaultValue={modal.data.title}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Fecha <small>(opcional)</small>
                      <input
                        name="date"
                        type="date"
                        defaultValue={modal.data.date}
                      />
                    </label>
                    <label>
                      Prioridad
                      <select
                        name="priority"
                        defaultValue={modal.data.priority}
                      >
                        {["Baja", "Media", "Alta"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Foco semanal
                    <select
                      name="focusGoal"
                      defaultValue={modal.data.focusGoal || "auto"}
                    >
                      <option value="auto">Según el título</option>
                      <option value="tfg">TFG</option>
                      <option value="work">Trabajo</option>
                      <option value="none">Sin objetivo</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <p className="form-help">
                    Precio de referencia de <b>{modal.data.asset}</b>. Se usará
                    para valorar las unidades restantes. No modifica tu Excel.
                  </p>
                  <label>
                    Precio por unidad (€)
                    <input
                      autoFocus
                      name="price"
                      required
                      type="number"
                      inputMode="decimal"
                      min="0.0001"
                      step="0.0001"
                      defaultValue={modal.data.price}
                    />
                  </label>
                </>
              )}
              <div className="modal-actions">
                {modal.id && !modal.confirmDelete && (
                  <button
                    type="button"
                    className="icon delete"
                    aria-label="Eliminar registro"
                    onClick={() => setModal({ ...modal, confirmDelete: true })}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  className="secondary"
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    modal.confirmDelete
                      ? setModal({ ...modal, confirmDelete: false })
                      : setModal(null)
                  }
                >
                  Cancelar
                </button>
                <button
                  className={"primary " + (modal.confirmDelete ? "danger" : "")}
                  disabled={saving}
                  type="submit"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : modal.confirmDelete ? (
                    <Trash2 size={16} />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  {modal.confirmDelete
                    ? "Eliminar"
                    : saving
                      ? "Guardando…"
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
function Stat({
  title,
  value,
  note,
  icon,
  positive = false,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <section className="stat">
      <div>
        <span>{title}</span>
        <i>{icon}</i>
      </div>
      <strong className={positive ? "positive" : ""}>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
function PanelTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
