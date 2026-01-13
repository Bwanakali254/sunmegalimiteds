import { Resend } from 'resend';
import { logError } from '../utils/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend API
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.from - Sender email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML email content
 * @param {string} [params.text] - Plain text email content (optional)
 * @param {string} [params.replyTo] - Reply-to email address (optional)
 * @returns {Promise<Object>} Resend API response
 * @throws {Error} If email sending fails
 */
export const sendEmail = async ({ to, from, subject, html, text, replyTo }) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured');
        }

        const emailData = {
            from,
            to,
            subject,
            html,
        };

        if (text) {
            emailData.text = text;
        }

        if (replyTo) {
            emailData.replyTo = replyTo;
        }

        const response = await resend.emails.send(emailData);

        if (response.error) {
            throw new Error(response.error.message || 'Failed to send email');
        }

        return response.data;
    } catch (error) {
        logError(error, 'resendService-sendEmail');
        throw error;
    }
};
