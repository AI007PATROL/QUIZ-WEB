/* =========================
   GET CURRENT QUIZ
========================= */
async function getCurrentQuiz() {
  const res = await fetch("/api/quiz-status");
  const status = await res.json();

  if (!status.currentQuiz) {
    alert("No active quiz");
    window.location.href = "/";
    return null;
  }

  return status.currentQuiz;
}

/* =========================
   LOAD LEADERBOARD
========================= */
async function loadLeaderboard() {
  const quizId = await getCurrentQuiz();
  if (!quizId) return;

  const res = await fetch(`/results?quizId=${quizId}`);
  const data = await res.json();

  const board = document.getElementById("board");
  board.innerHTML = "";

  if (!data.length) {
    board.innerHTML = "<p>No submissions yet.</p>";
    return;
  }

  // Sort: score ↓ , time ↑
  data.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time - b.time;
  });

  data.forEach((r, i) => {
    board.innerHTML += `
      <div class="leader">
        <div>
          <strong>#${i + 1} ${r.nickname}</strong><br>
          <small>
            Correct: ${r.correct}/${r.total} |
            Accuracy: ${r.accuracy}% |
            Time: ${r.time}s
          </small>
        </div>
        <strong>${r.score}</strong>
      </div>
    `;
  });
}

/* =========================
   AUTO REFRESH
========================= */
loadLeaderboard();
setInterval(loadLeaderboard, 3000); // refresh every 3 sec
