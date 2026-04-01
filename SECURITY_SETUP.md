# Security-Hardened Contact Form Integration Guide

This guide explains how to integrate the security-hardened contact form with **Google reCAPTCHA v3**, **advanced rate limiting**, **spam detection**, and **secure email delivery** into your MERN stack application.

## Overview

The secure contact form implements **8 layers of security**:

1. **Google reCAPTCHA v3** - Invisible bot detection with score thresholds
2. **IP-based Rate Limiting** - Track and temporarily ban abusive IPs
3. **Input Validation & Sanitization** - Prevent XSS and injection attacks
4. **Honeypot Field** - Trap automated bots (invisible to humans)
5. **Spam Detection Heuristics** - Detect suspicious patterns (URLs, keywords, formatting)
6. **Disposable Email Detection** - Block temporary email services
7. **Comprehensive Logging** - Monitor all submissions with IP, user-agent, timestamps
8. **Secure Email Delivery** - Via Resend API with proper error handling

---

## File Structure

```
backend/
├── controllers/
│   └── secureContactController.js  # Main security controller + route
└── server.js                        # Update to include the new route

frontend/
└── src/
    └── components/
        └── SecureContactForm.jsx    # React component with reCAPTCHA v3
```

---

## Step 1: Environment Variables

### Backend (.env)

Add these to your `backend/.env` file:

```env
# reCAPTCHA v3 Configuration
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
RECAPTCHA_SCORE_THRESHOLD=0.5

# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key_here
EMAIL_SUPPORT=support@sunmega.co.ke
EMAIL_NO_REPLY=no-reply@sunmega.co.ke

# Backend URL
BACKEND_URL=http://localhost:4000
```

### Frontend (.env)

Add this to your `frontend/.env` file:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

---

## Step 2: Get reCAPTCHA v3 Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" (+ icon)
3. Fill in the form:
   - **Label**: SunMega Contact Form
   - **reCAPTCHA type**: reCAPTCHA v3
   - **Domains**: `localhost`, `yourdomain.com`, `www.yourdomain.com`
   - **Accept terms of service**: ✓
   - **Send alerts to owners**: ✓ (optional)
4. Click "Submit"
5. Copy the **Site Key** (for frontend) and **Secret Key** (for backend)

---

## Step 3: Backend Integration

### 3.1 Install Dependencies

```bash
cd backend
npm install axios resend express-validator
```

### 3.2 Add Route to Server

In your `server.js`, add the secure contact route:

```javascript
import secureContactRouter from './controllers/secureContactController.js';

// ... other imports and middleware ...

// Add this BEFORE error handling middleware
app.use('/api', secureContactRouter);
```

### 3.3 Verify Controller is in Place

Ensure `secureContactController.js` is in `backend/controllers/` with all the security features.

---

## Step 4: Frontend Integration

### 4.1 Install Dependencies

```bash
cd frontend
npm install axios react-toastify
```

### 4.2 Replace Your Contact Component

Replace your existing Contact component with `SecureContactForm.jsx`:

```javascript
// In your App.jsx or router
import SecureContactForm from './components/SecureContactForm';

// Use it in your Contact page
function Contact() {
  return (
    <div>
      <h1>Contact Us</h1>
      <SecureContactForm />
    </div>
  );
}
```

Or integrate the security features into your existing Contact component by copying the relevant parts:

1. Copy the `loadRecaptchaScript` and `executeRecaptcha` functions
2. Add the honeypot field to your form
3. Add the reCAPTCHA token to your submission data
4. Update error handling to match the backend responses

---

## Step 5: Testing

### 5.1 Test Rate Limiting

```bash
# Send multiple requests quickly
curl -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","subject":"Test","message":"Test message","recaptchaToken":"fake"}'
```

After 5 attempts in 15 minutes, you should receive a `429 Too Many Requests` response.

### 5.2 Test Honeypot

Try filling the honeypot field (hidden field named `website`) - the request should be rejected.

### 5.3 Test Spam Detection

Submit a message with spam keywords like "viagra", "casino", or many URLs.

### 5.4 Check reCAPTCHA Score

Submit a legitimate form and check the console for the reCAPTCHA score.

---

## Step 6: Monitor Logs

The controller logs all activity. Watch your server console for:

```
[REQUEST] 2024-01-15T10:30:00.000Z - IP: 192.168.1.1 - Contact form submission
[SUBMISSION] {"timestamp":"...","ip":"...","recaptchaScore":0.9,...}
[EMAIL] Notification sent: email_id_here
[EMAIL] Auto-reply sent: email_id_here
```

Rejected submissions are logged with `[REJECTED]` and reasons.

---

## Step 7: Production Deployment

### 7.1 Update Environment Variables

```env
# Production reCAPTCHA (different keys for production)
RECAPTCHA_SECRET_KEY=your_production_secret_key
RECAPTCHA_SCORE_THRESHOLD=0.5

# Production Resend (verify domain in Resend dashboard)
RESEND_API_KEY=re_your_production_key
EMAIL_SUPPORT=support@sunmega.co.ke
EMAIL_NO_REPLY=no-reply@sunmega.co.ke

# Production Backend URL
BACKEND_URL=https://api.sunmega.co.ke
```

### 7.2 Update Frontend Environment

```env
VITE_BACKEND_URL=https://api.sunmega.co.ke
VITE_RECAPTCHA_SITE_KEY=your_production_site_key
```

### 7.3 Add Production Domain to reCAPTCHA

In the reCAPTCHA admin console, add your production domain:
- `sunmega.co.ke`
- `www.sunmega.co.ke`

### 7.4 Verify Resend Domain

Ensure your domain (`sunmega.co.ke`) is verified in the Resend dashboard for email delivery.

### 7.5 Consider Redis for Rate Limiting

In production with multiple server instances, replace the in-memory `ipTrackingStore` with Redis:

```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Replace ipTrackingStore and bannedIps with Redis operations
```

---

## Configuration Tuning

### Adjust reCAPTCHA Threshold

In `.env`:

```env
# Stricter (may block some legitimate users)
RECAPTCHA_SCORE_THRESHOLD=0.7

# More permissive (may allow more bots)
RECAPTCHA_SCORE_THRESHOLD=0.3
```

Monitor your logs to find the optimal threshold for your traffic.

### Adjust Rate Limits

In `secureContactController.js`, modify these constants:

```javascript
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;     // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;                // 5 requests per window
const RATE_LIMIT_BAN_THRESHOLD = 3;               // Ban after 3 violations
const RATE_LIMIT_BAN_DURATION_MS = 60 * 60 * 1000; // 1 hour ban
```

### Customize Spam Keywords

Add more spam patterns to the `SPAM_KEYWORDS` array:

```javascript
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', ...
  'your', 'custom', 'keywords'
];
```

---

## Troubleshooting

### "reCAPTCHA verification failed"

- Check that `RECAPTCHA_SECRET_KEY` is set correctly
- Ensure the action name matches ('submit')
- Verify the token is being sent from frontend

### "Too many requests" (429)

- Wait for the rate limit window to reset (15 minutes)
- Or clear the `ipTrackingStore` during development

### Emails not sending

- Check `RESEND_API_KEY` is configured
- Verify domain is verified in Resend dashboard
- Check Resend logs at https://resend.com/logs

### Low reCAPTCHA scores for legitimate users

- Lower the threshold temporarily: `RECAPTCHA_SCORE_THRESHOLD=0.3`
- Monitor the reCAPTCHA admin console for score distribution
- reCAPTCHA learns over time - scores may improve

---

## API Endpoints

### POST /api/contact

Submit a secure contact form.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Product Inquiry",
  "message": "I'm interested in solar panels for my home.",
  "phone": "+254712345678",
  "location": "Nairobi",
  "productInterest": "Single Phase",
  "recaptchaToken": "03AD...",
  "website": ""  // Honeypot - must be empty
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Thank you! Your message has been sent successfully.",
  "data": {
    "recaptchaScore": 0.9,
    "emailsSent": {
      "notification": true,
      "autoReply": true
    }
  }
}
```

**Error Response (400/429/500):**
```json
{
  "success": false,
  "error": "Specific error message",
  "retryAfter": 900  // Seconds until rate limit resets (if 429)
}
```

### GET /api/contact/status

Check rate limit status for your IP.

**Response:**
```json
{
  "ip": "192.168.1.1",
  "allowed": true,
  "remaining": 4,
  "banned": false,
  "resetTime": "2024-01-15T10:45:00.000Z"
}
```

---

## Security Checklist

- [ ] reCAPTCHA v3 keys are configured (different for dev/prod)
- [ ] Resend API key is set and domain is verified
- [ ] Environment variables are NOT committed to git
- [ ] Rate limiting is working (test with multiple rapid requests)
- [ ] Honeypot field is hidden from users but present in HTML
- [ ] Email notifications are delivering to Zoho inbox
- [ ] Auto-reply emails are sending to clients
- [ ] Logs show proper security information (no sensitive data)
- [ ] CORS is properly configured to prevent CSRF
- [ ] HTTPS is enforced in production

---

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set
3. Test with the `/api/contact/status` endpoint
4. Review reCAPTCHA scores in the Google Admin Console
