import { Router } from 'express'
import { getSupabase, ClientRow } from '../supabase'

const router = Router()

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: List clients
 *     tags: [clients]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *         required: false
 *         description: Max rows (default 100)
 *     responses:
 *       200:
 *         description: List of clients
 *   post:
 *     summary: Create a client
 *     tags: [clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, email]
 *             properties:
 *               nom: { type: string }
 *               email: { type: string, format: email }
 *           examples:
 *             default:
 *               value: { nom: "Jean Tremblay", email: "jt@example.com" }
 *     responses:
 *       201:
 *         description: Created client
 */
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 200)
  const sb = getSupabase()
  const { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data as ClientRow[])
})

router.post('/', async (req, res) => {
  const { nom, email } = req.body || {}
  if (!nom || !email) return res.status(400).json({ error: 'Missing nom or email' })
  const sb = getSupabase()
  const { data, error } = await sb.from('clients').insert({ nom, email }).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data as ClientRow)
})

/**
 * @openapi
 * /clients/{id}:
 *   patch:
 *     summary: Update a client
 *     tags: [clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               email: { type: string, format: email }
 *           examples:
 *             default:
 *               value: { nom: "Nouveau Nom" }
 *     responses:
 *       200: { description: Updated client }
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { nom, email } = req.body || {}
  if (!nom && !email) return res.status(400).json({ error: 'Nothing to update' })
  const sb = getSupabase()
  const { data, error } = await sb.from('clients').update({ nom, email }).eq('id', id).select('*').single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data as ClientRow)
})

export default router

