import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/challenge.controller.js';

const r = Router();
r.get('/', requireAuth, c.listChallenges);
r.patch('/:id/accept', requireAuth, c.acceptChallenge);

export default r;
