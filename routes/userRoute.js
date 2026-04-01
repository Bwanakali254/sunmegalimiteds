import { Router } from 'express';
import { adminLogin, verifyOTP, resetAdminPassword, getAdminProfile, inviteAdmin, refreshAccessToken } from '../controllers/userController.js';
import adminAuth from '../middleware/adminAuth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Super admin only middleware
const superAdminAuth = async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.json({ success: false, message: "Not authorized" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'super_admin') {
            return res.json({ success: false, message: "Access denied. Super admin only." });
        }
        
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('Super admin auth error:', error);
        res.json({ success: false, message: "Not authorized" });
    }
};

// Public routes
router.post('/admin', adminLogin);
router.post('/verify-otp', verifyOTP);
router.post('/refresh-token', refreshAccessToken);

// Admin management routes
router.get('/admin/profile', adminAuth, getAdminProfile);
router.post('/admin/invite', superAdminAuth, inviteAdmin);
router.post('/admin/reset-password', resetAdminPassword);

export default router;
