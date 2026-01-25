import {v2 as cloudinary} from 'cloudinary';
import { logInfo, logError } from '../utils/logger.js';

const connectCloudinary = async () => {
    try {
        if (!process.env.CLOUDINARY_URL) {
            logError(new Error('Cloudinary credentials missing: set CLOUDINARY_URL'), 'connectCloudinary');
            return;
        }

        // Parse CLOUDINARY_URL: cloudinary://api_key:api_secret@cloud_name
        const url = process.env.CLOUDINARY_URL;
        const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
        
        if (!match) {
            logError(new Error('Invalid CLOUDINARY_URL format. Expected: cloudinary://api_key:api_secret@cloud_name'), 'connectCloudinary');
            return;
        }

        const [, api_key, api_secret, cloud_name] = match;

        cloudinary.config({
            cloud_name,
            api_key,
            api_secret
        });
        
        logInfo('Cloudinary configured successfully', 'cloudinary');
    } catch (error) {
        logError(error, 'connectCloudinary');
    }
}

export default connectCloudinary;