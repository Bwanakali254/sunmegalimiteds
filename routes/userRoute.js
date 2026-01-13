import express from 'express';
import { loginUser, registerUser, adminLogin, googleAuth, getUserProfile, updateUserProfile, sendOTP, verifyOTP } from '../controllers/userController.js';
import { authRateLimit, otpSendRateLimit, otpVerifyRateLimit } from '../middleware/rateLimit.js';
import { validateRegister, validateLogin, validateAdminLogin, validateGoogleAuth, validateProfileUpdate, validateSendOTP, validateVerifyOTP, handleValidationErrors } from '../middleware/validation.js';
import authUser from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';

const userRouter = express.Router();

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

export default userRouter;