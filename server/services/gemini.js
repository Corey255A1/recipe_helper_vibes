const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const config = require('../config');
const fs = require('fs').promises;

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


class GeminiService {
  async getModel() {
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
      throw new Error('Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable or save it in the app preferences.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateSuggestions(context, history, cacheSummaries, neededMeals, mealType = '') {
    const model = await this.getModel();
    const mealTypeContext = mealType ? `\nFocus EXCLUSIVELY on suggestions for: ${mealType}.` : '';
    
    const prompt = `
You are an expert meal planner. The user needs ${neededMeals} meal suggestions for this week.${mealTypeContext}
Here is the user's meal planning context/rule:
${context.rule}

Their default servings is ${context.servings}. Leftovers enabled: ${context.leftoversEnabled}.

Here is their meal history for the past few weeks (avoid repeating these unless they are staples):
${JSON.stringify(history)}

Here is a summary of their existing recipe cache:
${JSON.stringify(cacheSummaries)}

Please provide exactly 10 recipe suggestions. Try to include a mix of about 5 from their cache and 5 new recipes from the web.
For new recipes, provide a source URL if possible, or indicate "web". For cached ones, use "cache".
Return the response as a JSON array matching the schema.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      }
    });

    const text = result.response.text();
    return JSON.parse(text);
  }

  async generateGroceryList(recipes, context) {
    const model = await this.getModel();
    const prompt = `
You are an expert at combining grocery lists.
Here are the recipes the user selected for the week:
${JSON.stringify(recipes, null, 2)}

Consolidate the ingredients. Combine duplicate items (e.g., "1 onion" + "2 onions" = "3 onions").
Categorize them by typical grocery store sections (Produce, Proteins, Dairy, Pantry, etc.).
Adjust quantities if needed based on the user's context (they need ${context.servings} servings per meal generally, but follow the recipe's intended servings if different).

Return a JSON object matching the schema.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: grocerySchema,
      }
    });

    const text = result.response.text();
    return JSON.parse(text);
  }

  async extractRecipeFromText(text, source) {
    const model = await this.getModel();
    const prompt = `
You are an expert recipe parser.
Below is text extracted from a recipe webpage or document. Extract the recipe details and format them as a single JSON object.
Use the source provided: "${source}".
Generate a clean, kebab-case id based on the title (e.g. "chicken-tikka-masala").
If cook time, prep time, or servings are not explicitly mentioned, estimate it based on the directions or use default estimates.

Text:
${text}
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema.items,
      }
    });

    return JSON.parse(result.response.text());
  }

  async extractRecipeFromPdf(pdfBuffer, source) {
    const model = await this.getModel();
    const prompt = `
You are an expert recipe parser.
Below is an uploaded PDF recipe document (which may contain text or scanned images). Extract the recipe details and format them as a single JSON object.
Use the source provided: "${source}".
Generate a clean, kebab-case id based on the title (e.g. "chicken-tikka-masala").
If cook time, prep time, or servings are not explicitly mentioned, estimate it based on the directions or use default estimates.
    `;

    const result = await model.generateContent({
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
      }
    });

    return JSON.parse(result.response.text());
  }
}

module.exports = new GeminiService();
