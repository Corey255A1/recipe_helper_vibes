# 🍳 Recipe Helper

A modern, mobile-friendly, AI-powered meal planner, recipe library, and grocery assistant designed for home kitchens and local network deployments.

---

## 🌟 Key Features

### 1. 📅 Flexible Meal Plan Scheduling
- **Custom Start Date & Range**: Plan for any time span—**3 Days**, **5 Days**, **7 Days**, **10 Days**, **14 Days**, or a custom day range up to 31 days.
- **Dynamic Calendar View**: View rows dynamically matching the exact date span (`Oct 21`, `Oct 22`, etc.) with daily meal summaries.
- **Interactive Day Assignment**: Assign meals across multiple days for meal prep and leftovers with real-time day previews.
- **Proportional AI Suggestions**: Suggestions scale automatically to match the plan's duration (e.g. 3 meals for a 3-day plan, 10 for a 10-day plan).

### 2. 🤖 Gemini Model Selection & AI Generator
- **Gemini 3.8 Flash Default**: Powered by **`gemini-3.8-flash`** for rapid, accurate, high-quality recipe generation and vision parsing.
- **Live API Model Discovery**: Under **Settings (⚙️)**, click **"🔄 Fetch Available Models"** to discover and switch between all models active on your Google Gemini account.
- **Custom Prompts & Fridge Cleanout**: Provide custom requests (e.g. *"Use up leftover spinach and chicken thighs"*, *"Under 25 minutes"*, *"High-protein Mexican dinner"*).
- **Guaranteed Usable Recipe Links**: Web recipes are verified in parallel; broken or missing links automatically fall back to clean Google Recipe Search queries.

### 3. 📖 Cook Mode & Smart Kitchen Assistant
- **🔆 Keep Screen Awake**: One-tap Wake Lock keeps your mobile phone or tablet screen awake while cooking.
- **Portion Scaler**: Live ingredient scaling for `½x`, `1x`, `1.5x`, and `2x` servings with automatic fraction recalculation.
- **Tap-to-Check Ingredients & Steps**: Strike off ingredients as you prep and dim completed steps as you cook.
- **Auto-Detected Inline Timers**: Instruction times (e.g. *"simmer for 20 minutes"*) become clickable timer chips with floating countdowns and audio chime alerts.

### 4. 🛒 Persistent Smart Grocery Checklist
- **Multi-Device Persistence**: Grocery checklists persist across devices in `data/grocery.json`.
- **Custom Item Quick-Add**: Add essentials (milk, paper towels, pantry staples) with store section categorization.
- **Shopping Progress**: Real-time progress bar tracking items gathered vs remaining.
- **Aisle-Friendly Controls**: Hide checked items while shopping, clear completed items, or share via native mobile sheet.

### 5. 📚 Recipe Library & Multimodal Import
- **Manual Recipe Editor**: Create and edit recipes with ingredients, instructions, tags, and prep/cook times.
- **❤️ Favorites & Filters**: Quick-filter by favorites, tags, and maximum cook time.
- **📷 Camera / Photo Scan**: Snap photos of cookbook pages or handwritten recipe cards to extract structured recipes via Gemini Vision.
- **📄 PDF Import**: Single or batch import PDF recipes.

### 6. 📱 Mobile-First UX & PWA
- **Native Bottom Navigation Bar**: App-style bottom navigation with Library, Plan, Shop, and Settings tabs.
- **Bottom-Sheet Modals**: Mobile touch-friendly sheets with drag handles and large tap targets.
- **Installable PWA**: Standalone fullscreen app mode for iOS and Android home screens.

### 7. 🔄 Zero-Rebuild Container Updates
- **No Image Rebuilds**: Docker bind mounts (`./:/app` and `./data:/data`) ensure code updates and `git pull` apply immediately.
- **In-App Updater**: Check commit status and click **"Pull Latest Updates & Restart"** under Settings (⚙️) to update without touching the terminal.
- **Auto-Restart Supervisor**: [entrypoint.sh](entrypoint.sh) restarts the Node server in <1 second upon update or code change.

---

## 🚀 Quick Start

### Running with Docker Compose (Recommended)

1. Clone repository:
   ```bash
   git clone <repo-url> recipe_helper
   cd recipe_helper
   ```

2. Start container:
   ```bash
   docker compose up -d
   ```

3. Open **`http://localhost:3000`** in your browser (or visit your host machine's local IP from any phone/tablet on your Wi-Fi).

4. Enter your Google Gemini API key in **Settings (⚙️)**.

### Running Locally with Node.js

Requires Node.js 18+ (Node 22 recommended):

```bash
npm install
npm start
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Web server listening port | `3000` |
| `DATA_DIR` | Directory for recipes, plans, context, and grocery list | `./data` |
| `GEMINI_API_KEY` | Google Gemini API key (can also be entered in Settings UI) | `undefined` |
| `GEMINI_MODEL` | Override default model | `gemini-3.8-flash` |

---

## 🛠️ API Reference

### Plan & Scheduling
- `GET /api/plan/plans` — List active meal plans.
- `POST /api/plan/plans` — Create plan with `{ startDate, daysCount }`.
- `PUT /api/plan/plans/:weekOf` — Update plan schedule (`startDate`, `daysCount`).
- `DELETE /api/plan/plans/:weekOf` — Delete plan.
- `POST /api/plan/suggest` — Generate AI meal suggestions scaled to plan duration.
- `POST /api/plan/decide` — Save accepted suggestions or custom assignments.
- `DELETE /api/plan/meals/:recipeId` — Remove meal or single day from plan.

### Context & Gemini Settings
- `GET /api/context` — Retrieve household rules and API status.
- `PUT /api/context` — Save household rules, Gemini API key, and selected model.
- `GET /api/context/models` — Query live available Gemini models from Google API.

### Recipes
- `GET /api/recipes` — List cached recipes.
- `POST /api/recipes` — Manually create a recipe.
- `GET /api/recipes/:id` — Get full recipe details.
- `PUT /api/recipes/:id` — Update recipe fields or favorite status.
- `DELETE /api/recipes/:id` — Delete recipe.
- `POST /api/recipes/import-image` — Parse recipe from photo/screenshot.
- `POST /api/recipes/import-pdf` — Parse recipe from PDF.

### Grocery
- `GET /api/grocery` — Generate grocery checklist from selected plans.
- `GET /api/grocery/saved` — Get persistent grocery checklist.
- `PUT /api/grocery/saved` — Save checked state and custom items.

### System Updates
- `GET /api/system/status` — Get Git commit hash, branch, uptime, and update status.
- `POST /api/system/update` — Pull updates from Git and restart server process.

---

## 📄 License
ISC
