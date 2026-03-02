export interface Recipe {
  id: number;
  title: string;
  category: string;
  tags: string[];
  timeMinutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  coverImageUrl: string;
  galleryImageUrls: string[];
  imageSource: "upload" | "url" | "ai" | "none";
  difficulty: "easy" | "medium" | "hard";
  isFavorite: boolean;
  created_at: string;
}

export type NewRecipe = Omit<Recipe, 'id' | 'created_at'>;
