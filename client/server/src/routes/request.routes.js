import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as reqc from '../controllers/request.controller.js';

const r = Router();
r.get('/lobby/:lobbyId/requests', requireAuth, reqc.listLobbyRequests);
r.post('/lobby/:lobbyId/request', requireAuth, reqc.createJoinRequest);
r.post('/lobby/:lobbyId/waitlist', requireAuth, reqc.createWaitlist);
r.patch('/request/:requestId/approve', requireAuth, reqc.approveRequest);
r.patch('/request/:requestId/reject', requireAuth, reqc.rejectRequest);
r.patch('/request/:requestId/cancel', requireAuth, reqc.cancelRequest);
r.patch('/request/:requestId/dropout', requireAuth, reqc.dropout);

export default r;
