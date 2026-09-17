import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.js';

const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  console.log('[Storage] Cloudinary configured successfully.');
} else {
  console.log('[Storage] Cloudinary not configured; using secure inline buffer/Data URI storage fallback.');
}

/**
 * Upload an image buffer or file data to Cloudinary or fallback to a Data URI
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File mime type
 * @param {string} folder - Destination folder in Cloudinary
 * @returns {Promise<string>} Image URL or Data URI
 */
export const uploadImage = async (buffer, mimeType = 'image/jpeg', folder = 'stylesync') => {
  if (!buffer) return '';

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Fallback: Return Base64 Data URI
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
};

export { cloudinary, isCloudinaryConfigured };
