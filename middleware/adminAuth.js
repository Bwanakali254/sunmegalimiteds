import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { logError } from '../utils/logger.js';

const adminAuth = async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.status(401).json({ success: false, message: "No Authorized Login Again", tokenExpired: false });
        }
        
        // Verify and decode token as JWT object
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if decoded payload has admin or super_admin role
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Verify user exists and check otpVerified
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if OTP was verified (for admin login security)
        if (!user.otpVerified) {
            return res.status(403).json({ success: false, message: "Session not verified. Please login again." });
        }

        // Check if user still has admin/super_admin role
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        logError(error, 'adminAuth');
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: "Token expired", tokenExpired: true });
        }
        res.status(401).json({ success: false, message: "Invalid admin credentials", tokenExpired: false })
    }
}

export default adminAuth;