import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as t from '../controllers/tournament.controller.js';

const r = Router();
r.get('/', requireAuth, t.listTournaments);
r.get('/:id', requireAuth, t.getTournament);
r.post('/:id/register', requireAuth, t.registerSquad);

export default r;
