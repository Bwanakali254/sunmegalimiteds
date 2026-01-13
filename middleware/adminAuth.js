import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

const adminAuth = async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.json({ success: false, message: "No Authorized Login Again" });
        }
        
        // Verify and decode token as JWT object
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if decoded payload has admin role
        if (decoded.role !== 'admin') {
            return res.json({ success: false, message: "Invalid admin credentials" });
        }
        
        next();
    } catch (error) {
        logError(error, 'adminAuth');
        res.json({ success: false, message: "Invalid admin credentials" })
    }
}

export default adminAuth;