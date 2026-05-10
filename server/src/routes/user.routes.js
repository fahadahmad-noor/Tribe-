import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import * as user from '../controllers/user.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 3 * 1024 * 1024 },
});

const r = Router();
r.get('/me', requireAuth, user.getMe);
r.patch('/me', requireAuth, user.patchMe);
r.get('/me/history', requireAuth, user.getHistory);
r.get('/me/squads', requireAuth, user.getMeSquads);
r.get('/search', requireAuth, user.searchUsers);
r.post('/me/avatar', requireAuth, upload.single('avatar'), user.uploadAvatar);
r.get('/:id/public', requireAuth, user.getUserPublicProfile);
r.get('/:id', requireAuth, user.getUserById);

export default r;
