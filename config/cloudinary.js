import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure Cloudinary for image uploads
 * Uses CLOUDINARY_URL from environment variables
 * Format: cloudinary://api_key:api_secret@cloud_name
 */
const connectCloudinary = async () => {
  try {
    if (!process.env.CLOUDINARY_URL) {
      console.warn('⚠️  CLOUDINARY_URL not set. Image uploads will not work.');
      return;
    }

    // Parse CLOUDINARY_URL: cloudinary://api_key:api_secret@cloud_name
    const url = process.env.CLOUDINARY_URL;
    const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    
    if (!match) {
      console.error('❌ Invalid CLOUDINARY_URL format. Expected: cloudinary://api_key:api_secret@cloud_name');
      return;
    }

    const [, api_key, api_secret, cloud_name] = match;

    cloudinary.config({
      cloud_name,
      api_key,
      api_secret
    });
    
    console.log('✅ Cloudinary configured successfully');
  } catch (error) {
    console.error('❌ Cloudinary configuration failed:', error.message);
  }
};

export default connectCloudinary;
