require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');
const ouraRoutes = require('./routes/ouraRoutes');

const app = express();
const PORT = process.env.PORT || 3011;

// Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'oura-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/oura', ouraRoutes);

// Error handling
app.use((err, req, res, next) => {
  req.log.error(err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    }
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Oura service listening at http://localhost:${PORT}`);
  });
}

module.exports = app;
