const answersDiv = document.getElementById("answers");
const typeSelect = document.getElementById("type");

/* =========================
   RENDER ANSWER SELECTOR
========================= */
function renderAnswers() {
  answersDiv.innerHTML = "";

  const type = typeSelect.value;

  for (let i = 0; i < 4; i++) {
    answersDiv.innerHTML += `
      <label class="answer-option">
        <input 
          type="${type === "single" ? "radio" : "checkbox"}"
          name="correct"
          value="${i}"
        >
        Correct Option ${String.fromCharCode(65 + i)}
      </label>
    `;
  }
}

// Render once on load
renderAnswers();

/* =========================
   SAVE QUESTION
========================= */
async function saveQuestion() {
  const question = document.getElementById("question").value.trim();
  const type = typeSelect.value;

  const options = [
    document.getElementById("opt0").value.trim(),
    document.getElementById("opt1").value.trim(),
    document.getElementById("opt2").value.trim(),
    document.getElementById("opt3").value.trim()
  ];

  const correctInputs = document.querySelectorAll(
    'input[name="correct"]:checked'
  );

  const answer = Array.from(correctInputs).map(i =>
    Number(i.value)
  );

  // VALIDATION
  if (!question) return alert("Question is required");
  if (options.some(o => !o)) return alert("All options required");
  if (answer.length === 0) return alert("Select correct answer");

  const formData = new FormData();
  formData.append("question", question);
  formData.append("type", type);
  formData.append("options", JSON.stringify(options));
  formData.append("answer", JSON.stringify(answer));

  const image = document.getElementById("image").files[0];
  if (image) formData.append("image", image);

  const res = await fetch("/admin/add-question", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (res.ok) {
    alert("✅ Question saved successfully");
    location.reload();
  } else {
    alert(data.message || "Error saving question");
  }
}
