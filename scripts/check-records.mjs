import assert from "node:assert/strict";
const base = process.env.PULSO_TEST_URL || "http://127.0.0.1:5173";
const headers = {
  "Content-Type": "application/json",
  Origin: base,
};
async function call(method, body, id) {
  const r = await fetch(base + "/api/records" + (id ? "?id=" + id : ""), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
assert.equal((await fetch(base + "/api/records")).status, 401);
const login = await fetch(base + "/signin-with-chatgpt?return_to=/", {
  redirect: "manual",
});
assert.equal(login.status, 302);
headers.Cookie = login.headers.get("set-cookie").split(";")[0];
assert.equal(
  (
    await call("POST", {
      kind: "movement",
      data: {
        type: "expense",
        amount: -1,
        date: "2026-11-14",
        title: "Invalid",
        category: "Otros",
      },
    })
  ).status,
  400,
);
const m = {
  type: "expense",
  amount: 18.5,
  date: "2026-11-14",
  title: "QA disposable movement",
  category: "Comida",
};
const created = await call("POST", { kind: "movement", data: m });
assert.equal(created.status, 200);
assert.ok(created.data.id);
assert.equal(
  (await call("GET")).data.find((r) => r.id === created.data.id).data.amount,
  18.5,
);
assert.equal(
  (
    await call("POST", {
      id: created.data.id,
      kind: "movement",
      data: { ...m, amount: 20 },
    })
  ).status,
  200,
);
assert.equal(
  (await call("GET")).data.find((r) => r.id === created.data.id).data.amount,
  20,
);
const task = await call("POST", {
  kind: "task",
  data: {
    title: "QA disposable task",
    date: "",
    priority: "Media",
    done: false,
  },
});
assert.equal(task.status, 200);
assert.equal(
  (
    await call("POST", {
      id: task.data.id,
      kind: "task",
      data: {
        title: "QA disposable task",
        date: "",
        priority: "Media",
        done: true,
      },
    })
  ).status,
  200,
);
assert.equal(
  (await call("GET")).data.find((r) => r.id === task.data.id).data.done,
  true,
);
for (const id of [created.data.id, task.data.id])
  assert.equal((await call("DELETE", null, id)).status, 200);
assert.equal(
  (await call("GET")).data.some((r) =>
    [created.data.id, task.data.id].includes(r.id),
  ),
  false,
);
console.log(
  "PASS: auth, validation, persistence, edits, task completion and deletion. Test records removed.",
);
