const { Pool } = require('pg');

// PostgreSQL接続設定
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'university_sns',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // 接続プールの設定
  max: 20, // プール内の最大接続数
  idleTimeoutMillis: 30000, // アイドル接続のタイムアウト
  connectionTimeoutMillis: 2000, // 接続試行のタイムアウト
});

// データベース接続テスト
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // PostgreSQLのバージョン確認
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[1]);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// ユーザーテーブルの初期化
const initializeUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        university VARCHAR(100),
        year INTEGER,
        department VARCHAR(100),
        bio TEXT,
        profile_image VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // インデックス作成
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_university ON users(university);
    `);

    console.log('✅ Users table initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing users table:', error);
    throw error;
  }
};

// データベース全体の初期化
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      throw new Error('Database connection failed');
    }

    await initializeUsersTable();
    
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};