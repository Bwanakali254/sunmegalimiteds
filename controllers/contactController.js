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
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      })
    }

    const { name, email, subject, message } = req.body

    await contactModel.create({
      name,
      email,
      subject,
      message,
      date: new Date(),
      status: 'new'
    })

    sendContactNotification({ name, email, subject, message }).catch(err => {
      console.error('Contact notification email error:', err.message)
    })

    sendContactAutoReply(email, name).catch(err => {
      console.error('Contact auto-reply email error:', err.message)
    })

    res.json({ success: true, message: 'Message sent successfully' })
  } catch (error) {
    console.error('Contact submission error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to submit contact form' })
  }
}

export { submitContact, validateContact }
