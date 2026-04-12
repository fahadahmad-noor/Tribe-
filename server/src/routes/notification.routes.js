const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getNotifications);
router.patch('/read-all', auth, ctrl.markAllRead);
router.patch('/:id/read', auth, ctrl.markRead);

module.exports = router;
