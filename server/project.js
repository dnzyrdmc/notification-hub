export default function ({
  db,
  router,
  run,
  get,
  all,
  tx,
  id,
  now,
  text,
  choice,
  required,
  fail,
  publish,
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),name TEXT,body TEXT);
 CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),template TEXT REFERENCES templates(id),channel TEXT,recipient TEXT,body TEXT,status TEXT,attempt INTEGER DEFAULT 0,next_at INTEGER,last_error TEXT,dedupe TEXT,UNIQUE(owner,dedupe));`);
  function work() {
    const jobs = all(
      "SELECT * FROM notifications WHERE status='queued' AND next_at<=? LIMIT 10",
      Date.now(),
    );
    for (const j of jobs) {
      const attempt = j.attempt + 1;
      const failDemo = j.recipient === "fail-demo";
      const transient = j.recipient === "retry-demo" && attempt < 3;
      const status =
        failDemo || transient
          ? attempt >= 3
            ? "failed"
            : "queued"
          : "delivered";
      run(
        "UPDATE notifications SET status=?,attempt=?,next_at=?,last_error=? WHERE id=?",
        status,
        attempt,
        Date.now() + 1000 * 2 ** attempt,
        failDemo || transient ? "Simüle sağlayıcı hatası" : "",
        j.id,
      );
      publish("notification", { id: j.id, status }, j.owner);
    }
  }
  const timer = setInterval(work, 1000);
  timer.unref();
  router.get("/templates", (req, res) =>
    res.json(all("SELECT * FROM templates WHERE owner=?", req.user.id)),
  );
  router.post("/templates", (req, res) => {
    const tid = id();
    run(
      "INSERT INTO templates VALUES(?,?,?,?)",
      tid,
      req.user.id,
      text(req.body.name),
      text(req.body.body, 2000),
    );
    res.status(201).json({ id: tid });
  });
  router.get("/notifications", (req, res) =>
    res.json(
      all(
        "SELECT * FROM notifications WHERE owner=? ORDER BY rowid DESC LIMIT 100",
        req.user.id,
      ),
    ),
  );
  router.post("/notifications", (req, res) => {
    const template = required(
      get(
        "SELECT * FROM templates WHERE id=? AND owner=?",
        req.body.templateId,
        req.user.id,
      ),
    );
    const dedupe = text(req.body.dedupe),
      existing = get(
        "SELECT id FROM notifications WHERE owner=? AND dedupe=?",
        req.user.id,
        dedupe,
      );
    if (existing) return res.json({ id: existing.id, duplicate: true });
    const vars = req.body.variables || {};
    const body = template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (typeof vars[key] !== "string") fail(422, "Eksik değişken: " + key);
      return text(vars[key], 200);
    });
    const nid = id();
    run(
      "INSERT INTO notifications(id,owner,template,channel,recipient,body,status,next_at,last_error,dedupe) VALUES(?,?,?,?,?,?,?,?,?,?)",
      nid,
      req.user.id,
      template.id,
      choice(req.body.channel, ["email-demo", "sms-demo", "in-app"]),
      text(req.body.recipient),
      body,
      "queued",
      Date.now(),
      "",
      dedupe,
    );
    res.status(202).json({ id: nid });
  });
  router.post("/notifications/:id/retry", (req, res) => {
    const n = required(
      get(
        "SELECT * FROM notifications WHERE id=? AND owner=?",
        req.params.id,
        req.user.id,
      ),
    );
    if (n.status !== "failed")
      fail(409, "Yalnız başarısız işler yeniden başlatılabilir");
    run(
      "UPDATE notifications SET status='queued',attempt=0,next_at=? WHERE id=?",
      Date.now(),
      n.id,
    );
    res.json({ ok: true });
  });
}
