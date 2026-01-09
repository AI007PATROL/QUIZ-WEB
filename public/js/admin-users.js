/* =========================
   LOAD ALL USERS
========================= */
async function loadUsers() {
  const res = await fetch("/admin/users");
  const users = await res.json();

  const container = document.getElementById("userList");
  container.innerHTML = "";

  if (!users.length) {
    container.innerHTML = "<p>No users found.</p>";
    return;
  }

  users.forEach(u => {
    container.innerHTML += `
      <div class="list-item">
        <div style="flex:1">
          <strong>${u.username}</strong>
          <div style="font-size:13px;color:#555">
            Nickname: ${u.nickname || "—"}<br>
            Role: ${u.role}
          </div>
        </div>

        <div style="display:flex;gap:6px">
          <button class="btn secondary"
            onclick="editNickname('${u.username}')">
            ✏ Nickname
          </button>

          <button class="btn danger"
            onclick="resetPassword('${u.username}')">
            🔑 Reset
          </button>
        </div>
      </div>
    `;
  });
}

/* =========================
   EDIT NICKNAME (ADMIN)
========================= */
async function editNickname(username) {
  const nickname = prompt("Enter new nickname");
  if (!nickname) return;

  const res = await fetch("/admin/update-nickname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, nickname })
  });

  const data = await res.json();
  alert(data.message || "Nickname updated");

  loadUsers();
}

/* =========================
   RESET PASSWORD (ADMIN)
========================= */
async function resetPassword(username) {
  const password = prompt("Enter new password (min 4 chars)");
  if (!password || password.length < 4) {
    alert("Password too short");
    return;
  }

  const res = await fetch("/admin/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  alert(data.message || "Password reset");

  loadUsers();
}

/* =========================
   INIT
========================= */
loadUsers();
