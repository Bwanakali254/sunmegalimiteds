import newsletterModel from '../models/newsletterModel.js';
import { logError } from '../utils/logger.js';
import { sendNewsletterThanks } from '../services/emailService.js';
import crypto from 'crypto';

/**
 * Generate secure unsubscribe token
 */
const generateUnsubscribeToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if already subscribed
        const existing = await newsletterModel.findOne({ email, status: 'active' });
        if (existing) {
            return res.json({ success: false, message: "Already subscribed" });
        }

        // Generate secure unsubscribe token
        const unsubscribeToken = generateUnsubscribeToken();

        // Save subscription
        await newsletterModel.create({
            email,
            subscribedAt: new Date(),
            status: 'active',
            unsubscribeToken
        });

        // Fire-and-forget thank-you email (non-blocking)
        try {
            sendNewsletterThanks(email, unsubscribeToken)
                .catch(err => logError(err, 'subscribeNewsletter-thanks'));
        } catch (emailError) {
            logError(emailError, 'subscribeNewsletter-thanks');
        }

        // Return success response
        res.json({ success: true, message: "Subscribed successfully" });
    } catch (error) {
        logError(error, 'subscribeNewsletter');
        // Handle duplicate key error (email already exists but inactive)
        if (error.code === 11000 || error.code === 11001) {
            return res.json({ success: false, message: "Already subscribed" });
        }
        res.json({ success: false, message: "Failed to subscribe" });
    }
};

const unsubscribeNewsletter = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invalid Request</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
                        h1 { color: #ef4444; }
                        p { color: #666; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Invalid Request</h1>
                        <p>The unsubscribe link is invalid or has expired.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Find subscriber by token
        const subscriber = await newsletterModel.findOne({ unsubscribeToken: token });

        if (!subscriber) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Not Found</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
                        h1 { color: #ef4444; }
                        p { color: #666; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Not Found</h1>
                        <p>This subscription could not be found.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Check if already unsubscribed
        if (subscriber.status === 'unsubscribed') {
            return res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Already Unsubscribed</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
                        h1 { color: #22c55e; }
                        p { color: #666; line-height: 1.6; }
                        .email { color: #333; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Already Unsubscribed</h1>
                        <p>The email address <span class="email">${subscriber.email}</span> is already unsubscribed from our newsletter.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Unsubscribe the user
        subscriber.status = 'unsubscribed';
        subscriber.unsubscribedAt = new Date();
        await subscriber.save();

        // Return success confirmation
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Unsubscribed Successfully</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
                    h1 { color: #22c55e; }
                    p { color: #666; line-height: 1.6; margin-bottom: 20px; }
                    .email { color: #333; font-weight: bold; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>You have been unsubscribed.</h1>
                    <p>The email address <span class="email">${subscriber.email}</span> has been successfully removed from our newsletter.</p>
                    <p>You will no longer receive promotional emails from Sun Mega Limited.</p>
                    <p>If you change your mind, you can always resubscribe on our website.</p>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        logError(error, 'unsubscribeNewsletter');
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; text-align: center; }
                    h1 { color: #ef4444; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Error</h1>
                    <p>An error occurred while processing your request. Please try again later.</p>
                </div>
            </body>
            </html>
        `);
    }
};

export { subscribeNewsletter, unsubscribeNewsletter };
