import React, { useState, useRef } from "react";
import { X, Upload, Link, Type, Loader2, Camera, Mic, Tag as TagIcon, Sparkles, Clock, Users, Plus, Trash2, Save } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { parseRecipeFromText, parseRecipeFromImage, parseRecipeFromUrl, generateImagePrompt, generateRecipeImage } from "../services/geminiService";
import { Recipe, NewRecipe } from "../types";

interface AddRecipeModalProps {
  onClose: () => void;
  onAdd: (recipe: NewRecipe) => void;
  recipe?: Recipe;
}

export function AddRecipeModal({ onClose, onAdd, recipe }: AddRecipeModalProps) {
  const [mode, setMode] = useState<"manual" | "url" | "image" | "text" | "voice">(recipe ? "manual" : "text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<string | null>(null);
  const [capturedText, setCapturedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<NewRecipe>(recipe ? {
    title: recipe.title,
    category: recipe.category,
    tags: recipe.tags,
    timeMinutes: recipe.timeMinutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    coverImageUrl: recipe.coverImageUrl,
    galleryImageUrls: recipe.galleryImageUrls,
    imageSource: recipe.imageSource,
    difficulty: recipe.difficulty,
    isFavorite: recipe.isFavorite,
  } : {
    title: "",
    category: "Uncategorized",
    tags: [],
    timeMinutes: 30,
    servings: 4,
    ingredients: [""],
    steps: [""],
    coverImageUrl: "",
    galleryImageUrls: [],
    imageSource: "none",
    difficulty: "medium",
    isFavorite: false,
  });

  const [tagInput, setTagInput] = useState("");

  const handleTextSubmit = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const recipe = await parseRecipeFromText(text);
      setFormData(prev => ({ ...prev, ...recipe }));
      setMode("manual");
    } catch (err) {
      setError("Failed to parse recipe. Please check your text.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const recipe = await parseRecipeFromUrl(url);
      setFormData(prev => ({ ...prev, ...recipe }));
      setMode("manual");
    } catch (err) {
      setError("Failed to extract recipe from URL. Please try another link.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const recipe = await parseRecipeFromImage(base64, file.type);
        setFormData(prev => ({ ...prev, ...recipe }));
        setMode("manual");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to extract recipe from image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAiImageGenerate = async () => {
    if (!formData.title) {
      setError("Please enter a title first to generate an image.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = await generateImagePrompt(formData);
      const imageUrl = await generateRecipeImage(prompt);
      setFormData(prev => ({ ...prev, coverImageUrl: imageUrl, imageSource: "ai" }));
    } catch (err) {
      setError("Failed to generate AI image.");
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = (field: string, index?: number) => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(field);
    recognition.onend = () => setIsListening(null);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (field === "full_recipe") {
        setCapturedText(transcript);
      } else if (field === "tags") {
        const newTags = transcript.split(/[\s,]+/).filter((t: string) => t.trim());
        setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, ...newTags])] }));
      } else if (field === "ingredients" && index !== undefined) {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = transcript;
        setFormData(prev => ({ ...prev, ingredients: newIngredients }));
      } else if (field === "steps" && index !== undefined) {
        const newSteps = [...formData.steps];
        newSteps[index] = transcript;
        setFormData(prev => ({ ...prev, steps: newSteps }));
      } else {
        setFormData(prev => ({ ...prev, [field]: transcript }));
      }
    };

    recognition.start();
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const addIngredient = () => setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, ""] }));
  const removeIngredient = (index: number) => setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addStep = () => setFormData(prev => ({ ...prev, steps: [...prev.steps, ""] }));
  const removeStep = (index: number) => setFormData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <GlassCard className="w-full max-w-3xl bg-zinc-900/95 shadow-2xl max-h-[90vh] flex flex-col rounded-[18px]">
        <div className="mb-6 flex items-center justify-between p-2">
          <h2 className="text-3xl font-black text-white tracking-tight">{recipe ? "Edit Recipe" : "Add New Recipe"}</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 px-2 no-scrollbar">
          {[
            { id: "text", label: "Paste Text", icon: Type },
            { id: "url", label: "From URL", icon: Link },
            { id: "image", label: "From Image", icon: Camera },
            { id: "voice", label: "Voice Input", icon: Mic },
            { id: "manual", label: "Manual Entry", icon: Upload },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all whitespace-nowrap border ${
                mode === m.id
                  ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
              }`}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-white/60">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
                <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white" />
              </div>
              <p className="animate-pulse font-medium">AI is crafting your culinary masterpiece...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mode === "voice" && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className={`mb-8 flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all ${
                    isListening ? "border-emerald-500 bg-emerald-500/20 animate-pulse" : "border-white/10 bg-white/5"
                  }`}>
                    <Mic className={`h-16 w-16 ${isListening ? "text-emerald-500" : "text-white/20"}`} />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">Voice Capture</h3>
                  <p className="mb-8 max-w-xs text-sm text-white/40">
                    Speak the recipe title, ingredients, and steps. Our AI will organize it for you.
                  </p>
                  
                  {capturedText && (
                    <div className="mb-8 w-full max-w-md rounded-2xl bg-white/5 p-6 border border-white/10 text-left">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">Transcription</h4>
                      <p className="text-sm text-white/80 italic leading-relaxed">"{capturedText}"</p>
                      <button 
                        onClick={() => handleTextSubmit(capturedText)}
                        className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-xs font-black text-black hover:bg-emerald-400 transition-all"
                      >
                        Organize with AI
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => startVoiceInput("full_recipe")}
                    className={`rounded-2xl px-12 py-4 font-bold transition-all ${
                      isListening ? "bg-red-500 text-white" : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    {isListening ? "Stop Listening" : (capturedText ? "Try Again" : "Start Speaking")}
                  </button>
                </div>
              )}

              {mode === "text" && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      placeholder="Paste recipe text here..."
                      className="h-48 w-full rounded-[16px] border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.metaKey) handleTextSubmit(e.currentTarget.value);
                      }}
                    />
                  </div>
                  <button
                    onClick={(e) => handleTextSubmit((e.currentTarget.previousElementSibling?.querySelector('textarea') as HTMLTextAreaElement).value)}
                    className="w-full rounded-[16px] bg-white py-4 font-black text-black hover:bg-white/90 transition-all"
                  >
                    Extract with AI
                  </button>
                </div>
              )}

              {mode === "url" && (
                <div className="space-y-4">
                  <input
                    type="url"
                    placeholder="https://example.com/recipe"
                    className="w-full rounded-[16px] border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white/20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUrlSubmit(e.currentTarget.value);
                    }}
                  />
                  <button
                    onClick={(e) => handleUrlSubmit((e.currentTarget.previousElementSibling as HTMLInputElement).value)}
                    className="w-full rounded-[16px] bg-white py-4 font-black text-black hover:bg-white/90 transition-all"
                  >
                    Download Recipe
                  </button>
                </div>
              )}

              {mode === "image" && (
                <div className="flex h-48 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/10 bg-white/5 transition-colors hover:border-white/20">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-white/60 hover:text-white"
                  >
                    <Camera className="h-12 w-12" />
                    <span>Click to upload or take a photo</span>
                  </button>
                </div>
              )}

              {mode === "manual" && (
                <div className="space-y-6">
                  {/* Cover Image Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40">Cover Image</label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="relative aspect-video overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
                        {formData.coverImageUrl ? (
                          <img src={formData.coverImageUrl} alt="Cover" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-white/20">
                            <Camera className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleAiImageGenerate}
                          className="flex items-center justify-center gap-2 rounded-[16px] bg-indigo-500/20 py-4 text-sm font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/30 transition-all"
                        >
                          <Sparkles className="h-4 w-4" />
                          Generate with AI
                        </button>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Paste Image URL"
                            value={formData.coverImageUrl}
                            onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value, imageSource: "url" })}
                            className="w-full rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 rounded-[16px] bg-white/5 py-4 text-sm font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
                        >
                          <Upload className="h-4 w-4" />
                          Upload File
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Recipe Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full rounded-[16px] border border-white/10 bg-white/5 p-5 pr-12 text-xl font-black text-white outline-none focus:border-white/20"
                      />
                      <button onClick={() => startVoiceInput("title")} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isListening === "title" ? "text-red-500" : "text-white/40"}`}>
                        <Mic className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full rounded-[16px] border border-white/10 bg-white/5 p-5 pr-12 text-white outline-none focus:border-white/20"
                          />
                          <button onClick={() => startVoiceInput("category")} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isListening === "category" ? "text-red-500" : "text-white/40"}`}>
                            <Mic className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {['Quick Bites', 'Family Favorites', 'Seasonal', 'Healthy', 'Budget', 'Meal Prep'].map(cat => (
                            <button
                              key={cat}
                              onClick={() => setFormData({ ...formData, category: cat })}
                              className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:bg-white/10 hover:text-white"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Difficulty</label>
                        <div className="flex gap-2">
                          {['easy', 'medium', 'hard'].map((diff) => (
                            <button
                              key={diff}
                              onClick={() => setFormData({ ...formData, difficulty: diff as any })}
                              className={`flex-1 rounded-xl border py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                                formData.difficulty === diff
                                  ? "bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                                  : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                              }`}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                          <input
                            type="number"
                            placeholder="Mins"
                            value={formData.timeMinutes}
                            onChange={(e) => setFormData({ ...formData, timeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-[16px] border border-white/10 bg-white/5 p-5 pl-12 text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                          <input
                            type="number"
                            placeholder="Servings"
                            value={formData.servings}
                            onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-[16px] border border-white/10 bg-white/5 p-5 pl-12 text-white outline-none focus:border-white/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add Tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTag()}
                        className="flex-1 rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-white/20"
                      />
                      <button onClick={addTag} className="rounded-[16px] bg-white/10 px-6 text-white hover:bg-white/20 transition-all">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                          #{tag}
                          <button onClick={() => removeTag(tag)} className="ml-1 text-white/40 hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Ingredients</label>
                      <button onClick={addIngredient} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={ing}
                            onChange={(e) => updateIngredient(idx, e.target.value)}
                            placeholder={`Ingredient ${idx + 1}`}
                            className="flex-1 rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-white/20"
                          />
                          <button onClick={() => removeIngredient(idx)} className="text-white/20 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Steps</label>
                      <button onClick={addStep} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add Step
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white/40">
                            {idx + 1}
                          </div>
                          <textarea
                            value={step}
                            onChange={(e) => updateStep(idx, e.target.value)}
                            placeholder={`Step ${idx + 1}`}
                            className="flex-1 rounded-[16px] border border-white/10 bg-white/5 p-4 text-sm text-white outline-none focus:border-white/20 min-h-[100px]"
                          />
                          <button onClick={() => removeStep(idx)} className="text-white/20 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onAdd(formData)}
                    className="w-full rounded-[16px] bg-emerald-500 py-5 font-black text-black hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {recipe ? <Save className="h-5 w-5" /> : null}
                    {recipe ? "UPDATE RECIPE" : "SAVE RECIPE"}
                  </button>
                </div>
              )}

              {error && <p className="text-center text-sm text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
