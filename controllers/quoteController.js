import quoteModel from '../models/quoteModel.js';
import { logError } from '../utils/logger.js';
import { sendQuoteNotification, sendQuoteAutoReply } from '../services/emailService.js';

const submitQuote = async (req, res) => {
    try {
        let { name, email, phone, serviceType, location, message } = req.body;

        // Map new tab service types to backend-compatible values
        const serviceTypeMap = {
            'Residential': 'Solar Panel Installation',
            'Commercial': 'System Design & Consultation',
            'Industrial': 'Battery & Energy Storage Solutions',
            'Consultation': 'System Design & Consultation'
        };
        if (serviceTypeMap[serviceType]) {
            serviceType = serviceTypeMap[serviceType];
        }

        // Save to database
        const quote = await quoteModel.create({
            name,
            email,
            phone,
            serviceType,
            location,
            message,
            createdAt: new Date(),
            status: 'new'
        });

        // Fire-and-forget email to quotes (non-blocking)
        try {
            sendQuoteNotification({ name, email, phone, serviceType, location, message })
                .catch(err => logError(err, 'submitQuote-notification'));
        } catch (emailError) {
            logError(emailError, 'submitQuote-notification');
        }

        // Fire-and-forget auto-reply to user (non-blocking)
        try {
            sendQuoteAutoReply(email, name)
                .catch(err => logError(err, 'submitQuote-autoReply'));
        } catch (emailError) {
            logError(emailError, 'submitQuote-autoReply');
        }

        // Return success response
        res.json({ success: true, message: "Quote request submitted successfully" });
    } catch (error) {
        logError(error, 'submitQuote');
        res.json({ success: false, message: "Failed to submit quote" });
    }
};

export { submitQuote };
