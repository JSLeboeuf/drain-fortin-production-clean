import fetch from 'node-fetch'

interface VapiCallParams {
  to: string
  message: string
}

export async function vapiCall(params: VapiCallParams) {
  const base = process.env.VAPI_BASE_URL || 'https://api.vapi.ai'
  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) throw new Error('Missing VAPI_API_KEY')

  const url = `${base.replace(/\/$/, '')}/call`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`VAPI error ${res.status}: ${text}`)
  }
  return res.json()
}

