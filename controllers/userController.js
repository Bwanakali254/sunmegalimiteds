import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

/**
 * Generate JWT token with id and role
 */
const createToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Generate refresh token
 */
const createRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Bootstrap super admin on server start
 * Called from server.js on startup
 */
export const bootstrapSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      return;
    }

    // Get credentials from environment
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to create super admin');
      return;
    }

    // Create super admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: email,
      password: password,
      role: 'super_admin',
      mustResetPassword: true,
      otpVerified: false,
      emailVerified: true,
      authProvider: 'email'
    });

    await superAdmin.save();
    console.log('Super admin created successfully');
    
  } catch (error) {
    console.error('Bootstrap super admin error:', error);
  }
};

/**
 * Admin Login - Step 1
 * POST /api/user/admin
 * Validates credentials and sends OTP
 */
export const adminLogin = async (req, res) => {
  try {
    let { email, password } = req.body;
    
    // Normalize email
    email = String(email).trim().toLowerCase();
    console.log('=== ADMIN LOGIN REQUEST ===');
    console.log('Normalized email:', email);
    console.log('==========================');

    // Find user by email
    const user = await User.findOne({ email });
     
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

    const isMatch = await user.comparePassword(password);
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
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpPurpose = 'admin_login';
    user.otpVerified = false;
    
    await user.save();

    // Send OTP email
    try {
      // Import email service dynamically to avoid circular deps
      const { sendOTPEmail } = await import('../services/emailService.js');
      await sendOTPEmail({ 
        email: user.email, 
        name: user.name, 
        otpCode, 
        purpose: 'admin_login' 
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
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
    console.error('Admin login error:', error);
    res.json({ success: false, message: "Authentication failed" });
  }
};

/**
 * Verify OTP - Step 2
 * POST /api/user/verify-otp
 * Verifies OTP and issues token
 */
export const verifyOTP = async (req, res) => {
  try {
    let { email, otpCode, purpose } = req.body;

    if (!email || !otpCode || !purpose) {
      return res.json({ 
        success: false, 
        message: "Email, OTP code, and purpose are required" 
      });
    }

    // Normalize inputs
    email = String(email).trim().toLowerCase();
    otpCode = String(otpCode).trim();
    purpose = String(purpose).trim().toLowerCase();

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.json({ success: false, message: "Verification failed" });
    }

    // Check expiration FIRST
    if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      // Clear expired OTP fields
      user.otpCode = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      user.otpPurpose = null;
      await user.save();
      return res.json({ 
        success: false, 
        message: "This code has expired. Please request a new one." 
      });
    }

    // Check attempts before code comparison
    if (user.otpAttempts >= 5) {
      return res.json({ 
        success: false, 
        message: "Too many failed attempts. Please request a new OTP code." 
      });
    }

    // Check OTP code
    if (!user.otpCode || user.otpCode !== otpCode) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.json({ 
        success: false, 
        message: "Invalid code. Please try again." 
      });
    }

    // Check purpose matches
    const storedPurpose = String(user.otpPurpose || '').trim().toLowerCase();
    
    if (storedPurpose !== purpose) {
      return res.json({ 
        success: false, 
        message: "Invalid verification code purpose." 
      });
    }

    // OTP is valid - clear OTP fields
    user.otpCode = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.otpPurpose = null;

    // Handle purpose-specific actions
    if (purpose === 'admin_login') {
      // Admin login verification
      const token = createToken(user._id, user.role);
      const refreshToken = createRefreshToken(user._id);
      
      // Set otpVerified to true
      user.otpVerified = true;
      user.lastLogin = new Date();
      user.refreshToken = refreshToken;
      await user.save();
      
      return res.json({
        success: true,
        message: "Admin login verified successfully",
        token,
        refreshToken,
        role: user.role
      });
    }

    // For other purposes, just verify OTP
    await user.save();
    return res.json({
      success: true,
      message: "OTP verified successfully"
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.json({ success: false, message: "Verification failed" });
  }
};

/**
 * Reset Admin Password
 * POST /api/user/admin/reset-password
 */
export const resetAdminPassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.json({ 
        success: false, 
        message: "User ID and new password are required" 
      });
    }

    if (newPassword.length < 8) {
      return res.json({ 
        success: false, 
        message: "Password must be at least 8 characters" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // If mustResetPassword is true, don't require current password
    if (!user.mustResetPassword && currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.json({ 
          success: false, 
          message: "Current password is incorrect" 
        });
      }
    }

    // Update password
    user.password = newPassword;
    user.mustResetPassword = false;
    user.passwordChangedAt = new Date();
    
    // Generate OTP for admin login
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.otpPurpose = 'admin_login';
    user.otpVerified = false;
    
    await user.save();

    // Send OTP email
    try {
      const { sendOTPEmail } = await import('../services/emailService.js');
      await sendOTPEmail({ 
        email: user.email, 
        name: user.name, 
        otpCode, 
        purpose: 'admin_login' 
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
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
    console.error('Reset admin password error:', error);
    res.json({ success: false, message: "Failed to reset password" });
  }
};

/**
 * Get Admin Profile
 * GET /api/user/admin/profile
 * Protected route - requires adminAuth middleware
 */
export const getAdminProfile = async (req, res) => {
  try {
    const userId = req.userId; // Set by adminAuth middleware
    
    const user = await User.findById(userId).select('name email role createdAt lastLogin');
    
    if (!user) {
      return res.json({ success: false, message: "Admin not found" });
    }
    
    res.json({
      success: true,
      profile: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.json({ success: false, message: "Failed to fetch admin profile" });
  }
};

/**
 * Invite Admin (super_admin only)
 * POST /api/user/admin/invite
 */
export const inviteAdmin = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.json({ 
        success: false, 
        message: "Email and name are required" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ 
        success: false, 
        message: "User with this email already exists" 
      });
    }

    // Generate random temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    // Create admin user
    const newAdmin = new User({
      name,
      email,
      password: tempPassword,
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
      console.error('Failed to send invitation email:', emailError);
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
    console.error('Invite admin error:', error);
    res.json({ success: false, message: "Failed to invite admin" });
  }
};

/**
 * Refresh Access Token
 * POST /api/user/refresh-token
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.json({ success: false, message: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.json({ success: false, message: "Invalid refresh token" });
    }

    // Generate new tokens
    const newToken = createToken(user._id, user.role);
    const newRefreshToken = createRefreshToken(user._id);
    
    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.json({ success: false, message: "Failed to refresh token" });
  }
};

/**
 * Generic authentication middleware for protected routes
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add userId to request
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
