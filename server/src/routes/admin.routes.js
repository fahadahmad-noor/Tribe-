import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import * as admin from '../controllers/admin.controller.js';

const r = Router();
r.use(requireAuth, requireRoles('admin'));

// Overview
r.get('/dashboard', admin.dashboard);

// Users
r.get('/users',              admin.listUsers);
r.get('/users/:id',          admin.getUser);
r.patch('/users/:id/ban',    admin.banUser);
r.patch('/users/:id/unban',  admin.unbanUser);
r.patch('/users/:id/roles',  admin.updateUserRoles);

// Venues
r.get('/venues/pending',        admin.pendingVenues);
r.get('/venues',                admin.listAllVenues);
r.patch('/venues/:id/verify',   admin.verifyVenue);
r.patch('/venues/:id/reject',   admin.rejectVenue);

// Lobbies
r.get('/lobbies',               admin.listAllLobbies);
r.patch('/lobbies/:id/close',   admin.forceCloseLobby);

// Audit Log
r.get('/audit',                 admin.listAuditLog);

export default r;
