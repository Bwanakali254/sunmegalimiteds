import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});

// Rate limit for OTP sending (5 requests per 15 minutes per user)
export const otpSendRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many OTP requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limit for OTP verification (10 requests per 15 minutes per user)
export const otpVerifyRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Too many verification attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
