import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as squad from '../controllers/squad.controller.js';

const r = Router();
r.get('/', requireAuth, squad.listSquads);
r.post('/', requireAuth, squad.createSquad);
r.get('/:id/history', requireAuth, squad.squadHistory);
r.get('/:id', requireAuth, squad.getSquad);
r.post('/:id/members', requireAuth, squad.addMember);
r.delete('/:id/members/:userId', requireAuth, squad.removeMember);
r.post('/:id/leave', requireAuth, squad.leaveSquad);

export default r;
