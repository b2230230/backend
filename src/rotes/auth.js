const express = require('express');
const { register, login, getProfile, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// 公開ルート（認証不要）
router.post('/register', registrationLimiter, register);
router.post('/login', authLimiter, login);

// 保護されたルート（認証必要）
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

// ヘルスチェック用
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Authentication API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;