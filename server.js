const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '大学生SNS バックエンドAPI が正常動作中',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 8000
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Error handling middleware
//s
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`🚀 Backend API Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
});

module.exports = app;
