import {v2 as cloudinary} from 'cloudinary';
import { logInfo, logError } from '../utils/logger.js';

const connectCloudinary = async () => {
    try {
        if (!process.env.CLOUDINARY_URL) {
            logError(new Error('Cloudinary credentials missing: set CLOUDINARY_URL'), 'connectCloudinary');
            return;
        }

        cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
        logInfo('Cloudinary configured successfully', 'cloudinary');
    } catch (error) {
        logError(error, 'connectCloudinary');
    }
}

export default connectCloudinary;
