function enterSystem() {
  document.querySelector(".landing").style.display = "none";
  document.querySelector(".login-section").style.display = "block";
}const screens = {
  home: document.getElementById("screenHome"),
  dash: document.getElementById("screenDashboard"),
  play: document.getElementById("screenCase")
};

const btnStart = document.getElementById("btnStart");
const btnDashboard = document.getElementById("btnDashboard");
const btnHome = document.getElementById("btnHome");
const statCases = document.getElementById("statCases");

const rankSelect = document.getElementById("rankSelect");
const profileSummary = document.getElementById("profileSummary");
const caseList = document.getElementById("caseList");

const caseHeader = document.getElementById("caseHeader");
const caseMeta = document.getElementById("caseMeta");
const uiScore = document.getElementById("uiScore");
const uiRisk = document.getElementById("uiRisk");
const uiConviction = document.getElementById("uiConviction");
const uiXP = document.getElementById("uiXP");

const sceneTitle = document.getElementById("sceneTitle");
const sceneText = document.getElementById("sceneText");
const choicesWrap = document.getElementById("choices");

const suspectsPane = document.getElementById("suspectsPane");
const cluesPane = document.getElementById("cluesPane");
const toolsPane = document.getElementById("toolsPane");

const btnExitCase = document.getElementById("btnExitCase");
const btnResetCase = document.getElementById("btnResetCase");

const RANKS = ["ANALYST","AGENT","SENIOR_AGENT","SUPERVISOR","TASK_FORCE_LEAD"];
const RANK_LABEL = {
  ANALYST:"Analyst",
  AGENT:"Field Agent",
  SENIOR_AGENT:"Senior Agent",
  SUPERVISOR:"Supervisor",
  TASK_FORCE_LEAD:"Task Force Lead"
};

function rankAtLeast(current, required){
  return RANKS.indexOf(current) >= RANKS.indexOf(required);
}

function show(screen){
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function loadProfile(){
  const stored = JSON.parse(localStorage.getItem("CF_PROFILE") || "{}");
  return {
    rank: stored.rank || "ANALYST",
    xp: Number.isFinite(stored.xp) ? stored.xp : 0
  };
}

function saveProfile(p){
  localStorage.setItem("CF_PROFILE", JSON.stringify(p));
}

let profile = loadProfile();
rankSelect.value = profile.rank;
profileSummary.textContent = `${profile.rank} • XP ${profile.xp}`;

statCases.textContent = String((window.CASES || []).length);

btnStart.addEventListener("click", () => {
  show(screens.dash);
  renderDashboard();
});

btnDashboard.addEventListener("click", () => {
  show(screens.dash);
  renderDashboard();
});

btnHome.addEventListener("click", () => show(screens.home));

rankSelect.addEventListener("change", () => {
  profile.rank = rankSelect.value;
  saveProfile(profile);
  profileSummary.textContent = `${profile.rank} • XP ${profile.xp}`;
  renderDashboard();
});

// Tabs
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tabpane").forEach(p => p.classList.add("hidden"));
    document.getElementById(`tab-${tab}`).classList.remove("hidden");
  });
});

function renderDashboard(){
  caseList.innerHTML = "";
  (window.CASES || []).forEach(c => {
    const locked = !rankAtLeast(profile.rank, c.requiredRank);
    const card = document.createElement("div");
    card.className = "case-card";
    card.innerHTML = `
      <h3>${c.title}</h3>
      <div class="meta">
        <div><b>Case ID:</b> ${c.id}</div>
        <div><b>Classification:</b> ${c.classification}</div>
        <div><b>Location:</b> ${c.location}</div>
        <div><b>Threat:</b> ${c.threatLevel}</div>
      </div>
      <div class="req">Required Rank: <b>${RANK_LABEL[c.requiredRank]}</b></div>
      <div class="actions">
        <button class="btn ${locked ? "danger": "primary"}" ${locked ? "disabled": ""}>
          ${locked ? "LOCKED" : "OPEN CASE →"}
        </button>
      </div>
    `;
    const btn = card.querySelector("button");
    if(!locked){
      btn.addEventListener("click", () => startCase(c.id));
    }
    caseList.appendChild(card);
  });
}

let currentCase = null;
let state = null;

function newState(){
  return {
    sceneId: null,
    score: 0,
    risk: 0,
    conviction: 50,
    clues: [],
    xpGained: 0,
    lastAccusation: null
  };
}

function startCase(caseId){
  currentCase = window.CASES.find(c => c.id === caseId);
  if(!currentCase) return;

  const saved = JSON.parse(localStorage.getItem(`CF_CASESTATE_${caseId}`) || "null");
  state = saved || newState();
  if(!state.sceneId) state.sceneId = currentCase.startSceneId;

  renderCaseShell();
  renderScene();
  show(screens.play);
}

function persistCase(){
  localStorage.setItem(`CF_CASESTATE_${currentCase.id}`, JSON.stringify(state));
}

function resetCase(){
  localStorage.removeItem(`CF_CASESTATE_${currentCase.id}`);
  state = newState();
  state.sceneId = currentCase.startSceneId;
  renderCaseShell();
  renderScene();
}

btnExitCase.addEventListener("click", () => {
  persistCase();
  show(screens.dash);
  renderDashboard();
});

btnResetCase.addEventListener("click", () => resetCase());

function renderCaseShell(){
  caseHeader.textContent = `${currentCase.id} // ${currentCase.classification}`;
  caseMeta.textContent = `${currentCase.location} • ${currentCase.jurisdiction} • Threat: ${currentCase.threatLevel}`;

  suspectsPane.innerHTML = "";
  currentCase.suspects.forEach(s => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="title">${s.name}</div><div class="desc">${s.summary}</div>`;
    suspectsPane.appendChild(div);
  });

  toolsPane.innerHTML = "";
  currentCase.tools.forEach(t => {
    const div = document.createElement("div");
    div.className = "item";
    const locked = !rankAtLeast(profile.rank, t.reqRank);
    div.innerHTML = `
      <div class="title">${t.name} ${locked ? "• LOCKED" : ""}</div>
      <div class="desc">${t.desc}</div>
      <div class="desc muted">Requires: ${RANK_LABEL[t.reqRank]}</div>
    `;
    toolsPane.appendChild(div);
  });

  renderHUD();
  renderClues();
}

function renderHUD(){
  uiScore.textContent = String(state.score);
  uiRisk.textContent = String(state.risk);
  uiConviction.textContent = String(Math.max(0, Math.min(100, state.conviction)));
  uiXP.textContent = String(profile.xp);
}

function renderClues(){
  cluesPane.innerHTML = "";
  if(state.clues.length === 0){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="title">No clues logged</div><div class="desc">Collect evidence legally. Log it. Build admissible proof.</div>`;
    cluesPane.appendChild(div);
    return;
  }

  state.clues.forEach(c => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="title">${c}</div>`;
    cluesPane.appendChild(div);
  });
}

function findScene(id){
  return currentCase.scenes.find(s => s.id === id);
}

function hasClue(clue){
  return state.clues.includes(clue);
}

function meetsChoiceRequirements(choice){
  if(choice.requireRank && !rankAtLeast(profile.rank, choice.requireRank)) return false;
  if(choice.requireClues){
    for(const rc of choice.requireClues){
      if(!hasClue(rc)) return false;
    }
  }
  return true;
}

function applyEffects(effects){
  if(!effects) return;
  state.score += effects.score || 0;
  state.risk += effects.risk || 0;
  state.conviction += effects.conviction || 0;

  const add = effects.addClues || [];
  add.forEach(cl => { if(!state.clues.includes(cl)) state.clues.push(cl); });

  // XP gain model (simple)
  const xpDelta = Math.max(0, (effects.score || 0) + Math.max(0, (effects.conviction || 0)) - Math.max(0, (effects.risk || 0)));
  if(xpDelta > 0){
    profile.xp += xpDelta;
    saveProfile(profile);
  }
}

function computeEnding(){
  // Basic admissibility gate: risk too high collapses prosecution
  const majorClues = state.clues.filter(c =>
    c.includes("(logged)") || c.startsWith("Forensics:")
  ).length;

  const conviction = Math.max(0, Math.min(100, state.conviction));

  if(state.risk >= 6) return { status:"COMPROMISED", desc:"Procedural violations compromised admissibility." };
  if(majorClues < 3) return { status:"DISMISSED", desc:"Insufficient admissible major evidence to prosecute." };
  if(conviction >= 65) return { status:"CLOSED", desc:"Prosecution-ready package established with admissible evidence." };
  return { status:"DISMISSED", desc:"Evidence remains too weak for a confident prosecution." };
}

function renderScene(){
  const scene = findScene(state.sceneId);
  if(!scene) return;

  sceneTitle.textContent = scene.title;
  sceneText.textContent = scene.text;

  choicesWrap.innerHTML = "";

  // Special: END scene
  if(scene.id === "END"){
    const ending = computeEnding();
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="title">STATUS: ${ending.status}</div><div class="desc">${ending.desc}</div>`;
    choicesWrap.appendChild(div);

    renderHUD();
    renderClues();
    persistCase();
    return;
  }

  scene.choices.forEach(choice => {
    const allowed = meetsChoiceRequirements(choice);
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.disabled = !allowed;

    btn.innerHTML = `
      <div><b>${choice.label}</b></div>
      <div class="hint">${choice.hint || ""}${!allowed ? " (Locked by requirements)" : ""}</div>
    `;

    btn.addEventListener("click", () => {
      applyEffects(choice.effects);

      // if accusation choice at SCENE_9, store it (optional)
      if(scene.id === "SCENE_9" && choice.label.startsWith("Accuse")){
        state.lastAccusation = choice.label;
      }

      state.sceneId = choice.nextSceneId;
      persistCase();
      renderHUD();
      renderClues();
      renderScene();
    });

    choicesWrap.appendChild(btn);
  });

  renderHUD();
  renderClues();
}

// Initial screen
show(screens.home);

