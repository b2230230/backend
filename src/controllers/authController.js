const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');

// 大学メールドメインの検証
const validateUniversityEmail = (email) => {
  const universityDomains = [
    '.ac.jp', '.edu', '.edu.au', '.edu.cn', '.edu.sg',
    // 日本の主要大学ドメイン例
    'u-tokyo.ac.jp', 'kyoto-u.ac.jp', 'osaka-u.ac.jp', 'tohoku.ac.jp',
    'nagoya-u.ac.jp', 'kyushu-u.ac.jp', 'hokudai.ac.jp', 'titech.ac.jp',
    'waseda.jp', 'keio.jp', 'rikkyo.ac.jp', 'meiji.ac.jp', 'chuo-u.ac.jp',
    'hosei.ac.jp', 'aoyama.ac.jp', 'sophia.ac.jp', 'icu.ac.jp'
  ];
  
  return universityDomains.some(domain => email.endsWith(domain));
};

// JWTトークンの生成
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ユーザー登録
const register = async (req, res) => {
  try {
    const { email, password, username, fullName, university, year, department } = req.body;

    // 入力検証
    if (!email || !password || !username || !fullName) {
      return res.status(400).json({ 
        error: 'Required fields missing',
        message: 'Email, password, username, and full name are required'
      });
    }

    // 大学メールアドレス検証
    if (!validateUniversityEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email domain',
        message: 'Please use a valid university email address'
      });
    }

    // パスワード強度チェック
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      });
    }

    // ユーザー名の検証
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        error: 'Invalid username',
        message: 'Username must be between 3 and 20 characters'
      });
    }

    // 既存ユーザーチェック
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'Email or username is already registered'
      });
    }

    // パスワードハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const result = await pool.query(
      `INSERT INTO users (email, password, username, full_name, university, year, department) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, username, full_name, university, created_at`,
      [
        email.toLowerCase(),
        hashedPassword,
        username.toLowerCase(),
        fullName,
        university || null,
        year || null,
        department || null
      ]
    );

    const user = result.rows[0];
    
    // JWTトークン生成
    const token = generateToken(user.id, user.email);

    // ログイン時刻を更新
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    console.log(`✅ New user registered: ${user.username} (${user.email})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        university: user.university,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'Internal server error. Please try again later.'
    });
  }
};

// ユーザーログイン
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 入力検証
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // ユーザー検索
    const result = await pool.query(
      `SELECT id, email, password, username, full_name, university, is_active 
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    // アカウント有効性チェック
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // ログイン時刻を更新
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // JWTトークン生成
    const token = generateToken(user.id, user.email);

    console.log(`✅ User logged in: ${user.username} (${user.email})`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        university: user.university
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'Internal server error. Please try again later.'
    });
  }
};

// ユーザー情報取得
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, email, username, full_name, university, year, department, 
              bio, profile_image, created_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        university: user.university,
        year: user.year,
        department: user.department,
        bio: user.bio,
        profileImage: user.profile_image,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
};

// ログアウト（トークンの無効化は本来フロントエンドで行う）
const logout = async (req, res) => {
  try {
    // 実際のログアウトログ
    console.log(`📤 User logged out: ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout
};