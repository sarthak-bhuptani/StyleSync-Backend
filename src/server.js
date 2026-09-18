import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and external assets
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false, // Allows cross-origin requests from frontend (localhost:5173)
  })
);

// CORS Configuration - Accept all origins
const corsOptions = {
  origin: true, // Dynamically accepts any origin while supporting credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle all preflight requests

// HTTP Request Logger
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body Parsing Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// OpenAPI / Swagger Documentation (FastAPI & Standard Style)
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));

  const swaggerUiOptions = {
    customSiteTitle: 'StyleSync Backend - Swagger UI',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 20px 0; }
      .swagger-ui .info .title { font-size: 32px; font-weight: 700; color: #1e293b; }
      .swagger-ui .info .title small.version-stamp { background-color: #0284c7; }
      .swagger-ui .info .title small.version-stamp pre { color: #fff; }
      .swagger-ui .btn.authorize { background-color: transparent; border-color: #10b981; color: #10b981; }
      .swagger-ui .btn.authorize svg { fill: #10b981; }
      .swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.08); border-color: #61affe; }
      .swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.08); border-color: #49cc90; }
      .swagger-ui .opblock.opblock-put { background: rgba(252, 161, 48, 0.08); border-color: #fca130; }
      .swagger-ui .opblock.opblock-delete { background: rgba(249, 62, 62, 0.08); border-color: #f93e3e; }
      .swagger-ui .opblock.opblock-patch { background: rgba(80, 227, 194, 0.08); border-color: #50e3c2; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      defaultModelRendering: 'model',
    },
  };

  // Serve raw JSON spec
  app.get(['/openapi.json', '/api-docs.json'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // Serve Swagger UI at both /docs (FastAPI style) and /api-docs (Express style)
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

  console.log('[Docs] Swagger UI live at: http://localhost:5000/docs');
  console.log('[Docs] Swagger UI live at: http://localhost:5000/api-docs');
  console.log('[Docs] OpenAPI JSON schema at: http://localhost:5000/openapi.json');
} catch (err) {
  console.warn('[Docs] Could not load docs/swagger.yaml for Swagger UI:', err.message);
}

// Health Check Endpoint
app.get(['/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'StyleSync Production Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    aiEngine: config.geminiApiKey ? 'Gemini 2.0 / 1.5 Active' : 'Heuristic Engine (Mock Fallback)',
  });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to StyleSync — AI Personal Shopping Advisor API',
    docs: '/api-docs',
    health: '/health',
    version: 'v1',
  });
});

// 404 & Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start Server (only when not running inside Vercel serverless functions)
if (!process.env.VERCEL) {
  const server = app.listen(config.port, () => {
    console.log(
      `🚀 [StyleSync Server] Running in ${config.nodeEnv} mode on http://localhost:${config.port}`
    );
    console.log(`📖 [API Documentation] Interactive Swagger UI: http://localhost:${config.port}/api-docs`);
  });

  // Handle port in use automatically
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port Handler] Port ${config.port} temporarily busy. Retrying in 1.5s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        server.listen(config.port);
      }, 1500);
    } else {
      console.error(`[Server Error]: ${err.message}`);
    }
  });

  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection Error]: ${err.message}`);
});

export default app;
