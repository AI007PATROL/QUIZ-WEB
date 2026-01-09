/* =========================
   LOGIN
========================= */
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!username || !password) {
    alert("Please enter username and password");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // Save session
    localStorage.setItem("username", data.username);
    localStorage.setItem("role", data.role);
    localStorage.setItem("nickname", data.nickname || "");

    // Redirect
    if (data.role === "admin") {
      window.location.href = "/views/admin-dashboard.html";
    } else {
      if (!data.nickname) {
        window.location.href = "/views/set-nickname.html";
      } else {
        window.location.href = "/views/user-dashboard.html";
      }
    }
  } catch (err) {
    console.error(err);
    alert("Server error. Please try again.");
  }
}

/* =========================
   SAVE NICKNAME (ONE TIME)
========================= */
async function saveNickname() {
  const nickname = document.getElementById("nickname").value.trim();
  const username = localStorage.getItem("username");

  if (!nickname) {
    alert("Please enter a nickname");
    return;
  }

  if (!username) {
    alert("Session expired. Please login again.");
    window.location.href = "/";
    return;
  }

  const res = await fetch("/api/set-nickname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, nickname })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Failed to save nickname");
    return;
  }

  localStorage.setItem("nickname", nickname);
  window.location.href = "/views/user-dashboard.html";
}

/* =========================
   LOGOUT (GLOBAL)
========================= */
function logout() {
  localStorage.clear();
  window.location.href = "/";
}
