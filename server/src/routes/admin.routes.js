import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import * as admin from '../controllers/admin.controller.js';

const r = Router();
r.use(requireAuth, requireRoles('admin'));
r.get('/dashboard', admin.dashboard);
r.get('/venues/pending', admin.pendingVenues);
r.get('/users', admin.listUsers);
r.patch('/venues/:id/verify', admin.verifyVenue);
r.patch('/venues/:id/reject', admin.rejectVenue);
r.patch('/users/:id/ban', admin.banUser);

export default r;
