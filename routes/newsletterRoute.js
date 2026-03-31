import express from 'express'
import { subscribeNewsletter, unsubscribeNewsletter, validateSubscribe } from '../controllers/newsletterController.js'

const router = express.Router()

router.post('/subscribe', validateSubscribe, subscribeNewsletter)
router.get('/unsubscribe', unsubscribeNewsletter)

export default router
