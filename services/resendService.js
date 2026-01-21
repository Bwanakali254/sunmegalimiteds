import { Resend } from 'resend';
import { logError } from '../utils/logger.js';
import emailQueueModel from '../models/emailQueueModel.js';

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
export const sendEmail = async ({ to, from, subject, html, text, replyTo, context }) => {
    // Create email queue entry
    const queueEntry = await emailQueueModel.create({
        to,
        from,
        subject,
        html,
        text: text || '',
        status: 'pending',
        attempts: 0,
        context: context || 'unknown'
    });
    
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

        queueEntry.attempts += 1;
        queueEntry.lastAttemptAt = new Date();

        const response = await resend.emails.send(emailData);

        if (response.error) {
            throw new Error(response.error.message || 'Failed to send email');
        }

        // Mark as sent
        queueEntry.status = 'sent';
        queueEntry.sentAt = new Date();
        await queueEntry.save();

        return response.data;
    } catch (error) {
        logError(error, 'resendService-sendEmail');
        
        // Update queue entry with failure
        queueEntry.status = queueEntry.attempts >= queueEntry.maxAttempts ? 'failed' : 'pending';
        queueEntry.error = error.message;
        if (queueEntry.status === 'failed') {
            queueEntry.failedAt = new Date();
        }
        await queueEntry.save();
        
        // Retry logic: schedule retry for pending emails (handled by separate job)
        if (queueEntry.attempts < queueEntry.maxAttempts) {
            // Attempt immediate retry
            setTimeout(() => retryFailedEmail(queueEntry._id), 60000); // Retry after 1 minute
        }
        
        throw error;
    }
};

// Retry failed email
const retryFailedEmail = async (queueId) => {
    try {
        const queueEntry = await emailQueueModel.findById(queueId);
        if (!queueEntry || queueEntry.status === 'sent' || queueEntry.attempts >= queueEntry.maxAttempts) {
            return;
        }
        
        queueEntry.attempts += 1;
        queueEntry.lastAttemptAt = new Date();
        await queueEntry.save();
        
        const response = await resend.emails.send({
            from: queueEntry.from,
            to: queueEntry.to,
            subject: queueEntry.subject,
            html: queueEntry.html,
            text: queueEntry.text
        });
        
        if (response.error) {
            throw new Error(response.error.message);
        }
        
        queueEntry.status = 'sent';
        queueEntry.sentAt = new Date();
        await queueEntry.save();
        
        console.log(`Email retry successful: ${queueId}`);
    } catch (error) {
        logError(error, 'retryFailedEmail');
        
        const queueEntry = await emailQueueModel.findById(queueId);
        if (queueEntry) {
            queueEntry.error = error.message;
            if (queueEntry.attempts >= queueEntry.maxAttempts) {
                queueEntry.status = 'failed';
                queueEntry.failedAt = new Date();
            }
            await queueEntry.save();
        }
    }
};
