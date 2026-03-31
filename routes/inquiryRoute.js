import express from 'express'
import { submitInquiry, validateInquiry } from '../controllers/inquiryController.js'

const router = express.Router()

router.post('/', validateInquiry, submitInquiry)

export default router
