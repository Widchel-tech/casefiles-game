// Case Files - Main Application Logic
// Standalone version without external dependencies

// ============== STATE MANAGEMENT ==============
let currentUser = null;
let currentGame = null;

// ============== LOCAL STORAGE ==============
function saveToStorage(key, data) {
    localStorage.setItem(`casefiles_${key}`, JSON.stringify(data));
}

function loadFromStorage(key) {
    const data = localStorage.getItem(`casefiles_${key}`);
    return data ? JSON.parse(data) : null;
}

function getUsers() {
    return loadFromStorage('users') || [];
}

function saveUsers(users) {
    saveToStorage('users', users);
}

function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

// ============== TOAST NOTIFICATIONS ==============
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ============== PAGE NAVIGATION ==============
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ============== AUTHENTICATION ==============
function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
        showToast('Email already registered', 'error');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        showToast('Username already taken', 'error');
        return;
    }
    
    const newUser = {
        id: 'user-' + Date.now(),
        username,
        email,
        password, // In production, this should be hashed
        career_points: 0,
        cases_solved: 0,
        created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    currentUser = newUser;
    saveToStorage('currentUser', newUser);
    
    showToast('Welcome to the Bureau, Agent!', 'success');
    loadDashboard();
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const user = getUserByEmail(email);
    
    if (!user || user.password !== password) {
        showToast('Invalid credentials', 'error');
        return;
    }
    
    currentUser = user;
    saveToStorage('currentUser', user);
    
    showToast('Access granted', 'success');
    loadDashboard();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('casefiles_currentUser');
    showPage('landing-page');
    showToast('Logged out successfully', 'info');
}

function checkAuth() {
    const savedUser = loadFromStorage('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        loadDashboard();
    }
}

// ============== DASHBOARD ==============
function loadDashboard() {
    if (!currentUser) return;
    
    const { rank, title } = getRank(currentUser.career_points);
    
    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('user-rank').textContent = title;
    document.getElementById('welcome-name').textContent = currentUser.username;
    document.getElementById('career-points').textContent = currentUser.career_points;
    document.getElementById('cases-solved').textContent = currentUser.cases_solved || 0;
    document.getElementById('user-level').textContent = rank;
    
    loadCases();
    showPage('dashboard-page');
}

function loadCases() {
    const cases = getCases();
    const casesGrid = document.getElementById('cases-list');
    casesGrid.innerHTML = '';
    
    cases.forEach(caseData => {
        const card = document.createElement('div');
        card.className = 'case-card';
        
        const difficultyDots = Array(5).fill(0).map((_, i) => 
            `<span class="${i < caseData.difficulty ? 'active' : ''}"></span>`
        ).join('');
        
        card.innerHTML = `
            <div class="case-card-header">
                <span class="case-card-id">${caseData.case_id}</span>
                <span class="case-card-badge ${caseData.is_free ? 'free' : 'premium'}">
                    ${caseData.is_free ? 'FREE' : 'PREMIUM'}
                </span>
            </div>
            <h3>${caseData.title}</h3>
            <div class="case-card-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${caseData.location_county}, ${caseData.location_state}</span>
                <span><i class="fas fa-clock"></i> ${caseData.time_limit_minutes} min</span>
            </div>
            <p class="case-card-description">${caseData.victim_overview}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="difficulty-dots">${difficultyDots}</div>
                <button class="btn btn-primary" onclick="startGame('${caseData.id}')">
                    <i class="fas fa-play"></i> Investigate
                </button>
            </div>
        `;
        
        casesGrid.appendChild(card);
    });
}

// ============== GAMEPLAY ==============
function startGame(caseId) {
    const caseData = getCaseById(caseId);
    if (!caseData) {
        showToast('Case not found', 'error');
        return;
    }
    
    const { rank, title } = getRank(currentUser.career_points);
    
    currentGame = {
        caseData,
        sessionId: 'session-' + Date.now(),
        currentSceneIndex: 0,
        score: 0,
        cluesCollected: [],
        proceduralRisk: 'LOW',
        riskPoints: 0,
        convictionProbability: 10,
        evidenceStrength: 0,
        xpEarned: 0,
        proceduralViolations: [],
        evidenceLegallyObtained: [],
        evidenceSuppressed: [],
        warrantsObtained: [],
        mirandaGiven: [],
        sceneHistory: [],
        startTime: Date.now(),
        timeRemaining: caseData.time_limit_minutes * 60,
        userRank: title,
        interrogationHistory: {},
        suspectCooperation: {},
        selectedAccuseSuspect: null,
        selectedClues: []
    };
    
    // Initialize suspect cooperation
    caseData.suspects.forEach(suspect => {
        currentGame.suspectCooperation[suspect.id] = suspect.cooperation_level || 50;
    });
    
    renderGame();
    startTimer();
    showPage('gameplay-page');
}

function renderGame() {
    if (!currentGame) return;
    
    const { caseData } = currentGame;
    const currentScene = caseData.scenes[currentGame.currentSceneIndex];
    
    // Update header
    document.getElementById('game-case-id').textContent = caseData.case_id;
    document.getElementById('game-case-title').textContent = caseData.title;
    document.getElementById('game-threat').textContent = `${caseData.threat_level.toUpperCase()} THREAT`;
    document.getElementById('game-conviction').textContent = `${currentGame.convictionProbability}%`;
    
    // Update risk display
    const riskContainer = document.getElementById('game-risk-container');
    riskContainer.className = `game-stat risk ${currentGame.proceduralRisk.toLowerCase()}`;
    document.getElementById('game-risk').textContent = currentGame.proceduralRisk;
    
    // Update stats bar
    document.getElementById('evidence-count').textContent = currentGame.cluesCollected.length;
    document.getElementById('warrant-count').textContent = currentGame.warrantsObtained.length;
    document.getElementById('game-rank').textContent = currentGame.userRank;
    document.getElementById('clues-count').textContent = currentGame.cluesCollected.length;
    
    // Update violations display
    const violationsContainer = document.getElementById('violations-container');
    if (currentGame.proceduralViolations.length > 0) {
        violationsContainer.style.display = 'flex';
        document.getElementById('violations-count').textContent = currentGame.proceduralViolations.length;
    } else {
        violationsContainer.style.display = 'none';
    }
    
    // Render current scene
    renderScene(currentScene);
    renderSuspects();
    renderClues();
    renderTimeline();
    
    // Show/hide back button
    document.getElementById('back-btn').style.display = 
        currentGame.sceneHistory.length > 0 ? 'flex' : 'none';
}

function renderScene(scene) {
    document.querySelector('.scene-number').textContent = `SCENE ${scene.order + 1}`;
    document.getElementById('scene-title').textContent = scene.title;
    document.getElementById('scene-narration').textContent = scene.narration;
    
    // Render media
    const mediaContainer = document.getElementById('scene-media');
    mediaContainer.innerHTML = '';
    if (scene.media_urls && scene.media_urls.length > 0) {
        scene.media_urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Scene evidence';
            mediaContainer.appendChild(img);
        });
    }
    
    // Render choices
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    
    // Check if this is accusation scene
    if (scene.is_accusation_scene) {
        const accuseBtn = document.createElement('button');
        accuseBtn.className = 'choice-btn';
        accuseBtn.innerHTML = `
            <span class="choice-text">Make your accusation</span>
            <i class="fas fa-gavel"></i>
        `;
        accuseBtn.onclick = () => openAccusationModal();
        choicesContainer.appendChild(accuseBtn);
        return;
    }
    
    scene.choices.forEach((choice, index) => {
        const hasRequiredClues = choice.require_clues.every(
            clueId => currentGame.cluesCollected.includes(clueId)
        );
        
        const choiceBtn = document.createElement('button');
        choiceBtn.className = 'choice-btn';
        choiceBtn.disabled = !hasRequiredClues;
        
        let riskBadge = '';
        if (choice.risk_flag !== 'none') {
            riskBadge = `<span class="choice-risk ${choice.risk_flag}">${choice.risk_flag.toUpperCase()} RISK</span>`;
        }
        
        choiceBtn.innerHTML = `
            <div>
                <span class="choice-text">${choice.text}</span>
                ${!hasRequiredClues ? `
                    <div class="choice-locked">
                        <i class="fas fa-lock"></i>
                        Requires additional evidence
                    </div>
                ` : ''}
            </div>
            ${riskBadge}
        `;
        
        if (hasRequiredClues) {
            choiceBtn.onclick = () => makeChoice(choice);
        }
        
        choicesContainer.appendChild(choiceBtn);
    });
}

function renderSuspects() {
    const grid = document.getElementById('suspects-grid');
    grid.innerHTML = '';
    
    currentGame.caseData.suspects.forEach(suspect => {
        const card = document.createElement('div');
        card.className = 'suspect-card';
        
        card.innerHTML = `
            <div class="suspect-header">
                <div class="suspect-avatar">
                    ${suspect.portrait_url 
                        ? `<img src="${suspect.portrait_url}" alt="${suspect.name}">` 
                        : `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="suspect-info">
                    <h3>${suspect.name}</h3>
                    <span class="suspect-meta">${suspect.age} years old • ${suspect.role}</span>
                </div>
            </div>
            <div class="suspect-details">
                <div class="suspect-detail">
                    <label>MOTIVE</label>
                    <p>${suspect.motive_angle}</p>
                </div>
                <div class="suspect-detail">
                    <label>ALIBI</label>
                    <p>${suspect.alibi_summary}</p>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="openInterrogation('${suspect.id}')">
                <i class="fas fa-comments"></i> Interrogate
            </button>
        `;
        
        grid.appendChild(card);
    });
}

function renderClues() {
    const emptyState = document.getElementById('clues-empty');
    const grid = document.getElementById('clues-grid');
    
    if (currentGame.cluesCollected.length === 0) {
        emptyState.style.display = 'block';
        grid.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = '';
    
    currentGame.cluesCollected.forEach(clueId => {
        const clue = currentGame.caseData.clues.find(c => c.id === clueId);
        if (!clue) return;
        
        const card = document.createElement('div');
        card.className = 'clue-card';
        
        card.innerHTML = `
            <div class="clue-icon ${clue.load_bearing ? 'key' : ''}">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="clue-content">
                <h4>${clue.label}</h4>
                <p>${clue.description}</p>
                ${clue.load_bearing ? '<span class="clue-badge">KEY EVIDENCE</span>' : ''}
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';
    
    const visitedScenes = currentGame.caseData.scenes.slice(0, currentGame.currentSceneIndex + 1);
    
    visitedScenes.forEach((scene, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <span class="timeline-label">SCENE ${index + 1}</span>
            <span class="timeline-title">${scene.title}</span>
        `;
        container.appendChild(item);
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.closest('.tab-btn').classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============== GAME ACTIONS ==============
function makeChoice(choice) {
    // Save current state to history
    currentGame.sceneHistory.push({
        sceneIndex: currentGame.currentSceneIndex,
        score: currentGame.score,
        cluesCollected: [...currentGame.cluesCollected],
        proceduralRisk: currentGame.proceduralRisk,
        riskPoints: currentGame.riskPoints,
        convictionProbability: currentGame.convictionProbability,
        evidenceStrength: currentGame.evidenceStrength,
        proceduralViolations: [...currentGame.proceduralViolations]
    });
    
    // Update score
    currentGame.score += choice.score_delta;
    
    // Add clues
    choice.add_clues.forEach(clueId => {
        if (!currentGame.cluesCollected.includes(clueId)) {
            currentGame.cluesCollected.push(clueId);
            
            const clue = currentGame.caseData.clues.find(c => c.id === clueId);
            if (clue) {
                showToast(`Evidence collected: ${clue.label}`, 'success');
                
                // Track legally vs illegally obtained
                if (clue.legally_obtained && !choice.procedural_violation) {
                    currentGame.evidenceLegallyObtained.push(clueId);
                } else {
                    currentGame.evidenceSuppressed.push(clueId);
                }
            }
        }
    });
    
    // Handle procedural violation
    if (choice.procedural_violation) {
        if (!currentGame.proceduralViolations.includes(choice.procedural_violation)) {
            currentGame.proceduralViolations.push(choice.procedural_violation);
            showToast('Procedural violation recorded!', 'warning');
        }
    }
    
    // Update risk
    const riskMap = { none: 0, low: 1, medium: 3, high: 5 };
    currentGame.riskPoints += riskMap[choice.risk_flag] || 0;
    
    if (currentGame.riskPoints >= 12) {
        currentGame.proceduralRisk = 'CRITICAL';
    } else if (currentGame.riskPoints >= 8) {
        currentGame.proceduralRisk = 'HIGH';
    } else if (currentGame.riskPoints >= 4) {
        currentGame.proceduralRisk = 'MEDIUM';
    }
    
    // Update conviction probability
    currentGame.convictionProbability += choice.conviction_delta || 0;
    
    // Add evidence strength from clues
    choice.add_clues.forEach(clueId => {
        const clue = currentGame.caseData.clues.find(c => c.id === clueId);
        if (clue && currentGame.evidenceLegallyObtained.includes(clueId)) {
            currentGame.convictionProbability += clue.evidence_strength;
        }
    });
    
    // Reduce for violations
    currentGame.convictionProbability -= currentGame.proceduralViolations.length * 5;
    currentGame.convictionProbability = Math.max(0, Math.min(100, currentGame.convictionProbability));
    
    // Update evidence strength
    currentGame.evidenceStrength += choice.evidence_strength_delta || 0;
    
    // Move to next scene
    const nextSceneIndex = currentGame.caseData.scenes.findIndex(s => s.id === choice.next_scene_id);
    if (nextSceneIndex !== -1) {
        currentGame.currentSceneIndex = nextSceneIndex;
    }
    
    renderGame();
}

function goBack() {
    if (currentGame.sceneHistory.length === 0) return;
    
    const previousState = currentGame.sceneHistory.pop();
    
    currentGame.currentSceneIndex = previousState.sceneIndex;
    currentGame.score = previousState.score;
    currentGame.cluesCollected = previousState.cluesCollected;
    currentGame.proceduralRisk = previousState.proceduralRisk;
    currentGame.riskPoints = previousState.riskPoints;
    currentGame.convictionProbability = previousState.convictionProbability;
    currentGame.evidenceStrength = previousState.evidenceStrength;
    currentGame.proceduralViolations = previousState.proceduralViolations;
    
    showToast('Returned to previous scene', 'info');
    renderGame();
}

// ============== TIMER ==============
let timerInterval = null;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        currentGame.timeRemaining--;
        
        const mins = Math.floor(currentGame.timeRemaining / 60);
        const secs = currentGame.timeRemaining % 60;
        document.getElementById('game-timer').textContent = 
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (currentGame.timeRemaining <= 60) {
            document.getElementById('game-timer').style.color = 'var(--accent-red)';
        }
        
        if (currentGame.timeRemaining <= 0) {
            clearInterval(timerInterval);
            endGame('timeout');
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============== INTERROGATION ==============
function openInterrogation(suspectId) {
    const suspect = currentGame.caseData.suspects.find(s => s.id === suspectId);
    if (!suspect) return;
    
    currentGame.currentInterrogationSuspect = suspect;
    
    document.getElementById('interrogation-suspect-name').textContent = suspect.name;
    
    // Update cooperation bar
    const cooperation = currentGame.suspectCooperation[suspectId] || 50;
    document.getElementById('cooperation-bar').style.width = `${cooperation}%`;
    
    // Update Miranda status
    const mirandaBtn = document.getElementById('miranda-btn');
    const mirandaStatus = document.getElementById('miranda-status');
    
    if (currentGame.mirandaGiven.includes(suspectId)) {
        mirandaBtn.style.display = 'none';
        mirandaStatus.style.display = 'flex';
    } else {
        mirandaBtn.style.display = 'inline-flex';
        mirandaStatus.style.display = 'none';
    }
    
    // Load chat history
    const chatHistory = currentGame.interrogationHistory[suspectId] || [];
    renderInterrogationChat(chatHistory);
    
    openModal('interrogation-modal');
}

function renderInterrogationChat(history) {
    const chatContainer = document.getElementById('interrogation-chat');
    
    if (history.length === 0) {
        chatContainer.innerHTML = '<p class="chat-placeholder">Begin your interrogation</p>';
        return;
    }
    
    chatContainer.innerHTML = history.map(entry => `
        <div class="chat-message">
            <div class="chat-agent">AGENT (${entry.approach}): ${entry.question}</div>
            <div class="chat-response">${entry.response}</div>
            ${entry.lawyerRequested ? '<div class="chat-warning danger"><i class="fas fa-exclamation-triangle"></i> LAWYER REQUESTED</div>' : ''}
            ${entry.suspectBreaking ? '<div class="chat-warning success"><i class="fas fa-check"></i> SUSPECT SHOWING CRACKS</div>' : ''}
        </div>
    `).join('');
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function giveMiranda() {
    if (!currentGame.currentInterrogationSuspect) return;
    
    const suspectId = currentGame.currentInterrogationSuspect.id;
    currentGame.mirandaGiven.push(suspectId);
    
    document.getElementById('miranda-btn').style.display = 'none';
    document.getElementById('miranda-status').style.display = 'flex';
    
    showToast('Miranda rights administered', 'success');
}

function sendQuestion() {
    const questionInput = document.getElementById('interrogation-question');
    const question = questionInput.value.trim();
    
    if (!question || !currentGame.currentInterrogationSuspect) return;
    
    const suspect = currentGame.currentInterrogationSuspect;
    const approach = document.getElementById('interrogation-approach').value;
    
    // Simulate AI response (in production, this would call an AI service)
    const response = generateInterrogationResponse(suspect, question, approach);
    
    // Save to history
    if (!currentGame.interrogationHistory[suspect.id]) {
        currentGame.interrogationHistory[suspect.id] = [];
    }
    
    currentGame.interrogationHistory[suspect.id].push({
        question,
        response: response.text,
        approach,
        lawyerRequested: response.lawyerRequested,
        suspectBreaking: response.suspectBreaking
    });
    
    // Update cooperation
    const approachEffects = {
        professional: { cooperation: 0 },
        aggressive: { cooperation: -10 },
        sympathetic: { cooperation: 5 },
        strategic_silence: { cooperation: -5 }
    };
    
    const effect = approachEffects[approach];
    currentGame.suspectCooperation[suspect.id] = Math.max(0, Math.min(100, 
        currentGame.suspectCooperation[suspect.id] + effect.cooperation
    ));
    
    document.getElementById('cooperation-bar').style.width = 
        `${currentGame.suspectCooperation[suspect.id]}%`;
    
    renderInterrogationChat(currentGame.interrogationHistory[suspect.id]);
    questionInput.value = '';
    
    if (response.lawyerRequested) {
        showToast('Suspect has requested a lawyer!', 'warning');
    }
    if (response.suspectBreaking) {
        showToast('Suspect is showing cracks!', 'success');
    }
}

function generateInterrogationResponse(suspect, question, approach) {
    // This is a simplified simulation. In production, this would use an AI API.
    const cooperation = currentGame.suspectCooperation[suspect.id] || 50;
    const evidenceCount = currentGame.cluesCollected.length;
    
    const responses = {
        cooperative: [
            "Look, I want to help. I didn't do this, but I'll tell you what I know.",
            "I understand you're just doing your job. Here's what I can tell you...",
            "I've got nothing to hide. Ask me anything."
        ],
        defensive: [
            "*crosses arms* I don't know what you're implying.",
            "I already told you everything I know. Why do you keep asking?",
            "*sighs* This feels like a fishing expedition, Agent."
        ],
        hostile: [
            "Are you serious right now? You've got nothing on me.",
            "I'm done answering your questions. This is harassment.",
            "*slams table* You want a confession? You won't get one."
        ],
        calculating: [
            "*pauses thoughtfully* That's an interesting question. Let me think...",
            "I see what you're trying to do. Very clever, Agent.",
            "Perhaps we should discuss this with my attorney present."
        ]
    };
    
    const personalityResponses = responses[suspect.personality_type] || responses.defensive;
    const baseResponse = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
    
    // Check if suspect should request lawyer
    const lawyerRequested = approach === 'aggressive' && 
        Math.random() < (1 - cooperation / 100) * 0.5;
    
    // Check if suspect is breaking
    const suspectBreaking = suspect.is_guilty && 
        evidenceCount >= suspect.breaking_point && 
        cooperation < 30 &&
        Math.random() < 0.3;
    
    let text = baseResponse;
    
    if (suspectBreaking) {
        text = "*visible discomfort* I... I need a moment. This is all too much. *wipes brow nervously*";
    }
    
    if (lawyerRequested) {
        text = "I think I should have my lawyer present before answering any more questions.";
    }
    
    return { text, lawyerRequested, suspectBreaking };
}

// ============== ACCUSATION ==============
function openAccusationModal() {
    currentGame.selectedAccuseSuspect = null;
    currentGame.selectedClues = [];
    
    renderAccusationModal();
    openModal('accusation-modal');
}

function renderAccusationModal() {
    // Render suspects
    const suspectsGrid = document.getElementById('accusation-suspects');
    suspectsGrid.innerHTML = '';
    
    currentGame.caseData.suspects.forEach(suspect => {
        const btn = document.createElement('button');
        btn.className = `select-btn ${currentGame.selectedAccuseSuspect?.id === suspect.id ? 'selected' : ''}`;
        btn.innerHTML = `
            <span class="name">${suspect.name}</span>
            <span class="role">${suspect.role}</span>
        `;
        btn.onclick = () => {
            currentGame.selectedAccuseSuspect = suspect;
            renderAccusationModal();
        };
        suspectsGrid.appendChild(btn);
    });
    
    // Render evidence
    const evidenceGrid = document.getElementById('accusation-evidence');
    evidenceGrid.innerHTML = '';
    
    currentGame.cluesCollected.forEach(clueId => {
        const clue = currentGame.caseData.clues.find(c => c.id === clueId);
        if (!clue) return;
        
        const isSelected = currentGame.selectedClues.includes(clueId);
        
        const btn = document.createElement('button');
        btn.className = `select-btn evidence-btn ${isSelected ? 'selected' : ''}`;
        btn.innerHTML = `
            <div class="checkbox">
                ${isSelected ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div>
                <span class="name">${clue.label}</span>
                <span class="role">${clue.description.substring(0, 50)}...</span>
            </div>
        `;
        btn.onclick = () => {
            if (isSelected) {
                currentGame.selectedClues = currentGame.selectedClues.filter(id => id !== clueId);
            } else {
                currentGame.selectedClues.push(clueId);
            }
            renderAccusationModal();
        };
        evidenceGrid.appendChild(btn);
    });
    
    document.getElementById('selected-evidence-count').textContent = currentGame.selectedClues.length;
}

function confirmAccusation() {
    if (!currentGame.selectedAccuseSuspect) {
        showToast('Select a suspect', 'error');
        return;
    }
    
    if (currentGame.selectedClues.length < 3) {
        showToast('Select at least 3 pieces of evidence', 'error');
        return;
    }
    
    closeModal('accusation-modal');
    
    const suspect = currentGame.selectedAccuseSuspect;
    const isCorrect = suspect.is_guilty;
    const caseData = currentGame.caseData;
    
    // Calculate ending type
    let endingType;
    let xpEarned = 0;
    
    const violations = currentGame.proceduralViolations.length;
    const maxViolations = caseData.max_procedural_violations;
    const convictionProb = currentGame.convictionProbability;
    const threshold = caseData.conviction_threshold;
    const legalEvidence = currentGame.evidenceLegallyObtained.length;
    
    if (violations > maxViolations || currentGame.proceduralRisk === 'CRITICAL') {
        endingType = 'COMPROMISED';
    } else if (legalEvidence < 3) {
        endingType = 'DISMISSED';
    } else if (!isCorrect) {
        endingType = 'DISMISSED';
    } else if (convictionProb < threshold) {
        endingType = 'DISMISSED';
    } else if (convictionProb >= 85 && currentGame.proceduralRisk === 'LOW') {
        endingType = 'ESCALATED';
    } else {
        endingType = 'CLOSED';
    }
    
    // Get ending data
    const ending = caseData.endings.find(e => e.type === endingType) || caseData.endings[0];
    
    xpEarned = ending.cp_base;
    if (isCorrect) {
        xpEarned += Math.min(currentGame.selectedClues.length * 3, 15);
    }
    if (currentGame.proceduralRisk === 'LOW') {
        xpEarned += 10;
    }
    
    endGame(endingType, ending, isCorrect, xpEarned);
}

// ============== GAME END ==============
function endGame(endType, ending = null, isCorrect = false, xpEarned = 0) {
    stopTimer();
    
    if (endType === 'timeout') {
        ending = {
            type: 'COMPROMISED',
            title: 'Time Expired',
            narration: 'The investigation window has closed. Without a conclusive resolution, the case remains open. The Bureau marks this as an operational failure.'
        };
        xpEarned = 0;
    }
    
    // Update user stats
    if (currentUser) {
        currentUser.career_points += xpEarned;
        if (endType === 'CLOSED' || endType === 'ESCALATED') {
            currentUser.cases_solved = (currentUser.cases_solved || 0) + 1;
        }
        
        // Save updated user
        const users = getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            saveUsers(users);
        }
        saveToStorage('currentUser', currentUser);
    }
    
    const { rank, title } = getRank(currentUser.career_points);
    
    // Render game over screen
    const statusClass = {
        'CLOSED': 'success',
        'ESCALATED': 'escalated',
        'DISMISSED': 'warning',
        'COMPROMISED': 'failure'
    }[endType] || 'failure';
    
    const content = document.getElementById('gameover-content');
    content.innerHTML = `
        <div class="gameover-status ${statusClass}">CASE STATUS: ${endType}</div>
        <h1 class="gameover-title">${ending.title}</h1>
        <p class="gameover-narration">${ending.narration}</p>
        <div class="gameover-stats">
            <div class="gameover-stat">
                <div class="label">VERDICT</div>
                <div class="value" style="color: ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-red)'}">${isCorrect ? 'CORRECT' : 'INCORRECT'}</div>
            </div>
            <div class="gameover-stat">
                <div class="label">XP EARNED</div>
                <div class="value">${xpEarned > 0 ? '+' : ''}${xpEarned}</div>
            </div>
            <div class="gameover-stat">
                <div class="label">CONVICTION %</div>
                <div class="value" style="color: ${currentGame.convictionProbability >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}">${currentGame.convictionProbability}%</div>
            </div>
            <div class="gameover-stat">
                <div class="label">VIOLATIONS</div>
                <div class="value" style="color: ${currentGame.proceduralViolations.length > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)'}">${currentGame.proceduralViolations.length}</div>
            </div>
        </div>
        <div class="gameover-rank">
            <div class="label">CURRENT RANK</div>
            <div class="value">${title}</div>
        </div>
        <div class="gameover-actions">
            <button class="btn btn-ghost" onclick="exitGame()">
                <i class="fas fa-home"></i> Return to Dashboard
            </button>
            <button class="btn btn-primary" onclick="replayGame()">
                <i class="fas fa-redo"></i> Replay Case
            </button>
        </div>
    `;
    
    openModal('gameover-modal');
}

function exitGame() {
    stopTimer();
    currentGame = null;
    closeModal('gameover-modal');
    loadDashboard();
}

function replayGame() {
    closeModal('gameover-modal');
    const caseId = currentGame.caseData.id;
    currentGame = null;
    startGame(caseId);
}

// ============== MODALS ==============
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
