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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 10;

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

// Login - email-based (no password; for extension)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true, email: true, name: true, role: true, created_at: true,
        linkedin_profile_id: true,
        linkedin_profile: { select: { id: true, name: true, niche: true } }
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard login - username or email + password, returns JWT
app.post('/api/auth/dashboard-login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    const loginLower = login.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginLower },
          { username: { equals: login.trim(), mode: 'insensitive' } }
        ]
      },
      select: {
        id: true, email: true, username: true, name: true, role: true, created_at: true,
        password_hash: true,
        linkedin_profile_id: true,
        linkedin_profile: { select: { id: true, name: true, niche: true } }
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account has no password set. Use Users & Roles to set one.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    const { password_hash: _, ...safeUser } = user;
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user: safeUser, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify JWT for dashboard protected routes
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, name: true, role: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.authUser = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.authUser);
});

// Change own password (requires auth)
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const newTrimmed = String(newPassword).trim();
    if (newTrimmed.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const userWithHash = await prisma.user.findUnique({
      where: { id: req.authUser.id },
      select: { id: true, password_hash: true }
    });
    if (!userWithHash || !userWithHash.password_hash) {
      return res.status(400).json({ error: 'This account has no password set' });
    }
    const match = await bcrypt.compare(String(currentPassword), userWithHash.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newTrimmed, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.authUser.id },
      data: { password_hash: hash }
    });
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  linkedin_profile_id: true,
  linkedin_profile: { select: { id: true, name: true, niche: true } },
  created_at: true
};

// Get all users (dashboard: require auth, admin only for write)
app.get('/api/users', authMiddleware, async (req, res) => {
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
app.get('/api/users/:id', authMiddleware, async (req, res) => {
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

// Create user (admin only)
app.post('/api/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, username, name, role, linkedin_profile_id, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (role === 'LH' && !linkedin_profile_id) {
      return res.status(400).json({ error: 'LinkedIn Profile is required for LH role' });
    }
    const data = {
      email: email.trim().toLowerCase(),
      username: username && String(username).trim() ? String(username).trim() : null,
      name: name || null,
      role: role || 'DC_R',
      linkedin_profile_id: linkedin_profile_id || null
    };
    if (password && String(password).trim()) {
      data.password_hash = await bcrypt.hash(String(password).trim(), SALT_ROUNDS);
    }
    const user = await prisma.user.create({
      data,
      select: USER_SELECT
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const msg = Array.isArray(target) && target.includes('username')
        ? 'A user with this username already exists'
        : 'A user with this email already exists';
      return res.status(409).json({ error: msg });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
app.put('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, name, role, linkedin_profile_id, password } = req.body;
    if (role === 'LH' && linkedin_profile_id === null) {
      return res.status(400).json({ error: 'LinkedIn Profile is required for LH role' });
    }
    const data = {};
    if (email !== undefined) data.email = email.trim().toLowerCase();
    if (username !== undefined) data.username = username && String(username).trim() ? String(username).trim() : null;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (linkedin_profile_id !== undefined) data.linkedin_profile_id = linkedin_profile_id || null;
    if (password !== undefined && String(password).trim()) {
      data.password_hash = await bcrypt.hash(String(password).trim(), SALT_ROUNDS);
    }
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
app.delete('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
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

// ==================== STATS (DC_R role) ====================
// Aggregated counts only - no record fetching

app.get('/api/stats/dc-r', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [totalProspects, todaysProspects, thisWeeksProspects, assignedLeads] = await Promise.all([
      prisma.prospect.count(),
      prisma.prospect.count({
        where: {
          created_at: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.prospect.count({
        where: {
          created_at: { gte: startOfWeek },
        },
      }),
      prisma.prospect.count({
        where: {
          lh_user_id: { not: null },
        },
      }),
    ]);

    res.json({
      totalProspects,
      todaysProspects,
      thisWeeksProspects,
      assignedLeads,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top 3 prospect sources: count per source via DB aggregation, sorted desc, limit 3
app.get('/api/stats/top-sources', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 3, 20);
    // Aggregation, sort, and limit done in the database
    const rows = await prisma.$queryRaw`
      SELECT sources AS source, COUNT(*)::int AS count
      FROM "Prospect"
      WHERE sources IS NOT NULL
      GROUP BY sources
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      include: {
        linkedin_profile: { select: { id: true, name: true, niche: true } },
      },
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
