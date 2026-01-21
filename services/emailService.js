import { sendEmail } from './resendService.js';
import { logError } from '../utils/logger.js';

const EMAIL_NO_REPLY = process.env.EMAIL_NO_REPLY || 'no-reply@sunmega.co.ke';
const EMAIL_NEWS = process.env.EMAIL_NEWS || 'news@sunmega.co.ke';
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@sunmega.co.ke';
const EMAIL_QUOTES = process.env.EMAIL_QUOTES || 'quote@sunmega.co.ke';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/**
 * Generate reusable legal footer for all emails
 * Ensures GDPR/CAN-SPAM compliance
 */
const getLegalFooter = () => {
    return `
                    <tr>
                        <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 2px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 15px 0;">
                                You are receiving this email because you interacted with Sun Mega Limited.
                            </p>
                            <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">
                                Sun Mega Limited
                            </p>
                            <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">
                                <a href="mailto:${EMAIL_SUPPORT}" style="color: #22c55e; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                            <p style="color: #6b7280; font-size: 13px; margin: 0 0 15px 0;">
                                Kenya
                            </p>
                            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                <a href="${FRONTEND_URL}/privacy-policy" style="color: #22c55e; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                                |
                                <a href="${FRONTEND_URL}/terms-and-conditions" style="color: #22c55e; text-decoration: none; margin: 0 10px;">Terms & Conditions</a>
                            </p>
                        </td>
                    </tr>
    `.trim();
};

/**
 * Generate welcome email HTML template
 */
const getWelcomeEmailTemplate = (userName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Sun Mega</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Sun Mega!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName ? userName : 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for creating an account with Sun Mega! We're excited to have you join our community.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                You can now browse our extensive collection of solar products, save your favorites, and place orders with ease.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                                If you have any questions, feel free to contact our support team at <a href="mailto:${EMAIL_SUPPORT}" style="color: #22c55e; text-decoration: none;">${EMAIL_SUPPORT}</a>.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate contact notification email HTML template
 */
const getContactNotificationTemplate = (contactData) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Name:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${contactData.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;"><a href="mailto:${contactData.email || ''}" style="color: #22c55e; text-decoration: none;">${contactData.email || 'N/A'}</a></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Subject:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${contactData.subject || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Message:</strong>
                                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 5px 0 0 0; white-space: pre-wrap;">${contactData.message || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification. Please reply directly to the sender's email address.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate contact auto-reply email HTML template
 */
const getContactAutoReplyTemplate = (userName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We received your message</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">We received your message</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName ? userName : 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for contacting Sun Mega. We've received your message and our support team will get back to you as soon as possible.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                                If you have any urgent inquiries, please feel free to call us at +254 1190 27300.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate newsletter thank-you email HTML template
 */
const getNewsletterThanksTemplate = (unsubscribeToken) => {
    const unsubscribeUrl = unsubscribeToken 
        ? `${BACKEND_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
        : '#';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thanks for subscribing!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #fb923c; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thanks for subscribing!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                You're all set! You've successfully subscribed to the Sun Mega newsletter.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Be the first to know about:
                            </p>
                            <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                                <li>New solar products and innovations</li>
                                <li>Exclusive discounts and special offers</li>
                                <li>Energy-saving tips and insights</li>
                                <li>Latest updates from Sun Mega</li>
                            </ul>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                                We're excited to share great content with you!
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                <a href="${unsubscribeUrl}" style="color: #fb923c; text-decoration: underline;">Unsubscribe from newsletter</a>
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send welcome email to new user
 * @param {Object} user - User object with email and name
 * @param {string} user.email - User email
 * @param {string} user.name - User name
 */
export const sendWelcomeEmail = async (user) => {
    try {
        if (!user || !user.email) {
            logError(new Error('Invalid user data for welcome email'), 'sendWelcomeEmail');
            return;
        }

        const html = getWelcomeEmailTemplate(user.name);
        const text = `Welcome to Sun Mega!\n\nHi ${user.name || 'there'},\n\nThank you for creating an account with Sun Mega! We're excited to have you join our community.\n\nYou can now browse our extensive collection of solar products, save your favorites, and place orders with ease.\n\nIf you have any questions, feel free to contact our support team at ${EMAIL_SUPPORT}.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to: user.email,
            from: EMAIL_NO_REPLY,
            subject: 'Welcome to Sun Mega!',
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendWelcomeEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send contact form notification to support
 * @param {Object} contactData - Contact form data
 * @param {string} contactData.name - Sender name
 * @param {string} contactData.email - Sender email
 * @param {string} contactData.subject - Message subject
 * @param {string} contactData.message - Message content
 */
export const sendContactNotification = async (contactData) => {
    try {
        if (!contactData || !contactData.email) {
            logError(new Error('Invalid contact data for notification'), 'sendContactNotification');
            return;
        }

        const html = getContactNotificationTemplate(contactData);
        const text = `New Contact Form Submission\n\nName: ${contactData.name || 'N/A'}\nEmail: ${contactData.email || 'N/A'}\nSubject: ${contactData.subject || 'N/A'}\n\nMessage:\n${contactData.message || 'N/A'}\n\n---\nPlease reply directly to the sender's email address.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            replyTo: contactData.email,
            subject: `Contact Form: ${contactData.subject || 'New Message'}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendContactNotification');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send auto-reply to contact form submitter
 * @param {string} userEmail - User email address
 * @param {string} userName - User name
 */
export const sendContactAutoReply = async (userEmail, userName) => {
    try {
        if (!userEmail) {
            logError(new Error('Invalid email for auto-reply'), 'sendContactAutoReply');
            return;
        }

        const html = getContactAutoReplyTemplate(userName);
        const text = `We received your message\n\nHi ${userName || 'there'},\n\nThank you for contacting Sun Mega. We've received your message and our support team will get back to you as soon as possible.\n\nIf you have any urgent inquiries, please feel free to call us at +254 1190 27300.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to: userEmail,
            from: EMAIL_NO_REPLY,
            subject: 'We received your message',
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendContactAutoReply');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send thank-you email to newsletter subscriber
 * @param {string} email - Subscriber email address
 * @param {string} unsubscribeToken - Secure unsubscribe token
 */
export const sendNewsletterThanks = async (email, unsubscribeToken) => {
    try {
        if (!email) {
            logError(new Error('Invalid email for newsletter thanks'), 'sendNewsletterThanks');
            return;
        }

        const html = getNewsletterThanksTemplate(unsubscribeToken);
        const unsubscribeUrl = unsubscribeToken 
            ? `${BACKEND_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
            : '';
        const text = `Thanks for subscribing!\n\nYou're all set! You've successfully subscribed to the Sun Mega newsletter.\n\nBe the first to know about:\n- New solar products and innovations\n- Exclusive discounts and special offers\n- Energy-saving tips and insights\n- Latest updates from Sun Mega\n\nWe're excited to share great content with you!\n\n${unsubscribeUrl ? `To unsubscribe, visit: ${unsubscribeUrl}\n\n` : ''}Best regards,\nSun Mega Team`;

        await sendEmail({
            to: email,
            from: EMAIL_NEWS,
            subject: 'Thanks for subscribing!',
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendNewsletterThanks');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate OTP email HTML template
 */
const getOTPEmailTemplate = (userName, otpCode, purpose) => {
    const purposeText = {
        'signup': 'complete your registration',
        'password_change': 'change your password',
        'email_change': 'change your email',
        'verification': 'verify your email',
        'admin_login': 'complete your admin login',
        'account_delete': 'confirm account deletion'
    }[purpose] || 'verify your account';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verify Your Email</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName ? userName : 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Use this code to ${purposeText}:
                            </p>
                            <div style="background-color: #f9f9f9; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                                <p style="color: #22c55e; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                                    ${otpCode}
                                </p>
                            </div>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send OTP email to user
 * @param {Object} params - OTP email parameters
 * @param {string} params.email - User email address
 * @param {string} params.name - User name
 * @param {string} params.otpCode - 6-digit OTP code
 * @param {string} params.purpose - OTP purpose (signup, password_change, email_change, verification)
 * @throws {Error} If email sending fails
 */
export const sendOTPEmail = async ({ email, name, otpCode, purpose }) => {
    if (!email || !otpCode) {
        throw new Error('Invalid email or OTP code');
    }

        const purposeText = {
            'signup': 'Complete Registration',
            'password_change': 'Change Password',
            'email_change': 'Change Email',
            'verification': 'Verify Email',
            'admin_login': 'Admin Login Verification',
            'account_delete': 'Account Deletion Confirmation'
        }[purpose] || 'Verify Your Account';

    const html = getOTPEmailTemplate(name, otpCode, purpose);
    const text = `Verify Your Email\n\nHi ${name || 'there'},\n\nUse this code to verify your email:\n\n${otpCode}\n\nThis code will expire in 10 minutes. If you didn't request this code, please ignore this email.\n\nBest regards,\nSun Mega Team`;

    await sendEmail({
        to: email,
        from: EMAIL_NO_REPLY,
        subject: `Your Sun Mega Verification Code - ${purposeText}`,
        html,
        text,
    });
};

/**
 * Generate quote notification email HTML template
 */
const getQuoteNotificationTemplate = (quoteData) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Quote Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">New Quote Request</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                A new quote request has been submitted through the website.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Name:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${quoteData.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;"><a href="mailto:${quoteData.email || ''}" style="color: #22c55e; text-decoration: none;">${quoteData.email || 'N/A'}</a></p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Phone:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${quoteData.phone || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Service Type:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${quoteData.serviceType || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Location:</strong>
                                        <p style="color: #666666; font-size: 16px; margin: 5px 0 0 0;">${quoteData.location || 'N/A'}</p>
                                    </td>
                                </tr>
                                ${quoteData.message ? `
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Message:</strong>
                                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 5px 0 0 0; white-space: pre-wrap;">${quoteData.message}</p>
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification. Please reply directly to the sender's email address.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate quote auto-reply email HTML template
 */
const getQuoteAutoReplyTemplate = (userName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We received your quote request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">We received your quote request</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName ? userName : 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for requesting a quote from Sun Mega. We've received your request and our team will review it and get back to you as soon as possible.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                                If you have any urgent inquiries, please feel free to call us at +254 1190 27300.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin invite email HTML template
 */
const getAdminInviteEmailTemplate = (userName, tempPassword) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Admin Invitation</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName ? userName : 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                You have been invited as an administrator for Sun Mega Limited.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your temporary password is:
                            </p>
                            <div style="background-color: #f9f9f9; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                                <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">
                                    ${tempPassword}
                                </p>
                            </div>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                <strong>Important:</strong> You will be required to change this password on your first login. Please keep this information secure.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send admin invitation email
 * @param {Object} params - Admin invite parameters
 * @param {string} params.email - Admin email address
 * @param {string} params.name - Admin name
 * @param {string} params.tempPassword - Temporary password
 * @throws {Error} If email sending fails
 */
export const sendAdminInviteEmail = async ({ email, name, tempPassword }) => {
    if (!email || !tempPassword) {
        throw new Error('Invalid email or temporary password');
    }

    const html = getAdminInviteEmailTemplate(name, tempPassword);
    const text = `Admin Invitation\n\nHi ${name || 'there'},\n\nYou have been invited as an administrator for Sun Mega Limited.\n\nYour temporary password is:\n${tempPassword}\n\nImportant: You will be required to change this password on your first login. Please keep this information secure.\n\nBest regards,\nSun Mega Team`;

    await sendEmail({
        to: email,
        from: EMAIL_NO_REPLY,
        subject: 'Sun Mega Admin Invitation',
        html,
        text,
    });
};

/**
 * Send quote notification to quotes email
 * @param {Object} quoteData - Quote form data
 * @param {string} quoteData.name - Requester name
 * @param {string} quoteData.email - Requester email
 * @param {string} quoteData.phone - Requester phone
 * @param {string} quoteData.serviceType - Service type requested
 * @param {string} quoteData.location - Project location
 * @param {string} quoteData.message - Optional message
 */
export const sendQuoteNotification = async (quoteData) => {
    try {
        if (!quoteData || !quoteData.email) {
            logError(new Error('Invalid quote data for notification'), 'sendQuoteNotification');
            return;
        }

        const html = getQuoteNotificationTemplate(quoteData);
        const text = `New Quote Request\n\nName: ${quoteData.name || 'N/A'}\nEmail: ${quoteData.email || 'N/A'}\nPhone: ${quoteData.phone || 'N/A'}\nService Type: ${quoteData.serviceType || 'N/A'}\nLocation: ${quoteData.location || 'N/A'}\n\nMessage:\n${quoteData.message || 'N/A'}\n\n---\nPlease reply directly to the sender's email address.`;

        await sendEmail({
            to: EMAIL_QUOTES,
            from: EMAIL_NO_REPLY,
            replyTo: quoteData.email,
            subject: `New Quote Request: ${quoteData.serviceType || 'General Inquiry'}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendQuoteNotification');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send auto-reply to quote requester
 * @param {string} userEmail - User email address
 * @param {string} userName - User name
 */
export const sendQuoteAutoReply = async (userEmail, userName) => {
    try {
        if (!userEmail) {
            logError(new Error('Invalid email for quote auto-reply'), 'sendQuoteAutoReply');
            return;
        }

        const html = getQuoteAutoReplyTemplate(userName);
        const text = `We received your quote request\n\nHi ${userName || 'there'},\n\nThank you for requesting a quote from Sun Mega. We've received your request and our team will review it and get back to you as soon as possible.\n\nIf you have any urgent inquiries, please feel free to call us at +254 1190 27300.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to: userEmail,
            from: EMAIL_NO_REPLY,
            subject: 'We received your quote request',
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendQuoteAutoReply');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate order confirmation email HTML template (Customer)
 */
const getOrderConfirmationTemplate = (order, user) => {
    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <p style="color: #333333; font-size: 14px; margin: 0;">${item.name || 'Product'}</p>
                <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">Size: ${item.size || 'N/A'} | Qty: ${item.quantity || 1}</p>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0;">KES ${(item.price * item.quantity).toLocaleString()}</p>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Confirmed!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for your order! We've received your order and it's being processed.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #22c55e; font-size: 18px; font-weight: bold; margin: 0;">#${order._id}</p>
                                    </td>
                                </tr>
                            </table>
                            <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">Order Summary</h3>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                ${itemsList}
                                <tr>
                                    <td style="padding: 15px 0 10px 0; text-align: right;" colspan="2">
                                        <p style="color: #333333; font-size: 16px; font-weight: bold; margin: 0;">Total: KES ${Number(order.amount).toLocaleString()}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                                <strong>Next Step:</strong> Please complete your payment to process your order. You'll receive a payment confirmation email once the payment is successful.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                Need help? Contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #22c55e; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin new order notification email HTML template
 */
const getAdminNewOrderTemplate = (order, user) => {
    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <strong style="color: #333333; font-size: 14px;">${item.name || 'Product'}</strong>
                <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">Size: ${item.size || 'N/A'} | Qty: ${item.quantity || 1} | Price: KES ${(item.price * item.quantity).toLocaleString()}</p>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Order Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                A new order has been placed and is awaiting payment.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #22c55e; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.email || order.address?.email || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.phone || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Delivery Address:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">
                                            ${order.address?.firstName || ''} ${order.address?.lastName || ''}<br>
                                            ${order.address?.street || ''}<br>
                                            ${order.address?.city || ''}, ${order.address?.state || ''} ${order.address?.zipcode || ''}<br>
                                            ${order.address?.country || 'Kenya'}
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Order Items:</strong>
                                    </td>
                                </tr>
                                ${itemsList}
                                <tr>
                                    <td style="padding: 15px 0 10px 0;">
                                        <strong style="color: #333333; font-size: 16px;">Total Amount: KES ${Number(order.amount).toLocaleString()}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Status:</strong>
                                        <p style="color: #fb923c; font-size: 14px; font-weight: bold; margin: 5px 0 0 0;">${order.status || 'Pending Payment'}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                <strong>Action Required:</strong> Monitor payment status. Once payment is confirmed, process and ship the order.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate payment confirmation email HTML template (Customer)
 */
const getPaymentConfirmationTemplate = (order, user) => {
    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <p style="color: #333333; font-size: 14px; margin: 0;">${item.name || 'Product'}</p>
                <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">Size: ${item.size || 'N/A'} | Qty: ${item.quantity || 1}</p>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">
                <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0;">KES ${(item.price * item.quantity).toLocaleString()}</p>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Successful!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your payment has been received and confirmed. Your order is now being processed for delivery.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #f0fdf4; border-radius: 8px; border: 2px solid #22c55e;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #22c55e; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">#${order._id}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Amount Paid</p>
                                        <p style="color: #333333; font-size: 20px; font-weight: bold; margin: 0;">KES ${Number(order.amount).toLocaleString()}</p>
                                    </td>
                                </tr>
                            </table>
                            <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">Order Summary</h3>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                ${itemsList}
                            </table>
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                <h4 style="color: #333333; font-size: 16px; margin: 0 0 10px 0;">What's Next?</h4>
                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                    Our team is now processing your order. You'll receive updates on your order status via email. Typical delivery time is 3-7 business days.
                                </p>
                            </div>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                                Thank you for choosing Sun Mega!
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                Questions about your order? Contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #22c55e; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega. All rights reserved.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 10px 0 0 0;">
                                Saramala round, 2nd floor, 2c Mombasa, Kenya
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin payment received notification email HTML template
 */
const getAdminPaymentReceivedTemplate = (order, user) => {
    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <strong style="color: #333333; font-size: 14px;">${item.name || 'Product'}</strong>
                <p style="color: #666666; font-size: 12px; margin: 5px 0 0 0;">Size: ${item.size || 'N/A'} | Qty: ${item.quantity || 1} | Price: KES ${(item.price * item.quantity).toLocaleString()}</p>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #22c55e; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Received</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Payment has been confirmed for order #${order._id}.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #22c55e; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Payment Reference:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.orderTrackingId || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Amount Received:</strong>
                                        <p style="color: #22c55e; font-size: 18px; font-weight: bold; margin: 5px 0 0 0;">KES ${Number(order.amount).toLocaleString()}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.email || order.address?.email || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.phone || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Order Items:</strong>
                                    </td>
                                </tr>
                                ${itemsList}
                                <tr>
                                    <td style="padding: 15px 0 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Status:</strong>
                                        <p style="color: #22c55e; font-size: 14px; font-weight: bold; margin: 5px 0 0 0;">${order.status || 'Paid'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <p style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Action Required</p>
                                <p style="color: #92400e; font-size: 14px; margin: 0;">Process and prepare this order for shipping.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send order confirmation email to customer
 * @param {Object} params - Order confirmation parameters
 * @param {string} params.to - Customer email address
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendOrderConfirmationEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for order confirmation email'), 'sendOrderConfirmationEmail');
            return;
        }

        const html = getOrderConfirmationTemplate(order, user);
        const text = `Order Confirmed!\n\nHi ${user?.name || 'there'},\n\nThank you for your order! We've received your order and it's being processed.\n\nOrder ID: #${order._id}\nTotal: KES ${Number(order.amount).toLocaleString()}\n\nNext Step: Please complete your payment to process your order. You'll receive a payment confirmation email once the payment is successful.\n\nNeed help? Contact us at ${EMAIL_SUPPORT}\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Order Confirmed - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendOrderConfirmationEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send new order notification to admin
 * @param {Object} params - Order notification parameters
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendAdminNewOrderEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin new order email'), 'sendAdminNewOrderEmail');
            return;
        }

        const html = getAdminNewOrderTemplate(order, user);
        const text = `New Order Received\n\nA new order has been placed and is awaiting payment.\n\nOrder ID: #${order._id}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${user?.email || order.address?.email || 'N/A'}\nTotal: KES ${Number(order.amount).toLocaleString()}\nStatus: ${order.status || 'Pending Payment'}\n\nAction Required: Monitor payment status. Once payment is confirmed, process and ship the order.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `New Order - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminNewOrderEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send payment confirmation email to customer
 * @param {Object} params - Payment confirmation parameters
 * @param {string} params.to - Customer email address
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendPaymentConfirmationEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for payment confirmation email'), 'sendPaymentConfirmationEmail');
            return;
        }

        const html = getPaymentConfirmationTemplate(order, user);
        const text = `Payment Successful!\n\nHi ${user?.name || 'there'},\n\nGreat news! Your payment has been received and confirmed. Your order is now being processed for delivery.\n\nOrder ID: #${order._id}\nAmount Paid: KES ${Number(order.amount).toLocaleString()}\n\nWhat's Next?\nOur team is now processing your order. You'll receive updates on your order status via email. Typical delivery time is 3-7 business days.\n\nThank you for choosing Sun Mega!\n\nQuestions about your order? Contact us at ${EMAIL_SUPPORT}\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Payment Confirmed - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendPaymentConfirmationEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send payment received notification to admin
 * @param {Object} params - Payment notification parameters
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendAdminPaymentReceivedEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin payment received email'), 'sendAdminPaymentReceivedEmail');
            return;
        }

        const html = getAdminPaymentReceivedTemplate(order, user);
        const text = `Payment Received\n\nPayment has been confirmed for order #${order._id}.\n\nOrder ID: #${order._id}\nPayment Reference: ${order.orderTrackingId || 'N/A'}\nAmount Received: KES ${Number(order.amount).toLocaleString()}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${user?.email || order.address?.email || 'N/A'}\nStatus: ${order.status || 'Paid'}\n\nAction Required: Process and prepare this order for shipping.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Payment Received - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminPaymentReceivedEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate payment failed email HTML template (Customer)
 */
const getPaymentFailedTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ef4444; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Failed</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Unfortunately, we were unable to process your payment for order <strong>#${order._id}</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">#${order._id}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Amount</p>
                                        <p style="color: #333333; font-size: 20px; font-weight: bold; margin: 0;">KES ${Number(order.amount).toLocaleString()}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">What This Means:</p>
                                <ul style="color: #991b1b; font-size: 14px; margin: 0; padding-left: 20px;">
                                    <li>Your payment did not go through</li>
                                    <li>Your order has not been processed</li>
                                    <li>No charges were made to your account</li>
                                </ul>
                            </div>
                            <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">What You Can Do:</h3>
                            <ol style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li><strong>Check your payment details:</strong> Ensure your payment information was entered correctly</li>
                                <li><strong>Verify your account:</strong> Make sure you have sufficient funds or credit available</li>
                                <li><strong>Try again:</strong> Place a new order and complete the payment process</li>
                                <li><strong>Contact your bank:</strong> Some payments are declined by banks for security reasons</li>
                                <li><strong>Need help?</strong> Contact our support team at <a href="mailto:${EMAIL_SUPPORT}" style="color: #ef4444; text-decoration: none;">${EMAIL_SUPPORT}</a></li>
                            </ol>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                We apologize for any inconvenience. If you continue to experience issues, our support team is here to help.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate payment failed notification email HTML template (Admin)
 */
const getAdminPaymentFailedTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ef4444; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Failed</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Payment processing failed for order <strong>#${order._id}</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0 0 15px 0;">#${order._id}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Payment Reference</p>
                                        <p style="color: #333333; font-size: 14px; margin: 0 0 15px 0;">${order.orderTrackingId || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Amount</p>
                                        <p style="color: #333333; font-size: 18px; font-weight: bold; margin: 0;">KES ${Number(order.amount).toLocaleString()}</p>
                                    </td>
                                </tr>
                            </table>
                            <h3 style="color: #333333; font-size: 18px; margin: 30px 0 15px 0;">Customer Information</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 15px;">
                                <tr>
                                    <td>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Name</p>
                                        <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0 0 15px 0;">${user?.name || 'N/A'}</p>
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Email</p>
                                        <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0;">${user?.email || order.address?.email || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Action Required:</p>
                                <p style="color: #991b1b; font-size: 14px; margin: 0;">Monitor for customer retry or contact if needed. Order will not be processed until payment is successful.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                            <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send payment failed email to customer
 * @param {Object} params - Email parameters
 * @param {string} params.to - Customer email
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendPaymentFailedEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for payment failed email'), 'sendPaymentFailedEmail');
            return;
        }

        const html = getPaymentFailedTemplate(order, user);
        const text = `Payment Failed\n\nHi ${user?.name || 'there'},\n\nUnfortunately, we were unable to process your payment for order #${order._id}.\n\nOrder ID: #${order._id}\nAmount: KES ${Number(order.amount).toLocaleString()}\n\nWhat This Means:\n- Your payment did not go through\n- Your order has not been processed\n- No charges were made to your account\n\nWhat You Can Do:\n1. Check your payment details and ensure they were entered correctly\n2. Verify you have sufficient funds or credit available\n3. Try placing a new order and complete the payment process\n4. Contact your bank if the issue persists\n5. Need help? Contact us at ${EMAIL_SUPPORT}\n\nWe apologize for any inconvenience.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Payment Failed - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendPaymentFailedEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send payment failed notification to admin
 * @param {Object} params - Email parameters
 * @param {Object} params.order - Order object
 * @param {Object} params.user - User object
 */
export const sendAdminPaymentFailedEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin payment failed email'), 'sendAdminPaymentFailedEmail');
            return;
        }

        const html = getAdminPaymentFailedTemplate(order, user);
        const text = `Payment Failed\n\nPayment processing failed for order #${order._id}.\n\nOrder ID: #${order._id}\nPayment Reference: ${order.orderTrackingId || 'N/A'}\nAmount: KES ${Number(order.amount).toLocaleString()}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${user?.email || order.address?.email || 'N/A'}\nStatus: Payment Failed\n\nAction Required: Monitor for customer retry or contact if needed. Order will not be processed until payment is successful.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Payment Failed - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminPaymentFailedEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate order processing email HTML template (Customer)
 */
const getOrderProcessingTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Processing</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #3b82f6; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Processing</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your payment has been confirmed and your order is now being processed.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #3b82f6; font-size: 18px; font-weight: bold; margin: 0;">#${order._id}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>What's Next?</strong><br>
                                Our team is preparing your order for shipment. We'll notify you as soon as it's on its way!
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Thank you for choosing Sun Mega Limited. If you have any questions, please contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #3b82f6; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate order shipped email HTML template (Customer)
 */
const getOrderShippedTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #8b5cf6; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚚 Order Shipped!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Exciting news! Your order is on its way to you!
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #f5f3ff; border-left: 4px solid #8b5cf6; border-radius: 4px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #8b5cf6; font-size: 18px; font-weight: bold; margin: 0;">#${order._id}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>Delivery Information:</strong><br>
                                Your order has been dispatched and should arrive within the estimated delivery time. Our delivery team will contact you shortly.
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Questions about your delivery? Contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #8b5cf6; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate order delivered email HTML template (Customer)
 */
const getOrderDeliveredTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivered</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #10b981; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✓ Order Delivered!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Great news! Your order has been successfully delivered!
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #10b981; font-size: 18px; font-weight: bold; margin: 0;">#${order._id}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>Thank You!</strong><br>
                                We hope you're satisfied with your purchase. If you have any questions or concerns about your order, please don't hesitate to reach out to us.
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                Need assistance? Contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #10b981; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate order cancelled email HTML template (Customer)
 */
const getOrderCancelledTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ef4444; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Cancelled</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${user?.name || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We're writing to inform you that your order has been cancelled.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 5px 0;">Order ID</p>
                                        <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0;">#${order._id}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                <strong>What Happens Next?</strong><br>
                                If a payment was made, any applicable refund will be processed according to our refund policy. This may take 5-10 business days to reflect in your account.
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                                If you have any questions about this cancellation or need assistance placing a new order, please contact us at <a href="mailto:${EMAIL_SUPPORT}" style="color: #ef4444; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send order processing email to customer
 */
export const sendOrderProcessingEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for order processing email'), 'sendOrderProcessingEmail');
            return;
        }

        const html = getOrderProcessingTemplate(order, user);
        const text = `Order Processing\n\nHi ${user?.name || 'there'},\n\nGreat news! Your payment has been confirmed and your order is now being processed.\n\nOrder ID: #${order._id}\n\nWhat's Next?\nOur team is preparing your order for shipment. We'll notify you as soon as it's on its way!\n\nThank you for choosing Sun Mega Limited.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Order Processing - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendOrderProcessingEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order shipped email to customer
 */
export const sendOrderShippedEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for order shipped email'), 'sendOrderShippedEmail');
            return;
        }

        const html = getOrderShippedTemplate(order, user);
        const text = `Order Shipped!\n\nHi ${user?.name || 'there'},\n\nExciting news! Your order is on its way to you!\n\nOrder ID: #${order._id}\n\nDelivery Information:\nYour order has been dispatched and should arrive within the estimated delivery time. Our delivery team will contact you shortly.\n\nQuestions about your delivery? Contact us at ${EMAIL_SUPPORT}\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Order Shipped - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendOrderShippedEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order delivered email to customer
 */
export const sendOrderDeliveredEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for order delivered email'), 'sendOrderDeliveredEmail');
            return;
        }

        const html = getOrderDeliveredTemplate(order, user);
        const text = `Order Delivered!\n\nHi ${user?.name || 'there'},\n\nGreat news! Your order has been successfully delivered!\n\nOrder ID: #${order._id}\n\nThank You!\nWe hope you're satisfied with your purchase. If you have any questions or concerns about your order, please don't hesitate to reach out to us.\n\nNeed assistance? Contact us at ${EMAIL_SUPPORT}\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Order Delivered - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendOrderDeliveredEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order cancelled email to customer
 */
export const sendOrderCancelledEmail = async ({ to, order, user }) => {
    try {
        if (!to || !order) {
            logError(new Error('Invalid data for order cancelled email'), 'sendOrderCancelledEmail');
            return;
        }

        const html = getOrderCancelledTemplate(order, user);
        const text = `Order Cancelled\n\nHi ${user?.name || 'there'},\n\nWe're writing to inform you that your order has been cancelled.\n\nOrder ID: #${order._id}\n\nWhat Happens Next?\nIf a payment was made, any applicable refund will be processed according to our refund policy. This may take 5-10 business days to reflect in your account.\n\nIf you have any questions about this cancellation or need assistance placing a new order, please contact us at ${EMAIL_SUPPORT}\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: `Order Cancelled - Order #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendOrderCancelledEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate admin order processing notification email HTML template
 */
const getAdminOrderProcessingTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Updated - Processing</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #3b82f6; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Order Status: Processing</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Order status has been updated to <strong>Processing</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #3b82f6; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.email || user?.email || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #1e40af; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Action Required</p>
                                <p style="color: #1e40af; font-size: 14px; margin: 0;">Prepare this order for shipping.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin order shipped notification email HTML template
 */
const getAdminOrderShippedTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Updated - Shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #8b5cf6; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Order Status: Shipped</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Order status has been updated to <strong>Shipped</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #8b5cf6; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.email || user?.email || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #6d28d9; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Status Update</p>
                                <p style="color: #6d28d9; font-size: 14px; margin: 0;">Order has been dispatched to customer.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin order delivered notification email HTML template
 */
const getAdminOrderDeliveredTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Updated - Delivered</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #10b981; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Order Status: Delivered</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Order status has been updated to <strong>Delivered</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #10b981; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.email || user?.email || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #065f46; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Success</p>
                                <p style="color: #065f46; font-size: 14px; margin: 0;">Order has been successfully delivered to customer.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate admin order cancelled notification email HTML template
 */
const getAdminOrderCancelledTemplate = (order, user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Updated - Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ef4444; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Order Status: Cancelled</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Order status has been updated to <strong>Cancelled</strong>.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 10px 0;">
                                        <strong style="color: #333333; font-size: 14px;">Order ID:</strong>
                                        <p style="color: #ef4444; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">#${order._id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Customer:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${user?.name || 'N/A'}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 14px;">Email:</strong>
                                        <p style="color: #666666; font-size: 14px; margin: 5px 0 0 0;">${order.address?.email || user?.email || 'N/A'}</p>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Action Required</p>
                                <p style="color: #991b1b; font-size: 14px; margin: 0;">Process refund if payment was received.</p>
                            </div>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                This is an automated notification from Sun Mega order management system.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send order processing notification to admin
 */
export const sendAdminOrderProcessingEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin order processing email'), 'sendAdminOrderProcessingEmail');
            return;
        }

        const html = getAdminOrderProcessingTemplate(order, user);
        const text = `Order Status Updated: Processing\n\nOrder status has been updated to Processing.\n\nOrder ID: #${order._id}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${order.address?.email || user?.email || 'N/A'}\n\nAction Required: Prepare this order for shipping.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Order Processing - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminOrderProcessingEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order shipped notification to admin
 */
export const sendAdminOrderShippedEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin order shipped email'), 'sendAdminOrderShippedEmail');
            return;
        }

        const html = getAdminOrderShippedTemplate(order, user);
        const text = `Order Status Updated: Shipped\n\nOrder status has been updated to Shipped.\n\nOrder ID: #${order._id}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${order.address?.email || user?.email || 'N/A'}\n\nStatus Update: Order has been dispatched to customer.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Order Shipped - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminOrderShippedEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order delivered notification to admin
 */
export const sendAdminOrderDeliveredEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin order delivered email'), 'sendAdminOrderDeliveredEmail');
            return;
        }

        const html = getAdminOrderDeliveredTemplate(order, user);
        const text = `Order Status Updated: Delivered\n\nOrder status has been updated to Delivered.\n\nOrder ID: #${order._id}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${order.address?.email || user?.email || 'N/A'}\n\nSuccess: Order has been successfully delivered to customer.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Order Delivered - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminOrderDeliveredEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Send order cancelled notification to admin
 */
export const sendAdminOrderCancelledEmail = async ({ order, user }) => {
    try {
        if (!order) {
            logError(new Error('Invalid data for admin order cancelled email'), 'sendAdminOrderCancelledEmail');
            return;
        }

        const html = getAdminOrderCancelledTemplate(order, user);
        const text = `Order Status Updated: Cancelled\n\nOrder status has been updated to Cancelled.\n\nOrder ID: #${order._id}\nCustomer: ${user?.name || 'N/A'}\nEmail: ${order.address?.email || user?.email || 'N/A'}\n\nAction Required: Process refund if payment was received.\n\nThis is an automated notification from Sun Mega order management system.`;

        await sendEmail({
            to: EMAIL_SUPPORT,
            from: EMAIL_NO_REPLY,
            subject: `Order Cancelled - #${order._id}`,
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAdminOrderCancelledEmail');
        // Don't throw - fire-and-forget pattern
    }
};

/**
 * Generate account deletion confirmation email HTML template
 */
const getAccountDeletionConfirmationTemplate = (userName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="background-color: #ef4444; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Account Deleted</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName || 'there'},
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your Sun Mega Limited account has been successfully deleted as requested.
                            </p>
                            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="color: #991b1b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">What This Means:</p>
                                <ul style="color: #991b1b; font-size: 14px; margin: 0; padding-left: 20px;">
                                    <li>All your personal data has been permanently removed</li>
                                    <li>Your order history has been anonymized</li>
                                    <li>You will no longer receive emails from us</li>
                                    <li>This action cannot be undone</li>
                                </ul>
                            </div>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                If you didn't request this deletion or believe this was done in error, please contact our support team immediately at <a href="mailto:${EMAIL_SUPPORT}" style="color: #ef4444; text-decoration: none;">${EMAIL_SUPPORT}</a>
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                Thank you for being part of the Sun Mega community. We're sorry to see you go.
                            </p>
                        </td>
                    </tr>
                    ${getLegalFooter()}
                    <tr>
                        <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666666; font-size: 14px; margin: 0;">
                                &copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Send account deletion confirmation email
 */
export const sendAccountDeletionConfirmationEmail = async ({ to, name }) => {
    try {
        if (!to) {
            logError(new Error('Invalid email for account deletion confirmation'), 'sendAccountDeletionConfirmationEmail');
            return;
        }

        const html = getAccountDeletionConfirmationTemplate(name);
        const text = `Account Deleted\n\nHi ${name || 'there'},\n\nYour Sun Mega Limited account has been successfully deleted as requested.\n\nWhat This Means:\n- All your personal data has been permanently removed\n- Your order history has been anonymized\n- You will no longer receive emails from us\n- This action cannot be undone\n\nIf you didn't request this deletion or believe this was done in error, please contact our support team immediately at ${EMAIL_SUPPORT}\n\nThank you for being part of the Sun Mega community. We're sorry to see you go.\n\nBest regards,\nSun Mega Team`;

        await sendEmail({
            to,
            from: EMAIL_NO_REPLY,
            subject: 'Your Sun Mega Account Has Been Deleted',
            html,
            text,
        });
    } catch (error) {
        logError(error, 'sendAccountDeletionConfirmationEmail');
        // Don't throw - fire-and-forget pattern
    }
};
