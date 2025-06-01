const rateLimit = require('express-rate-limit');

// 認証API用のレート制限（厳しめ）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 15分間に5回まで
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // カスタムキー生成（IPアドレス + User-Agent）
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('User-Agent')}`;
  },
  // レート制限にひっかかった時の処理
  onLimitReached: (req, res, options) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
  }
});

// 一般API用のレート制限（緩め）
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分間に100回まで
  message: {
    error: 'Too many requests',
    message: 'Please slow down and try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 開発環境ではスキップ
    return process.env.NODE_ENV === 'development';
  }
});

// パスワードリセット用の厳しいレート制限
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // 1時間に3回まで
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again after 1 hour',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// IPアドレス別の登録制限
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // 1時間に3回まで新規登録
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again after 1 hour',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  generalLimiter,
  passwordResetLimiter,
  registrationLimiter
};