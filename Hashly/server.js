import express from "express";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const DB_PATH = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { posts: [] };
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// UPLOAD
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (_, f, cb) => cb(null, Date.now() + "-" + f.originalname)
});
const upload = multer({ storage });

// --- POSTS LIST ---
app.get("/posts", (req, res) => {
  const db = loadDB();
  res.json(db.posts);
});

// --- CREATE POST ---
app.post("/posts", upload.single("file"), (req, res) => {
  const db = loadDB();
  const text = req.body.text;

  const hashtags = text.match(/#\w+/g) || [];

  const post = {
    id: Date.now(),
    user: req.body.user || "Anonyme",
    avatar: req.body.avatar,
    text,
    hashtags,
    mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
    likes: 0,
    shares: 0,
    comments: [],
    date: new Date().toISOString()
  };

  db.posts.unshift(post);
  saveDB(db);

  res.json(post);
});

// --- LIKE ---
app.post("/like", (req, res) => {
  const { postId } = req.body;
  const db = loadDB();
  const p = db.posts.find(x => x.id == postId);
  if (p) {
    p.likes++;
    saveDB(db);
  }
  res.json(p);
});

// --- COMMENT ---
app.post("/comment", (req, res) => {
  const { postId, text, user, avatar } = req.body;
  const db = loadDB();
  const post = db.posts.find(p => p.id == postId);

  const comment = {
    id: Date.now(),
    user,
    avatar,
    text,
    date: new Date().toISOString()
  };

  post.comments.push(comment);
  saveDB(db);

  res.json(comment);
});

// --- SHARE ---
app.post("/share", (req, res) => {
  const { postId } = req.body;
  const db = loadDB();
  const p = db.posts.find(x => x.id == postId);
  if (p) p.shares++;
  saveDB(db);
  res.json(p);
});

// --- HASHTAG TRENDS ---
app.get("/trends", (req, res) => {
  const db = loadDB();
  const counts = {};

  db.posts.forEach(p =>
    p.hashtags.forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    })
  );

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  res.json(sorted);
});

// --- RECOMMENDATION ---
app.post("/recommend", (req, res) => {
  const { likedTags } = req.body;
  const db = loadDB();

  const recommended = db.posts.filter(p =>
    p.hashtags.some(t => likedTags.includes(t))
  );

  res.json(recommended);
});

// --- REAL TIME CHAT ---
wss.on("connection", ws => {
  ws.on("message", msg => {
    wss.clients.forEach(c => c.send(msg));
  });
});

server.listen(3000, () =>
  console.log("✔ Hashly ouvert sur http://localhost:3000")
);
