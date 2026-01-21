import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { logError, logInfo } from '../utils/logger.js';
import { verifyGoogleToken } from '../services/googleAuth.js';


const ccreateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Bootstrap super admin on server start
const bootstrapSuperAdmin = async () => {
    try {
        // Check if super admin already exists
        const existingSuperAdmin = await userModel.findOne({ role: 'super_admin' });
        
        if (existingSuperAdmin) {
            logInfo('Super admin already exists', 'bootstrapSuperAdmin');
            return;
        }

        // Get credentials from environment
        const email = process.env.SUPER_ADMIN_EMAIL;
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!email || !password) {
            logError(new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to create super admin'), 'bootstrapSuperAdmin');
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create super admin
        const superAdmin = new userModel({
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'super_admin',
            mustResetPassword: true,
            otpVerified: false,
            emailVerified: true,
            authProvider: 'email'
        });

        await superAdmin.save();
        logInfo('Super admin created successfully', 'bootstrapSuperAdmin');
    } catch (error) {
        logError(error, 'bootstrapSuperAdmin');
    }
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

        // Send OTP email - fail if email cannot be sent
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'signup' });
        } catch (emailError) {
            logError(emailError, 'registerUser-otpEmail');
            return res.json({
                success: false,
                message: "Failed to send verification email. Please try again."
            });
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
        let { email, password } = req.body;
        
        // ===== ADMIN OTP BUG FIX: Normalize email =====
        email = String(email).trim().toLowerCase();
        console.log("=== ADMIN LOGIN REQUEST ===");
        console.log("Normalized email:", email);
        console.log("==========================");

        // Find user by email
        const user = await userModel.findOne({ email });
         
         if (!user) {
             return res.json({ success: false, message: "Invalid credentials" });
         }

         // Check if user is admin or super_admin
         if (user.role !== 'admin' && user.role !== 'super_admin') {
             return res.json({ success: false, message: "Access denied" });
         }

         // Verify password
         if (!user.password) {
             return res.json({ success: false, message: "Invalid credentials" });
         }

         const isMatch = await bcrypt.compare(password, user.password);
         if (!isMatch) {
             return res.json({ success: false, message: "Invalid credentials" });
         }

         // Check if must reset password
         if (user.mustResetPassword) {
             return res.json({
                 success: true,
                 mustResetPassword: true,
                 userId: user._id,
                 message: "You must reset your password before continuing"
             });
         }

         // Generate and send OTP
         const otpCode = generateOTP();
         const otpExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (temporary for testing)

        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = 'admin_login';
        user.otpVerified = false;
        
        // ===== ADMIN OTP BUG FIX: Enhanced Admin Login Debug =====
        console.log("=== Admin Login - Before Save ===");
        console.log("Setting OTP Purpose:", user.otpPurpose);
        console.log("OTP Purpose length:", user.otpPurpose.length);
        console.log("OTP Purpose char codes:", Array.from(user.otpPurpose).map(c => c.charCodeAt(0)));
        console.log("OTP Code:", otpCode);
        console.log("OTP Expires at:", otpExpires);
        console.log("Current time:", new Date());
        console.log("================================");
        
        await user.save();
        
        // Reload user from DB to verify save
        const verifyUser = await userModel.findById(user._id);
        console.log("=== Admin Login - After Save (DB Verification) ===");
        console.log("User saved with OTP Purpose:", verifyUser.otpPurpose);
        console.log("DB OTP Purpose length:", verifyUser.otpPurpose?.length);
        console.log("DB OTP Purpose char codes:", verifyUser.otpPurpose ? Array.from(verifyUser.otpPurpose).map(c => c.charCodeAt(0)) : 'N/A');
        console.log("DB OTP Code:", verifyUser.otpCode);
        console.log("DB OTP Expires:", verifyUser.otpExpires);
        console.log("==================================================");

         // Send OTP email
         try {
             const { sendOTPEmail } = await import('../services/emailService.js');
             await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'admin_login' });
         } catch (emailError) {
             logError(emailError, 'adminLogin-otpEmail');
             return res.json({
                 success: false,
                 message: "Failed to send verification code. Please try again."
             });
         }

         res.json({
             success: true,
             requiresOTP: true,
             userId: user._id,
             message: "Verification code sent to your email"
         });

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

        console.log("sendOTP called for:", user.email, "role:", user.role, "setting purpose:", purpose);

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = purpose;
        await user.save();

        // Send OTP email - fail if email cannot be sent
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose });
        } catch (emailError) {
            logError(emailError, 'sendOTP-email');
            return res.json({
                success: false,
                message: "Failed to send OTP email. Please try again."
            });
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
        let { email, otpCode, purpose } = req.body;

        // ===== ADMIN OTP BUG FIX: Enhanced Debug Logging =====
        console.log("=== RAW REQUEST BODY ===");
        console.log("Raw req.body:", JSON.stringify(req.body));
        console.log("Raw email:", email, "| length:", email?.length);
        console.log("Raw otpCode:", otpCode, "| length:", String(otpCode).length);
        console.log("Raw purpose:", purpose, "| length:", purpose?.length);
        console.log("Purpose char codes:", purpose ? Array.from(purpose).map(c => c.charCodeAt(0)) : 'N/A');
        console.log("========================");

        if (!email || !otpCode || !purpose) {
            return res.json({ success: false, message: "Email, OTP code, and purpose are required" });
        }

        // Ensure otpCode is string and normalize purpose to lowercase + trim
        // Also normalize email to handle any whitespace issues
        email = String(email).trim().toLowerCase();
        otpCode = String(otpCode).trim();
        purpose = String(purpose).trim().toLowerCase();

        console.log("=== AFTER NORMALIZATION ===");
        console.log("Normalized email:", email, "| length:", email.length);
        console.log("Normalized otpCode:", otpCode, "| length:", otpCode.length);
        console.log("Normalized purpose:", purpose, "| length:", purpose.length);
        console.log("Purpose char codes:", Array.from(purpose).map(c => c.charCodeAt(0)));
        console.log("===========================");

        const user = await userModel.findOne({ email });
        
        // ===== ADMIN OTP BUG FIX: User Lookup Verification =====
        if (user) {
            console.log("=== USER FOUND ===");
            console.log("User ID:", user._id);
            console.log("User email:", user.email);
            console.log("User role:", user.role);
            console.log("User has OTP data:", !!user.otpCode);
            console.log("==================");
        }
        if (!user) {
            return res.json({ success: false, message: "Verification failed" }); // Generic message for security
        }

        // Debug logs for expiry troubleshooting
        console.log("=== OTP Expiry Debug ===");
        console.log("Now:", new Date());
        console.log("OTP Expires:", user.otpExpires);
        console.log("Now (timestamp):", Date.now());
        console.log("Expires (timestamp):", user.otpExpires ? user.otpExpires.getTime() : null);
        console.log("Is Expired:", user.otpExpires ? user.otpExpires.getTime() < Date.now() : true);
        console.log("========================");

        // Check expiration FIRST (before checking code or incrementing attempts)
        // Use timestamps for reliable comparison
        if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
            // Clear expired OTP fields
            user.otpCode = null;
            user.otpExpires = null;
            user.otpAttempts = 0;
            user.otpPurpose = null;
            await user.save();
            return res.json({ success: false, message: "This code has expired. Please request a new one." });
        }

        // Check attempts before code comparison
        if (user.otpAttempts >= 5) {
            return res.json({ success: false, message: "Too many failed attempts. Please request a new OTP code." });
        }

        // Check OTP code
        if (!user.otpCode || user.otpCode !== otpCode) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            await user.save();
            return res.json({ success: false, message: "Invalid code. Please try again." });
        }

        // DB user snapshot before purpose check
        console.log("=== DB USER SNAPSHOT BEFORE PURPOSE CHECK ===");
        console.log("DB user snapshot before purpose check:", {
            email: user.email,
            role: user.role,
            otpCode: user.otpCode,
            otpPurpose: user.otpPurpose,
            otpExpires: user.otpExpires,
            otpVerified: user.otpVerified,
        });
        console.log("=============================================");

        // Check purpose matches (normalize stored purpose to lowercase + trim)
        const storedPurpose = String(user.otpPurpose || '').trim().toLowerCase();
        
        // ===== ADMIN OTP BUG FIX: Enhanced Purpose Comparison Debug =====
        console.log("=== OTP Purpose Comparison Debug ===");
        console.log("Stored purpose (raw):", user.otpPurpose);
        console.log("Stored purpose (raw) length:", user.otpPurpose?.length);
        console.log("Stored purpose (raw) char codes:", user.otpPurpose ? Array.from(user.otpPurpose).map(c => c.charCodeAt(0)) : 'N/A');
        console.log("---");
        console.log("Stored purpose (normalized):", storedPurpose);
        console.log("Stored purpose (normalized) length:", storedPurpose.length);
        console.log("Stored purpose (normalized) char codes:", Array.from(storedPurpose).map(c => c.charCodeAt(0)));
        console.log("---");
        console.log("Received purpose:", purpose);
        console.log("Received purpose length:", purpose.length);
        console.log("Received purpose char codes:", Array.from(purpose).map(c => c.charCodeAt(0)));
        console.log("---");
        console.log("Comparison: '" + storedPurpose + "' === '" + purpose + "'");
        console.log("Match result:", storedPurpose === purpose);
        console.log("String equality check:", storedPurpose.valueOf() === purpose.valueOf());
        console.log("=====================================");
        
        if (storedPurpose !== purpose) {
            console.log("❌ PURPOSE MISMATCH - Returning error");
            return res.json({ success: false, message: "Invalid verification code purpose." });
        }
        
        console.log("✅ PURPOSE MATCHED - Proceeding with verification");

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
            
            const token = ccreateToken(user._id, user.role);
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
        } else if (purpose === 'admin_login') {
            // ===== ADMIN OTP BUG FIX: Admin Login Branch Entered =====
            console.log("🎯 ADMIN LOGIN BRANCH ENTERED");
            console.log("Setting otpVerified to true for user:", user.email);
            
            // Admin login verification
            user.otpVerified = true;
            user.lastLogin = new Date();
            await user.save();
            
            console.log("✅ Admin OTP verified successfully, issuing token");
            console.log("User role:", user.role);
            
            const token = ccreateToken(user._id, user.role);
            return res.json({
                success: true,
                message: "Admin login verified successfully",
                token,
                role: user.role
            });
        } else if (purpose === 'email_change') {
            // Email change verification
            if (!user.pendingEmail) {
                return res.json({ success: false, message: "No pending email change found" });
            }
            
            // Update email to pending email
            user.email = user.pendingEmail;
            user.pendingEmail = null;
            user.emailVerified = true;
            await user.save();
            
            return res.json({
                success: true,
                message: "Email updated successfully"
            });
        } else if (purpose === 'account_delete') {
            // Account deletion verification
            const userEmail = user.email;
            const userName = user.name;
            
            // Permanently delete user account
            await userModel.findByIdAndDelete(user._id);
            
            // Send account deletion confirmation email (fire-and-forget)
            try {
                const { sendAccountDeletionConfirmationEmail } = await import('../services/emailService.js');
                sendAccountDeletionConfirmationEmail({ to: userEmail, name: userName })
                    .catch(err => logError(err, 'verifyOTP-accountDeletionEmail'));
            } catch (emailError) {
                logError(emailError, 'verifyOTP-accountDeletionEmail');
            }
            
            return res.json({
                success: true,
                message: "Account deleted successfully"
            });
        } else {
            // For password_change - just verify OTP, don't change anything yet
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

// Invite admin (super_admin only)
const inviteAdmin = async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.json({ success: false, message: "Email and name are required" });
        }

        // Validate email
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User with this email already exists" });
        }

        // Generate random temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Create admin user
        const newAdmin = new userModel({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            mustResetPassword: true,
            otpVerified: false,
            emailVerified: true,
            authProvider: 'email'
        });

        await newAdmin.save();

        // Send invitation email
        try {
            const { sendAdminInviteEmail } = await import('../services/emailService.js');
            await sendAdminInviteEmail({ email, name, tempPassword });
        } catch (emailError) {
            logError(emailError, 'inviteAdmin-email');
            return res.json({
                success: false,
                message: "Failed to send invitation email. Please try again."
            });
        }

        res.json({
            success: true,
            message: "Admin invited successfully"
        });

    } catch (error) {
        logError(error, 'inviteAdmin');
        res.json({ success: false, message: "Failed to invite admin" });
    }
}

// Reset admin password
const resetAdminPassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.json({ success: false, message: "User ID and new password are required" });
        }

        if (newPassword.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        console.log("resetAdminPassword called for:", user.email, "setting purpose: admin_login");

        // If mustResetPassword is true, don't require current password
        if (!user.mustResetPassword && currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.json({ success: false, message: "Current password is incorrect" });
            }
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        user.password = hashedPassword;
        user.mustResetPassword = false;
        user.passwordChangedAt = new Date();
        await user.save();

        // Generate OTP for admin login
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (temporary for testing)

        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = 'admin_login';
        user.otpVerified = false;
        
        console.log("Reset Password - Setting OTP Purpose:", user.otpPurpose);
        console.log("Reset Password - OTP Expires at:", otpExpires);
        console.log("Reset Password - Current time:", new Date());
        await user.save();
        console.log("Reset Password - User saved with OTP Purpose:", user.otpPurpose);

        // Send OTP email
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'admin_login' });
        } catch (emailError) {
            logError(emailError, 'resetAdminPassword-otpEmail');
            return res.json({
                success: false,
                message: "Password updated but failed to send verification code. Please try logging in again."
            });
        }

        res.json({
            success: true,
            requiresOTP: true,
            message: "Password updated successfully. Verification code sent to your email."
        });

    } catch (error) {
        logError(error, 'resetAdminPassword');
        res.json({ success: false, message: "Failed to reset password" });
    }
}

// Request password reset - sends OTP with purpose "password_change"
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Find user
        const user = await userModel.findOne({ email });
        if (!user) {
            // Generic message for security - don't reveal if email exists
            return res.json({ success: false, message: "If this email exists, you will receive a password reset code." });
        }

        // Only allow regular users (not admin/super_admin)
        if (user.role !== 'user') {
            return res.json({ success: false, message: "Invalid request" });
        }

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = 'password_change';
        await user.save();

        // Send OTP email
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'password_change' });
        } catch (emailError) {
            logError(emailError, 'requestPasswordReset-email');
            return res.json({
                success: false,
                message: "Failed to send password reset code. Please try again."
            });
        }

        res.json({
            success: true,
            message: "Password reset code sent to your email",
            expiresIn: 600 // 10 minutes in seconds
        });
    } catch (error) {
        logError(error, 'requestPasswordReset');
        res.json({ success: false, message: "Failed to process password reset request" });
    }
};

// Reset password after OTP verification
const resetPassword = async (req, res) => {
    try {
        const { email, otpCode, newPassword } = req.body;

        if (!email || !otpCode || !newPassword) {
            return res.json({ success: false, message: "All fields are required" });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters long" });
        }

        // Find user
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid request" });
        }

        // Only allow regular users
        if (user.role !== 'user') {
            return res.json({ success: false, message: "Invalid request" });
        }

        // Verify OTP
        if (!user.otpCode || String(user.otpCode) !== String(otpCode)) {
            return res.json({ success: false, message: "Invalid verification code" });
        }

        // Check expiry
        if (user.otpExpires.getTime() < Date.now()) {
            // Clear expired OTP
            user.otpCode = undefined;
            user.otpExpires = undefined;
            user.otpPurpose = undefined;
            user.otpAttempts = 0;
            await user.save();
            return res.json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        // Check purpose
        if (user.otpPurpose !== 'password_change') {
            return res.json({ success: false, message: "Invalid verification code purpose" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP fields
        user.password = hashedPassword;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        user.otpPurpose = undefined;
        user.otpAttempts = 0;
        user.otpVerified = false;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successfully. You can now login with your new password."
        });
    } catch (error) {
        logError(error, 'resetPassword');
        res.json({ success: false, message: "Failed to reset password" });
    }
};

// Request email change - sends OTP to new email
const requestEmailChange = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { newEmail } = req.body;

        if (!newEmail) {
            return res.json({ success: false, message: "New email is required" });
        }

        // Validate email format
        if (!validator.isEmail(newEmail)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        // Get current user
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Only allow regular users (not admin/super_admin)
        if (user.role !== 'user') {
            return res.json({ success: false, message: "Invalid request" });
        }

        // Check if new email is same as current
        if (user.email.toLowerCase() === newEmail.toLowerCase()) {
            return res.json({ success: false, message: "New email is the same as your current email" });
        }

        // Check if new email is already in use
        const existingUser = await userModel.findOne({ email: newEmail.toLowerCase() });
        if (existingUser) {
            return res.json({ success: false, message: "This email is already registered" });
        }

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store pending email and OTP
        user.pendingEmail = newEmail.toLowerCase();
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = 'email_change';
        await user.save();

        // Send OTP email to NEW email address
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: newEmail, name: user.name, otpCode, purpose: 'email_change' });
        } catch (emailError) {
            logError(emailError, 'requestEmailChange-email');
            return res.json({
                success: false,
                message: "Failed to send verification code. Please try again."
            });
        }

        res.json({
            success: true,
            message: "Verification code sent to your new email address",
            expiresIn: 600 // 10 minutes in seconds
        });
    } catch (error) {
        logError(error, 'requestEmailChange');
        res.json({ success: false, message: "Failed to process email change request" });
    }
};

// Request account deletion - sends OTP for confirmation
const requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { password } = req.body;

        if (!password) {
            return res.json({ success: false, message: "Password is required" });
        }

        // Get current user
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Only allow regular users (not admin/super_admin)
        if (user.role !== 'user') {
            return res.json({ success: false, message: "Invalid request" });
        }

        // Check if user uses email authentication
        if (user.authProvider !== 'email' || !user.password) {
            return res.json({ success: false, message: "Google accounts cannot be deleted through this method. Please contact support." });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Incorrect password" });
        }

        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        user.otpAttempts = 0;
        user.otpPurpose = 'account_delete';
        await user.save();

        // Send OTP email
        try {
            const { sendOTPEmail } = await import('../services/emailService.js');
            await sendOTPEmail({ email: user.email, name: user.name, otpCode, purpose: 'account_delete' });
        } catch (emailError) {
            logError(emailError, 'requestAccountDeletion-email');
            return res.json({
                success: false,
                message: "Failed to send verification code. Please try again."
            });
        }

        res.json({
            success: true,
            message: "Verification code sent to your email. This action is permanent and cannot be undone.",
            expiresIn: 600 // 10 minutes in seconds
        });
    } catch (error) {
        logError(error, 'requestAccountDeletion');
        res.json({ success: false, message: "Failed to process account deletion request" });
    }
};

export { loginUser, registerUser, adminLogin, googleAuth, getUserProfile, updateUserProfile, sendOTP, verifyOTP, bootstrapSuperAdmin, inviteAdmin, resetAdminPassword, requestPasswordReset, resetPassword, requestEmailChange, requestAccountDeletion };
