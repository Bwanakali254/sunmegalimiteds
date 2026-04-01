import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import connectCloudinary from './config/cloudinary.js'
import contactRouter from './routes/contactRoute.js'
import inquiryRouter from './routes/inquiryRoute.js'
import newsletterRouter from './routes/newsletterRoute.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import { sendEmail } from './services/emailService.js'
import { bootstrapSuperAdmin } from './controllers/userController.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Trust proxy for rate limiting to work correctly behind Render's proxy
app.set('trust proxy', 1)

// Connect to DB, Cloudinary, and bootstrap super admin
connectDB().then(() => {
  bootstrapSuperAdmin()
})
connectCloudinary()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL, process.env.ADMIN_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS configuration - strict whitelist for production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'https://sunmega.co.ke',
  'https://www.sunmega.co.ke',
  'https://admin.sunmega.co.ke'
].filter(Boolean) // Remove undefined values

// Add localhost only in development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:5174')
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked request from: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many form submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/', (req, res) => {
  res.json({ message: 'Sun Mega Limited API' })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const result = await sendEmail({
      to: process.env.EMAIL_QUOTES || 'quote@sunmega.co.ke',
      from: process.env.EMAIL_NO_REPLY || 'no-reply@sunmega.co.ke',
      subject: 'Test Email from New Backend',
      html: '<h1>Test Email</h1><p>This is a test from the new SunMega backend.</p>',
      text: 'Test Email - This is a test from the new SunMega backend.'
    })
    res.json({ success: true, result, env: {
      quotes: process.env.EMAIL_QUOTES,
      support: process.env.EMAIL_SUPPORT,
      noreply: process.env.EMAIL_NO_REPLY
    }})
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.use('/api/contact', formLimiter, contactRouter)
app.use('/api/inquiry', formLimiter, inquiryRouter)
app.use('/api/newsletter', newsletterRouter)
app.use('/api/user', userRouter)
app.use('/api/product', productRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
