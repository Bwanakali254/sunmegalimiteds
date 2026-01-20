import { sendEmail } from './resendService.js';
import { logError } from '../utils/logger.js';

const EMAIL_NO_REPLY = process.env.EMAIL_NO_REPLY || 'no-reply@sunmega.co.ke';
const EMAIL_NEWS = process.env.EMAIL_NEWS || 'news@sunmega.co.ke';
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@sunmega.co.ke';
const EMAIL_QUOTES = process.env.EMAIL_QUOTES || 'quote@sunmega.co.ke';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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
const getNewsletterThanksTemplate = () => {
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
 */
export const sendNewsletterThanks = async (email) => {
    try {
        if (!email) {
            logError(new Error('Invalid email for newsletter thanks'), 'sendNewsletterThanks');
            return;
        }

        const html = getNewsletterThanksTemplate();
        const text = `Thanks for subscribing!\n\nYou're all set! You've successfully subscribed to the Sun Mega newsletter.\n\nBe the first to know about:\n- New solar products and innovations\n- Exclusive discounts and special offers\n- Energy-saving tips and insights\n- Latest updates from Sun Mega\n\nWe're excited to share great content with you!\n\nBest regards,\nSun Mega Team`;

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
        'admin_login': 'complete your admin login'
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
            'admin_login': 'Admin Login Verification'
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
