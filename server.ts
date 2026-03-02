import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.PORT ? "/tmp/recipes.db" : "recipes.db";
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Uncategorized',
    tags TEXT,
    timeMinutes INTEGER DEFAULT 0,
    servings INTEGER DEFAULT 0,
    ingredients TEXT,
    steps TEXT,
    coverImageUrl TEXT,
    galleryImageUrls TEXT,
    imageSource TEXT DEFAULT 'none',
    difficulty TEXT DEFAULT 'medium',
    isFavorite INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.use(express.json({ limit: '10mb' }));

  app.get("/api/recipes", (req, res) => {
    const recipes = db.prepare("SELECT * FROM recipes ORDER BY title ASC").all();
    const parsedRecipes = recipes.map((r: any) => ({
      ...r,
      tags: JSON.parse(r.tags || "[]"),
      ingredients: JSON.parse(r.ingredients || "[]"),
      steps: JSON.parse(r.steps || "[]"),
      galleryImageUrls: JSON.parse(r.galleryImageUrls || "[]"),
      isFavorite: !!r.isFavorite,
    }));
    res.json(parsedRecipes);
  });

  app.post("/api/recipes", (req, res) => {
    const { title, category, tags, timeMinutes, servings, ingredients, steps, coverImageUrl, galleryImageUrls, imageSource, difficulty, isFavorite } = req.body;
    const info = db.prepare(`INSERT INTO recipes (title, category, tags, timeMinutes, servings, ingredients, steps, coverImageUrl, galleryImageUrls, imageSource, difficulty, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, category, JSON.stringify(tags || []), timeMinutes || 0, servings || 0, JSON.stringify(ingredients || []), JSON.stringify(steps || []), coverImageUrl || "", JSON.stringify(galleryImageUrls || []), imageSource || "none", difficulty || "medium", isFavorite ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/recipes/:id", (req, res) => {
    db.prepare("DELETE FROM recipes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/recipes/:id", (req, res) => {
    const { title, category, tags, timeMinutes, servings, ingredients, steps, coverImageUrl, galleryImageUrls, imageSource, difficulty, isFavorite } = req.body;
    db.prepare(`UPDATE recipes SET title = ?, category = ?, tags = ?, timeMinutes = ?, servings = ?, ingredients = ?, steps = ?, coverImageUrl = ?, galleryImageUrls = ?, imageSource = ?, difficulty = ?, isFavorite = ? WHERE id = ?`).run(title, category, JSON.stringify(tags || []), timeMinutes || 0, servings || 0, JSON.stringify(ingredients || []), JSON.stringify(steps || []), coverImageUrl || "", JSON.stringify(galleryImageUrls || []), imageSource || "none", difficulty || "medium", isFavorite ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/recipes/:id/favorite", (req, res) => {
    const { isFavorite } = req.body;
    db.prepare("UPDATE recipes SET isFavorite = ? WHERE id = ?").run(isFavorite ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  const distPath = path.resolve(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  const googlePort = Number(process.env.PORT) || 8080;
  app.listen(googlePort, "0.0.0.0", () => {
    console.log(`Server running on port ${googlePort}`);
  });
}

startServer();
