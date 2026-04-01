import axios from 'axios'
import { body, validationResult } from 'express-validator'
import inquiryModel from '../models/inquiryModel.js'
import { sendInquiryNotification, sendInquiryAutoReply } from '../services/emailService.js'

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

const validateInquiry = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 200 }),
  body('productInterest').trim().notEmpty().withMessage('Product interest is required'),
  body('message').optional().trim().isLength({ max: 5000 }),
  body('contactMethod').optional().trim().isIn(['phone', 'email', 'whatsapp', '']).withMessage('Invalid contact method'),
  body('recaptchaToken').notEmpty().withMessage('reCAPTCHA verification required')
]

const submitInquiry = async (req, res) => {
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

    const { firstName, lastName, email, phone, location, productInterest, message, contactMethod, recaptchaToken } = req.body

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

    const inquiry = await inquiryModel.create({
      firstName,
      lastName,
      email,
      phone,
      location,
      productInterest,
      message: message || '',
      contactMethod: contactMethod || '',
      status: 'new',
      createdAt: new Date()
    })
    console.log('Inquiry created:', inquiry._id)

    // Fire-and-forget email sending - completely detached from response
    // Use setImmediate to ensure it runs after response is sent
    setImmediate(() => {
      Promise.race([
        Promise.all([
          sendInquiryNotification({ firstName, lastName, email, phone, location, productInterest, message, contactMethod })
            .then(result => console.log('[EMAIL] Notification sent:', result ? 'success' : 'failed'))
            .catch(err => console.error('[EMAIL] Notification error:', err.message)),
          sendInquiryAutoReply(email, firstName)
            .then(result => console.log('[EMAIL] Auto-reply sent:', result ? 'success' : 'failed'))
            .catch(err => console.error('[EMAIL] Auto-reply error:', err.message))
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]).catch(err => console.error('[EMAIL] Email process failed:', err.message))
    })

    // Return response immediately - don't wait for emails
    return res.json({ success: true, message: 'Inquiry submitted successfully', inquiryId: inquiry._id })
  } catch (error) {
    console.error('Inquiry submission error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' })
  }
}

export { submitInquiry, validateInquiry }
