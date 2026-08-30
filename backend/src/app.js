'use strict';

const path = require('node:path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const evidenceRoutes = require('./routes/evidence.routes');
const healthRoutes = require('./routes/health.routes');
const userRoutes = require('./routes/user.routes');
const suspiciousRoutes = require('./routes/suspicious.routes');
const contentRoutes = require('./routes/content.routes');
const contentAdminRoutes = require('./routes/contentAdmin.routes');
const initiativeRoutes = require('./routes/initiative.routes');
const initiativeAdminRoutes = require('./routes/initiativeAdmin.routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { generalApiLimiter } = require('./middleware/rateLimiter');
const originGuard = require('./middleware/originGuard');
const { createSessionMiddleware } = require('./config/session');
const { env } = require('./config/env');
const requestContext = require('./middleware/requestContext');
const cachePolicy = require('./middleware/cachePolicy');
const assistantRoutes = require('./routes/assistant.routes');
const configRoutes = require('./routes/config.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
const frontendDirectory = path.resolve(__dirname, '..', '..', 'frontend');

app.disable('x-powered-by');
if (env.TRUST_PROXY_HOPS > 0) app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(requestContext);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
    }
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    let host = '';
    try { host = new URL(origin).host.toLowerCase(); } catch (err) { host = ''; }
    const allowed = env.clientOrigins.some((item) => {
      try { return new URL(item).host.toLowerCase() === host; } catch (err) { return item === origin; }
    }) || host.endsWith('.netlify.app') || host.endsWith('.onrender.com');
    callback(null, allowed);
  },
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-Request-ID'],
  credentials: true,
  maxAge: 600
}));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(createSessionMiddleware());
app.use(cachePolicy);
app.use('/api', originGuard);

app.use('/api', generalApiLimiter);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin', contentAdminRoutes);
app.use('/api/v1/admin', initiativeAdminRoutes);
app.use('/api/v1', suspiciousRoutes);
app.use('/api/v1', contentRoutes);
app.use('/api/v1', initiativeRoutes);
app.use('/api/v1', evidenceRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/users', userRoutes);

// Kept as a compatibility alias for the Phase 1 health check.
app.use('/health', healthRoutes);
app.use('/api', notFound);

app.use(['/private_uploads', '/uploads'], notFound);

app.use(express.static(frontendDirectory, {
  extensions: ['html'],
  etag: true,
  maxAge: 0,
  setHeaders(response, filePath) {
    if (path.extname(filePath) === '.html') response.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('*path', (request, response) => {
  response.sendFile(path.join(frontendDirectory, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
