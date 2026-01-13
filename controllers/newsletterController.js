import newsletterModel from '../models/newsletterModel.js';
import { logError } from '../utils/logger.js';
import { sendNewsletterThanks } from '../services/emailService.js';

const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if already subscribed
        const existing = await newsletterModel.findOne({ email, status: 'active' });
        if (existing) {
            return res.json({ success: false, message: "Already subscribed" });
        }

        // Save subscription
        await newsletterModel.create({
            email,
            subscribedAt: new Date(),
            status: 'active'
        });

        // Fire-and-forget thank-you email (non-blocking)
        try {
            sendNewsletterThanks(email)
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

export { subscribeNewsletter };
