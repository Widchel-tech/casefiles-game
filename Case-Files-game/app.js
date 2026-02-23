(function(){
  const landing = document.getElementById("landing");
  const dashboard = document.getElementById("dashboard");

  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");

  const usernameLabel = document.getElementById("usernameLabel");
  const rankBadge = document.getElementById("rankBadge");
  const cpValue = document.getElementById("cpValue");

  const caseGrid = document.getElementById("caseGrid");
  const leaderboardList = document.getElementById("leaderboardList");

  const logoutBtn = document.getElementById("logoutBtn");

  // ===== Local Storage Keys =====
  const LS_USER = "casefiles_user";
  const LS_CP = "casefiles_cp";

  function getCP(){
    const raw = localStorage.getItem(LS_CP);
    const cp = raw ? parseInt(raw, 10) : 5; // default demo CP
    return Number.isFinite(cp) ? cp : 5;
  }

  function setCP(cp){
    localStorage.setItem(LS_CP, String(cp));
    updateCPAndRankUI();
  }

  function rankFromCP(cp){
    // Adjust thresholds whenever you want
    if (cp >= 1000) return "S";
    if (cp >= 500)  return "A";
    if (cp >= 200)  return "B";
    return "C";
  }

  function updateCPAndRankUI(){
    const cp = getCP();
    if (cpValue) cpValue.textContent = String(cp);
    if (rankBadge) rankBadge.textContent = rankFromCP(cp);
  }

  function showDashboard(username){
    localStorage.setItem(LS_USER, username);

    usernameLabel.textContent = username;
    updateCPAndRankUI();

    landing.classList.add("hidden");
    dashboard.classList.remove("hidden");

    renderCases();
    loadLeaderboard();
  }

  function showLanding(){
    dashboard.classList.add("hidden");
    landing.classList.remove("hidden");
  }

  function validateLogin(username, password){
    // Demo login: allow any non-empty username.
    // Replace with real auth later.
    if (!username || username.trim().length < 3) return "Enter a username (3+ characters).";
    if (!password || password.trim().length < 1) return "Enter an access code (anything for demo).";
    return null;
  }

  function onLogin(){
    loginError.textContent = "";
    const username = (usernameInput.value || "").trim();
    const password = (passwordInput.value || "").trim();

    const err = validateLogin(username, password);
    if (err){
      loginError.textContent = err;
      return;
    }

    // Ensure CP exists for new demo players
    if (!localStorage.getItem(LS_CP)) setCP(5);

    showDashboard(username);
  }

  function renderCases(){
    caseGrid.innerHTML = "";
    const cases = (window.CASES || []).filter(c => c.isDemo); // only demo

    for (const c of cases){
      const card = document.createElement("div");
      card.className = "case-card";

      card.innerHTML = `
        <div class="case-thumb">
          <div style="font-weight:900;letter-spacing:.12em;opacity:.85;">DEMO FILE</div>
        </div>
        <div class="case-name">${escapeHtml(c.title)}</div>
        <div class="case-desc">${escapeHtml(c.description)}</div>
        <div class="case-meta">
          <span class="pill">${escapeHtml(c.difficulty)}</span>
          <span class="pill">${escapeHtml(String(c.minutes))} min</span>
          <span class="pill">${escapeHtml(c.type)}</span>
          <span class="pill">FREE</span>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn primary" data-open="${escapeAttr(c.id)}">OPEN CASE</button>
          <button class="btn" data-reset>RESET CP</button>
        </div>
      `;

      card.querySelector("[data-open]").addEventListener("click", () => {
        // For now, demo case just shows a message.
        alert("Demo case launch stub: " + c.title + "\\n\\nNext: we’ll wire this to your actual case gameplay screen.");
      });

      card.querySelector("[data-reset]").addEventListener("click", () => {
        setCP(5);
        alert("CP reset to 5 for demo.");
      });

      caseGrid.appendChild(card);
    }
  }

  async function loadLeaderboard(){
    if (!leaderboardList) return;

    try{
      const res = await fetch("leaderboard.json", { cache: "no-store" });
      const data = await res.json();

      data.sort((a,b) => (b.cp ?? 0) - (a.cp ?? 0));

      leaderboardList.innerHTML = "";
      for (const row of data.slice(0, 25)){
        const li = document.createElement("li");

        const left = document.createElement("span");
        left.textContent = row.username ?? "Unknown";

        const right = document.createElement("span");
        right.className = "lb-cp";
        right.textContent = `${row.cp ?? 0} CP`;

        li.appendChild(left);
        li.appendChild(right);
        leaderboardList.appendChild(li);
      }
    }catch(e){
      console.error(e);
      leaderboardList.innerHTML = "<li><span>Leaderboard unavailable</span><span class='lb-cp'>—</span></li>";
    }
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function escapeAttr(s){
    return escapeHtml(s).replaceAll("`","&#096;");
  }

  // ===== Wire events =====
  loginBtn.addEventListener("click", onLogin);
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onLogin();
  });

  logoutBtn.addEventListener("click", () => {
    // keep CP (progress), just log out
    localStorage.removeItem(LS_USER);
    showLanding();
  });

  // Auto-login if user exists
  const remembered = localStorage.getItem(LS_USER);
  if (remembered){
    showDashboard(remembered);
  }else{
    showLanding();
  }
})();
