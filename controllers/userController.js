import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { logError } from '../utils/logger.js';
import { verifyGoogleToken } from '../services/googleAuth.js';


const ccreateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route handler for user login
const loginUser = async (req, res) => {
   try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
          
        if (!user) {
            return res.json({success: false, message: "User does not exist"});
        }

        if (!user.password) {
            return res.json({success: false, message: "This account uses Google sign-in. Please use Google to login."});
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Update lastLogin
            user.lastLogin = new Date();
            await user.save();
            
            const token = ccreateToken(user._id);
            res.json({success:true, token})
        }
        else {
            res.json({success:false, message: "Invalid credentials"})
        }

   } catch (error) {
        logError(error, 'loginUser');
        res.json({success:false, message: "Login failed"})
   }
}

// Route handler for user registration
const registerUser = async (req, res) => {
   try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({success: false, message: "User already exists"});
        }

        // validating email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({success: false, message: "Please enter a valid email"});
        }

        if (password.length < 8) {
            return res.json({success: false, message: "Please enter a strong password"});
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            emailVerified: false, // New users need verification
            otpCode,
            otpExpires,
            otpAttempts: 0,
            otpPurpose: 'signup',
            currency: 'KES',
            notificationPreferences: {
                orderUpdates: true,
                marketingEmails: false
            }
        });

        const user = await newUser.save();

        // Fire-and-forget OTP email (non-blocking)
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'signup' })
                .catch(err => logError(err, 'registerUser-otpEmail'));
        } catch (emailError) {
            logError(emailError, 'registerUser-otpEmail');
        }

        // Return requiresVerification flag instead of token
        res.json({
            success: true,
            requiresVerification: true,
            message: "Please verify your email to complete registration"
        });

   } catch (error) {
        logError(error, 'registerUser');
        res.json({success:false, message: "Registration failed"})
   }
}

// Route for Admin login
const adminLogin = async (req, res) => {
   try {
   
         const { email, password } = req.body;

         if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Create structured JWT payload with role and email
            const payload = {
               email: email,
               role: 'admin'
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.json({success:true, token})
         }
         else {
            res.json({success:false, message: "Invalid admin credentials"})
         }

   } catch (error) {
       logError(error, 'adminLogin');
       res.json({success:false, message: "Authentication failed"});
   }
}

// Route handler for Google authentication
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.json({ success: false, message: 'Google token is required' });
        }

        // Verify Google token
        const googleUser = await verifyGoogleToken(idToken);

        // Check if user exists by googleId
        let user = await userModel.findOne({ googleId: googleUser.googleId });

        if (user) {
            // User exists with this Google account - login
            user.lastLogin = new Date();
            await user.save();
            const token = ccreateToken(user._id);
            return res.json({ success: true, token });
        }

        // Check if user exists by email with different auth provider
        const existingUser = await userModel.findOne({ email: googleUser.email });
        
        if (existingUser) {
            // Email exists but with password auth - reject to prevent account takeover
            return res.json({ 
                success: false, 
                message: 'Email already registered with password. Please use password login.' 
            });
        }

        // New user - create account
        const newUser = new userModel({
            name: googleUser.name,
            email: googleUser.email,
            googleId: googleUser.googleId,
            authProvider: 'google',
            password: undefined, // No password for Google users
            emailVerified: true, // Google users are auto-verified
            cartData: {},
            currency: 'KES',
            notificationPreferences: {
                orderUpdates: true,
                marketingEmails: false
            }
        });

        user = await newUser.save();
        
        // Fire-and-forget welcome email (non-blocking)
        try {
            const { sendWelcomeEmail } = await import('../services/emailService.js');
            sendWelcomeEmail({ email: user.email, name: user.name })
                .catch(err => logError(err, 'googleAuth-welcomeEmail'));
        } catch (emailError) {
            logError(emailError, 'googleAuth-welcomeEmail');
        }
        
        const token = ccreateToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        logError(error, 'googleAuth');
        res.json({ 
            success: false, 
            message: error.message || 'Google authentication failed' 
        });
    }
}

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.userId; // Set by auth middleware

        const user = await userModel.findById(userId).select('-password -otpCode -otpExpires -otpAttempts -otpPurpose -emailVerificationToken -emailVerificationExpires');

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || null,
                address: {
                    country: user.address?.country || null,
                    city: user.address?.city || null,
                    street: user.address?.street || null
                },
                emailVerified: user.emailVerified || false,
                currency: user.currency || 'KES',
                notificationPreferences: {
                    orderUpdates: user.notificationPreferences?.orderUpdates !== undefined ? user.notificationPreferences.orderUpdates : true,
                    marketingEmails: user.notificationPreferences?.marketingEmails !== undefined ? user.notificationPreferences.marketingEmails : false
                },
                authProvider: user.authProvider || 'email',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        logError(error, 'getUserProfile');
        res.json({ success: false, message: "Failed to fetch profile" });
    }
}

// Update user profile
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId; // Set by auth middleware
        const { name, phone, address, currency, notificationPreferences } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Update only provided fields (partial update)
        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) {
            if (!user.address) user.address = {};
            if (address.country !== undefined) user.address.country = address.country;
            if (address.city !== undefined) user.address.city = address.city;
            if (address.street !== undefined) user.address.street = address.street;
        }
        if (currency !== undefined) user.currency = currency;
        if (notificationPreferences !== undefined) {
            if (!user.notificationPreferences) user.notificationPreferences = {};
            if (notificationPreferences.orderUpdates !== undefined) {
                user.notificationPreferences.orderUpdates = notificationPreferences.orderUpdates;
            }
            if (notificationPreferences.marketingEmails !== undefined) {
                user.notificationPreferences.marketingEmails = notificationPreferences.marketingEmails;
            }
        }

        user.updatedAt = new Date();
        await user.save();

        // Return updated user (exclude sensitive fields)
        const updatedUser = await userModel.findById(userId).select('-password -otpCode -otpExpires -otpAttempts -otpPurpose -emailVerificationToken -emailVerificationExpires');

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone || null,
                address: {
                    country: updatedUser.address?.country || null,
                    city: updatedUser.address?.city || null,
                    street: updatedUser.address?.street || null
                },
                emailVerified: updatedUser.emailVerified || false,
                currency: updatedUser.currency || 'KES',
                notificationPreferences: {
                    orderUpdates: updatedUser.notificationPreferences?.orderUpdates !== undefined ? updatedUser.notificationPreferences.orderUpdates : true,
                    marketingEmails: updatedUser.notificationPreferences?.marketingEmails !== undefined ? updatedUser.notificationPreferences.marketingEmails : false
                },
                authProvider: updatedUser.authProvider || 'email',
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }
        });
    } catch (error) {
        logError(error, 'updateUserProfile');
        res.json({ success: false, message: "Failed to update profile" });
    }
}

// Send OTP
const sendOTP = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        const userId = req.userId; // Optional, set by auth middleware if logged in

        let user;
        if (userId) {
            // Logged-in user requesting OTP
            user = await userModel.findById(userId);
            if (!user) {
                return res.json({ success: false, message: "User not found" });
            }
        } else {
            // Not logged in (signup flow or verification)
            if (!email) {
                return res.json({ success: false, message: "Email is required" });
            }
            user = await userModel.findOne({ email });
            if (!user) {
                return res.json({ success: false, message: "Verification failed" }); // Generic message for security
            }
        }

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = purpose;
        await user.save();

        // Fire-and-forget OTP email (non-blocking)
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose })
                .catch(err => logError(err, 'sendOTP-email'));
        } catch (emailError) {
            logError(emailError, 'sendOTP-email');
        }

        res.json({
            success: true,
            message: "OTP sent successfully",
            expiresIn: 600 // 10 minutes in seconds
        });
    } catch (error) {
        logError(error, 'sendOTP');
        res.json({ success: false, message: "Failed to send OTP" });
    }
}

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email, otpCode, purpose } = req.body;

        if (!email || !otpCode || !purpose) {
            return res.json({ success: false, message: "Email, OTP code, and purpose are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Verification failed" }); // Generic message for security
        }

        // Check OTP
        if (!user.otpCode || user.otpCode !== otpCode) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            await user.save();
            return res.json({ success: false, message: "Invalid code. Please try again." });
        }

        // Check expiration
        if (!user.otpExpires || user.otpExpires < new Date()) {
            return res.json({ success: false, message: "This code has expired. Please request a new one." });
        }

        // Check attempts
        if (user.otpAttempts >= 5) {
            return res.json({ success: false, message: "Too many failed attempts. Please request a new OTP code." });
        }

        // Check purpose matches
        if (user.otpPurpose !== purpose) {
            return res.json({ success: false, message: "Invalid verification code." });
        }

        // OTP is valid - clear OTP fields
        user.otpCode = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        user.otpPurpose = null;

        // Handle purpose-specific actions
        if (purpose === 'signup') {
            user.emailVerified = true;
            await user.save();
            
            // Send welcome email after verification
            try {
                const { sendWelcomeEmail } = await import('../services/emailService.js');
                sendWelcomeEmail({ email: user.email, name: user.name })
                    .catch(err => logError(err, 'verifyOTP-welcomeEmail'));
            } catch (emailError) {
                logError(emailError, 'verifyOTP-welcomeEmail');
            }
            
            const token = ccreateToken(user._id);
            return res.json({
                success: true,
                message: "Email verified successfully",
                token
            });
        } else if (purpose === 'verification') {
            user.emailVerified = true;
            await user.save();
            return res.json({
                success: true,
                message: "Email verified successfully"
            });
        } else {
            // For password_change, email_change - just verify OTP, don't change anything yet
            await user.save();
            return res.json({
                success: true,
                message: "OTP verified successfully"
            });
        }
    } catch (error) {
        logError(error, 'verifyOTP');
        res.json({ success: false, message: "Verification failed" });
    }
}

export { loginUser, registerUser, adminLogin, googleAuth, getUserProfile, updateUserProfile, sendOTP, verifyOTP };
