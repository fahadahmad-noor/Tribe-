import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';

const r = Router();
r.post('/register', auth.register);
r.post('/login', loginRateLimiter, auth.login);
r.post('/logout', auth.logout);

export default r;
