const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

/* =========================
   HELPERS
========================= */
function readJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensure(file, data) {
  if (!fs.existsSync(file)) writeJSON(file, data);
}

/* =========================
   INIT FILES & FOLDERS
========================= */
ensure("./data/users.json", []);
ensure("./data/quizzes.json", []);
ensure("./data/audit-log.json", []);
ensure("./data/quiz-status.json", {
  currentQuiz: null,
  active: false,
  started: false,
  title: "",
  joined: []
});

if (!fs.existsSync("./data/questions")) fs.mkdirSync("./data/questions");
if (!fs.existsSync("./data/results")) fs.mkdirSync("./data/results");

/* =========================
   AUDIT LOGGER
========================= */
function logAudit(action, actor, details = {}) {
  const status = readJSON("./data/quiz-status.json", {});
  const logs = readJSON("./data/audit-log.json", []);

  logs.push({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    quizId: status.currentQuiz,
    quizTitle: status.title,
    actor,
    action,
    details
  });

  writeJSON("./data/audit-log.json", logs);
}

/* =========================
   APP SETUP
========================= */
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

/* =========================
   MULTER (IMAGES)
========================= */
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

/* =========================
   HOME
========================= */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "views/login.html"))
);

/* =========================
   AUTH
========================= */
app.post("/api/login", (req, res) => {
  const { username, password, role } = req.body;
  const users = readJSON("./data/users.json", []);

  const user = users.find(
    u => u.username === username && u.role === role
  );

  if (!user || user.password !== password)
    return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    username: user.username,
    role: user.role,
    nickname: user.nickname || ""
  });
});

/* =========================
   SAFE VIEW ROUTER
========================= */
app.get("/views/:page", (req, res) => {
  const allowed = [
    "login.html",
    "user-dashboard.html",
    "quiz.html",
    "leaderboard.html",
    "set-nickname.html",
    "admin-dashboard.html",
    "admin-add-question.html",
    "admin-edit-question.html",
    "admin-manage-questions.html",
    "admin-analytics.html",
    "admin-users.html"
  ];

  if (!allowed.includes(req.params.page))
    return res.status(403).send("Access denied");

  res.sendFile(path.join(__dirname, "views", req.params.page));
});

/* =========================
   USERS (ADMIN)
========================= */
app.get("/admin/users", (_, res) =>
  res.json(readJSON("./data/users.json", []))
);

app.post("/admin/update-nickname", (req, res) => {
  const { username, nickname } = req.body;
  const users = readJSON("./data/users.json", []);

  const u = users.find(x => x.username === username);
  if (!u) return res.status(404).json({ message: "User not found" });

  u.nickname = nickname;
  writeJSON("./data/users.json", users);

  logAudit("ADMIN_EDIT_USER", { type: "admin" }, { username });
  res.json({ message: "Nickname updated" });
});

/* =========================
   QUIZZES
========================= */
app.get("/api/quizzes", (_, res) =>
  res.json(readJSON("./data/quizzes.json", []))
);

app.post("/admin/create-quiz", (req, res) => {
  const { title } = req.body;
  const quizzes = readJSON("./data/quizzes.json", []);

  const id = "quiz-" + Date.now();
  quizzes.push({ id, title, active: false });

  writeJSON("./data/quizzes.json", quizzes);
  writeJSON(`./data/questions/${id}.json`, []);
  writeJSON(`./data/results/${id}.json`, []);

  res.json({ message: "Quiz created", id });
});

app.post("/admin/activate-quiz", (req, res) => {
  const { quizId } = req.body;
  const quizzes = readJSON("./data/quizzes.json", []);

  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  quizzes.forEach(q => (q.active = q.id === quizId));
  writeJSON("./data/quizzes.json", quizzes);

  writeJSON("./data/quiz-status.json", {
    currentQuiz: quizId,
    active: true,
    started: false,
    title: quiz.title,
    joined: []
  });

  logAudit("QUIZ_ACTIVATED", { type: "admin" }, quiz.title);
  res.json({ message: "Quiz activated" });
});

/* =========================
   QUIZ STATUS
========================= */
app.get("/api/quiz-status", (_, res) =>
  res.json(readJSON("./data/quiz-status.json", {}))
);

app.post("/api/join-quiz", (req, res) => {
  const { username, nickname } = req.body;
  const status = readJSON("./data/quiz-status.json", {});

  if (!status.active)
    return res.status(403).json({ message: "No active quiz" });

  if (status.started)
    return res.status(403).json({ message: "Quiz already started" });

  if (!status.joined.some(u => u.username === username)) {
    status.joined.push({ username, nickname });
    writeJSON("./data/quiz-status.json", status);

    logAudit("USER_JOINED", { type: "user", username, nickname });
  }

  res.json({ message: "Joined quiz" });
});

app.post("/admin/start-quiz", (_, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  status.started = true;
  writeJSON("./data/quiz-status.json", status);

  logAudit("QUIZ_STARTED", { type: "admin" });
  res.json({ message: "Quiz started" });
});

app.post("/admin/reset-quiz", (_, res) => {
  logAudit("QUIZ_RESET", { type: "admin" });

  writeJSON("./data/quiz-status.json", {
    currentQuiz: null,
    active: false,
    started: false,
    title: "",
    joined: []
  });

  res.json({ message: "Quiz reset" });
});

/* =========================
   QUESTIONS
========================= */
app.get("/api/questions", (_, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  if (!status.started) {
    return res.status(403).json({ message: "Quiz not started" });
  }
  res.json(readJSON(`./data/questions/${status.currentQuiz}.json`, []));
});

app.post("/admin/add-question", upload.single("image"), (req, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  if (!status.currentQuiz)
    return res.status(400).json({ message: "No active quiz" });

  const questionsFile = `./data/questions/${status.currentQuiz}.json`;
  const questions = readJSON(questionsFile, []);

  questions.push({
    id: questions.length + 1,
    question: req.body.question,
    type: req.body.type,
    options: JSON.parse(req.body.options),
    answer: JSON.parse(req.body.answer),
    image: req.file ? `/uploads/${req.file.filename}` : ""
  });

  writeJSON(questionsFile, questions);
  res.json({ message: "Question saved successfully" });
});

/* =========================
   SUBMIT & RESULTS
========================= */
app.post("/api/submit", (req, res) => {
  const { username, nickname, answers, timeTaken } = req.body;
  const status = readJSON("./data/quiz-status.json", {});
  const questions = readJSON(
    `./data/questions/${status.currentQuiz}.json`,
    []
  );

  let correct = 0;
  questions.forEach(q => {
    if (
      JSON.stringify((answers[q.id] || []).sort()) ===
      JSON.stringify(q.answer.sort())
    ) correct++;
  });

  const total = questions.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const score =
    correct * 10 +
    Math.round((accuracy / 100) * 20) +
    Math.max(0, Math.round(((300 - timeTaken) / 300) * 20));

  const resultsFile = `./data/results/${status.currentQuiz}.json`;
  const results = readJSON(resultsFile, []);

  results.push({
    username,
    nickname,
    correct,
    total,
    accuracy,
    time: timeTaken,
    score
  });

  writeJSON(resultsFile, results);

  logAudit("QUIZ_SUBMITTED", { type: "user", username, nickname }, {
    correct,
    total,
    accuracy,
    timeTaken,
    score
  });

  res.json({ score });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () =>
  console.log("Server running on port " + PORT)
);
