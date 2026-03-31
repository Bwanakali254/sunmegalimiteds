import { body, validationResult } from 'express-validator'
import newsletterModel, { generateUnsubscribeToken } from '../models/newsletterModel.js'
import { sendNewsletterThanks } from '../services/emailService.js'

const validateSubscribe = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail()
]

const subscribeNewsletter = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      })
    }

    const { email } = req.body

    const existing = await newsletterModel.findOne({ email, status: 'active' })
    if (existing) {
      return res.json({ success: false, message: 'Already subscribed' })
    }

    const unsubscribeToken = generateUnsubscribeToken()

    await newsletterModel.create({
      email,
      subscribedAt: new Date(),
      status: 'active',
      unsubscribeToken
    })

    sendNewsletterThanks(email, unsubscribeToken).catch(err => {
      console.error('Newsletter thanks email error:', err.message)
    })

    res.json({ success: true, message: 'Subscribed successfully' })
  } catch (error) {
    console.error('Newsletter subscription error:', error.message)
    if (error.code === 11000 || error.code === 11001) {
      return res.json({ success: false, message: 'Already subscribed' })
    }
    res.status(500).json({ success: false, message: 'Failed to subscribe' })
  }
}

const unsubscribeNewsletter = async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).send(getUnsubscribeErrorHtml())
    }

    const subscriber = await newsletterModel.findOne({ unsubscribeToken: token })

    if (!subscriber) {
      return res.status(404).send(getNotFoundHtml())
    }

    if (subscriber.status === 'unsubscribed') {
      return res.status(200).send(getAlreadyUnsubscribedHtml(subscriber.email))
    }

    subscriber.status = 'unsubscribed'
    subscriber.unsubscribedAt = new Date()
    await subscriber.save()

    res.status(200).send(getUnsubscribeSuccessHtml(subscriber.email))
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error.message)
    res.status(500).send(getErrorHtml())
  }
}

const getUnsubscribeErrorHtml = () => {
  return `<!DOCTYPE html>
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
</html>`
}

const getNotFoundHtml = () => {
  return `<!DOCTYPE html>
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
</html>`
}

const getAlreadyUnsubscribedHtml = (email) => {
  return `<!DOCTYPE html>
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
    <p>The email address <span class="email">${email}</span> is already unsubscribed from our newsletter.</p>
  </div>
</body>
</html>`
}

const getUnsubscribeSuccessHtml = (email) => {
  return `<!DOCTYPE html>
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
    <p>The email address <span class="email">${email}</span> has been successfully removed from our newsletter.</p>
    <p>You will no longer receive promotional emails from Sun Mega Limited.</p>
    <p>If you change your mind, you can always resubscribe on our website.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Sun Mega Limited. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

const getErrorHtml = () => {
  return `<!DOCTYPE html>
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
</html>`
}

export { subscribeNewsletter, unsubscribeNewsletter, validateSubscribe }
