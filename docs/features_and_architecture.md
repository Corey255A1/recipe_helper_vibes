# 🏗️ Architecture & Features Technical Guide

This document details the software architecture, data structures, and implementation design of **Recipe Helper**.

---

## 1. Directory Structure

```
├── Dockerfile                  # Container definition with Node 22 and git
├── docker-compose.yml          # Bind mount volumes for zero-rebuild dev/prod
├── entrypoint.sh               # Auto-restart supervisor loop with git safe.directory
├── package.json                # Project dependencies
├── server/
│   ├── index.js                # Express app entrypoint & API mounting
│   ├── config.js               # Environment and data paths configuration
│   ├── routes/
│   │   ├── context.js          # Household rules, API key, model catalog routes
│   │   ├── grocery.js          # Persistent checklist & generation routes
│   │   ├── pantry.js           # Pantry inventory & AI image vision scan routes
│   │   ├── plan.js             # Meal plan schedule & suggestion routes
│   │   ├── recipes.js          # Recipe CRUD, PDF, and image extraction routes
│   │   └── system.js           # Git status & zero-rebuild update routes
│   ├── services/
│   │   ├── gemini.js           # Gemini SDK service, fallback cascade, url verification
│   │   ├── history.js          # Meal history persistence
│   │   └── recipeCache.js      # Markdown recipe store & file cache
│   └── utils/
│       ├── markdown.js         # Gray-matter recipe markdown serialization
│       └── slugify.js          # ID slug generation
├── public/
│   ├── index.html              # Single page app shell & modals
│   ├── manifest.json           # Web App manifest for mobile installation
│   ├── css/
│   │   └── styles.css          # Cyberpunk/modern dark UI, mobile bottom navigation
│   └── js/
│       ├── app.js              # Client-side routing & page initialization
│       ├── api.js              # Fetch client for all backend endpoints
│       ├── utils.js            # Plan days calculation, ingredient scaling, timer parser, image downscaler
│       ├── components/
│       │   ├── confirmModal.js # Reusable confirmation dialogs
│       │   ├── loader.js       # Animated loading indicators
│       │   ├── recipeCard.js   # Recipe cards, Cook Mode, Wake Lock, timers
│       │   └── toast.js        # Notification toasts
│       └── views/
│           ├── context.js      # Settings, API key, model selector, updates
│           ├── grocery.js      # Smart checklist, custom items, aisle progress, pantry check
│           ├── matrix.js       # Desktop Excel-style multi-pane workspace & master sheets
│           ├── pantry.js       # Kitchen inventory & AI vision scan verification
│           ├── plan.js         # Flexible schedule, calendar list, day assignment
│           └── recipes.js      # Library, search, filter modal, photo import
└── data/                       # Bound storage volume (JSON files & Markdown recipes)
    ├── context.json            # Household rules, Gemini key, selected model
    ├── grocery.json            # Persistent grocery checklist state
    ├── history.json            # Completed meal history
    ├── pantry.json             # Persistent pantry inventory records
    ├── plans.json              # Active meal plans and assignments
    └── recipes/                # Markdown recipe files (.md) and uploaded PDFs
```

---

## 2. Key Architectural Subsystems

### A. Zero-Rebuild Container Architecture
1. **Bind Mounts**:
   `docker-compose.yml` mounts host directory to `/app` inside the container:
   ```yaml
   volumes:
     - ./data:/data
     - ./:/app
     - /app/node_modules
   ```
   `/app/node_modules` is an anonymous Docker volume, ensuring host OS and container Node dependencies do not clash.
2. **Supervisor Entrypoint (`entrypoint.sh`)**:
   Runs Node inside a loop:
   ```sh
   while true; do
     node server/index.js
     sleep 1
   done
   ```
3. **In-App Updater (`server/routes/system.js`)**:
   When triggered, executes `git pull --rebase --autostash` (or hard reset if forced) and kills the Node process with `process.exit(0)`. The supervisor immediately restarts it with fresh code without restarting the Docker container.

---

### B. Gemini AI Integration & Model Selection
1. **Dynamic Model Discovery (`GET /api/context/models`)**:
   Queries `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}` to retrieve active models that support `generateContent`.
2. **Preferred Model Hierarchy**:
   - User-chosen model in `data/context.json` (defaults to `gemini-3.8-flash`)
   - `gemini-3.8-flash`
   - `gemini-3.5-flash`
   - `gemini-2.5-flash`
   - `gemini-2.0-flash`
   - `gemini-1.5-flash`
   - `gemini-2.5-pro`
   - `gemini-1.5-pro`
3. **Web Recipe URL Verification (`validateAndResolveWebUrls`)**:
   Web recipe suggestions are verified via parallel HTTP `HEAD` checks with a 2.5-second timeout. Any 404, 500, or invalid link automatically falls back to:
   ```
   https://www.google.com/search?q=${encodeURIComponent(title + ' recipe')}
   ```
   This prevents broken links and ensures suggestions are immediately usable.

---

### C. Meal Plan Scheduling
1. **Data Model**:
   ```json
   {
     "weekOf": "2026-10-21",
     "startDate": "2026-10-21",
     "daysCount": 5,
     "status": "in_progress",
     "meals": [
       {
         "recipeId": "lemon-herb-roast-chicken",
         "title": "Lemon Herb Roast Chicken",
         "assignedDays": ["2026-10-21", "2026-10-22"],
         "servings": 4,
         "mealType": "Dinner"
       }
     ]
   }
   ```
2. **Dynamic Days Resolution (`Utils.getPlanDays`)**:
   Computes exact date strings (`YYYY-MM-DD`), day abbreviations (`WED`, `THU`), and formatted labels (`Wed, Oct 21`).
3. **Proportional Meal Sizing**:
   `neededMeals` scales dynamically:
   ```javascript
   const targetDays = targetWeek.daysCount || 7;
   const targetMeals = context.mealsPerWeek 
     ? Math.max(1, Math.round((context.mealsPerWeek / 7) * targetDays)) 
     : targetDays;
   ```

---

### D. Smart Grocery Checklist
1. **Category Mapping**:
   Categorizes items into:
   - Produce
   - Dairy
   - Proteins
   - Pantry
   - Bakery
   - Frozen
   - Spices & Oils
   - Household / Other
2. **Persistence**:
   Checked items and custom non-recipe additions are stored in `data/grocery.json` and synchronized across devices.
3. **Rebuild Mechanism**:
   Regenerating aggregates ingredients from all meals across currently selected active plans.

---

### E. Interactive Cook Mode
1. **Screen Wake Lock**:
   Uses the Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent display timeout during cooking.
2. **Portion Multiplier**:
   Regular expressions detect leading quantities (fractions, mixed numbers, decimals, unicode fractions like `½`, `¼`) and scale them cleanly.
3. **Instruction Timers**:
   Regex pattern `\b(\d+)(?:\s*[-–to]+\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?)\b` wraps durations into interactive timer buttons that launch floating countdowns with Web Audio chime alerts.
