import {v2 as cloudinary} from 'cloudinary';
import { logInfo, logError } from '../utils/logger.js';

const connectCloudinary = async () => {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        logInfo('Cloudinary configured successfully', 'cloudinary');
    } catch (error) {
        logError(error, 'connectCloudinary');
    }
}

export default connectCloudinary;