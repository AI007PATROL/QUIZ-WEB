async function submitNickname() {
  const nickname = document.getElementById("nickname").value.trim();
  const username = localStorage.getItem("username");

  if (!nickname) {
    alert("Please enter a nickname");
    return;
  }

  if (!username) {
    alert("Session expired. Login again.");
    window.location.href = "/";
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
      throw new Error(data.message || "Server error");
    }

    localStorage.setItem("nickname", data.nickname);
    window.location.href = "/views/user-dashboard.html";

  } catch (err) {
    document.getElementById("error").innerText =
      err.message || "Server error. Try again.";
  }
}
