import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';

const r = Router();
r.post('/register', auth.register);
r.post('/login', auth.login);
r.post('/logout', auth.logout);

export default r;
