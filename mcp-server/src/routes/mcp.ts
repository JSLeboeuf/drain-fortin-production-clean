import { Router } from 'express'
import type { McpAction, McpExecuteBody, McpResponse } from '../types'
import { getSupabase } from '../supabase'
import { vapiCall } from '../vapi'

const router = Router()

/**
 * @openapi
 * /mcp/actions:
 *   get:
 *     summary: List available MCP actions
 *     tags: [mcp]
 *     responses:
 *       200:
 *         description: Array of actions
 */
router.get('/actions', (_req, res) => {
  const actions: McpAction[] = [
    {
      name: 'supabase.clients.list',
      description: 'List clients from the Supabase table `clients`',
      parameters: { limit: 100 },
    },
    {
      name: 'supabase.clients.create',
      description: 'Create a new client',
      parameters: { nom: 'string', email: 'string' } as any,
    },
    {
      name: 'supabase.clients.update',
      description: 'Update an existing client by id',
      parameters: { id: 'string', nom: 'string?', email: 'string?' } as any,
    },
    {
      name: 'vapi.call',
      description: 'Trigger a VAPI phone call with a message',
      parameters: { to: 'E.164 phone', message: 'string' } as any,
    },
  ]
  res.json(actions)
})

/**
 * @openapi
 * /mcp/execute:
 *   post:
 *     summary: Execute an MCP action
 *     tags: [mcp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string }
 *               params: { type: object }
 *           examples:
 *             list:
 *               value: { action: "supabase.clients.list", params: { limit: 50 } }
 *             create:
 *               value: { action: "supabase.clients.create", params: { nom: "Jean", email: "j@example.com" } }
 *             update:
 *               value: { action: "supabase.clients.update", params: { id: "uuid", nom: "Nouveau" } }
 *             vapi:
 *               value: { action: "vapi.call", params: { to: "+14389004385", message: "Bonjour!" } }
 *     responses:
 *       200:
 *         description: MCP response wrapper
 */
router.post('/execute', async (req, res) => {
  const body = req.body as McpExecuteBody
  const response: McpResponse = { status: 'ok' }

  try {
    switch (body.action) {
      case 'supabase.clients.list': {
        const limit = Math.min(parseInt(String(body.params?.limit ?? '100'), 10) || 100, 200)
        const sb = getSupabase()
        const { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false }).limit(limit)
        if (error) throw new Error(error.message)
        response.data = data
        break
      }
      case 'supabase.clients.create': {
        const { nom, email } = body.params || {}
        if (!nom || !email) throw new Error('Missing nom or email')
        const sb = getSupabase()
        const { data, error } = await sb.from('clients').insert({ nom, email }).select('*').single()
        if (error) throw new Error(error.message)
        response.data = data
        break
      }
      case 'supabase.clients.update': {
        const { id, nom, email } = body.params || {}
        if (!id) throw new Error('Missing id')
        if (!nom && !email) throw new Error('Nothing to update')
        const sb = getSupabase()
        const { data, error } = await sb.from('clients').update({ nom, email }).eq('id', id).select('*').single()
        if (error) throw new Error(error.message)
        response.data = data
        break
      }
      case 'vapi.call': {
        const { to, message } = body.params || {}
        if (!to || !message) throw new Error('Missing to or message')
        const result = await vapiCall({ to, message })
        response.data = result
        break
      }
      default:
        return res.status(400).json({ status: 'error', error: { code: 'UNKNOWN_ACTION', message: 'Unsupported action' } })
    }
    res.json(response)
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: { code: 'EXEC_ERROR', message: err?.message || 'Execution error' } })
  }
})

export default router

