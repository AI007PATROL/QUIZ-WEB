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
   INIT FILES / FOLDERS
========================= */
ensure("./data/users.json", []);
ensure("./data/quizzes.json", []);
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
    "quiz.html",
    "leaderboard.html",
    "set-nickname.html",
    "user-dashboard.html",
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
   USERS
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
  res.json({ message: "Nickname updated" });
});

app.post("/admin/update-password", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON("./data/users.json", []);

  const u = users.find(x => x.username === username);
  if (!u) return res.status(404).json({ message: "User not found" });

  u.password = password;
  writeJSON("./data/users.json", users);
  res.json({ message: "Password updated" });
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

  quizzes.forEach(q => (q.active = q.id === quizId));
  writeJSON("./data/quizzes.json", quizzes);

  writeJSON("./data/quiz-status.json", {
    currentQuiz: quizId,
    active: true,
    started: false,
    title: quizzes.find(q => q.id === quizId)?.title || "",
    joined: []
  });

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

  if (status.started)
    return res.status(403).json({ message: "Quiz already started" });

  if (!status.joined.some(u => u.username === username)) {
    status.joined.push({ username, nickname });
    writeJSON("./data/quiz-status.json", status);
  }

  res.json({ message: "Joined" });
});

app.post("/admin/start-quiz", (_, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  status.started = true;
  writeJSON("./data/quiz-status.json", status);
  res.json({ message: "Quiz started" });
});

app.post("/admin/reset-quiz", (_, res) => {
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
  res.json(
    readJSON(`./data/questions/${status.currentQuiz}.json`, [])
  );
});

app.get("/admin/questions", (req, res) => {
  const quizId = req.query.quizId ||
    readJSON("./data/quiz-status.json", {}).currentQuiz;

  res.json(readJSON(`./data/questions/${quizId}.json`, []));
});

app.post("/admin/add-question", upload.single("image"), (req, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  const questions = readJSON(
    `./data/questions/${status.currentQuiz}.json`,
    []
  );

  questions.push({
    id: questions.length + 1,
    type: req.body.type,
    question: req.body.question,
    options: JSON.parse(req.body.options || "[]"),
    answer: JSON.parse(req.body.answer || "[]"),
    image: req.file ? `/uploads/${req.file.filename}` : ""
  });

  writeJSON(
    `./data/questions/${status.currentQuiz}.json`,
    questions
  );

  res.json({ message: "Question added" });
});

app.post("/admin/update-question", upload.single("image"), (req, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  const questions = readJSON(
    `./data/questions/${status.currentQuiz}.json`,
    []
  );

  const q = questions.find(x => x.id == req.body.id);
  if (!q) return res.status(404).json({ message: "Not found" });

  q.type = req.body.type;
  q.question = req.body.question;
  q.options = JSON.parse(req.body.options || "[]");
  q.answer = JSON.parse(req.body.answer || "[]");
  if (req.file) q.image = `/uploads/${req.file.filename}`;

  writeJSON(
    `./data/questions/${status.currentQuiz}.json`,
    questions
  );

  res.json({ message: "Updated" });
});

app.delete("/admin/delete-question/:id", (req, res) => {
  const status = readJSON("./data/quiz-status.json", {});
  let questions = readJSON(
    `./data/questions/${status.currentQuiz}.json`,
    []
  );

  questions = questions.filter(q => q.id != req.params.id);
  questions.forEach((q, i) => (q.id = i + 1));

  writeJSON(
    `./data/questions/${status.currentQuiz}.json`,
    questions
  );

  res.json({ message: "Deleted" });
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

  const resultsPath = `./data/results/${status.currentQuiz}.json`;
  const results = readJSON(resultsPath, []);

  results.push({
    username,
    nickname,
    correct,
    total,
    accuracy,
    time: timeTaken,
    score
  });

  writeJSON(resultsPath, results);
  res.json({ score });
});

app.get("/results/:quizId", (req, res) =>
  res.json(
    readJSON(`./data/results/${req.params.quizId}.json`, [])
  )
);

/* =========================
   START
========================= */
app.listen(PORT, () =>
  console.log("Server running on port " + PORT)
);
