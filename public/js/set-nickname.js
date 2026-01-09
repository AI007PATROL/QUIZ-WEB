/* =========================
   SESSION CHECK
========================= */
const username = localStorage.getItem("username");
const role = localStorage.getItem("role");

if (!username || role !== "user") {
  alert("Session expired. Please login again.");
  window.location.href = "/";
}

/* =========================
   SAVE NICKNAME
========================= */
async function saveNickname() {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    alert("Please enter a nickname");
    return;
  }

  if (nickname.length < 3) {
    alert("Nickname must be at least 3 characters");
    return;
  }

  try {
    const res = await fetch("/api/set-nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, nickname })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Unable to set nickname");
      return;
    }

    // Save locally
    localStorage.setItem("nickname", nickname);

    // Redirect to dashboard
    window.location.href = "/views/user-dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Server error. Try again.");
  }
}
