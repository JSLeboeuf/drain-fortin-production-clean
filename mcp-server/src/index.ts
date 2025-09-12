import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'

import mcpRoutes from './routes/mcp'
import clientsRoutes from './routes/clients'
import vapiRoutes from './routes/vapi'

const app = express()
const PORT = Number(process.env.PORT || 8787)

// Basic hardening
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Optional token auth
app.use((req, res, next) => {
  const required = process.env.MCP_TOKEN
  if (!required) return next()
  const token = req.header('x-api-token')
  if (token !== required) return res.status(401).json({ error: 'Unauthorized' })
  next()
})

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Swagger/OpenAPI setup
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MCP Bridge — Supabase + VAPI',
      version: '0.1.0',
      description: 'OpenAPI for MCP-compatible actions (Supabase clients + VAPI call)'
    },
    servers: [ { url: `http://localhost:${PORT}` } ],
    components: {
      securitySchemes: {
        ApiToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-token',
          description: 'Optional simple token auth'
        }
      }
    },
    security: process.env.MCP_TOKEN ? [ { ApiToken: [] } ] : [],
  },
  apis: ['src/routes/*.ts'],
})

app.get('/openapi.json', (_req, res) => {
  res.json(swaggerSpec)
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// MCP and resource routes
app.use('/mcp', mcpRoutes)
app.use('/clients', clientsRoutes)
app.use('/vapi', vapiRoutes)

// Discovery/manifest (simple)
app.get('/mcp/manifest', (_req, res) => {
  res.json({
    name: 'mcp-bridge-supabase-vapi',
    description: 'MCP connector exposing Supabase clients table and VAPI call',
    openapi_url: '/openapi.json',
    actions_url: '/mcp/actions',
  })
})

app.listen(PORT, () => {
  console.log(`MCP server listening on http://localhost:${PORT}`)
})
