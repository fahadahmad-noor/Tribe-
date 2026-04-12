import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { name, email, password, whatsappNumber, preferences } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const emailNorm = email.toLowerCase().trim();
    if (await User.findOne({ email: emailNorm })) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: emailNorm,
      password: hash,
      whatsappNumber: whatsappNumber || '',
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
    if (!user || user.banned || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user._id.toString());
    return res.json({ token, user: user.toPublicJSON() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function logout(_req, res) {
  return res.json({ ok: true });
}
