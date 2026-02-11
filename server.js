import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST before importing Prisma
dotenv.config();

// Verify required environment variables (warn but don't crash for serverless)
if (!process.env.DATABASE_URL) {
  console.error('WARNING: DATABASE_URL is not set');
}

if (!process.env.DIRECT_URL) {
  console.error('WARNING: DIRECT_URL is not set');
}

// Import Prisma client after env vars are loaded
import prisma from './prisma/client.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or chrome extensions)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a known pattern
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('chrome-extension://') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    
    // Default allow for development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Login - email-based (no password for now)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await prisma.user.create({
      data: { email, name: name || null, role: role || 'DC_R' },
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A user with this email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role } = req.body;
    const data = {};
    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'A user with this email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get all prospects
app.get('/api/prospects', async (req, res) => {
  try {
    const prospects = await prisma.prospect.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(prospects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prospects by user_id
app.get('/api/prospects/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const prospects = await prisma.prospect.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(prospects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new prospect
app.post('/api/prospects', async (req, res) => {
  try {
    const prospect = await prisma.prospect.create({
      data: req.body
    });
    res.status(201).json(prospect);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prospect
app.put('/api/prospects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prospect = await prisma.prospect.update({
      where: { id },
      data: req.body
    });
    res.json(prospect);
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Prospect not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Start server (only in non-serverless / local dev)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export for Vercel serverless
export default app;
