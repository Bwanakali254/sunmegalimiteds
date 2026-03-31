import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import contactRouter from './routes/contactRoute.js'
import inquiryRouter from './routes/inquiryRoute.js'
import newsletterRouter from './routes/newsletterRoute.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

connectDB()

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' }
})
app.use(limiter)

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many form submissions, please try again later' }
})

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Sun Mega Limited API' })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/contact', formLimiter, contactRouter)
app.use('/api/inquiry', formLimiter, inquiryRouter)
app.use('/api/newsletter', newsletterRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
