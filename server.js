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

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  linkedin_profile_id: true,
  linkedin_profile: { select: { id: true, name: true, niche: true } },
  created_at: true
};

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { created_at: 'desc' }
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
      select: USER_SELECT
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
    const { email, name, role, linkedin_profile_id } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (role === 'LH' && !linkedin_profile_id) {
      return res.status(400).json({ error: 'LinkedIn Profile is required for LH role' });
    }
    const data = {
      email,
      name: name || null,
      role: role || 'DC_R',
      linkedin_profile_id: linkedin_profile_id || null
    };
    const user = await prisma.user.create({
      data,
      select: USER_SELECT
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
    const { email, name, role, linkedin_profile_id } = req.body;
    // If updating to LH, linkedin_profile_id must be provided (or already set)
    if (role === 'LH' && linkedin_profile_id === null) {
      return res.status(400).json({ error: 'LinkedIn Profile is required for LH role' });
    }
    const data = {};
    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (linkedin_profile_id !== undefined) data.linkedin_profile_id = linkedin_profile_id || null;
    const user = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT
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

// ==================== LINKEDIN PROFILES ====================

// Get all LinkedIn profiles
app.get('/api/linkedin-profiles', async (req, res) => {
  try {
    const profiles = await prisma.linkedInProfile.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LinkedIn profile by ID
app.get('/api/linkedin-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.linkedInProfile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'LinkedIn profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create LinkedIn profile
app.post('/api/linkedin-profiles', async (req, res) => {
  try {
    const { name, niche } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    const data = { name: name.trim() };
    if (niche) data.niche = niche;
    const profile = await prisma.linkedInProfile.create({ data });
    res.status(201).json(profile);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A LinkedIn profile with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update LinkedIn profile
app.put('/api/linkedin-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, niche } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    const data = { name: name.trim() };
    if (niche !== undefined) data.niche = niche || null;
    const profile = await prisma.linkedInProfile.update({
      where: { id },
      data
    });
    res.json(profile);
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'LinkedIn profile not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'A LinkedIn profile with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete LinkedIn profile
app.delete('/api/linkedin-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.linkedInProfile.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'LinkedIn profile not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ==================== SKILLS ====================

// Get all skills
app.get('/api/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get skill by ID
app.get('/api/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create skill
app.post('/api/skills', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }
    const skill = await prisma.skill.create({
      data: { name: name.trim() }
    });
    res.status(201).json(skill);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A skill with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update skill
app.put('/api/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }
    const skill = await prisma.skill.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(skill);
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Skill not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'A skill with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete skill
app.delete('/api/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.skill.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Skill not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ==================== PROSPECTS ====================

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

// Get prospects assigned to LH user (by lh_user_id)
app.get('/api/prospects/lh/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const prospects = await prisma.prospect.findMany({
      where: { lh_user_id: userId },
      orderBy: { created_at: 'desc' }
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
