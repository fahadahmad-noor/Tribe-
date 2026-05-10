import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as lobby from '../controllers/lobby.controller.js';

const r = Router();
r.get('/', requireAuth, lobby.listLobbies);
r.get('/locations', requireAuth, lobby.getLocations);
r.post('/', requireAuth, lobby.createLobby);
r.get('/:id', requireAuth, lobby.getLobby);
r.patch('/:id/close', requireAuth, lobby.closeLobby);
r.post('/:id/manual-decrement', requireAuth, lobby.manualDecrement);

export default r;
