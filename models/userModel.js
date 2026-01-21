import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // Optional for Google users
    googleId: { type: String, required: false, unique: true, sparse: true },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    cartData: { type: Object, default: {} },
    
    // Role-based access control
    role: { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
    mustResetPassword: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
    
    // Profile fields
    phone: { type: String, required: false },
    address: {
        country: { type: String, required: false },
        city: { type: String, required: false },
        street: { type: String, required: false }
    },
    
    // Verification fields
    emailVerified: { type: Boolean, default: true }, // Default true for backward compatibility
    emailVerificationToken: { type: String, required: false },
    emailVerificationExpires: { type: Date, required: false },
    pendingEmail: { type: String, required: false }, // For email change verification
    
    // OTP fields
    otpCode: { type: String, required: false },
    otpExpires: { type: Date, required: false },
    otpAttempts: { type: Number, default: 0 },
    otpPurpose: { type: String, enum: ['signup', 'password_change', 'email_change', 'verification', 'admin_login', 'account_delete'], required: false },
    
    // Preferences
    currency: { type: String, enum: ['KES', 'USD', 'EUR'], default: 'KES' },
    notificationPreferences: {
        orderUpdates: { type: Boolean, default: true },
        marketingEmails: { type: Boolean, default: false }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    passwordChangedAt: { type: Date, required: false },
    lastLogin: { type: Date, required: false }
},{minimize: false});

// Indexes
userSchema.index({ emailVerified: 1 });
userSchema.index({ otpExpires: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ role: 1 });

const userModel = mongoose.models.user || mongoose.model("User", userSchema);

export default userModel;