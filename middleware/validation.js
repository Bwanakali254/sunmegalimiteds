import { body, validationResult } from 'express-validator';

// Validation for user registration
export const validateRegister = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Validation for user login
export const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Validation for admin login
export const validateAdminLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Validation for Google authentication
export const validateGoogleAuth = [
    body('idToken').notEmpty().withMessage('Google token is required'),
    body('idToken').isString().withMessage('Google token must be a string')
];

// Validation for order placement
export const validateOrder = [
    body('address').isObject().withMessage('Address is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required')
];

// Validation for cart operations
export const validateAddToCart = [
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('quantity').notEmpty().withMessage('Quantity is required')
];

export const validateUpdateCart = [
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('sizeKey').notEmpty().withMessage('Size key is required'),
    body('newQuantity').isInt({ min: 0 }).withMessage('Valid quantity is required')
];

// Validation for contact form
export const validateContact = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required')
];

// Validation for newsletter subscription
export const validateNewsletter = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// Validation for profile update
export const validateProfileUpdate = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
    body('phone').optional().trim().matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).withMessage('Invalid phone number format'),
    body('address.country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
    body('address.city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
    body('address.street').optional().trim().isLength({ max: 200 }).withMessage('Street must be less than 200 characters'),
    body('currency').optional().isIn(['KES', 'USD', 'EUR']).withMessage('Currency must be KES, USD, or EUR'),
    body('notificationPreferences.orderUpdates').optional().isBoolean().withMessage('Order updates preference must be boolean'),
    body('notificationPreferences.marketingEmails').optional().isBoolean().withMessage('Marketing emails preference must be boolean')
];

// Validation for sending OTP
export const validateSendOTP = [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('purpose').isIn(['signup', 'password_change', 'email_change', 'verification']).withMessage('Invalid OTP purpose')
];

// Validation for verifying OTP
export const validateVerifyOTP = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otpCode').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
    body('purpose').isIn(['signup', 'password_change', 'email_change', 'verification', 'admin_login', 'account_delete']).withMessage('Invalid OTP purpose')
];

// Validation for quote request
export const validateQuote = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required').matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).withMessage('Invalid phone number format'),
    body('serviceType').isIn(['Solar Panel Installation', 'System Design & Consultation', 'Battery & Energy Storage Solutions', 'Maintenance & Cleaning Services', 'Monitoring & O&M Plans', 'General Inquiry', 'Residential', 'Commercial', 'Industrial', 'Consultation']).withMessage('Invalid service type'),
    body('location').trim().notEmpty().withMessage('Location is required').isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
    body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message must be less than 1000 characters')
];

// Validation for password reset request
export const validatePasswordResetRequest = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// Validation for password reset
export const validatePasswordReset = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otpCode').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

// Validation for email change request
export const validateEmailChangeRequest = [
    body('newEmail').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// Validation for account deletion request
export const validateAccountDeletionRequest = [
    body('password').notEmpty().withMessage('Password is required')
];

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({ 
            success: false, 
            message: errors.array()[0].msg 
        });
    }
    next();
};
