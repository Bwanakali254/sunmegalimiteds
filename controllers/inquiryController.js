import { body, validationResult } from 'express-validator'
import inquiryModel from '../models/inquiryModel.js'
import { sendInquiryNotification, sendInquiryAutoReply } from '../services/emailService.js'

const validateInquiry = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 200 }),
  body('productInterest').trim().notEmpty().withMessage('Product interest is required'),
  body('message').optional().trim().isLength({ max: 5000 }),
  body('contactMethod').optional().trim().isIn(['phone', 'email', 'whatsapp', '']).withMessage('Invalid contact method')
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

    const { firstName, lastName, email, phone, location, productInterest, message, contactMethod } = req.body

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
    console.log('Inquiry created:', inquiry)

    // Send notification to quote@ (with replyTo for Zoho replies)
    try {
      const notificationResult = await sendInquiryNotification({ firstName, lastName, email, phone, location, productInterest, message, contactMethod })
      console.log('Inquiry notification sent to quote@:', notificationResult)
    } catch (err) {
      console.error('Inquiry notification email FAILED:', err.message)
    }

    // Send auto-reply to client
    try {
      const autoReplyResult = await sendInquiryAutoReply(email, firstName)
      console.log('Inquiry auto-reply sent to client:', autoReplyResult)
    } catch (err) {
      console.error('Inquiry auto-reply email FAILED:', err.message)
    }

    res.json({ success: true, message: 'Inquiry submitted successfully' })
  } catch (error) {
    console.error('Inquiry submission error:', error.message)
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' })
  }
}

export { submitInquiry, validateInquiry }
