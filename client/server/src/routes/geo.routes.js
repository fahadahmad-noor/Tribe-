import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as geo from '../controllers/geo.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/search', geo.search);
r.get('/reverse', geo.reverse);

export default r;
