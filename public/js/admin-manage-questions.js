/* =========================
   GET QUERY PARAMS
========================= */
const params = new URLSearchParams(window.location.search);
const quizId = params.get("quizId");
const qid = params.get("id");

if (!quizId || !qid) {
  alert("Invalid question link");
  window.location.href = "/views/admin-dashboard.html";
}

/* =========================
   ELEMENTS
========================= */
const questionInput = document.getElementById("question");
const typeSelect = document.getElementById("type");
const answersDiv = document.getElementById("answers");

/* =========================
   LOAD QUESTION
========================= */
let currentQuestion = null;

async function loadQuestion() {
  const res = await fetch(`/admin/questions?quizId=${quizId}`);
  const questions = await res.json();

  currentQuestion = questions.find(q => q.id == qid);
  if (!currentQuestion) {
    alert("Question not found");
    return;
  }

  // Fill fields
  questionInput.value = currentQuestion.question;
  typeSelect.value = currentQuestion.type;

  ["opt0", "opt1", "opt2", "opt3"].forEach((id, i) => {
    document.getElementById(id).value =
      currentQuestion.options[i] || "";
  });

  renderAnswers();
}

loadQuestion();

/* =========================
   RENDER ANSWERS
========================= */
function renderAnswers() {
  answersDiv.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    const checked =
      currentQuestion.answer.includes(i) ? "checked" : "";

    answersDiv.innerHTML += `
      <label class="option">
        <input type="${
          typeSelect.value === "single" ? "radio" : "checkbox"
        }"
        name="correct"
        value="${i}"
        ${checked}>
        Correct Option ${String.fromCharCode(65 + i)}
      </label>
    `;
  }
}

typeSelect.addEventListener("change", renderAnswers);

/* =========================
   UPDATE QUESTION
========================= */
async function updateQuestion() {
  const question = questionInput.value.trim();
  const type = typeSelect.value;

  const options = [
    opt0.value.trim(),
    opt1.value.trim(),
    opt2.value.trim(),
    opt3.value.trim()
  ];

  const selected = document.querySelectorAll(
    "input[name='correct']:checked"
  );
  const answer = Array.from(selected).map(i => Number(i.value));

  if (!question || options.some(o => !o) || !answer.length) {
    alert("Fill all fields and select correct answer(s)");
    return;
  }

  const formData = new FormData();
  formData.append("quizId", quizId);
  formData.append("id", qid);
  formData.append("type", type);
  formData.append("question", question);
  formData.append("options", JSON.stringify(options));
  formData.append("answer", JSON.stringify(answer));

  const image = document.getElementById("image").files[0];
  if (image) formData.append("image", image);

  const res = await fetch("/admin/update-question", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Failed to update question");
    return;
  }

  alert("✅ Question updated successfully");

  window.location.href =
    `/views/admin-manage-questions.html?quizId=${quizId}`;
}
