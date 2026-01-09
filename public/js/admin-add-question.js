async function saveQuestion() {
  const question = document.getElementById("question").value.trim();
  const type = document.getElementById("type").value;

  const options = [
    document.getElementById("opt0").value.trim(),
    document.getElementById("opt1").value.trim(),
    document.getElementById("opt2").value.trim(),
    document.getElementById("opt3").value.trim()
  ];

  const answerEls = document.querySelectorAll("input[name='answer']:checked");
  const answer = [...answerEls].map(a => Number(a.value));

  if (!question || options.some(o => !o) || answer.length === 0) {
    alert("Fill all fields and select correct answer");
    return;
  }

  const formData = new FormData();
  formData.append("question", question);
  formData.append("type", type);
  formData.append("options", JSON.stringify(options));
  formData.append("answer", JSON.stringify(answer));

  const image = document.getElementById("image").files[0];
  if (image) formData.append("image", image);

  try {
    const res = await fetch("/admin/add-question", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed");
    }

    alert("✅ Question saved successfully");

    // reset form
    document.getElementById("question").value = "";
    ["opt0","opt1","opt2","opt3"].forEach(id => {
      document.getElementById(id).value = "";
    });
    document.querySelectorAll("input[name='answer']").forEach(a => a.checked = false);
    document.getElementById("image").value = "";

  } catch (err) {
    alert("❌ " + err.message);
  }
}
