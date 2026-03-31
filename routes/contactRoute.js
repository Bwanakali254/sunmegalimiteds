import express from 'express'
import { submitContact, validateContact } from '../controllers/contactController.js'

const router = express.Router()

router.post('/', validateContact, submitContact)

export default router
