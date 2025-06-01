const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');

// JWT認証ミドルウェア
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // JWTトークンの検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // データベースでユーザーの存在確認
    const userResult = await pool.query(
      'SELECT id, email, username, full_name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];

    // ユーザーがアクティブかチェック
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated' 
      });
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Please login again' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expired',
        message: 'Please login again' 
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error' 
    });
  }
};

// オプショナル認証（ログインしていなくてもアクセス可能だが、ログインしていれば情報を取得）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await pool.query(
      'SELECT id, email, username, full_name FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    req.user = userResult.rows.length > 0 ? {
      userId: userResult.rows[0].id,
      email: userResult.rows[0].email,
      username: userResult.rows[0].username,
      fullName: userResult.rows[0].full_name
    } : null;

    next();
  } catch (error) {
    // エラーがあってもnextを呼ぶ（オプショナルなので）
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};