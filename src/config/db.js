import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if not supported in environment
}

let cachedConnection = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[Database] MongoDB Connected: ${cachedConnection.connection.host}`);
    return cachedConnection;
  } catch (error) {
    cachedConnection = null;
    console.error(`[Database] Connection Error: ${error.message}`);
    throw error;
  }
};
