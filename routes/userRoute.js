import express from 'express';
import { loginUser, registerUser, adminLogin, googleAuth, getUserProfile, updateUserProfile, sendOTP, verifyOTP, getAdminProfile, inviteAdmin, resetAdminPassword, requestPasswordReset, resetPassword, requestEmailChange, requestAccountDeletion } from '../controllers/userController.js';
import { authRateLimit, otpSendRateLimit, otpVerifyRateLimit } from '../middleware/rateLimit.js';
import { validateRegister, validateLogin, validateAdminLogin, validateGoogleAuth, validateProfileUpdate, validateSendOTP, validateVerifyOTP, validatePasswordResetRequest, validatePasswordReset, validateEmailChangeRequest, validateAccountDeletionRequest, handleValidationErrors } from '../middleware/validation.js';
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

// Password reset routes (customer)
userRouter.post('/request-password-reset', authRateLimit, validatePasswordResetRequest, handleValidationErrors, requestPasswordReset)
userRouter.post('/reset-password', authRateLimit, validatePasswordReset, handleValidationErrors, resetPassword)

// Email change routes (customer)
userRouter.post('/request-email-change', authUser, authRateLimit, validateEmailChangeRequest, handleValidationErrors, requestEmailChange)

// Account deletion routes (customer)
userRouter.post('/request-account-delete', authUser, authRateLimit, validateAccountDeletionRequest, handleValidationErrors, requestAccountDeletion)

// Admin management routes
userRouter.get('/admin/profile', adminAuth, getAdminProfile)
userRouter.post('/admin/invite', superAdminAuth, inviteAdmin)
userRouter.post('/admin/reset-password', resetAdminPassword)

export default userRouter;