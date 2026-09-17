import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env.js';

// Configure DNS for MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if not supported in environment
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    // If not in production, log error instead of crashing immediately so mock/test routes can run if DB is offline
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
};
