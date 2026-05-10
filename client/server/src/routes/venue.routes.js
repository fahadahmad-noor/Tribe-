import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as venue from '../controllers/venue.controller.js';

const r = Router();
r.get('/', optionalAuth, venue.listVenues);
r.get('/:id/history', requireAuth, venue.venueHistory);
r.get('/:id', optionalAuth, venue.getVenue);
r.post('/apply', requireAuth, venue.applyVenue);

export default r;
