import express from "express";
import type { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const app = express();
const port = 3000;
const prisma = new PrismaClient();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow specific frontends
    credentials: true, // Allow cookies
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// User registration endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });

    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User login endpoint
app.post("/login",async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, { httpOnly: true });
    res.json({ message: "Login successful" });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Middleware to authenticate JWT token
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Protected route example
app.get("/api/protected", authenticateToken, (req: Request, res: Response) => {
  res.json({ message: "This is a protected route", userId: req.userId });
}); 
app.get("/balance", authenticateToken, async (req: Request, res: Response) => {
  try {
    const balances = await prisma.balance.findMany({
      where: {
        userId: req.userId,
      },
    });

    res.json({ balances });
  } catch (error) {
    console.error("Error fetching balances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.post("/deposit", authenticateToken, async (req: Request, res: Response) => {

  //user also give me the assest name 
  const { amount,asset } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "Invalid deposit amount" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newBalance = user.balance + amount;
    await prisma.user.update({
      where: { id: req.userId },
      data: { balance: newBalance },
    });

    res.json({ message: "Deposit successful", newBalance });
  } catch (error) {
    console.error("Error processing deposit:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});