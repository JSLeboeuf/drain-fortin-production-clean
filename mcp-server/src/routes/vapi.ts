import { Router } from 'express'
import { vapiCall } from '../vapi'

const router = Router()

/**
 * @openapi
 * /vapi/call:
 *   post:
 *     summary: Trigger a VAPI call to a phone number with a message
 *     tags: [vapi]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, message]
 *             properties:
 *               to: { type: string, example: "+14389004385" }
 *               message: { type: string, example: "Bonjour, ceci est un test." }
 *     responses:
 *       200:
 *         description: VAPI response
 */
router.post('/call', async (req, res) => {
  const { to, message } = req.body || {}
  if (!to || !message) return res.status(400).json({ error: 'Missing to or message' })
  try {
    const result = await vapiCall({ to, message })
    res.json(result)
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'VAPI error' })
  }
})

export default router

