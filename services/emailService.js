import { Resend } from 'resend'
import emailQueueModel from '../models/emailQueueModel.js'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_NO_REPLY = process.env.EMAIL_NO_REPLY || 'onboarding@resend.dev'
const EMAIL_NEWS = process.env.EMAIL_NEWS || 'onboarding@resend.dev'
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@sunmega.co.ke'
const EMAIL_QUOTES = process.env.EMAIL_QUOTES || 'quote@sunmega.co.ke'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

/**
 * Send email using Resend API with queue and retry logic
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
export const sendEmail = async ({ to, from, subject, html, text, replyTo }) => {
  // Create email queue entry
  const queueEntry = await emailQueueModel.create({
    to,
    from,
    subject,
    html,
    text: text || '',
    status: 'pending',
    attempts: 0,
    maxAttempts: 3
  })
  
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const emailData = { from, to, subject, html }
    if (text) emailData.text = text
    if (replyTo) emailData.replyTo = replyTo

    queueEntry.attempts += 1
    queueEntry.lastAttemptAt = new Date()

    const response = await resend.emails.send(emailData)

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send email')
    }

    // Mark as sent
    queueEntry.status = 'sent'
    queueEntry.sentAt = new Date()
    await queueEntry.save()

    console.log('Email sent successfully:', response.data?.id)
    return response.data
  } catch (error) {
    console.error('Email send error:', error.message)
    
    // Update queue entry with failure
    queueEntry.status = queueEntry.attempts >= queueEntry.maxAttempts ? 'failed' : 'pending'
    queueEntry.error = error.message
    if (queueEntry.status === 'failed') {
      queueEntry.failedAt = new Date()
    }
    await queueEntry.save()
    
    // Retry logic: schedule retry for pending emails
    if (queueEntry.attempts < queueEntry.maxAttempts) {
      setTimeout(() => retryFailedEmail(queueEntry._id), 60000) // Retry after 1 minute
      console.log(`[EMAIL] Scheduled retry for: ${queueEntry._id}`)
    }
    
    throw error
  }
}

// Retry failed email
const retryFailedEmail = async (queueId) => {
  try {
    const queueEntry = await emailQueueModel.findById(queueId)
    if (!queueEntry || queueEntry.status === 'sent' || queueEntry.attempts >= queueEntry.maxAttempts) {
      return
    }
    
    queueEntry.attempts += 1
    queueEntry.lastAttemptAt = new Date()
    await queueEntry.save()
    
    const response = await resend.emails.send({
      from: queueEntry.from,
      to: queueEntry.to,
      subject: queueEntry.subject,
      html: queueEntry.html,
      text: queueEntry.text
    })
    
    if (response.error) {
      throw new Error(response.error.message)
    }
    
    queueEntry.status = 'sent'
    queueEntry.sentAt = new Date()
    await queueEntry.save()
    
    console.log(`[EMAIL] Retry successful: ${queueId}`)
  } catch (error) {
    console.error(`[EMAIL] Retry failed: ${queueId}`, error.message)
    
    const queueEntry = await emailQueueModel.findById(queueId)
    if (queueEntry) {
      queueEntry.error = error.message
      if (queueEntry.attempts >= queueEntry.maxAttempts) {
        queueEntry.status = 'failed'
        queueEntry.failedAt = new Date()
      }
      await queueEntry.save()
    }
  }
}

const getLegalFooter = () => {
  return `
    <tr>
      <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 2px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 15px 0;">
          You are receiving this email because you interacted with Sun Mega Limited.
        </p>
        <p style="color: #374151; font-size: 14px; font-weight: bold; margin: 0 0 5px 0;">Sun Mega Limited</p>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 5px 0;">
          <a href="mailto:${EMAIL_SUPPORT}" style="color: #22c55e; text-decoration: none;">${EMAIL_SUPPORT}</a>
        </p>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 15px 0;">Kenya</p>
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          <a href="${FRONTEND_URL}/privacy-policy" style="color: #22c55e; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
          |
          <a href="${FRONTEND_URL}/terms-and-conditions" style="color: #22c55e; text-decoration: none; margin: 0 10px;">Terms & Conditions</a>
        </p>
      </td>
    </tr>
  `
}

export const sendContactNotification = async (contactData) => {
  const { name, email, subject, message } = contactData

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Name:</strong> ${name}
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Email:</strong> <a href="mailto:${email}" style="color: #22c55e;">${email}</a>
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Subject:</strong> ${subject}
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Message:</strong>
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                ${message.replace(/\n/g, '<br>')}
              </p>
            </td>
          </tr>
          ${getLegalFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nPlease reply directly to the sender's email address.`

  return await sendEmail({
    to: EMAIL_SUPPORT,
    from: EMAIL_NO_REPLY,
    replyTo: email,
    subject: `Contact Form: ${subject}`,
    html,
    text
  })
}

export const sendContactAutoReply = async (userEmail, userName) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your message</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">We received your message</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName || 'there'},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for contacting Sun Mega. We've received your message and our support team will get back to you as soon as possible.
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                If you have any urgent inquiries, please call us at <strong>+254 1190 27300</strong>.
              </p>
            </td>
          </tr>
          ${getLegalFooter()}
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `We received your message\n\nHi ${userName || 'there'},\n\nThank you for contacting Sun Mega. We've received your message and our support team will get back to you as soon as possible.\n\nIf you have any urgent inquiries, please call us at +254 1190 27300.\n\nBest regards,\nSun Mega Team`

  return await sendEmail({
    to: userEmail,
    from: EMAIL_NO_REPLY,
    subject: 'We received your message',
    html,
    text
  })
}

export const sendInquiryNotification = async (inquiryData) => {
  const { firstName, lastName, email, phone, location, productInterest, message, contactMethod } = inquiryData
  const fullName = `${firstName} ${lastName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Pricing Inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Pricing Inquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Name:</strong> ${fullName}
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Email:</strong> <a href="mailto:${email}" style="color: #22c55e;">${email}</a>
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Phone:</strong> ${phone}
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Location:</strong> ${location}
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Product Interest:</strong> ${productInterest}
              </p>
              ${contactMethod ? `<p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;"><strong>Preferred Contact Method:</strong> ${contactMethod}</p>` : ''}
              ${message ? `
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>Message:</strong>
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                ${message.replace(/\n/g, '<br>')}
              </p>
              ` : ''}
            </td>
          </tr>
          ${getLegalFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `New Pricing Inquiry\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nLocation: ${location}\nProduct Interest: ${productInterest}\n${contactMethod ? `Preferred Contact Method: ${contactMethod}\n` : ''}${message ? `Message: ${message}\n` : ''}\nPlease reply directly to the sender's email address.`

  return await sendEmail({
    to: EMAIL_QUOTES,
    from: EMAIL_NO_REPLY,
    replyTo: email,
    subject: `Pricing Inquiry: ${productInterest}`,
    html,
    text
  })
}

export const sendInquiryAutoReply = async (userEmail, userName) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank you for your inquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName || 'there'},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in our solar solutions. We've received your inquiry and our team will prepare a personalized quote for you.
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We aim to respond to all inquiries within 24 business hours.
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                For urgent matters, please call us at <strong>+254 1190 27300</strong>.
              </p>
            </td>
          </tr>
          ${getLegalFooter()}
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `Thank you for your inquiry\n\nHi ${userName || 'there'},\n\nThank you for your interest in our solar solutions. We've received your inquiry and our team will prepare a personalized quote for you.\n\nWe aim to respond to all inquiries within 24 business hours.\n\nFor urgent matters, please call us at +254 1190 27300.\n\nBest regards,\nSun Mega Team`

  return await sendEmail({
    to: userEmail,
    from: EMAIL_NO_REPLY,
    subject: 'Thank you for your inquiry',
    html,
    text
  })
}

export const sendNewsletterThanks = async (email, unsubscribeToken) => {
  const unsubscribeUrl = unsubscribeToken ? `${BACKEND_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}` : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanks for subscribing!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thanks for subscribing!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You're all set! You've successfully subscribed to the Sun Mega newsletter.
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Be the first to know about:
              </p>
              <ul style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <li>New solar products and innovations</li>
                <li>Exclusive discounts and special offers</li>
                <li>Energy-saving tips and insights</li>
                <li>Latest updates from Sun Mega</li>
              </ul>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0;">
                We're excited to share great content with you!
              </p>
            </td>
          </tr>
          ${getLegalFooter()}
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              ${unsubscribeUrl ? `<p style="color: #666666; font-size: 12px; margin: 0 0 10px 0;"><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a></p>` : ''}
              <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `Thanks for subscribing!\n\nYou're all set! You've successfully subscribed to the Sun Mega newsletter.\n\nBe the first to know about:\n- New solar products and innovations\n- Exclusive discounts and special offers\n- Energy-saving tips and insights\n- Latest updates from Sun Mega\n\nWe're excited to share great content with you!\n\n${unsubscribeUrl ? `To unsubscribe, visit: ${unsubscribeUrl}\n\n` : ''}Best regards,\nSun Mega Team`

  return await sendEmail({
    to: email,
    from: EMAIL_NEWS,
    subject: 'Thanks for subscribing!',
    html,
    text
  })
}

/**
 * Send OTP Email for Admin Login 2FA
 * @param {string} email - Recipient email
 * @param {string} name - User name
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} purpose - OTP purpose (admin_login, etc.)
 */
export const sendOTPEmail = async ({ email, name, otpCode, purpose }) => {
  const subject = purpose === 'admin_login' 
    ? 'Your Admin Login Verification Code'
    : 'Your Verification Code'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${name},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your verification code is:
              </p>
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22c55e;">${otpCode}</span>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                This code will expire in 10 minutes.<br>
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `${subject}\n\nHello ${name},\n\nYour verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nSun Mega Team`

  return await sendEmail({
    to: email,
    from: EMAIL_NO_REPLY,
    subject,
    html,
    text
  })
}

/**
 * Send Admin Invitation Email
 * @param {string} email - Admin email
 * @param {string} name - Admin name
 * @param {string} tempPassword - Temporary password
 */
export const sendAdminInviteEmail = async ({ email, name, tempPassword }) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sun Mega Admin</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #22c55e; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to Sun Mega Admin</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${name},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You have been invited to join the Sun Mega Limited admin panel. Here are your login credentials:
              </p>
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>
              <p style="color: #dc2626; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                <strong>Important:</strong> You will be required to change this password on your first login.
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Please log in at the admin panel and complete the security verification.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `Welcome to Sun Mega Admin\n\nHello ${name},\n\nYou have been invited to join the Sun Mega Limited admin panel. Here are your login credentials:\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nImportant: You will be required to change this password on your first login.\n\nPlease log in at the admin panel and complete the security verification.\n\nBest regards,\nSun Mega Team`

  return await sendEmail({
    to: email,
    from: EMAIL_NO_REPLY,
    subject: 'Welcome to Sun Mega Admin Panel',
    html,
    text
  })
}
