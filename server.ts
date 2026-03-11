import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { insertCall, getCalls, getCallById, insertUser, getUserByUsername, getUserById, getAllUsers, verifyUser, deleteUser, UserRecord } from "./src/db/index.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Middleware to verify JWT
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

// Middleware to verify Admin
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    if (user.role !== 'admin') return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Call Forensics API is running" });
  });

  // Auth API
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      
      const existingUser = getUserByUsername.get(username);
      if (existingUser) return res.status(400).json({ error: "Username already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      
      insertUser.run({
        id,
        username,
        password: hashedPassword,
        is_verified: 0
      });

      res.json({ success: true, message: "Registration successful. Please wait for admin verification." });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check for Admin login
      if (username === process.env.ADMIN_USER_NAME && password === process.env.ADMIN_PASS_WORD) {
        const token = jwt.sign({ id: 'admin', username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { id: 'admin', username, role: 'admin', is_verified: 1 } });
      }

      // Check regular user
      const user = getUserByUsername.get(username) as UserRecord;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const validPassword = await bcrypt.compare(password, user.password!);
      if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

      if (user.is_verified === 0) {
        return res.status(403).json({ error: "Account pending verification by admin", status: "pending" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username, role: 'user', is_verified: user.is_verified } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role === 'admin') {
      return res.json({ id: 'admin', username: user.username, role: 'admin', is_verified: 1 });
    }
    
    const dbUser = getUserById.get(user.id) as UserRecord;
    if (!dbUser) return res.status(404).json({ error: "User not found" });
    
    res.json({ id: dbUser.id, username: dbUser.username, role: 'user', is_verified: dbUser.is_verified });
  });

  // Admin API
  app.get("/api/admin/users", authenticateAdmin, (req, res) => {
    try {
      const users = getAllUsers.all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/verify", authenticateAdmin, (req, res) => {
    try {
      verifyUser.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify user" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateAdmin, (req, res) => {
    try {
      deleteUser.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Call History API
  app.post("/api/calls", authenticateToken, (req, res) => {
    try {
      const result = req.body;
      const id = crypto.randomUUID();
      
      insertCall.run({
        id,
        file_names: JSON.stringify(result.fileNames || []),
        duration_sec: result.durationSec || 0,
        sentiment_score: result.sentimentScore || 0,
        risk_score: result.riskScore || 0,
        compliance_score: result.complianceScore || 0,
        summary: result.summary || '',
        full_result_json: JSON.stringify(result)
      });
      
      res.json({ success: true, id });
    } catch (error) {
      console.error("Error saving call:", error);
      res.status(500).json({ error: "Failed to save call" });
    }
  });

  app.get("/api/calls", authenticateToken, (req, res) => {
    try {
      const calls = getCalls.all();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  });

  app.get("/api/calls/:id", authenticateToken, (req, res) => {
    try {
      const call = getCallById.get(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ error: "Failed to fetch call" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
