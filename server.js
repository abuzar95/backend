import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST before importing Prisma
dotenv.config();

// Verify required environment variables
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env file');
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  console.error('ERROR: DIRECT_URL is not set in .env file');
  process.exit(1);
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
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
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

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
