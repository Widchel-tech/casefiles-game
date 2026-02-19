// Case Files - Main Application Logic
// Standalone version with OpenAI integration and audio system

// ============== CONFIGURATION ==============
const CONFIG = {
    openaiApiKey: localStorage.getItem('casefiles_openai_key') || null,
    audioEnabled: localStorage.getItem('casefiles_audio_enabled') !== 'false',
    audioVolume: parseFloat(localStorage.getItem('casefiles_audio_volume')) || 0.3
};

// ============== STATE MANAGEMENT ==============
let currentUser = null;
let currentGame = null;
let currentAmbientAudio = null;

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

// Custom cases storage
function getCustomCases() {
    return loadFromStorage('custom_cases') || [];
}

function saveCustomCases(cases) {
    saveToStorage('custom_cases', cases);
}

// ============== AUDIO SYSTEM ==============
class AudioManager {
    constructor() {
        this.ambientAudio = null;
        this.volume = CONFIG.audioVolume;
        this.enabled = CONFIG.audioEnabled;
    }
    
    setVolume(volume) {
        this.volume = volume;
        if (this.ambientAudio) {
            this.ambientAudio.volume = volume;
        }
        localStorage.setItem('casefiles_audio_volume', volume);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('casefiles_audio_enabled', this.enabled);
        if (!this.enabled) {
            this.stopAmbient();
        }
        return this.enabled;
    }
    
    playAmbient(type) {
        if (!this.enabled) return;
        
        const url = getAmbientAudio(type);
        if (!url) return;
        
        // Stop current ambient if playing
        this.stopAmbient();
        
        this.ambientAudio = new Audio(url);
        this.ambientAudio.loop = true;
        this.ambientAudio.volume = this.volume;
        this.ambientAudio.play().catch(() => {
            // Autoplay blocked - ignore
        });
    }
    
    stopAmbient() {
        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.ambientAudio = null;
        }
    }
    
    playEffect(type) {
        if (!this.enabled) return;
        
        const url = getSoundEffect(type);
        if (!url) return;
        
        const audio = new Audio(url);
        audio.volume = this.volume * 0.5; // Effects are quieter
        audio.play().catch(() => {});
    }
}

const audioManager = new AudioManager();

// ============== OPENAI INTEGRATION ==============
class OpenAIClient {
    constructor() {
        this.apiKey = CONFIG.openaiApiKey;
    }
    
    setApiKey(key) {
        this.apiKey = key;
        CONFIG.openaiApiKey = key;
        localStorage.setItem('casefiles_openai_key', key);
    }
    
    hasApiKey() {
        return !!this.apiKey;
    }
    
    async generateInterrogationResponse(suspect, question, approach, context) {
        if (!this.apiKey) {
            return this.fallbackResponse(suspect, question, approach);
        }
        
        const systemPrompt = `You are ${suspect.name}, a ${suspect.age}-year-old ${suspect.role} being interrogated by an FBI agent.

Character details:
- Personality: ${suspect.personality_type}
- ${suspect.is_guilty ? 'You ARE guilty but trying to hide it.' : 'You are innocent.'}
- Motive angle: ${suspect.motive_angle}
- Alibi: ${suspect.alibi_summary}
- Current cooperation level: ${context.cooperation}%

The agent is using a ${approach} approach.

Rules:
1. Stay in character as ${suspect.name}
2. Be realistic and nuanced in your responses
3. ${suspect.is_guilty ? 'Show subtle signs of guilt when pressured but do not confess easily.' : 'Maintain your innocence but show appropriate nervousness about being a suspect.'}
4. React appropriately to the interrogation approach:
   - Professional: Respond formally
   - Aggressive: Become defensive or hostile
   - Sympathetic: May open up more
   - Strategic silence: Become uncomfortable with pauses
5. Keep responses to 2-3 sentences
6. If cooperation is below 30% and aggressive approach is used, consider requesting a lawyer`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Agent asks: "${question}"` }
                    ],
                    max_tokens: 150,
                    temperature: 0.8
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const data = await response.json();
            const text = data.choices[0].message.content;
            
            // Determine if suspect should request lawyer or show breaking
            const lawyerRequested = text.toLowerCase().includes('lawyer') || 
                                   text.toLowerCase().includes('attorney');
            const suspectBreaking = suspect.is_guilty && 
                                   context.cooperation < 30 && 
                                   (text.includes('...') || text.toLowerCase().includes('i need'));
            
            return { text, lawyerRequested, suspectBreaking };
        } catch (error) {
            console.error('OpenAI error:', error);
            return this.fallbackResponse(suspect, question, approach);
        }
    }
    
    fallbackResponse(suspect, question, approach) {
        // Fallback to simulated responses when no API key
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
        const text = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
        
        const lawyerRequested = approach === 'aggressive' && Math.random() < 0.3;
        const suspectBreaking = suspect.is_guilty && Math.random() < 0.2;
        
        return { text, lawyerRequested, suspectBreaking };
    }
}

const openaiClient = new OpenAIClient();

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
    audioManager.playEffect(type === 'success' ? 'success' : type === 'error' ? 'error' : 'click');
    
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
    
    // Stop ambient audio when leaving gameplay
    if (pageId !== 'gameplay-page') {
        audioManager.stopAmbient();
    }
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
        password,
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
    audioManager.stopAmbient();
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
    // Combine built-in and custom cases
    const builtInCases = getCases();
    const customCases = getCustomCases();
    const allCases = [...builtInCases, ...customCases];
    
    const casesGrid = document.getElementById('cases-list');
    casesGrid.innerHTML = '';
    
    allCases.forEach(caseData => {
        const card = document.createElement('div');
        card.className = 'case-card';
        
        const difficultyDots = Array(5).fill(0).map((_, i) => 
            `<span class="${i < caseData.difficulty ? 'active' : ''}"></span>`
        ).join('');
        
        const isCustom = customCases.some(c => c.id === caseData.id);
        
        card.innerHTML = `
            <div class="case-card-header">
                <span class="case-card-id">${caseData.case_id}</span>
                <div style="display: flex; gap: 0.5rem;">
                    ${isCustom ? '<span class="case-card-badge" style="color: var(--accent-blue); border-color: var(--accent-blue);">CUSTOM</span>' : ''}
                    <span class="case-card-badge ${caseData.is_free ? 'free' : 'premium'}">
                        ${caseData.is_free ? 'FREE' : 'PREMIUM'}
                    </span>
                </div>
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
    
    // Add "Create Case" card
    const createCard = document.createElement('div');
    createCard.className = 'case-card';
    createCard.style.borderStyle = 'dashed';
    createCard.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; text-align: center;">
            <i class="fas fa-plus-circle" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3 style="color: var(--text-muted);">Create Custom Case</h3>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">Design your own investigation</p>
            <button class="btn btn-ghost" onclick="openCaseEditor()">
                <i class="fas fa-edit"></i> Case Editor
            </button>
        </div>
    `;
    casesGrid.appendChild(createCard);
}

// ============== GAMEPLAY ==============
function startGame(caseId) {
    // Check both built-in and custom cases
    let caseData = getCaseById(caseId);
    if (!caseData) {
        const customCases = getCustomCases();
        caseData = customCases.find(c => c.id === caseId);
    }
    
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
    
    // Start ambient audio
    const firstScene = caseData.scenes[0];
    audioManager.playAmbient(firstScene?.ambient_audio || caseData.ambient_audio || 'office');
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
    
    // Update ambient audio for current scene
    if (currentScene.ambient_audio) {
        audioManager.playAmbient(currentScene.ambient_audio);
    }
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
    audioManager.playEffect('click');
}

// ============== GAME ACTIONS ==============
function makeChoice(choice) {
    audioManager.playEffect('click');
    
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
                audioManager.playEffect('clue_found');
                
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
            audioManager.playEffect('warning');
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
    
    // Show AI badge if enabled
    const aiIndicator = document.getElementById('ai-indicator');
    if (aiIndicator) {
        aiIndicator.style.display = openaiClient.hasApiKey() ? 'flex' : 'none';
    }
    
    openModal('interrogation-modal');
    audioManager.playAmbient('interrogation');
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

async function sendQuestion() {
    const questionInput = document.getElementById('interrogation-question');
    const question = questionInput.value.trim();
    
    if (!question || !currentGame.currentInterrogationSuspect) return;
    
    const suspect = currentGame.currentInterrogationSuspect;
    const approach = document.getElementById('interrogation-approach').value;
    
    // Show typing indicator
    const chatContainer = document.getElementById('interrogation-chat');
    chatContainer.innerHTML += '<div class="chat-message"><div class="chat-response">Thinking...</div></div>';
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    audioManager.playEffect('typing');
    
    // Get response (from OpenAI or fallback)
    const context = {
        cooperation: currentGame.suspectCooperation[suspect.id] || 50,
        cluesCollected: currentGame.cluesCollected.length
    };
    
    const response = await openaiClient.generateInterrogationResponse(suspect, question, approach, context);
    
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
            audioManager.playEffect('click');
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
            audioManager.playEffect('click');
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
    audioManager.stopAmbient();
    
    if (endType === 'timeout') {
        ending = {
            type: 'COMPROMISED',
            title: 'Time Expired',
            narration: 'The investigation window has closed. Without a conclusive resolution, the case remains open. The Bureau marks this as an operational failure.'
        };
        xpEarned = 0;
    }
    
    // Play appropriate sound
    if (endType === 'CLOSED' || endType === 'ESCALATED') {
        audioManager.playEffect('case_closed');
    } else {
        audioManager.playEffect('error');
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
    audioManager.stopAmbient();
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

// ============== CASE EDITOR ==============
let editorCase = null;

function openCaseEditor(caseId = null) {
    if (caseId) {
        const customCases = getCustomCases();
        editorCase = customCases.find(c => c.id === caseId) || createEmptyCase();
    } else {
        editorCase = createEmptyCase();
    }
    
    renderCaseEditor();
    showPage('editor-page');
}

function createEmptyCase() {
    return {
        id: 'custom-' + Date.now(),
        case_id: 'FBI-CUS-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        case_type: 'HOM',
        title: '',
        location_county: '',
        location_state: 'California',
        victim_overview: '',
        summary: '',
        difficulty: 3,
        time_limit_minutes: 20,
        tags: [],
        threat_level: 'high',
        crime_classification: 'Homicide',
        conviction_threshold: 70,
        max_procedural_violations: 3,
        is_free: true,
        ambient_audio: 'office',
        suspects: [],
        scenes: [],
        clues: [],
        endings: [
            { id: 'end-1', type: 'CLOSED', title: 'Case Closed', narration: '', cp_base: 35, min_conviction_probability: 70, max_procedural_risk: 'medium' },
            { id: 'end-2', type: 'DISMISSED', title: 'Case Dismissed', narration: '', cp_base: 5, min_conviction_probability: 0, max_procedural_risk: 'critical' }
        ]
    };
}

function renderCaseEditor() {
    const editorContent = document.getElementById('editor-content');
    if (!editorContent) return;
    
    editorContent.innerHTML = `
        <div class="editor-section">
            <h3><i class="fas fa-file"></i> Case Details</h3>
            <div class="editor-grid">
                <div class="form-group">
                    <label>Case ID</label>
                    <input type="text" id="editor-case-id" value="${editorCase.case_id}" onchange="editorCase.case_id = this.value">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="editor-title" value="${editorCase.title}" onchange="editorCase.title = this.value" placeholder="The Mystery Case">
                </div>
                <div class="form-group">
                    <label>Case Type</label>
                    <select id="editor-type" onchange="editorCase.case_type = this.value; editorCase.crime_classification = this.options[this.selectedIndex].text.split(' - ')[1];">
                        <option value="HOM" ${editorCase.case_type === 'HOM' ? 'selected' : ''}>HOM - Homicide</option>
                        <option value="CYB" ${editorCase.case_type === 'CYB' ? 'selected' : ''}>CYB - Cybercrime</option>
                        <option value="KID" ${editorCase.case_type === 'KID' ? 'selected' : ''}>KID - Kidnapping</option>
                        <option value="FIN" ${editorCase.case_type === 'FIN' ? 'selected' : ''}>FIN - Financial</option>
                        <option value="TER" ${editorCase.case_type === 'TER' ? 'selected' : ''}>TER - Terrorism</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Threat Level</label>
                    <select id="editor-threat" onchange="editorCase.threat_level = this.value">
                        <option value="low" ${editorCase.threat_level === 'low' ? 'selected' : ''}>Low</option>
                        <option value="moderate" ${editorCase.threat_level === 'moderate' ? 'selected' : ''}>Moderate</option>
                        <option value="high" ${editorCase.threat_level === 'high' ? 'selected' : ''}>High</option>
                        <option value="critical" ${editorCase.threat_level === 'critical' ? 'selected' : ''}>Critical</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>County</label>
                    <input type="text" value="${editorCase.location_county}" onchange="editorCase.location_county = this.value" placeholder="Los Angeles">
                </div>
                <div class="form-group">
                    <label>State</label>
                    <input type="text" value="${editorCase.location_state}" onchange="editorCase.location_state = this.value" placeholder="California">
                </div>
                <div class="form-group">
                    <label>Difficulty (1-5)</label>
                    <input type="number" min="1" max="5" value="${editorCase.difficulty}" onchange="editorCase.difficulty = parseInt(this.value)">
                </div>
                <div class="form-group">
                    <label>Time Limit (minutes)</label>
                    <input type="number" min="5" max="60" value="${editorCase.time_limit_minutes}" onchange="editorCase.time_limit_minutes = parseInt(this.value)">
                </div>
            </div>
            <div class="form-group">
                <label>Victim Overview</label>
                <textarea rows="3" onchange="editorCase.victim_overview = this.value" placeholder="Description of the victim and circumstances...">${editorCase.victim_overview}</textarea>
            </div>
            <div class="form-group">
                <label>Case Summary</label>
                <textarea rows="3" onchange="editorCase.summary = this.value" placeholder="Brief summary of the case...">${editorCase.summary}</textarea>
            </div>
        </div>
        
        <div class="editor-section">
            <div class="section-header">
                <h3><i class="fas fa-users"></i> Suspects (${editorCase.suspects.length})</h3>
                <button class="btn btn-ghost btn-sm" onclick="addEditorSuspect()">
                    <i class="fas fa-plus"></i> Add Suspect
                </button>
            </div>
            <div id="editor-suspects">
                ${editorCase.suspects.map((s, i) => renderEditorSuspect(s, i)).join('')}
            </div>
        </div>
        
        <div class="editor-section">
            <div class="section-header">
                <h3><i class="fas fa-film"></i> Scenes (${editorCase.scenes.length})</h3>
                <button class="btn btn-ghost btn-sm" onclick="addEditorScene()">
                    <i class="fas fa-plus"></i> Add Scene
                </button>
            </div>
            <div id="editor-scenes">
                ${editorCase.scenes.map((s, i) => renderEditorScene(s, i)).join('')}
            </div>
        </div>
        
        <div class="editor-section">
            <div class="section-header">
                <h3><i class="fas fa-search"></i> Clues/Evidence (${editorCase.clues.length})</h3>
                <button class="btn btn-ghost btn-sm" onclick="addEditorClue()">
                    <i class="fas fa-plus"></i> Add Clue
                </button>
            </div>
            <div id="editor-clues">
                ${editorCase.clues.map((c, i) => renderEditorClue(c, i)).join('')}
            </div>
        </div>
        
        <div class="editor-section">
            <h3><i class="fas fa-flag-checkered"></i> Endings</h3>
            <div id="editor-endings">
                ${editorCase.endings.map((e, i) => renderEditorEnding(e, i)).join('')}
            </div>
        </div>
    `;
}

function renderEditorSuspect(suspect, index) {
    return `
        <div class="editor-item">
            <div class="item-header">
                <span>Suspect ${index + 1}: ${suspect.name || 'Unnamed'}</span>
                <button class="btn btn-ghost btn-sm" onclick="removeEditorSuspect(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="editor-grid">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" value="${suspect.name}" onchange="editorCase.suspects[${index}].name = this.value; renderCaseEditor()">
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" value="${suspect.age}" onchange="editorCase.suspects[${index}].age = parseInt(this.value)">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" value="${suspect.role}" onchange="editorCase.suspects[${index}].role = this.value">
                </div>
                <div class="form-group">
                    <label>Personality</label>
                    <select onchange="editorCase.suspects[${index}].personality_type = this.value">
                        <option value="cooperative" ${suspect.personality_type === 'cooperative' ? 'selected' : ''}>Cooperative</option>
                        <option value="defensive" ${suspect.personality_type === 'defensive' ? 'selected' : ''}>Defensive</option>
                        <option value="hostile" ${suspect.personality_type === 'hostile' ? 'selected' : ''}>Hostile</option>
                        <option value="calculating" ${suspect.personality_type === 'calculating' ? 'selected' : ''}>Calculating</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" ${suspect.is_guilty ? 'checked' : ''} onchange="editorCase.suspects[${index}].is_guilty = this.checked">
                        Is Guilty
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Motive</label>
                <textarea rows="2" onchange="editorCase.suspects[${index}].motive_angle = this.value">${suspect.motive_angle || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Alibi</label>
                <textarea rows="2" onchange="editorCase.suspects[${index}].alibi_summary = this.value">${suspect.alibi_summary || ''}</textarea>
            </div>
        </div>
    `;
}

function renderEditorScene(scene, index) {
    return `
        <div class="editor-item">
            <div class="item-header">
                <span>Scene ${index}: ${scene.title || 'Untitled'}</span>
                <button class="btn btn-ghost btn-sm" onclick="removeEditorScene(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="editor-grid">
                <div class="form-group">
                    <label>Scene ID</label>
                    <input type="text" value="${scene.id}" onchange="editorCase.scenes[${index}].id = this.value">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${scene.title}" onchange="editorCase.scenes[${index}].title = this.value; renderCaseEditor()">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" ${scene.is_accusation_scene ? 'checked' : ''} onchange="editorCase.scenes[${index}].is_accusation_scene = this.checked">
                        Accusation Scene
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Narration</label>
                <textarea rows="4" onchange="editorCase.scenes[${index}].narration = this.value">${scene.narration || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Choices (${scene.choices?.length || 0})</label>
                <button class="btn btn-ghost btn-sm" onclick="addEditorChoice(${index})">
                    <i class="fas fa-plus"></i> Add Choice
                </button>
            </div>
            <div class="choices-list">
                ${(scene.choices || []).map((c, ci) => `
                    <div class="choice-item">
                        <input type="text" value="${c.text}" onchange="editorCase.scenes[${index}].choices[${ci}].text = this.value" placeholder="Choice text...">
                        <input type="text" value="${c.next_scene_id}" onchange="editorCase.scenes[${index}].choices[${ci}].next_scene_id = this.value" placeholder="Next Scene ID" style="width: 100px;">
                        <button class="btn btn-ghost btn-sm" onclick="removeEditorChoice(${index}, ${ci})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderEditorClue(clue, index) {
    return `
        <div class="editor-item">
            <div class="item-header">
                <span>Clue: ${clue.label || 'Unnamed'}</span>
                <button class="btn btn-ghost btn-sm" onclick="removeEditorClue(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="editor-grid">
                <div class="form-group">
                    <label>ID</label>
                    <input type="text" value="${clue.id}" onchange="editorCase.clues[${index}].id = this.value">
                </div>
                <div class="form-group">
                    <label>Label</label>
                    <input type="text" value="${clue.label}" onchange="editorCase.clues[${index}].label = this.value; renderCaseEditor()">
                </div>
                <div class="form-group">
                    <label>Evidence Strength</label>
                    <input type="number" min="1" max="25" value="${clue.evidence_strength || 10}" onchange="editorCase.clues[${index}].evidence_strength = parseInt(this.value)">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" ${clue.load_bearing ? 'checked' : ''} onchange="editorCase.clues[${index}].load_bearing = this.checked">
                        Key Evidence
                    </label>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" onchange="editorCase.clues[${index}].description = this.value">${clue.description || ''}</textarea>
            </div>
        </div>
    `;
}

function renderEditorEnding(ending, index) {
    return `
        <div class="editor-item">
            <div class="editor-grid">
                <div class="form-group">
                    <label>Type</label>
                    <select onchange="editorCase.endings[${index}].type = this.value">
                        <option value="CLOSED" ${ending.type === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                        <option value="DISMISSED" ${ending.type === 'DISMISSED' ? 'selected' : ''}>DISMISSED</option>
                        <option value="COMPROMISED" ${ending.type === 'COMPROMISED' ? 'selected' : ''}>COMPROMISED</option>
                        <option value="ESCALATED" ${ending.type === 'ESCALATED' ? 'selected' : ''}>ESCALATED</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${ending.title}" onchange="editorCase.endings[${index}].title = this.value">
                </div>
                <div class="form-group">
                    <label>XP Base</label>
                    <input type="number" value="${ending.cp_base}" onchange="editorCase.endings[${index}].cp_base = parseInt(this.value)">
                </div>
            </div>
            <div class="form-group">
                <label>Narration</label>
                <textarea rows="3" onchange="editorCase.endings[${index}].narration = this.value">${ending.narration || ''}</textarea>
            </div>
        </div>
    `;
}

function addEditorSuspect() {
    editorCase.suspects.push({
        id: 'suspect-' + Date.now(),
        name: '',
        age: 30,
        role: '',
        motive_angle: '',
        alibi_summary: '',
        is_guilty: false,
        personality_type: 'defensive',
        breaking_point: 3,
        lawyer_threshold: 2,
        cooperation_level: 50
    });
    renderCaseEditor();
}

function removeEditorSuspect(index) {
    editorCase.suspects.splice(index, 1);
    renderCaseEditor();
}

function addEditorScene() {
    const sceneNum = editorCase.scenes.length;
    editorCase.scenes.push({
        id: 'S' + sceneNum,
        order: sceneNum,
        title: '',
        narration: '',
        is_interview_scene: false,
        is_accusation_scene: false,
        scene_type: 'investigation',
        ambient_audio: 'office',
        choices: [],
        media_urls: []
    });
    renderCaseEditor();
}

function removeEditorScene(index) {
    editorCase.scenes.splice(index, 1);
    renderCaseEditor();
}

function addEditorChoice(sceneIndex) {
    if (!editorCase.scenes[sceneIndex].choices) {
        editorCase.scenes[sceneIndex].choices = [];
    }
    editorCase.scenes[sceneIndex].choices.push({
        id: 'choice-' + Date.now(),
        text: '',
        score_delta: 0,
        add_clues: [],
        require_clues: [],
        next_scene_id: '',
        risk_flag: 'none',
        conviction_delta: 0,
        evidence_strength_delta: 0
    });
    renderCaseEditor();
}

function removeEditorChoice(sceneIndex, choiceIndex) {
    editorCase.scenes[sceneIndex].choices.splice(choiceIndex, 1);
    renderCaseEditor();
}

function addEditorClue() {
    editorCase.clues.push({
        id: 'clue-' + Date.now(),
        label: '',
        description: '',
        load_bearing: false,
        misdirection: false,
        evidence_category: 'physical',
        evidence_type: 'generic',
        chain_of_custody: true,
        legally_obtained: true,
        evidence_strength: 10
    });
    renderCaseEditor();
}

function removeEditorClue(index) {
    editorCase.clues.splice(index, 1);
    renderCaseEditor();
}

function saveCaseEditor() {
    if (!editorCase.title) {
        showToast('Please enter a case title', 'error');
        return;
    }
    
    if (editorCase.suspects.length === 0) {
        showToast('Please add at least one suspect', 'error');
        return;
    }
    
    if (editorCase.scenes.length === 0) {
        showToast('Please add at least one scene', 'error');
        return;
    }
    
    const customCases = getCustomCases();
    const existingIndex = customCases.findIndex(c => c.id === editorCase.id);
    
    if (existingIndex !== -1) {
        customCases[existingIndex] = editorCase;
    } else {
        customCases.push(editorCase);
    }
    
    saveCustomCases(customCases);
    showToast('Case saved successfully!', 'success');
    loadDashboard();
}

function closeCaseEditor() {
    editorCase = null;
    loadDashboard();
}

// ============== SETTINGS ==============
function openSettings() {
    openModal('settings-modal');
    
    // Update settings display
    document.getElementById('settings-audio-enabled').checked = audioManager.enabled;
    document.getElementById('settings-audio-volume').value = audioManager.volume * 100;
    document.getElementById('settings-openai-key').value = CONFIG.openaiApiKey || '';
}

function saveSettings() {
    const audioEnabled = document.getElementById('settings-audio-enabled').checked;
    const audioVolume = parseInt(document.getElementById('settings-audio-volume').value) / 100;
    const openaiKey = document.getElementById('settings-openai-key').value.trim();
    
    audioManager.enabled = audioEnabled;
    audioManager.setVolume(audioVolume);
    localStorage.setItem('casefiles_audio_enabled', audioEnabled);
    
    if (openaiKey) {
        openaiClient.setApiKey(openaiKey);
        showToast('OpenAI key saved - AI interrogations enabled!', 'success');
    } else {
        localStorage.removeItem('casefiles_openai_key');
        CONFIG.openaiApiKey = null;
    }
    
    closeModal('settings-modal');
    showToast('Settings saved', 'success');
}

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Add settings modal HTML if not exists
    if (!document.getElementById('settings-modal')) {
        const settingsModal = document.createElement('div');
        settingsModal.id = 'settings-modal';
        settingsModal.className = 'modal';
        settingsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                    <button class="btn btn-ghost" onclick="closeModal('settings-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 1.5rem;">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="settings-audio-enabled" checked>
                            Enable Sound Effects & Ambient Audio
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Audio Volume</label>
                        <input type="range" id="settings-audio-volume" min="0" max="100" value="30">
                    </div>
                    <div class="form-group">
                        <label>OpenAI API Key (for AI Interrogations)</label>
                        <input type="password" id="settings-openai-key" placeholder="sk-...">
                        <small style="color: var(--text-muted);">Optional. Enables AI-powered suspect responses.</small>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="saveSettings()">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
            </div>
        `;
        document.getElementById('app').appendChild(settingsModal);
    }
    
    // Add editor page HTML if not exists
    if (!document.getElementById('editor-page')) {
        const editorPage = document.createElement('div');
        editorPage.id = 'editor-page';
        editorPage.className = 'page';
        editorPage.innerHTML = `
            <header class="dashboard-header">
                <div class="logo">
                    <i class="fas fa-fingerprint"></i>
                    <span>CASE FILES</span>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn btn-ghost" onclick="closeCaseEditor()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-primary" onclick="saveCaseEditor()">
                        <i class="fas fa-save"></i> Save Case
                    </button>
                </div>
            </header>
            <main class="editor-main" style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
                <h1 style="font-family: var(--font-heading); font-size: 2rem; margin-bottom: 2rem;">CASE EDITOR</h1>
                <div id="editor-content">
                    <!-- Editor content rendered dynamically -->
                </div>
            </main>
        `;
        document.getElementById('app').appendChild(editorPage);
    }
    
    // Add settings button to dashboard header
    const dashboardHeader = document.querySelector('#dashboard-page .dashboard-header .user-info');
    if (dashboardHeader && !dashboardHeader.querySelector('.settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn btn-ghost settings-btn';
        settingsBtn.onclick = openSettings;
        settingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
        dashboardHeader.insertBefore(settingsBtn, dashboardHeader.lastElementChild);
    }
});
