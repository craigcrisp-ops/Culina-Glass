import React from "react";
import { Recipe } from "../types";
import { GlassCard } from "./GlassCard";
import { Clock, Users, Heart } from "lucide-react";
import { motion } from "motion/react";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function RecipeCard({ recipe, onClick, onToggleFavorite }: RecipeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <GlassCard onClick={onClick} className="cursor-pointer group overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img
            src={recipe.coverImageUrl || `https://picsum.photos/seed/${recipe.title}/800/450`}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
              {recipe.category}
            </span>
            <span className={`rounded-full backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${
              recipe.difficulty === 'easy' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' :
              recipe.difficulty === 'medium' ? 'bg-amber-500/20 border-amber-500/20 text-amber-400' :
              'bg-red-500/20 border-red-500/20 text-red-400'
            }`}>
              {recipe.difficulty}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(e);
            }}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
              recipe.isFavorite 
                ? "bg-red-500 border-red-400 text-white" 
                : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-black/60"
            }`}
          >
            <Heart className={`h-4 w-4 ${recipe.isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>
        
        <div className="flex flex-col flex-1 gap-4 p-4">
          <h3 className="text-xl font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {recipe.title}
          </h3>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-4 text-xs text-white/40">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400/60" />
                <span>{recipe.timeMinutes}m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-400/60" />
                <span>{recipe.servings}</span>
              </div>
            </div>
            
            <div className="flex gap-1">
              {recipe.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] font-medium text-white/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
