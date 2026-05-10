import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { getRedis, isRedisAvailable } from '../config/redis.js';

const TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds — matches JWT expiry

export async function register(req, res) {
  try {
    const { name, email, password, whatsappNumber, preferences } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!whatsappNumber || !String(whatsappNumber).trim()) return res.status(400).json({ error: 'Contact / WhatsApp number is required' });
    const emailNorm = email.toLowerCase().trim();
    if (await User.findOne({ email: emailNorm })) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: emailNorm,
      password: hash,
      whatsappNumber: whatsappNumber.trim(),
      preferences: preferences || [],
    });
    const token = signToken(user._id.toString());
    return res.json({ token, user: user.toPublicJSON() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || user.banned || !user.password) {
      // Increment failed attempt counter
      await req._incrementLoginAttempts?.().catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      // Increment failed attempt counter
      await req._incrementLoginAttempts?.().catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Successful login — clear any previous failed attempts
    await req._clearLoginAttempts?.().catch(() => {});
    const token = signToken(user._id.toString());
    return res.json({ token, user: user.toPublicJSON() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function logout(req, res) {
  try {
    // Blacklist the current token in Redis so it can't be reused
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : null;

    if (token && (await isRedisAvailable())) {
      const redis = getRedis();
      if (!redis.status || redis.status === 'end') {
        await redis.connect().catch(() => {});
      }
      await redis.set(`blacklist:${token}`, '1', 'EX', TOKEN_TTL);
      console.log('🔒 Token blacklisted on logout');
    }
  } catch (err) {
    console.warn('⚠️  Logout blacklist failed (non-critical):', err?.message || err);
  }
  return res.json({ ok: true });
}
