/* =========================
   LOAD QUIZZES
========================= */
const quizSelect = document.getElementById("quizSelect");
const typeSelect = document.getElementById("type");
const answersDiv = document.getElementById("answers");

async function loadQuizzes() {
  const res = await fetch("/api/quizzes");
  const quizzes = await res.json();

  if (!quizzes.length) {
    alert("No quizzes found. Create a quiz first.");
    return;
  }

  quizzes.forEach(q => {
    const opt = document.createElement("option");
    opt.value = q.id;
    opt.textContent = q.title;
    quizSelect.appendChild(opt);
  });
}

loadQuizzes();

/* =========================
   ANSWER SELECT UI
========================= */
function renderAnswers() {
  answersDiv.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    answersDiv.innerHTML += `
      <label class="option">
        <input type="${
          typeSelect.value === "single" ? "radio" : "checkbox"
        }" name="correct" value="${i}">
        Correct Option ${String.fromCharCode(65 + i)}
      </label>
    `;
  }
}

typeSelect.addEventListener("change", renderAnswers);
renderAnswers();

/* =========================
   ADD QUESTION
========================= */
async function addQuestion() {
  const quizId = quizSelect.value;
  const question = document.getElementById("question").value.trim();
  const type = typeSelect.value;

  const options = [
    document.getElementById("opt0").value.trim(),
    document.getElementById("opt1").value.trim(),
    document.getElementById("opt2").value.trim(),
    document.getElementById("opt3").value.trim()
  ];

  const correctInputs = document.querySelectorAll(
    "input[name='correct']:checked"
  );
  const answer = Array.from(correctInputs).map(i => Number(i.value));

  if (!quizId || !question || options.some(o => !o) || !answer.length) {
    alert("Please fill all fields and select correct answer(s)");
    return;
  }

  const formData = new FormData();
  formData.append("quizId", quizId);
  formData.append("type", type);
  formData.append("question", question);
  formData.append("options", JSON.stringify(options));
  formData.append("answer", JSON.stringify(answer));

  const image = document.getElementById("image").files[0];
  if (image) formData.append("image", image);

  const res = await fetch("/admin/add-question", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Failed to add question");
    return;
  }

  alert("✅ Question added successfully");

  // Reset form
  document.getElementById("question").value = "";
  ["opt0", "opt1", "opt2", "opt3"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("image").value = "";
  renderAnswers();
}
