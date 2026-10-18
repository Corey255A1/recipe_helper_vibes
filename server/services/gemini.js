const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const config = require('../config');
const fs = require('fs').promises;

// Official candidate models in order of preference (fastest, most reliable first)
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro'
];

function safeJsonParse(rawText) {
  let text = (rawText || '').trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(text.trim());
}

async function validateAndResolveWebUrls(suggestions) {
  if (!Array.isArray(suggestions)) return suggestions;

  const checks = suggestions.map(async (s) => {
    if (!s || !s.source || s.source === 'cache') return;

    const title = s.title || 'recipe';
    const fallbackSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(title + ' recipe')}`;
    let url = s.source.trim();

    // If not a valid http(s) URL, convert immediately to search URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      s.source = fallbackSearchUrl;
      return;
    }

    // Search URLs from Google, Bing, DuckDuckGo, etc. are guaranteed to load
    const isSearchEngineUrl = /google\.[a-z.]+\/search|bing\.com\/search|duckduckgo\.com|allrecipes\.com\/search/i.test(url);
    if (isSearchEngineUrl) {
      return;
    }

    // Fast HEAD check with 2.5s timeout to ensure the link actually exists and loads
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const resp = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      // If page is missing (404, 410, 500, etc.), fall back to search URL
      if (!resp.ok) {
        console.log(`[URL RESOLVER] Dead or inaccessible link for "${title}" (${url} -> HTTP ${resp.status}). Replaced with reliable search URL.`);
        s.source = fallbackSearchUrl;
      }
    } catch (err) {
      // Timeout, DNS error, or anti-bot block -> fall back to search URL
      console.log(`[URL RESOLVER] Link check failed for "${title}" (${err.message}). Replaced with reliable search URL.`);
      s.source = fallbackSearchUrl;
    }
  });

  await Promise.allSettled(checks);
  return suggestions;
}

// Recipe schema for suggestions
const recipeSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      prepTime: { type: SchemaType.INTEGER },
      cookTime: { type: SchemaType.INTEGER },
      totalTime: { type: SchemaType.INTEGER },
      servings: { type: SchemaType.INTEGER },
      tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      source: { type: SchemaType.STRING },
      ingredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      instructions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      notes: { type: SchemaType.STRING },
    },
    required: ["id", "title", "prepTime", "cookTime", "totalTime", "servings", "tags", "source", "ingredients", "instructions"]
  }
};

// Grocery category schema
const grocerySchema = {
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                ingredient: { type: SchemaType.STRING },
                quantity: { type: SchemaType.STRING },
                fromRecipes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ["ingredient", "quantity", "fromRecipes"]
            }
          }
        },
        required: ["name", "items"]
      }
    }
  },
  required: ["categories"]
};

// Pantry scan schema for AI image recognition
const pantryScanSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING }
        },
        required: ["name", "quantity", "category"]
      }
    }
  },
  required: ["items"]
};

class GeminiService {
  async getApiKey() {
    let apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      try {
        const contextData = await fs.readFile(config.dataPaths.context, 'utf-8');
        const context = JSON.parse(contextData);
        if (context.geminiApiKey && context.geminiApiKey !== 'your_gemini_api_key_here') {
          apiKey = context.geminiApiKey;
        }
      } catch (e) {}
    }

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY environment variable or save it in app settings.');
    }

    return apiKey;
  }

  async generateContentWithFallback(requestData, maxRetriesPerModel = 3) {
    const apiKey = await this.getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    let userModel = process.env.GEMINI_MODEL;
    try {
      const contextData = await fs.readFile(config.dataPaths.context, 'utf-8');
      const context = JSON.parse(contextData);
      if (context.geminiModel) {
        userModel = context.geminiModel;
      }
    } catch (e) {}

    if (!userModel) {
      userModel = 'gemini-3.8-flash';
    }

    const modelsToTry = [userModel, ...CANDIDATE_MODELS.filter(m => m !== userModel)];

    let lastError = null;

    for (const modelName of modelsToTry) {
      let generativeModel;
      try {
        generativeModel = genAI.getGenerativeModel({ model: modelName });
      } catch (e) {
        continue;
      }

      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        try {
          return await generativeModel.generateContent(requestData);
        } catch (error) {
          lastError = error;
          const msg = (error.message || '').toLowerCase();

          // 404 Not Found or Unsupported model -> skip to next model candidate
          if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
            console.warn(`[GEMINI] Model '${modelName}' not found (404). Trying next candidate...`);
            break;
          }

          // Rate limit / 429 / quota exceeded -> wait and retry THIS model
          if (msg.includes('quota') || msg.includes('limit') || msg.includes('429') || msg.includes('resource_exhausted')) {
            const delayMs = attempt * 5000;
            const detailedReason = error.message ? error.message.replace(/\s+/g, ' ').trim() : 'Quota or rate limit exceeded';
            console.warn(`[GEMINI RATE LIMIT] Model '${modelName}' hit rate limit (attempt ${attempt}/${maxRetriesPerModel}). Details: "${detailedReason}". Pausing ${delayMs / 1000}s before retry...`);
            await new Promise(res => setTimeout(res, delayMs));
            continue;
          }

          // For any other fatal error, rethrow
          throw error;
        }
      }
    }

    throw lastError || new Error('All Gemini model candidates failed.');
  }

  async generateSuggestions(context, history, cacheSummaries, neededMeals, mealType = '', customPrompt = '') {
    const mealTypeContext = mealType ? `\nFocus EXCLUSIVELY on suggestions for: ${mealType}.` : '';
    const customPromptContext = customPrompt ? `\nIMPORTANT SPECIAL REQUEST FOR THIS WEEK: "${customPrompt}". Prioritize recipes that match this request!` : '';
    const cachedCount = (cacheSummaries || []).length;
    
    let cacheTarget = 0;
    let webTarget = 10;
    if (cachedCount >= 7) {
      cacheTarget = 7;
      webTarget = 3;
    } else if (cachedCount > 0) {
      cacheTarget = cachedCount;
      webTarget = 10 - cachedCount;
    }
    
    const userRule = (context && context.rule && context.rule.trim()) ? context.rule.trim() : 'Healthy, diverse, delicious home-cooked meals for the family';
    const servings = (context && context.servings) || 4;
    const leftoversEnabled = Boolean(context && context.leftoversEnabled);

    const prompt = `
You are an expert culinary assistant and meal planner. The user needs ${neededMeals} meal suggestions for this week.${mealTypeContext}${customPromptContext}
Here is the user's meal planning context/rule:
${userRule}

Default servings: ${servings}. Leftovers enabled: ${leftoversEnabled}.

Meal history for the past few weeks (avoid repeating these unless they are staples):
${JSON.stringify(history || { weeks: [] })}

Summary of their existing recipe cache (${cachedCount} saved recipes):
${JSON.stringify(cacheSummaries || [])}

RECIPE SELECTION & SOURCE LINK RULES:
- Provide up to 10 total recipe suggestions.
- If there are enough cached recipes available (at least 7) and no conflicting special request, select up to ${cacheTarget} recipes from their existing cache and ${webTarget} new recipes from the web.
- Otherwise, use relevant cached recipes and fill the remaining spots with new recipes from the web to reach 10 total suggestions.
- FOR NEW WEB RECIPES:
  You must provide a reliable, usable URL in the "source" property:
  1. If you know a verified, real recipe link from a well-known culinary site (e.g. Allrecipes, BBC Good Food, Serious Eats, Simply Recipes, Budget Bytes, Food Network, Cookie and Kate), provide it.
  2. If you are not 100% sure of the exact URL, provide a clean Google Search recipe URL: "https://www.google.com/search?q=" + encodeURIComponent(title + " recipe").
  NEVER invent fake article IDs, non-existent slugs, or dead links.
- FOR CACHED RECIPES: Set "source": "cache".

Return the response as a JSON array matching the schema.
    `;

    const result = await this.generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        maxOutputTokens: 8192
      }
    });

    const text = result.response.text();
    const rawSuggestions = safeJsonParse(text);

    // Verify and ensure every web suggestion has a working, usable link
    return await validateAndResolveWebUrls(rawSuggestions);
  }

  async generateGroceryList(recipes, context) {
    const prompt = `
You are an expert at combining grocery lists.
Here are the recipes the user selected for the week:
${JSON.stringify(recipes, null, 2)}

Consolidate the ingredients. Combine duplicate items (e.g., "1 onion" + "2 onions" = "3 onions").
Categorize them by typical grocery store sections (Produce, Proteins, Dairy, Pantry, Bakery, Frozen, Spices & Oils, Other).
Adjust quantities if needed based on the user's context (they need ${context.servings} servings per meal generally, but follow the recipe's intended servings if different).

Return a JSON object matching the schema.
    `;

    const result = await this.generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: grocerySchema,
        maxOutputTokens: 8192
      }
    });

    const text = result.response.text();
    return safeJsonParse(text);
  }

  async extractRecipeFromText(text, source) {
    const prompt = `
You are an expert recipe parser.
Below is text extracted from a recipe webpage or document. Extract the recipe details and format them as a single JSON object.
Use the source provided: "${source}".
Generate a clean, kebab-case id based on the title (e.g. "chicken-tikka-masala").
If cook time, prep time, or servings are not explicitly mentioned, estimate it based on the directions or use default estimates.

Text:
${text}
    `;

    const result = await this.generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema.items,
        maxOutputTokens: 8192
      }
    });

    return safeJsonParse(result.response.text());
  }

  async extractRecipeFromPdf(pdfBuffer, source) {
    const prompt = `
You are an expert recipe parser.
Below is an uploaded PDF recipe document (which may contain text or scanned images). Extract the recipe details and format them as a single JSON object.
Use the source provided: "${source}".
Generate a clean, kebab-case id based on the title (e.g. "chicken-tikka-masala").
If cook time, prep time, or servings are not explicitly mentioned, estimate it based on the directions or use default estimates.
    `;

    const result = await this.generateContentWithFallback({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBuffer.toString("base64"),
                mimeType: "application/pdf"
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema.items,
        maxOutputTokens: 8192
      }
    });

    return safeJsonParse(result.response.text());
  }

  async extractRecipeFromImage(imageBuffer, mimeType, source) {
    const prompt = `
You are an expert recipe parser.
Below is a photo or screenshot of a recipe (from a cookbook, handwritten card, or screen). Extract all recipe details accurately and format them as a single JSON object.
Use the source provided: "${source || 'photo'}".
Generate a clean, kebab-case id based on the title (e.g. "grandmas-apple-pie").
If cook time, prep time, or servings are not explicitly mentioned, estimate them reasonably based on the directions.
    `;

    const result = await this.generateContentWithFallback({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType || "image/jpeg"
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema.items,
        maxOutputTokens: 8192
      }
    });

    return safeJsonParse(result.response.text());
  }

  async extractPantryItemsFromImage(imageBuffer, mimeType) {
    const prompt = `
You are an expert culinary pantry inventory assistant.
Analyze this photo of a refrigerator, pantry, shelf, countertop, grocery haul, or receipt.
Identify all visible food ingredients, raw produce, dairy products, meats/proteins, packaged pantry goods, condiments, spices, oils, baked goods, and frozen items.

For each distinct item detected:
1. "name": A clean, concise, standardized culinary name in title case (e.g. "Garlic", "Extra Virgin Olive Oil", "Whole Milk", "Greek Yogurt", "Yellow Onions", "Boneless Chicken Breast", "Canned Black Beans", "Cheddar Cheese"). Avoid overly verbose brand adjectives unless essential.
2. "quantity": A reasonable estimate of what is visible (e.g., "1 bottle", "3 bulbs", "1 carton", "half bag", "2 cans", "1 loaf"). If not clear, leave as an empty string "" or "1 item".
3. "category": Must be one of: "Produce", "Dairy", "Proteins", "Pantry", "Spices & Oils", "Bakery", "Frozen", or "Other".

Do not invent items that are clearly not visible. If the image is blurry, focus on the items you can clearly discern.
Return a structured JSON object matching the schema.
    `;

    const result = await this.generateContentWithFallback({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: mimeType || "image/jpeg"
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: pantryScanSchema,
        maxOutputTokens: 8192
      }
    });

    return safeJsonParse(result.response.text());
  }
}

module.exports = new GeminiService();
