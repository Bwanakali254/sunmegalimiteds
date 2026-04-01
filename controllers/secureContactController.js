/**
 * ============================================================
 * SECURITY-HARDENED CONTACT/INQUIRY CONTROLLER
 * ============================================================
 * 
 * This controller implements multiple layers of security to prevent spam,
 * bot submissions, and malicious attacks on contact/inquiry forms.
 * 
 * Security Layers:
 * 1. Google reCAPTCHA v3 - Invisible bot detection with score thresholds
 * 2. IP-based Rate Limiting - Track and temporarily ban abusive IPs
 * 3. Input Validation & Sanitization - Prevent injection attacks
 * 4. Honeypot Field - Trap automated bots
 * 5. Spam Detection Heuristics - Detect suspicious patterns
 * 6. Comprehensive Logging - Monitor and audit all submissions
 * 7. Secure Email Delivery - Via Resend API with proper error handling
 * 
 * Environment Variables Required:
 * - RECAPTCHA_SECRET_KEY: Google reCAPTCHA v3 secret key
 * - RECAPTCHA_SCORE_THRESHOLD: Minimum score (0.0-1.0, default 0.5)
 * - RESEND_API_KEY: Resend API key for email
 * - EMAIL_SUPPORT: Support email for notifications
 * - EMAIL_NO_REPLY: No-reply email for auto-responses
 * - BACKEND_URL: Backend URL for logging
 * 
 * Frontend Integration:
 * - Must include reCAPTCHA v3 script and execute before form submission
 * - Must send recaptchaToken with form data
 * - Should include honeypot field (hidden from users)
 * ============================================================
 */

import axios from 'axios';
import { Resend } from 'resend';
import { validationResult, body } from 'express-validator';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** reCAPTCHA v3 secret key from environment */
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

/** Minimum score threshold (0.0-1.0). 0.5 is Google's recommended default.
 *  Higher values = stricter, may block legitimate users.
 *  Lower values = more permissive, may allow bots. */
const RECAPTCHA_SCORE_THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;

/** Resend email service configuration */
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@sunmega.co.ke';
const EMAIL_NO_REPLY = process.env.EMAIL_NO_REPLY || 'no-reply@sunmega.co.ke';

/** Rate limiting configuration */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // Max requests per window
const RATE_LIMIT_BAN_THRESHOLD = 3; // Ban after this many violations
const RATE_LIMIT_BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour ban

/** Spam detection configuration */
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'lottery', 'winner', 'prize',
  'click here', 'act now', 'limited time', 'make money fast',
  'earn extra cash', 'work from home', 'weight loss', 'miracle cure',
  'debt free', 'credit card', 'loan approval', 'investment opportunity'
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i, /tinyurl/i, /short\.link/i, /goo\.gl/i,
  /http[s]?:\/\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/i, // IP-based URLs
  /\.exe$/i, /\.zip$/i, /\.rar$/i, // Suspicious file extensions
];

const MAX_URLS_ALLOWED = 3; // Maximum URLs allowed in message
const MAX_MESSAGE_LENGTH = 2000; // Prevent buffer overflow attempts
const MIN_MESSAGE_LENGTH = 10; // Prevent empty/short spam

// ============================================================================
// IN-MEMORY IP TRACKING STORE
// In production, use Redis or database for distributed systems
// ============================================================================

const ipTrackingStore = new Map();
const bannedIps = new Map();

/**
 * IP Tracking Data Structure
 * {
 *   count: number,          // Request count in current window
 *   violations: number,     // Rate limit violations
 *   firstRequest: number,   // Timestamp of first request in window
 *   lastRequest: number,    // Timestamp of last request
 *   blocked: boolean        // Currently blocked status
 * }
 */

// ============================================================================
// RATE LIMITING IMPLEMENTATION
// ============================================================================

/**
 * Check if IP is currently banned
 * @param {string} ip - Client IP address
 * @returns {boolean} - True if banned
 */
const isIpBanned = (ip) => {
  if (!bannedIps.has(ip)) return false;
  
  const banExpiry = bannedIps.get(ip);
  if (Date.now() > banExpiry) {
    // Ban expired, remove from banned list
    bannedIps.delete(ip);
    return false;
  }
  return true;
};

/**
 * Ban an IP address temporarily
 * @param {string} ip - IP to ban
 * @param {string} reason - Reason for ban (for logging)
 */
const banIp = (ip, reason) => {
  const expiry = Date.now() + RATE_LIMIT_BAN_DURATION_MS;
  bannedIps.set(ip, expiry);
  console.warn(`[SECURITY] IP ${ip} banned for ${RATE_LIMIT_BAN_DURATION_MS / 60000} minutes. Reason: ${reason}`);
};

/**
 * Check and update rate limit for an IP
 * @param {string} ip - Client IP address
 * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
 */
const checkRateLimit = (ip) => {
  const now = Date.now();
  
  // Check if IP is banned
  if (isIpBanned(ip)) {
    const expiry = bannedIps.get(ip);
    return {
      allowed: false,
      remaining: 0,
      resetTime: expiry,
      banned: true
    };
  }
  
  // Get or create tracking data
  let tracking = ipTrackingStore.get(ip);
  
  if (!tracking) {
    tracking = {
      count: 0,
      violations: 0,
      firstRequest: now,
      lastRequest: now,
      blocked: false
    };
  }
  
  // Reset window if expired
  if (now - tracking.firstRequest > RATE_LIMIT_WINDOW_MS) {
    tracking.count = 0;
    tracking.firstRequest = now;
    tracking.blocked = false;
  }
  
  // Increment request count
  tracking.count++;
  tracking.lastRequest = now;
  
  // Check if over limit
  if (tracking.count > RATE_LIMIT_MAX_REQUESTS) {
    tracking.violations++;
    tracking.blocked = true;
    
    // Ban if too many violations
    if (tracking.violations >= RATE_LIMIT_BAN_THRESHOLD) {
      banIp(ip, 'Rate limit violations exceeded threshold');
      tracking.violations = 0; // Reset after ban
    }
    
    ipTrackingStore.set(ip, tracking);
    return {
      allowed: false,
      remaining: 0,
      resetTime: tracking.firstRequest + RATE_LIMIT_WINDOW_MS,
      banned: false
    };
  }
  
  ipTrackingStore.set(ip, tracking);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - tracking.count,
    resetTime: tracking.firstRequest + RATE_LIMIT_WINDOW_MS,
    banned: false
  };
};

// ============================================================================
// reCAPTCHA v3 VERIFICATION
// ============================================================================

/**
 * Verify reCAPTCHA v3 token with Google
 * This is the primary bot detection mechanism - invisible to users
 * 
 * @param {string} token - reCAPTCHA token from frontend
 * @param {string} action - Expected action name
 * @returns {Promise<object>} - Verification result { success, score, action }
 */
const verifyRecaptcha = async (token, action = 'submit') => {
  if (!RECAPTCHA_SECRET_KEY) {
    console.error('[SECURITY] RECAPTCHA_SECRET_KEY not configured');
    return { success: false, error: 'reCAPTCHA not configured' };
  }
  
  if (!token) {
    return { success: false, error: 'Missing reCAPTCHA token' };
  }
  
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    const data = response.data;
    
    // Validate action name to prevent replay attacks
    if (data.action !== action) {
      return {
        success: false,
        error: 'Invalid action',
        score: data.score,
        hostname: data.hostname
      };
    }
    
    // Check score against threshold
    // Score 1.0 = definitely human, 0.0 = definitely bot
    const passed = data.success && data.score >= RECAPTCHA_SCORE_THRESHOLD;
    
    return {
      success: passed,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challengeTs: data.challenge_ts,
      error: passed ? null : `Low reCAPTCHA score: ${data.score}`
    };
  } catch (error) {
    console.error('[SECURITY] reCAPTCHA verification error:', error.message);
    return {
      success: false,
      error: 'reCAPTCHA verification failed'
    };
  }
};

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers (onclick, onload, etc.)
};

/**
 * Validate email format with strict regex
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  // RFC 5322 compliant regex (simplified but effective)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Check for disposable/temporary email domains
 * Common sources: 10minutemail, guerrillamail, tempmail, etc.
 * @param {string} email - Email to check
 * @returns {boolean} - True if disposable
 */
const isDisposableEmail = (email) => {
  const disposableDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwawaymail.com', 'yopmail.com',
    'sharklasers.com', 'getairmail.com', 'tempinbox.com',
    'mailnesia.com', 'trashmail.com', 'mytrashmail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};

/**
 * Honeypot validation - hidden field that bots fill but humans don't
 * @param {string} honeypotValue - Value of honeypot field
 * @returns {boolean} - True if honeypot is clean (no bot detected)
 */
const validateHoneypot = (honeypotValue) => {
  // Honeypot should be empty - if it has content, it's likely a bot
  if (honeypotValue && honeypotValue.trim().length > 0) {
    return false;
  }
  return true;
};

// ============================================================================
// SPAM DETECTION HEURISTICS
// ============================================================================

/**
 * Advanced spam detection using multiple heuristics
 * @param {object} data - Form data
 * @returns {object} - { isSpam: boolean, score: number, reasons: string[] }
 */
const detectSpam = (data) => {
  const reasons = [];
  let spamScore = 0;
  
  const { name, email, subject, message } = data;
  const fullText = `${name} ${subject} ${message}`.toLowerCase();
  
  // 1. Check for spam keywords
  SPAM_KEYWORDS.forEach(keyword => {
    if (fullText.includes(keyword.toLowerCase())) {
      spamScore += 2;
      reasons.push(`Spam keyword detected: "${keyword}"`);
    }
  });
  
  // 2. Check for suspicious URLs
  const urlMatches = message.match(/http[s]?:\/\/[^\s]+/g) || [];
  if (urlMatches.length > MAX_URLS_ALLOWED) {
    spamScore += 3;
    reasons.push(`Too many URLs (${urlMatches.length} > ${MAX_URLS_ALLOWED})`);
  }
  
  SUSPICIOUS_URL_PATTERNS.forEach(pattern => {
    if (pattern.test(message)) {
      spamScore += 2;
      reasons.push(`Suspicious URL pattern: ${pattern.source}`);
    }
  });
  
  // 3. Check for excessive capitalization (shouting)
  const capsRatio = (message.replace(/[^A-Z]/g, '').length) / (message.replace(/[^a-zA-Z]/g, '').length || 1);
  if (capsRatio > 0.7 && message.length > 20) {
    spamScore += 1;
    reasons.push('Excessive capitalization');
  }
  
  // 4. Check for repetitive characters (aaaaaa, !!!!!)
  if (/(.)(\1{4,})/.test(message)) {
    spamScore += 1;
    reasons.push('Repetitive characters detected');
  }
  
  // 5. Check message length
  if (message.length < MIN_MESSAGE_LENGTH) {
    spamScore += 1;
    reasons.push('Message too short');
  }
  
  if (message.length > MAX_MESSAGE_LENGTH) {
    spamScore += 2;
    reasons.push('Message exceeds maximum length');
  }
  
  // 6. Check for email in message (common spam tactic)
  const emailInMessage = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailInMessage && emailInMessage.length > 1) {
    spamScore += 1;
    reasons.push('Multiple emails in message');
  }
  
  // 7. Name validation - reject single character names or all numbers
  if (name.length < 2 || /^\d+$/.test(name)) {
    spamScore += 2;
    reasons.push('Suspicious name format');
  }
  
  // Threshold: score >= 3 is considered spam
  const isSpam = spamScore >= 3;
  
  return {
    isSpam,
    score: spamScore,
    reasons: reasons.slice(0, 5) // Limit to 5 reasons
  };
};

// ============================================================================
// COMPREHENSIVE LOGGING
// ============================================================================

/**
 * Log submission details for monitoring and auditing
 * This helps identify attack patterns and improve security
 * 
 * @param {object} data - Submission data
 * @param {string} ip - Client IP
 * @param {string} userAgent - Client user agent
 * @param {object} securityChecks - Results of all security checks
 */
const logSubmission = (data, ip, userAgent, securityChecks) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip,
    userAgent: userAgent?.substring(0, 200), // Limit length
    email: data.email,
    name: data.name?.substring(0, 100),
    recaptchaScore: securityChecks.recaptchaScore,
    spamScore: securityChecks.spamScore,
    isSpam: securityChecks.isSpam,
    rateLimitHit: securityChecks.rateLimitHit,
    honeypotTriggered: securityChecks.honeypotTriggered,
    passed: securityChecks.passed
  };
  
  if (securityChecks.passed) {
    console.log('[SUBMISSION]', JSON.stringify(logEntry));
  } else {
    console.warn('[REJECTED]', JSON.stringify(logEntry));
    
    // Log detailed rejection reasons for analysis
    if (securityChecks.rejectionReasons?.length > 0) {
      console.warn('[REJECTION REASONS]', securityChecks.rejectionReasons);
    }
  }
};

// ============================================================================
// EMAIL SERVICE (Resend)
// ============================================================================

/**
 * Lazy-load Resend client to ensure environment variables are loaded
 */
let resendInstance = null;
const getResend = () => {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};

/**
 * Send notification email to support team (Zoho inbox)
 * Includes replyTo so Zoho replies go directly to the client
 * 
 * @param {object} data - Form submission data
 * @returns {Promise<object>} - Email send result
 */
const sendNotificationEmail = async (data) => {
  if (!process.env.RESEND_API_KEY) {
    console.error('[EMAIL] RESEND_API_KEY not configured');
    throw new Error('Email service not configured');
  }
  
  const { name, email, subject, message, phone, location, productInterest } = data;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #374151; }
        .value { color: #4b5563; margin-top: 5px; }
        .message-box { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #059669; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Contact Form Submission</h2>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Name:</div>
            <div class="value">${name}</div>
          </div>
          <div class="field">
            <div class="label">Email:</div>
            <div class="value">${email}</div>
          </div>
          ${phone ? `
          <div class="field">
            <div class="label">Phone:</div>
            <div class="value">${phone}</div>
          </div>` : ''}
          ${location ? `
          <div class="field">
            <div class="label">Location:</div>
            <div class="value">${location}</div>
          </div>` : ''}
          ${productInterest ? `
          <div class="field">
            <div class="label">Product Interest:</div>
            <div class="value">${productInterest}</div>
          </div>` : ''}
          <div class="field">
            <div class="label">Subject:</div>
            <div class="value">${subject}</div>
          </div>
          <div class="field">
            <div class="label">Message:</div>
            <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const response = await getResend().emails.send({
      from: EMAIL_NO_REPLY,
      to: EMAIL_SUPPORT,
      replyTo: email, // Critical: Zoho replies go directly to client
      subject: `New Contact: ${subject}`,
      html: htmlContent,
      text: `Name: ${name}\nEmail: ${email}\n${phone ? `Phone: ${phone}\n` : ''}${location ? `Location: ${location}\n` : ''}${productInterest ? `Product Interest: ${productInterest}\n` : ''}Subject: ${subject}\n\nMessage:\n${message}`
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error('[EMAIL] Notification failed:', error.message);
    throw error;
  }
};

/**
 * Send auto-reply confirmation to the client
 * 
 * @param {string} email - Client email address
 * @param {string} name - Client name
 * @param {string} subject - Original subject
 * @returns {Promise<object>} - Email send result
 */
const sendAutoReplyEmail = async (email, name, subject) => {
  if (!process.env.RESEND_API_KEY) {
    console.error('[EMAIL] RESEND_API_KEY not configured');
    throw new Error('Email service not configured');
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Thank You for Contacting Us!</h2>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>We have received your message regarding "<strong>${subject}</strong>".</p>
          <p>Our team will review your inquiry and get back to you within 24-48 business hours.</p>
          <p>If your matter is urgent, please call us directly at <strong>+254 1190 27300</strong>.</p>
          <br>
          <p>Best regards,<br>SunMega Limited Team</p>
        </div>
        <div class="footer">
          <p>This is an automated response. Please do not reply to this email.</p>
          <p>SunMega Limited | Nairobi, Kenya | support@sunmega.co.ke</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const response = await getResend().emails.send({
      from: EMAIL_NO_REPLY,
      to: email,
      subject: 'We received your message - SunMega Limited',
      html: htmlContent,
      text: `Dear ${name},\n\nWe have received your message regarding "${subject}".\n\nOur team will review your inquiry and get back to you within 24-48 business hours.\n\nIf your matter is urgent, please call us directly at +254 1190 27300.\n\nBest regards,\nSunMega Limited Team\n\n---\nThis is an automated response. Please do not reply to this email.`
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error('[EMAIL] Auto-reply failed:', error.message);
    throw error;
  }
};

// ============================================================================
// EXPRESS VALIDATION RULES
// ============================================================================

/**
 * Validation rules for contact/inquiry form
 * These run before the main controller logic
 */
export const contactValidationRules = [
  // Name validation: 2-100 chars, letters, spaces, hyphens allowed
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
  
  // Email validation: strict format check
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email too long'),
  
  // Subject validation: 5-200 chars
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Subject must be 5-200 characters'),
  
  // Message validation: 10-2000 chars
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters'),
  
  // Optional fields with sanitization
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-+()]+$/).withMessage('Invalid phone format'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location too long'),
  
  body('productInterest')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Product interest too long'),
  
  // reCAPTCHA token is required
  body('recaptchaToken')
    .notEmpty().withMessage('reCAPTCHA verification required'),
  
  // Honeypot field - should be empty (bots often fill this)
  body('website')
    .optional()
    .custom((value) => {
      if (value && value.trim().length > 0) {
        throw new Error('Invalid submission');
      }
      return true;
    })
];

// ============================================================================
// MAIN CONTROLLER
// ============================================================================

/**
 * Security-hardened contact form submission handler
 * Implements all security layers: reCAPTCHA, rate limiting, validation,
 * honeypot, spam detection, and comprehensive logging.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const submitSecureContact = async (req, res) => {
  // Get client IP (handles proxies correctly)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  const timestamp = new Date().toISOString();
  
  console.log(`[REQUEST] ${timestamp} - IP: ${clientIp} - Contact form submission`);
  
  try {
    // ========================================================================
    // STEP 1: Check Rate Limiting
    // Prevents brute force attacks and spam floods from single IPs
    // ========================================================================
    const rateLimit = checkRateLimit(clientIp);
    
    if (!rateLimit.allowed) {
      const response = {
        success: false,
        error: rateLimit.banned 
          ? 'Access temporarily suspended due to suspicious activity' 
          : 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      };
      
      // Log the rate limit violation
      logSubmission(
        { email: req.body?.email || 'unknown' },
        clientIp,
        userAgent,
        {
          recaptchaScore: null,
          spamScore: 0,
          isSpam: false,
          rateLimitHit: true,
          honeypotTriggered: false,
          passed: false,
          rejectionReasons: [rateLimit.banned ? 'IP banned' : 'Rate limit exceeded']
        }
      );
      
      return res.status(429).json(response);
    }
    
    // ========================================================================
    // STEP 2: Validate Input Format (express-validator)
    // Prevents malformed data and basic injection attempts
    // ========================================================================
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg);
      
      logSubmission(
        { email: req.body?.email || 'unknown' },
        clientIp,
        userAgent,
        {
          recaptchaScore: null,
          spamScore: 0,
          isSpam: false,
          rateLimitHit: false,
          honeypotTriggered: false,
          passed: false,
          rejectionReasons: ['Validation failed: ' + errorMessages.join(', ')]
        }
      );
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      });
    }
    
    // ========================================================================
    // STEP 3: Extract and Sanitize Data
    // Remove potentially dangerous content before processing
    // ========================================================================
    const rawData = req.body;
    
    const sanitizedData = {
      name: sanitizeInput(rawData.name),
      email: rawData.email.toLowerCase().trim(),
      subject: sanitizeInput(rawData.subject),
      message: sanitizeInput(rawData.message),
      phone: rawData.phone ? sanitizeInput(rawData.phone) : null,
      location: rawData.location ? sanitizeInput(rawData.location) : null,
      productInterest: rawData.productInterest ? sanitizeInput(rawData.productInterest) : null,
      recaptchaToken: rawData.recaptchaToken,
      honeypot: rawData.website || rawData.honeypot || null // Hidden field
    };
    
    // ========================================================================
    // STEP 4: Honeypot Validation
    // Trap for bots - humans won't see this field, bots fill it
    // ========================================================================
    if (!validateHoneypot(sanitizedData.honeypot)) {
      // Log but don't reveal to bot that we caught them
      logSubmission(
        sanitizedData,
        clientIp,
        userAgent,
        {
          recaptchaScore: null,
          spamScore: 10,
          isSpam: true,
          rateLimitHit: false,
          honeypotTriggered: true,
          passed: false,
          rejectionReasons: ['Honeypot field filled - bot detected']
        }
      );
      
      // Ban the IP immediately
      banIp(clientIp, 'Honeypot triggered - bot submission');
      
      // Return generic error to not tip off the bot
      return res.status(400).json({
        success: false,
        error: 'Unable to process submission'
      });
    }
    
    // ========================================================================
    // STEP 5: Additional Email Validation
    // Check for disposable emails and format issues
    // ========================================================================
    if (isDisposableEmail(sanitizedData.email)) {
      logSubmission(
        sanitizedData,
        clientIp,
        userAgent,
        {
          recaptchaScore: null,
          spamScore: 5,
          isSpam: true,
          rateLimitHit: false,
          honeypotTriggered: false,
          passed: false,
          rejectionReasons: ['Disposable email detected: ' + sanitizedData.email]
        }
      );
      
      return res.status(400).json({
        success: false,
        error: 'Please use a permanent email address'
      });
    }
    
    // ========================================================================
    // STEP 6: Spam Detection Heuristics
    // Analyze content for spam patterns before expensive reCAPTCHA call
    // ========================================================================
    const spamCheck = detectSpam(sanitizedData);
    
    if (spamCheck.isSpam) {
      logSubmission(
        sanitizedData,
        clientIp,
        userAgent,
        {
          recaptchaScore: null,
          spamScore: spamCheck.score,
          isSpam: true,
          rateLimitHit: false,
          honeypotTriggered: false,
          passed: false,
          rejectionReasons: spamCheck.reasons
        }
      );
      
      return res.status(400).json({
        success: false,
        error: 'Message appears to be spam. Please revise and try again.'
      });
    }
    
    // ========================================================================
    // STEP 7: Google reCAPTCHA v3 Verification
    // Invisible bot detection - no user friction, high accuracy
    // ========================================================================
    const recaptchaResult = await verifyRecaptcha(
      sanitizedData.recaptchaToken,
      'submit'
    );
    
    if (!recaptchaResult.success) {
      logSubmission(
        sanitizedData,
        clientIp,
        userAgent,
        {
          recaptchaScore: recaptchaResult.score,
          spamScore: spamCheck.score,
          isSpam: false,
          rateLimitHit: false,
          honeypotTriggered: false,
          passed: false,
          rejectionReasons: [`reCAPTCHA failed: ${recaptchaResult.error}`]
        }
      );
      
      // If score is very low, consider banning the IP
      if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.3) {
        banIp(clientIp, 'Very low reCAPTCHA score: ' + recaptchaResult.score);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Security verification failed. Please try again.',
        score: recaptchaResult.score // Optional: helpful for debugging
      });
    }
    
    // ========================================================================
    // STEP 8: All Security Checks Passed - Process Submission
    // Log successful submission and send emails
    // ========================================================================
    logSubmission(
      sanitizedData,
      clientIp,
      userAgent,
      {
        recaptchaScore: recaptchaResult.score,
        spamScore: spamCheck.score,
        isSpam: false,
        rateLimitHit: false,
        honeypotTriggered: false,
        passed: true,
        rejectionReasons: []
      }
    );
    
    // Send notification email to support (Zoho inbox)
    let notificationResult = null;
    let autoReplyResult = null;
    
    try {
      notificationResult = await sendNotificationEmail(sanitizedData);
      console.log(`[EMAIL] Notification sent: ${notificationResult.id}`);
    } catch (emailError) {
      console.error('[EMAIL] Notification failed:', emailError.message);
      // Don't fail the request if email fails - we still want to save the data
    }
    
    // Send auto-reply to client
    try {
      autoReplyResult = await sendAutoReplyEmail(
        sanitizedData.email,
        sanitizedData.name,
        sanitizedData.subject
      );
      console.log(`[EMAIL] Auto-reply sent: ${autoReplyResult.id}`);
    } catch (emailError) {
      console.error('[EMAIL] Auto-reply failed:', emailError.message);
    }
    
    // ========================================================================
    // STEP 9: Success Response
    // Return success to client with appropriate status
    // ========================================================================
    return res.status(200).json({
      success: true,
      message: 'Thank you! Your message has been sent successfully.',
      data: {
        recaptchaScore: recaptchaResult.score, // Helpful for debugging
        emailsSent: {
          notification: notificationResult?.success || false,
          autoReply: autoReplyResult?.success || false
        }
      }
    });
    
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // Log all errors but don't expose internal details to client
    // ========================================================================
    console.error('[CONTACT ERROR]', {
      timestamp: new Date().toISOString(),
      ip: clientIp,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request. Please try again later.'
    });
  }
};

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

/**
 * Express route configuration for contact form
 * Usage: app.post('/api/contact', contactRoute);
 */
import { Router } from 'express';
const router = Router();

router.post('/contact', contactValidationRules, submitSecureContact);

/**
 * Health check endpoint for monitoring
 * Returns current rate limit status for an IP
 */
router.get('/contact/status', (req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress;
  
  const rateLimit = checkRateLimit(clientIp);
  
  res.json({
    ip: clientIp,
    allowed: rateLimit.allowed,
    remaining: rateLimit.remaining,
    banned: rateLimit.banned,
    resetTime: new Date(rateLimit.resetTime).toISOString()
  });
});

export default router;
