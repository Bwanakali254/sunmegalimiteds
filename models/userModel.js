import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Admin/User Model - matches old website structure
 * Supports customer accounts and admin accounts with roles
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'email';
    }
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'super_admin'],
    default: 'customer'
  },
  // OTP fields for 2FA
  otpCode: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpPurpose: {
    type: String,
    default: null
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  // Admin-specific fields
  mustResetPassword: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  // Auth provider
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  googleId: {
    type: String
  },
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String
  },
  // For email change flow
  pendingEmail: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
