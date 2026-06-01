require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const config = require('./config');
const webhookRoutes = require('./routes/webhook');
const healthRoutes = require('./routes/health');
const matcherService = require('./services/matcher');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Rate limiting for API routes
app.use('/api', apiLimiter);

// Routes
app.use('/webhook', webhookRoutes);
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'InstaGle Bot',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start auto-matching process
    matcherService.startAutoMatching(1000);

    // Start Express server
    const port = config.PORT;
    app.listen(port, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🎉 InstaGle Bot is running!             ║
║                                           ║
║   Port: ${port}                              ║
║   Environment: ${config.NODE_ENV}              ║
║   Database: MongoDB Connected              ║
║                                           ║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  matcherService.stopAutoMatching();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  matcherService.stopAutoMatching();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
module.exports = app;

// Start server if run directly
if (require.main === module) {
  startServer();
}