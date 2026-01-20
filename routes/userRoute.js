import express from 'express';
import { loginUser, registerUser, adminLogin, googleAuth, getUserProfile, updateUserProfile, sendOTP, verifyOTP, inviteAdmin, resetAdminPassword } from '../controllers/userController.js';
import { authRateLimit, otpSendRateLimit, otpVerifyRateLimit } from '../middleware/rateLimit.js';
import { validateRegister, validateLogin, validateAdminLogin, validateGoogleAuth, validateProfileUpdate, validateSendOTP, validateVerifyOTP, handleValidationErrors } from '../middleware/validation.js';
import authUser from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import adminAuth from '../middleware/adminAuth.js';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

const userRouter = express.Router();

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
        logError(error, 'superAdminAuth');
        res.json({ success: false, message: "Not authorized" });
    }
};

// Auth routes
userRouter.post('/register', authRateLimit, validateRegister, handleValidationErrors, registerUser)
userRouter.post('/login', authRateLimit, validateLogin, handleValidationErrors, loginUser)
userRouter.post('/admin', authRateLimit, validateAdminLogin, handleValidationErrors, adminLogin)
userRouter.post('/google', authRateLimit, validateGoogleAuth, handleValidationErrors, googleAuth)

// Profile routes
userRouter.get('/profile', authUser, getUserProfile)
userRouter.put('/profile', authUser, validateProfileUpdate, handleValidationErrors, updateUserProfile)

// OTP routes (optionalAuth allows logged-in users to use token, but also works without token for signup)
userRouter.post('/send-otp', optionalAuth, otpSendRateLimit, validateSendOTP, handleValidationErrors, sendOTP)
userRouter.post('/verify-otp', otpVerifyRateLimit, validateVerifyOTP, handleValidationErrors, verifyOTP)

// Admin management routes
userRouter.post('/admin/invite', superAdminAuth, inviteAdmin)
userRouter.post('/admin/reset-password', resetAdminPassword)

export default userRouter;