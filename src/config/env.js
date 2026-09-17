import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/stylesync',
  jwtSecret: process.env.JWT_SECRET || 'stylesync_jwt_fallback_secret_key_prod_2025',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  huggingFaceToken: process.env.HUGGINGFACE_TOKEN || '',
  smtp: {
    service: process.env.SMTP_SERVICE || '', // e.g. 'gmail'
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'StyleSync Support <noreply@stylesync.ai>',
  },
};
