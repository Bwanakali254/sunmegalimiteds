import axios from 'axios'
import { body, validationResult } from 'express-validator'
import contactModel from '../models/contactModel.js'
import { sendContactNotification, sendContactAutoReply } from '../services/emailService.js'

// reCAPTCHA configuration
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const RECAPTCHA_SCORE_THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5

/**
 * Verify reCAPTCHA v3 token with Google
 */
const verifyRecaptcha = async (token) => {
  if (!RECAPTCHA_SECRET_KEY) {
    console.error('[SECURITY] RECAPTCHA_SECRET_KEY not configured')
    return { success: false, error: 'reCAPTCHA not configured' }
  }

  if (!token) {
    return { success: false, error: 'Missing reCAPTCHA token' }
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token
        },
        timeout: 5000
      }
    )

    const data = response.data
    const passed = data.success && data.score >= RECAPTCHA_SCORE_THRESHOLD

    return {
      success: passed,
      score: data.score,
      error: passed ? null : `Low reCAPTCHA score: ${data.score}`
    }
  } catch (error) {
    console.error('[SECURITY] reCAPTCHA verification error:', error.message)
    return { success: false, error: 'reCAPTCHA verification failed' }
  }
}

const validateContact = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name is too long'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }).withMessage('Subject is too long'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }).withMessage('Message is too long'),
  body('recaptchaToken').notEmpty().withMessage('reCAPTCHA verification required')
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

    const { name, email, subject, message, recaptchaToken } = req.body

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(recaptchaToken)
    if (!recaptchaResult.success) {
      console.warn('[SECURITY] reCAPTCHA failed:', recaptchaResult.error)
      return res.status(400).json({
        success: false,
        message: 'Security verification failed. Please try again.',
        score: recaptchaResult.score
      })
    }

    console.log('[SECURITY] reCAPTCHA passed with score:', recaptchaResult.score)

    const contact = await contactModel.create({
      name,
      email,
      subject,
      message,
      date: new Date(),
      status: 'new'
    })
    console.log('Contact created:', contact._id)

    // Fire-and-forget email sending
    setImmediate(() => {
      Promise.race([
        Promise.all([
          sendContactNotification({ name, email, subject, message })
            .then(result => console.log('[EMAIL] Notification sent:', result ? 'success' : 'failed'))
            .catch(err => console.error('[EMAIL] Notification error:', err.message)),
          sendContactAutoReply(email, name)
            .then(result => console.log('[EMAIL] Auto-reply sent:', result ? 'success' : 'failed'))
            .catch(err => console.error('[EMAIL] Auto-reply error:', err.message))
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]).catch(err => console.error('[EMAIL] Email process failed:', err.message))
    })

    return res.json({ success: true, message: 'Message sent successfully', contactId: contact._id })
  } catch (error) {
    console.error('Contact submission error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to submit contact form' })
  }
}

export { submitContact, validateContact }
