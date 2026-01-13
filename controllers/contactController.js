import contactModel from '../models/contactModel.js';
import { logError } from '../utils/logger.js';
import { sendContactNotification, sendContactAutoReply } from '../services/emailService.js';

const submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Save to database
        const contact = await contactModel.create({
            name,
            email,
            subject,
            message,
            date: new Date(),
            status: 'new'
        });

        // Fire-and-forget email to support (non-blocking)
        try {
            sendContactNotification({ name, email, subject, message })
                .catch(err => logError(err, 'submitContact-notification'));
        } catch (emailError) {
            logError(emailError, 'submitContact-notification');
        }

        // Fire-and-forget auto-reply to user (non-blocking)
        try {
            sendContactAutoReply(email, name)
                .catch(err => logError(err, 'submitContact-autoReply'));
        } catch (emailError) {
            logError(emailError, 'submitContact-autoReply');
        }

        // Return success response
        res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
        logError(error, 'submitContact');
        res.json({ success: false, message: "Failed to submit contact" });
    }
};

export { submitContact };
