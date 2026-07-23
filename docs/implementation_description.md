# Recipe Helper — Implementation Description

## 1. Overview

Recipe Helper is a Node.js/Express web application that uses the Google Gemini API to generate personalized weekly meal plans. Users describe their dietary preferences in plain language, and the system combines cached recipes, meal history, and live web search results to present curated meal options each week. Selected meals are aggregated into a consolidated grocery checklist.

---

## 2. Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                      │
│  Preferences · Meal Selector · Weekly Plan · Grocery    │
└──────────────────────┬──────────────────────────────────┘
                       │  REST / JSON
┌──────────────────────▼──────────────────────────────────┐
│                  Express Server (API)                   │
│  Routes · Middleware · Controllers · Services           │
└──┬──────────────┬──────────────┬────────────────────────┘
   │              │              │
   ▼              ▼              ▼
Gemini API   Web Search     File System
(generation  (new recipe    (JSON data +
 & analysis)  discovery)     MD recipe cache)
```

### 2.2 Technology Stack

| Layer         | Technology                                      |
|---------------|-------------------------------------------------|
| Runtime       | Node.js (≥ 20 LTS)                              |
| Framework     | Express 4.x                                     |
| AI            | Google Gemini API (`@google/generative-ai` SDK)  |
| Web Search    | Google Custom Search JSON API (or Gemini grounding with Google Search) |
| Data Storage  | File-system — JSON files for structured data, Markdown files for recipe cache |
| Frontend      | Vanilla HTML / CSS / JavaScript (single-page)    |

### 2.3 Why File-Based Storage?

The application intentionally avoids a traditional database in favor of flat files:

- **Recipes** are stored as individual Markdown files — human-readable, easy to version-control, and naturally cache-friendly.
- **Structured data** (user context, history, weekly plans) is stored as JSON files — simple to read/write with Node.js `fs` and sufficient for a single-user or household application.
- This keeps the project zero-dependency on external database services.

---

## 3. Project Structure

```
recipe_helper/
├── docs/
│   ├── initial_description.md
│   └── implementation_description.md   ← this file
├── server/
│   ├── index.js                        # Express app entry point
│   ├── config.js                       # Environment & constants
│   ├── routes/
│   │   ├── context.js                  # User preference/context CRUD
│   │   ├── recipes.js                  # Recipe cache operations
│   │   ├── plan.js                     # Weekly plan generation & management
│   │   └── grocery.js                  # Grocery list generation
│   ├── services/
│   │   ├── gemini.js                   # Gemini API client wrapper
│   │   ├── search.js                   # Web search integration
│   │   ├── recipeCache.js              # Markdown recipe read/write
│   │   ├── history.js                  # Meal history tracking
│   │   └── grocery.js                  # Ingredient aggregation logic
│   ├── middleware/
│   │   └── errorHandler.js             # Centralized error handling
│   └── utils/
│       ├── markdown.js                 # Markdown ↔ structured data helpers
│       └── slugify.js                  # File-name safe slug generation
├── public/
│   ├── index.html                      # Single-page app shell
│   ├── css/
│   │   └── styles.css                  # Application styles
│   └── js/
│       ├── app.js                      # SPA router & initialization
│       ├── api.js                      # Fetch wrapper for server API
│       ├── views/
│       │   ├── context.js              # Preferences/rules editor view
│       │   ├── discover.js             # Meal suggestion & selection view
│       │   ├── plan.js                 # Current week plan view
│       │   └── grocery.js              # Grocery checklist view
│       └── components/
│           ├── recipeCard.js           # Recipe card component
│           ├── toast.js                # Notification toasts
│           └── loader.js              # Loading state component
├── data/
│   ├── context.json                    # User preferences / rules
│   ├── history.json                    # Historical weekly selections
│   ├── current_week.json              # Active week plan
│   └── recipes/                        # Markdown recipe cache
│       ├── chicken-tikka-masala.md
│       ├── black-bean-tacos.md
│       └── ...
├── package.json
├── .env.example                        # Required env vars template
├── .gitignore
└── README.md
```

---

## 4. Data Models

### 4.1 User Context (`data/context.json`)

Stores the user's meal planning preferences as a plain-language rule plus structured metadata.

```json
{
  "rule": "We are a family of 4. We like Mediterranean and Asian food. My wife is vegetarian on weekdays. We meal prep on Sundays and want 2-3 recipes that make enough for leftovers the next day. Budget-friendly preferred.",
  "servings": 4,
  "mealsPerWeek": 7,
  "leftoversEnabled": true,
  "updatedAt": "2026-07-20T10:30:00Z"
}
```

### 4.2 Recipe (Markdown file in `data/recipes/`)

Each recipe is an individual Markdown file with YAML frontmatter for machine-readable metadata.

```markdown
---
id: "chicken-tikka-masala"
title: "Chicken Tikka Masala"
prepTime: 20
cookTime: 35
totalTime: 55
servings: 6
tags: ["indian", "chicken", "curry", "meal-prep"]
source: "https://example.com/tikka-masala"
addedAt: "2026-07-15T12:00:00Z"
timesSelected: 3
lastSelected: "2026-07-08"
---

# Chicken Tikka Masala

## Ingredients

- 2 lbs chicken breast, cubed
- 1 cup plain yogurt
- 2 tbsp garam masala
- 1 can (14 oz) crushed tomatoes
- 1 cup heavy cream
- 1 large onion, diced
- 4 cloves garlic, minced
- 1 tbsp fresh ginger, grated
- 2 tbsp vegetable oil
- Salt and pepper to taste
- Fresh cilantro for garnish

## Instructions

1. Marinate chicken in yogurt and garam masala for at least 30 minutes.
2. Heat oil in a large skillet. Sauté onion until golden.
3. Add garlic and ginger, cook 1 minute.
4. Add chicken, cook until browned on all sides.
5. Stir in crushed tomatoes, simmer 20 minutes.
6. Add cream, simmer 10 more minutes.
7. Season with salt and pepper. Garnish with cilantro.

## Notes

- Great for meal prep — stores well for 3-4 days.
- Serve over basmati rice or with naan bread.
```

### 4.3 Meal History (`data/history.json`)

Tracks every weekly plan to ensure variety and non-repetitive rotations.

```json
{
  "weeks": [
    {
      "weekOf": "2026-07-13",
      "meals": [
        {
          "recipeId": "chicken-tikka-masala",
          "assignedDays": ["monday", "tuesday"],
          "servings": 6
        },
        {
          "recipeId": "black-bean-tacos",
          "assignedDays": ["wednesday"],
          "servings": 4
        }
      ]
    }
  ]
}
```

### 4.4 Current Week Plan (`data/current_week.json`)

The active weekly plan being assembled.

```json
{
  "weekOf": "2026-07-20",
  "status": "in_progress",
  "meals": [
    {
      "recipeId": "lemon-herb-salmon",
      "assignedDays": ["monday"],
      "servings": 4
    }
  ],
  "pendingSuggestions": [],
  "groceryListGenerated": false
}
```

### 4.5 Recipe Suggestion (API response shape, not persisted)

Returned by the AI when suggesting meals.

```json
{
  "id": "lemon-herb-salmon",
  "title": "Lemon Herb Salmon",
  "prepTime": 10,
  "cookTime": 20,
  "totalTime": 30,
  "servings": 4,
  "tags": ["seafood", "quick", "healthy"],
  "source": "cache | web",
  "ingredients": ["..."],
  "instructions": ["..."],
  "notes": "Light and quick weeknight dinner."
}
```

---

## 5. API Design

All endpoints are prefixed with `/api`.

### 5.1 User Context

| Method | Endpoint         | Description                          |
|--------|-----------------|--------------------------------------|
| GET    | `/api/context`   | Retrieve current user preferences    |
| PUT    | `/api/context`   | Create or update user preferences    |

**PUT `/api/context`** — Request body:
```json
{
  "rule": "Family of 4, Mediterranean focus...",
  "servings": 4,
  "mealsPerWeek": 7,
  "leftoversEnabled": true
}
```

### 5.2 Recipe Cache

| Method | Endpoint                  | Description                            |
|--------|--------------------------|----------------------------------------|
| GET    | `/api/recipes`            | List all cached recipes (summary only) |
| GET    | `/api/recipes/:id`        | Get full recipe by ID                  |
| DELETE | `/api/recipes/:id`        | Remove a recipe from cache             |

### 5.3 Meal Plan Generation

| Method | Endpoint                           | Description                                    |
|--------|------------------------------------|-------------------------------------------------|
| POST   | `/api/plan/suggest`                | Generate 10 meal suggestions from AI            |
| POST   | `/api/plan/decide`                 | Submit user decisions on suggestions             |
| GET    | `/api/plan/current`                | Get the current week's plan                      |
| POST   | `/api/plan/finalize`               | Mark the current week plan as complete            |
| GET    | `/api/plan/history`                | Get historical weekly plans                      |

**POST `/api/plan/suggest`** — No body required. Uses stored context, history, and recipe cache to generate suggestions.

**POST `/api/plan/decide`** — Request body:
```json
{
  "decisions": [
    { "recipeId": "chicken-tikka-masala", "decision": "yes", "assignedDays": ["monday", "tuesday"] },
    { "recipeId": "plain-pasta-bake",     "decision": "never" },
    { "recipeId": "thai-green-curry",     "decision": "not_this_time" }
  ]
}
```

Decision effects:
| Decision        | Cache Action                     | Plan Action              |
|-----------------|----------------------------------|--------------------------|
| `yes`           | Save/update in recipe cache      | Add to current week      |
| `not_this_time` | Save/update in recipe cache      | Do not add to week       |
| `never`         | Do not save (or remove if exists)| Do not add to week       |

### 5.4 Grocery List

| Method | Endpoint               | Description                                      |
|--------|------------------------|--------------------------------------------------|
| GET    | `/api/grocery`          | Generate consolidated grocery list for the week  |

**GET `/api/grocery`** — Response:
```json
{
  "weekOf": "2026-07-20",
  "categories": [
    {
      "name": "Produce",
      "items": [
        { "ingredient": "Onion, large", "quantity": "3", "fromRecipes": ["chicken-tikka-masala", "thai-green-curry"] },
        { "ingredient": "Garlic cloves", "quantity": "8", "fromRecipes": ["chicken-tikka-masala", "lemon-herb-salmon"] }
      ]
    },
    {
      "name": "Proteins",
      "items": [
        { "ingredient": "Chicken breast", "quantity": "2 lbs", "fromRecipes": ["chicken-tikka-masala"] }
      ]
    }
  ],
  "copyText": "PRODUCE\n- 3 large onions\n- 8 cloves garlic\n\nPROTEINS\n- 2 lbs chicken breast\n..."
}
```

---

## 6. AI Integration (Gemini)

### 6.1 Service Design (`server/services/gemini.js`)

A single Gemini service module wraps all AI interactions. It initializes the `GoogleGenerativeAI` client once and exposes purpose-built methods.

### 6.2 Core AI Operations

#### 6.2.1 Generate Meal Suggestions

**Input assembled for the prompt:**
1. The user's context/rule (plain language preferences).
2. Meal history from the last 4–6 weeks (to avoid repetition).
3. A summary of the current recipe cache (titles + tags).
4. The number of remaining meals needed for the week.

**Prompt strategy:**
- System instruction establishes the AI as a meal planning assistant.
- The prompt asks for exactly 10 recipe suggestions as structured JSON.
- It instructs the AI to pull ~5 from the existing cache and ~5 new suggestions.
- For new suggestions, the AI is instructed to search the web for real recipes with proper attribution.
- Each suggestion must include: title, ingredients list, step-by-step instructions, prep/cook times, servings, tags, and source URL (if from web).

**Output parsing:**
- Response is parsed as JSON (using Gemini's JSON response mode or extracted from markdown code fences).
- Each suggestion is validated against a schema before returning to the client.

#### 6.2.2 Convert Recipe to Markdown

When a user selects `yes` or `not_this_time`, the recipe data (which may have come from AI-generated JSON) is converted to the standardized Markdown format with YAML frontmatter and saved to `data/recipes/`.

#### 6.2.3 Generate Grocery List

**Input:**
- All recipes in the current week plan (full ingredient lists).
- The user's context (servings, leftover preferences).

**Prompt strategy:**
- Provide all selected recipes and their ingredient lists.
- Ask the AI to: consolidate duplicate ingredients (e.g., "2 onions" from recipe A + "1 onion" from recipe B = "3 onions"), categorize by grocery store section (Produce, Proteins, Dairy, Pantry, Frozen, etc.), and adjust quantities based on assigned servings.
- Return as structured JSON.

### 6.3 Web Search for New Recipes

Two approaches are supported (configured via environment variable):

1. **Gemini with Google Search grounding** (preferred) — Uses Gemini's built-in grounding capability to search the web and return real recipe URLs with attribution.
2. **Google Custom Search API** — A separate API call retrieves recipe URLs, which are then fetched and parsed, with the content fed to Gemini for structured extraction.

### 6.4 Error Handling & Rate Limiting

- All Gemini calls are wrapped in retry logic with exponential backoff (3 attempts max).
- Responses are validated against expected schemas; malformed responses trigger a retry.
- Rate limiting is applied at the service level to stay within API quotas.

---

## 7. Frontend (UI/UX)

### 7.1 Application Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Context  │────▶│  2. Discover │────▶│  3. Plan     │────▶│  4. Grocery  │
│   (Setup)    │     │  (Suggest)   │     │  (Week View) │     │  (Checklist) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 7.2 Views

#### 7.2.1 Context / Preferences View

- A large text area for entering the meal planning "rule" in plain language.
- Helper fields for: default servings, meals per week, and whether leftovers/multi-day meals are desired.
- A "Save" button persists to `data/context.json`.
- First-time users land here; returning users see a summary with an "Edit" option.

#### 7.2.2 Discover / Suggestion View

- Triggered by a "Plan My Week" action.
- Displays a loading state while the AI generates suggestions.
- Shows **10 recipe cards** in a responsive grid/list.
- Each card displays:
  - Recipe title
  - Prep time / cook time / total time badges
  - Servings count
  - Tags (as small pills/chips)
  - Source indicator (cached vs. new)
  - Expandable section: full ingredients list and step-by-step instructions
- Each card has **three action buttons**:
  - ✅ **Yes** — Adds to this week's plan. If the recipe serves enough for multiple days (based on context), prompts the user to assign which day(s) it covers.
  - ⏭️ **Not This Time** — Saves to cache for future weeks but doesn't select for this week.
  - 🚫 **Never** — Rejects entirely; recipe is not cached.
- A progress indicator shows how many meals are still needed (e.g., "3 of 7 meals selected").
- When all meal slots are filled, a "Finalize Plan" button appears. The user can also request more suggestions if unsatisfied.

#### 7.2.3 Weekly Plan View

- A 7-day view (Mon–Sun) showing assigned meals.
- Multi-day meals span their assigned days visually.
- Each day shows the recipe title, quick stats, and a link to expand the full recipe.
- Option to remove a meal (returns to Discover to find a replacement).
- Button to generate the grocery list once the plan is finalized.

#### 7.2.4 Grocery Checklist View

- Ingredients grouped by grocery store category (Produce, Proteins, Dairy, Pantry, etc.).
- Each item shows the combined quantity and which recipes it's needed for.
- Checkboxes for marking items as "got it" (client-side only, for in-store use).
- A prominent **"Copy to Clipboard"** button that copies the entire list as formatted plain text.
- A **"Share"** option using the Web Share API (on supported devices).

### 7.3 Design Principles

- **Mobile-first** responsive layout — this app will frequently be used on a phone at the grocery store.
- **Progressive disclosure** — recipe cards show summaries by default; full details expand on tap/click.
- **Minimal friction** — the core flow (set context → get suggestions → pick meals → get grocery list) should be completable in under 5 minutes.
- **Offline-capable considerations** — the grocery list view should work even if connectivity is spotty (consider caching in `localStorage`).

---

## 8. Key Implementation Details

### 8.1 Recipe Cache Management

- Recipes are stored as individual `.md` files in `data/recipes/`.
- Filenames are slugified from recipe titles (e.g., `chicken-tikka-masala.md`).
- The `recipeCache` service provides methods to:
  - `list()` — reads all files, parses frontmatter only, returns summaries.
  - `get(id)` — reads and parses a single recipe file fully.
  - `save(recipe)` — converts structured recipe data to Markdown with YAML frontmatter and writes to disk.
  - `remove(id)` — deletes a recipe file.
- Frontmatter is parsed using a lightweight YAML parser (e.g., `gray-matter`).

### 8.2 History & Repetition Avoidance

- After each week is finalized, the selected meals are appended to `data/history.json`.
- When generating suggestions, the last 4–6 weeks of history are included in the AI prompt with instructions to avoid repeating recent meals.
- The `timesSelected` and `lastSelected` fields on cached recipes help the AI prioritize less-recently-used recipes.

### 8.3 Multi-Day / Leftover Meals

- When the user's context indicates leftovers are enabled, the suggestion prompt asks the AI to include some recipes with higher servings that can cover multiple days.
- In the "Yes" selection flow, the user assigns specific days a recipe covers.
- The weekly plan accounts for this: a recipe assigned to Monday and Tuesday means no new meal is needed for Tuesday.
- The grocery list adjusts quantities based on actual servings needed (not the recipe default, unless they match).

### 8.4 Markdown ↔ Structured Data Conversion

A utility module (`server/utils/markdown.js`) handles bidirectional conversion:

- **Structured → Markdown**: Takes a recipe JSON object and produces a `.md` file with YAML frontmatter + formatted body (ingredients list, numbered steps, notes).
- **Markdown → Structured**: Parses YAML frontmatter for metadata and extracts ingredients/instructions from the Markdown body using simple heading-based parsing.

---

## 9. Environment & Configuration

### 9.1 Environment Variables (`.env`)

| Variable                  | Description                                       | Required |
|--------------------------|---------------------------------------------------|----------|
| `GEMINI_API_KEY`          | Google Gemini API key                             | Yes      |
| `GOOGLE_SEARCH_API_KEY`   | Google Custom Search API key (if not using Gemini grounding) | No       |
| `GOOGLE_SEARCH_CX`        | Google Custom Search engine ID                    | No       |
| `PORT`                    | Server port (default: 3000)                       | No       |
| `NODE_ENV`                | Environment (development / production)            | No       |
| `SEARCH_METHOD`           | `gemini_grounding` or `custom_search` (default: `gemini_grounding`) | No       |

### 9.2 NPM Scripts

| Script          | Command                          | Description                  |
|-----------------|----------------------------------|------------------------------|
| `start`         | `node server/index.js`           | Production start             |
| `dev`           | `node --watch server/index.js`   | Development with auto-reload |

---

## 10. Dependencies

### Production

| Package                   | Purpose                                     |
|--------------------------|---------------------------------------------|
| `express`                 | Web framework                               |
| `@google/generative-ai`   | Gemini API SDK                              |
| `gray-matter`             | YAML frontmatter parsing for Markdown files |
| `dotenv`                  | Environment variable loading                |
| `cors`                    | Cross-origin support (development)          |

### Development

| Package                   | Purpose                                     |
|--------------------------|---------------------------------------------|
| `eslint`                  | Code linting                                |

---

## 11. Future Considerations

These are out of scope for the initial build but worth designing around:

- **Multi-user support** — Currently single-user. Data directory could be namespaced per user.
- **Recipe ratings** — Let users rate recipes after cooking to improve future suggestions.
- **Nutritional info** — Ask Gemini to estimate macros and display on cards.
- **Calendar integration** — Export the weekly plan to Google Calendar.
- **PWA** — Add a service worker for full offline grocery list support and home screen install.
- **Recipe import** — Paste a URL and have the AI extract + cache the recipe automatically.
