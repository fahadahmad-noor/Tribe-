import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/notification.controller.js';

const r = Router();
r.get('/', requireAuth, ctrl.getNotifications);
r.patch('/read-all', requireAuth, ctrl.markAllRead);
r.patch('/:id/read', requireAuth, ctrl.markRead);

export default r;
