require('dotenv').config(); // .envファイルを読み込み
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// ルーターとデータベースのインポート
const authRoutes = require('./src/routes/auth');
const { initializeDatabase } = require('./src/database/connection');

const app = express();
const PORT = process.env.PORT || 5000;

// セキュリティミドルウェア（HTTPヘッダーをセキュアに設定）
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS設定（フロントエンドとの通信を許可）
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true  // 認証情報付きリクエストを許可
}));

// ログ設定（開発環境でのみHTTPリクエストログを出力）
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 基本ミドルウェア（JSONパースなど）
app.use(express.json({ limit: '10mb' }));          // JSONボディを解析
app.use(express.urlencoded({ extended: true }));   // URLエンコードされたボディを解析

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'University SNS Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API ルート（認証関連のルートを /api/auth 配下に配置）
app.use('/api/auth', authRoutes);

// 基本ルート（API仕様書的な役割）
app.get('/', (req, res) => {
  res.json({
    message: 'University SNS Backend API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        logout: 'POST /api/auth/logout',
        health: 'GET /api/auth/health'
      }
    },
    documentation: 'Visit /api/auth/health for authentication service status'
  });
});

// 404エラーハンドラー（存在しないルートへのアクセス）
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    message: 'The requested endpoint does not exist'
  });
});

// エラーハンドラー（予期しないエラーの処理）
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// サーバー起動処理
const startServer = async () => {
  try {
    // データベース初期化（接続テスト、テーブル作成）
    await initializeDatabase();

    // Express サーバー起動
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/health`);
      console.log(`✅ Ready for authentication testing!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // 起動に失敗した場合はプロセス終了
  }
};

startServer(); // サーバー起動実行

module.exports = app; // テスト用にエクスポート