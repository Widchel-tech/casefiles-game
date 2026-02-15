# CASE FILES - FBI Investigation Game Platform
## Product Requirements Document

### Original Problem Statement
Build "CASE FILES" - a hyper-realistic FBI investigation game platform featuring:
- Player web app for playing FBI investigation cases with scenes, choices, clues, procedural risk tracking
- Owner/Admin portal for case management, media uploads, analytics, subscriptions
- AI-powered case generation and suspect interrogation using OpenAI GPT-5.2
- Subscription system ($10.99/mo, $100/yr) with Stripe integration
- Persistent career progression with levels and career points
- Real money payouts via Stripe Connect for subscription revenue
- Freemium model: first case is free, all subsequent cases require subscription

### User Personas
1. **Players**: Crime/detective enthusiasts, true crime fans, ages 18-45 who enjoy procedural investigation games
2. **Game Owner**: Platform administrator managing cases, analytics, subscriptions, and content

### Core Requirements (Static)
- Hyper-realistic FBI investigation gameplay
- Scene-based narrative with branching choices
- Procedural risk system (LOW/MEDIUM/HIGH)
- Timer-based cases
- AI interrogation system for suspects
- Career progression with levels
- Subscription-based monetization
- Owner portal for case management
- Stripe Connect for owner payouts

---

## What's Been Implemented (Feb 13, 2026)

### Backend (FastAPI + MongoDB)
- ✅ JWT-based authentication (player + owner)
- ✅ User registration/login with career progression
- ✅ Case CRUD operations (create, read, update, delete)
- ✅ Case validation endpoint
- ✅ Play session management (start, make choices, accusation)
- ✅ AI interrogation using OpenAI GPT-5.2 via emergentintegrations
- ✅ AI case generation endpoint
- ✅ Stripe subscription checkout and webhook handling
- ✅ Analytics endpoints (overview, per-case, leaderboard)
- ✅ Media upload to local file storage
- ✅ Stripe Connect endpoints for owner payouts

### Frontend (React + Tailwind + shadcn/ui)
- ✅ Landing page with FBI noir theme
- ✅ Player authentication (login/register)
- ✅ Player dashboard with agent dossier
- ✅ Case gameplay screen with:
  - Scene narration in typewriter font
  - Tabbed interface (Scene, Suspects, Clues, Timeline)
  - Choice selection with risk indicators
  - Timer display
  - Score and procedural risk tracking
  - AI interrogation modal
  - Final accusation system
  - Game endings (CLOSED/COMPROMISED)
- ✅ Leaderboard page
- ✅ Subscription page with Stripe checkout

### Owner Portal
- ✅ Owner login (restricted access)
- ✅ Dashboard with KPIs (players, sessions, completion rate)
- ✅ Case manager (list, publish/unpublish, delete)
- ✅ Case editor with tabbed interface:
  - Header (case ID, type, location, difficulty)
  - Suspects (CRUD with guilty flag)
  - Scenes (narration, choices, risk flags)
  - Clues (load-bearing/misdirection flags)
  - Endings (CLOSED_GOOD, COMPROMISED_BAD)
- ✅ AI case generation wizard
- ✅ Analytics dashboard with leaderboard
- ✅ Players management page
- ✅ Revenue & Payouts page with Stripe Connect
- ✅ Navigation bug FIXED (Feb 13, 2026)

### Sample Case Created
- "The Riverside Conspiracy" - Complete 10-scene homicide case with:
  - 3 suspects
  - 11 clues (including load-bearing and misdirection)
  - Branching narrative paths
  - Interview scenes with Q/A format
  - Multiple risk-affecting choices
  - Proper endings

---

## Prioritized Backlog

### P0 - Critical (MVP Complete)
- ✅ Core gameplay loop
- ✅ Authentication system
- ✅ Case management
- ✅ Subscription system
- ✅ Owner portal navigation (FIXED)
- ✅ Stripe Connect for payouts

### P1 - High Priority
- ✅ Media attachments per scene (crime scene photos, evidence images) - COMPLETED
- [ ] Case validation enforcement before publishing
- [ ] Player session replay functionality
- [ ] Export analytics to CSV

### P2 - Medium Priority
- [ ] Patch notes per case
- [ ] Bonus files system (unlockable documents)
- [ ] More detailed player analytics
- [ ] Mobile responsive improvements
- [ ] Email notifications for subscription

### P3 - Low Priority
- [ ] Multiple admin users
- [ ] Case templates for faster creation
- [ ] Achievement system
- [ ] Social sharing features

---

## Technical Architecture

### Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via emergentintegrations
- **Payments**: Stripe via emergentintegrations (subscriptions + Connect payouts)
- **Auth**: JWT tokens

### Key Credentials
- Owner Portal: admin@casefiles.fbi / admin123

### API Routes
- `/api/auth/*` - Player authentication
- `/api/owner/*` - Owner-only endpoints
- `/api/owner/revenue` - Revenue data
- `/api/owner/stripe/connect` - Stripe Connect onboarding
- `/api/owner/stripe/dashboard` - Stripe Express dashboard link
- `/api/cases` - Published cases for players
- `/api/play/*` - Gameplay endpoints
- `/api/payments/*` - Stripe subscription
- `/api/leaderboard` - Public leaderboard

---

## Changelog

### Feb 15, 2026
- **UPDATED**: Subscription pricing changed from $5/mo + $50/yr to **$10.99/mo + $100/yr**
- **UPDATED**: Yearly savings badge updated to "SAVE $32" (reflects 12 × $10.99 = $131.88 vs $100)
- **FIXED**: Stripe API error handling for production deployment
  - Added API key format validation (must start with `sk_live_` or `sk_test_`)
  - Changed error responses from 500 to 503 for service unavailability
  - Added `AuthenticationError` handling for invalid API keys
  - User-friendly error messages instead of raw Stripe errors
- Backend `SUBSCRIPTION_PACKAGES` updated in server.py
- Frontend `SubscriptionPage.js` pricing display updated
- Freemium model in place: first case free, subscription required for additional cases

### Feb 13, 2026
- **FIXED**: Owner portal navigation bug - Added missing routes for `/owner/analytics`, `/owner/users`, `/owner/revenue` in App.js
- **ADDED**: Revenue link to sidebar navigation in OwnerDashboardPage and OwnerCasesPage
- **ADDED**: Photo upload feature for suspects (portraits), clues (evidence photos), and scenes (crime scene photos)
- **ADDED**: ImageUpload reusable component with drag-and-drop support
- **VERIFIED**: All owner portal pages (Dashboard, Cases, Analytics, Players, Revenue) navigate correctly
- **VERIFIED**: Stripe Connect UI displays correctly on Revenue page
- **VERIFIED**: File upload API working correctly at `/api/owner/upload`

---

## Next Action Items
1. Test complete subscription flow with Stripe checkout ($10.99/mo or $100/yr)
2. Test Stripe Connect onboarding flow for owner payouts
3. Implement AI Case Generation (OpenAI GPT-5.2 integration)
4. Implement Analytics backend with detailed player metrics
5. Implement "Validate Case" feature before publishing
6. Create more sample cases using AI generation
7. Add session replay functionality for failed cases
