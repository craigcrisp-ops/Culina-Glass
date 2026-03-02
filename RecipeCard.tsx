import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewRecipe, Recipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The name of the recipe." },
    category: { type: Type.STRING, description: "Suggest 3 specific, creative categories. Prefer: Quick Bites, Family Favorites, Seasonal, Healthy, Budget, Meal Prep, High Protein, One Pan, Kid Friendly." },
    tags: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "A list of tags for granular organization." 
    },
    timeMinutes: { type: Type.NUMBER, description: "Total preparation and cooking time in minutes." },
    servings: { type: Type.NUMBER, description: "Number of servings." },
    ingredients: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "The list of ingredients." 
    },
    steps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "The step-by-step instructions." 
    },
    coverImageUrl: { type: Type.STRING, description: "A URL to an image if available." },
    difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"], description: "The difficulty level of the recipe." },
  },
  required: ["title", "category", "ingredients", "steps", "timeMinutes", "servings", "difficulty"],
};

export async function generateImagePrompt(recipe: Partial<NewRecipe>): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create a highly detailed image generation prompt for this recipe: ${recipe.title}. 
    Style: Food photography, natural light, close-up, appetizing, high detail, clean background.`,
  });
  return response.text || `Food photography of ${recipe.title}, high detail, appetizing.`;
}

export async function generateRecipeImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "16:9" } },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

export async function parseRecipeFromText(text: string): Promise<NewRecipe> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the recipe from this text. Suggest 3 specific, creative categories. Prefer: Quick Bites, Family Favorites, Seasonal, Healthy, Budget, Meal Prep, High Protein, One Pan, Kid Friendly. Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    },
  });
  const data = JSON.parse(response.text);
  return { ...data, galleryImageUrls: [], imageSource: "none" };
}

export async function parseRecipeFromImage(base64Image: string, mimeType: string): Promise<NewRecipe> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: "Extract the recipe from this image. Suggest 3 specific, creative categories. Prefer: Quick Bites, Family Favorites, Seasonal, Healthy, Budget, Meal Prep, High Protein, One Pan, Kid Friendly." },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    },
  });
  const data = JSON.parse(response.text);
  return { ...data, galleryImageUrls: [], imageSource: "upload" };
}

export async function parseRecipeFromUrl(url: string): Promise<NewRecipe> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the recipe from this URL. Suggest 3 specific, creative categories. Prefer: Quick Bites, Family Favorites, Seasonal, Healthy, Budget, Meal Prep, High Protein, One Pan, Kid Friendly. URL: ${url}`,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    },
  });
  const data = JSON.parse(response.text);
  return { ...data, coverImageUrl: data.coverImageUrl || "", galleryImageUrls: [], imageSource: "url" };
}

export async function askAboutRecipe(recipe: Recipe, question: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Recipe: ${recipe.title}
      Ingredients: ${recipe.ingredients.join(", ")}
      Steps: ${recipe.steps.join("\n")}
      
      Question: ${question}
      
      Provide a helpful, concise answer based on the recipe.
    `,
  });
  return response.text || "I'm sorry, I couldn't process that request.";
}

export async function modifyRecipe(recipe: Recipe, instruction: string): Promise<NewRecipe> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Recipe: ${recipe.title}
      Ingredients: ${recipe.ingredients.join(", ")}
      Steps: ${recipe.steps.join("\n")}
      
      Modification Instruction: ${instruction}
      
      Return the modified recipe as JSON.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    },
  });
  return JSON.parse(response.text);
}

export async function processVoiceCommand(transcript: string): Promise<{
  intent: "add_recipe" | "search" | "navigate" | "unknown";
  data?: any;
}> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this voice command and extract the intent and data: "${transcript}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { 
            type: Type.STRING, 
            enum: ["add_recipe", "search", "navigate", "unknown"],
            description: "The user's intent."
          },
          data: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: "Search query or navigation target." },
              recipe: recipeSchema
            }
          }
        },
        required: ["intent"]
      }
    }
  });
  return JSON.parse(response.text);
}

export function createLiveSession(callbacks: {
  onopen: () => void;
  onmessage: (message: any) => void;
  onerror: (error: any) => void;
  onclose: () => void;
}) {
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction: "You are Culina, an elegant and proactive culinary agent. You help users manage their recipes, provide cooking tips, and interact with the app on their behalf. You can search for recipes, open the add recipe modal, and filter by category using the tools provided. Be conversational, helpful, and sophisticated. If a user asks to see something or find something, use the appropriate tool and tell them you've done it.",
      tools: [
        {
          functionDeclarations: [
            {
              name: "search_recipes",
              description: "Search for recipes by title or ingredients.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING, description: "The search term." }
                },
                required: ["query"]
              }
            },
            {
              name: "open_add_recipe_modal",
              description: "Open the modal to add a new recipe.",
              parameters: { type: Type.OBJECT, properties: {} }
            },
            {
              name: "filter_by_category",
              description: "Filter the recipe list by a specific category.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "The category name (e.g., 'Italian', 'Dessert', 'All')." }
                },
                required: ["category"]
              }
            }
          ]
        }
      ],
      outputAudioTranscription: {},
    },
  });
}
