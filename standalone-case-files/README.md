# CASE FILES - FBI Investigation Game

A standalone, hyper-realistic FBI investigation game built with vanilla HTML, CSS, and JavaScript. Now with AI-powered interrogations and a case editor!

## Features

### Core Gameplay
- **5 Complete Cases**: Homicide, Cybercrime, Kidnapping, Financial Crimes, and Domestic Terrorism
- **Procedural Risk System**: Your choices affect the case outcome
- **Conviction Probability Tracking**: Build a strong case with legally obtained evidence
- **Multiple Endings**: CLOSED, DISMISSED, COMPROMISED, or ESCALATED based on investigation quality
- **Career Progression**: Earn XP and climb the ranks from Analyst to Task Force Lead

### AI-Powered Interrogations (Optional)
- **OpenAI GPT Integration**: Suspects respond dynamically to your questions
- **Approach Selection**: Professional, Aggressive, Sympathetic, or Strategic Silence
- **Miranda Rights System**: Proper procedure affects case outcomes
- **Suspect Personalities**: Each suspect has unique traits that affect responses

### Sound System
- **Ambient Audio**: Immersive soundscapes for different scene types
- **Sound Effects**: Feedback for actions, discoveries, and warnings
- **Adjustable Volume**: Control audio through settings

### Case Editor
- **Create Custom Cases**: Design your own investigations
- **Add Suspects**: Define personalities, motives, and alibis
- **Build Scenes**: Create narrative with branching choices
- **Define Evidence**: Add clues with legal requirements
- **Set Endings**: Configure multiple outcomes

## Project Structure

```
standalone-case-files/
├── index.html      # Main HTML file
├── styles.css      # All CSS styles
├── app.js          # Main application logic + AI + Audio + Editor
├── cases.js        # 5 complete cases + audio config
├── vercel.json     # Vercel deployment config
├── netlify.toml    # Netlify deployment config
└── README.md       # This file
```

## Run Locally

### Option 1: Simple HTTP Server (Python)
```bash
cd standalone-case-files
python -m http.server 8080
```
Open http://localhost:8080

### Option 2: Live Server (VS Code)
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

### Option 3: Node.js
```bash
npx serve standalone-case-files
```

## Deploy to Vercel

### CLI Deployment
```bash
npm install -g vercel
cd standalone-case-files
vercel
```

### Dashboard Deployment
1. Push to GitHub/GitLab
2. Go to [vercel.com](https://vercel.com)
3. Import repository → Deploy

## Deploy to Netlify

### CLI Deployment
```bash
npm install -g netlify-cli
cd standalone-case-files
netlify deploy --prod
```

### Drag & Drop
1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag the folder to deploy area

## OpenAI Integration Setup

The AI interrogation feature is **optional**. Without an API key, the game uses simulated responses.

### To Enable AI:
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. In-game: Click ⚙️ Settings
3. Paste your API key
4. Save

### Supported Models
The integration uses GPT-4o for realistic suspect roleplay.

## Included Cases

| Case | Type | Difficulty | Time |
|------|------|------------|------|
| The Riverside Conspiracy | Homicide | ⭐⭐⭐ | 20 min |
| Digital Ghost | Cybercrime | ⭐⭐⭐⭐ | 25 min |
| The Vanishing Act | Kidnapping | ⭐⭐⭐⭐⭐ | 15 min |
| The Ponzi Prince | Financial | ⭐⭐⭐⭐ | 25 min |
| Countdown | Terrorism | ⭐⭐⭐⭐⭐ | 18 min |

## Creating Custom Cases

1. Go to Dashboard
2. Click "Create Custom Case"
3. Fill in case details:
   - Case ID and title
   - Victim overview
   - Add suspects (mark one as guilty)
   - Create scenes with choices
   - Define clues/evidence
   - Configure endings
4. Save and play!

### Case Structure
```javascript
{
    id: "custom-xxx",
    case_id: "FBI-CUS-24-001",
    case_type: "HOM",
    title: "Your Case Title",
    suspects: [{
        name: "Suspect Name",
        is_guilty: true,
        personality_type: "defensive",
        // ...
    }],
    scenes: [{
        id: "S0",
        title: "Scene Title",
        narration: "What happens...",
        choices: [{
            text: "Choice text",
            next_scene_id: "S1",
            add_clues: ["clue-1"]
        }]
    }],
    clues: [{
        id: "clue-1",
        label: "Evidence Name",
        description: "What it proves"
    }],
    endings: [{
        type: "CLOSED",
        title: "Success",
        narration: "Victory text"
    }]
}
```

## Audio Sources

Ambient sounds and effects are loaded from Mixkit (free to use):
- Office ambiance
- Outdoor environments
- Rain and weather
- Lab equipment
- Sirens and alerts
- Courtroom atmosphere

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Local Storage

The game saves to browser localStorage:
- User accounts and progress
- Custom cases
- Settings (audio, API key)

## License

MIT License - Free to use, modify, and distribute.

---

Built with ❤️ for aspiring FBI agents everywhere.
