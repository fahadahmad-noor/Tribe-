import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as msg from '../controllers/message.controller.js';

const r = Router();
r.get('/inbox', requireAuth, msg.inbox);
r.get('/:userId', requireAuth, msg.thread);
r.post('/:userId', requireAuth, msg.sendDm);

export default r;
