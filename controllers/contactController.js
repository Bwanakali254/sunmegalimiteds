import { body, validationResult } from 'express-validator'
import contactModel from '../models/contactModel.js'
import { sendContactNotification, sendContactAutoReply } from '../services/emailService.js'

const validateContact = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name is too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }).withMessage('Subject is too long'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }).withMessage('Message is too long')
]

const submitContact = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('Validation failed:', errors.array().map(e => e.msg))
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      })
    }

    const { name, email, subject, message } = req.body

    const contact = await contactModel.create({
      name,
      email,
      subject,
      message,
      date: new Date(),
      status: 'new'
    })
    console.log('Contact created:', contact)

    // Send notification to support@ (with replyTo for Zoho replies)
    try {
      const notificationResult = await sendContactNotification({ name, email, subject, message })
      console.log('Contact notification sent to support@:', notificationResult)
    } catch (err) {
      console.error('Contact notification email FAILED:', err.message)
    }

    // Send auto-reply to client
    try {
      const autoReplyResult = await sendContactAutoReply(email, name)
      console.log('Contact auto-reply sent to client:', autoReplyResult)
    } catch (err) {
      console.error('Contact auto-reply email FAILED:', err.message)
    }

    res.json({ success: true, message: 'Message sent successfully' })
  } catch (error) {
    console.error('Contact submission error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to submit contact form' })
  }
}

export { submitContact, validateContact }
