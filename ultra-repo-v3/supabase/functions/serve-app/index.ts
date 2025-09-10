import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BUCKET_NAME = 'hosting'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

// Cache pour les fichiers statiques
const fileCache = new Map<string, Response>()

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    let path = url.pathname

    // Redirection racine vers index.html
    if (path === '/' || path === '') {
      path = '/index.html'
    }

    // Pour les routes SPA, toujours servir index.html
    if (!path.includes('.') && path !== '/') {
      path = '/index.html'
    }

    // Construire l'URL du fichier dans Storage
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}${path}`

    // Vérifier le cache
    if (fileCache.has(fileUrl)) {
      return fileCache.get(fileUrl)!.clone()
    }

    // Fetch du fichier depuis Storage
    const fileResponse = await fetch(fileUrl)

    if (!fileResponse.ok && path !== '/index.html') {
      // Si le fichier n'existe pas et ce n'est pas index.html, 
      // essayer de servir index.html pour le routing SPA
      const indexUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/index.html`
      const indexResponse = await fetch(indexUrl)
      
      if (indexResponse.ok) {
        const response = new Response(indexResponse.body, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
        return response
      }
    }

    // Déterminer le Content-Type
    let contentType = 'text/plain'
    if (path.endsWith('.html')) contentType = 'text/html; charset=utf-8'
    else if (path.endsWith('.js')) contentType = 'application/javascript'
    else if (path.endsWith('.css')) contentType = 'text/css'
    else if (path.endsWith('.json')) contentType = 'application/json'
    else if (path.endsWith('.svg')) contentType = 'image/svg+xml'
    else if (path.endsWith('.ico')) contentType = 'image/x-icon'
    else if (path.endsWith('.png')) contentType = 'image/png'
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg'

    // Cache Control selon le type de fichier
    let cacheControl = 'public, max-age=3600'
    if (path.includes('/assets/')) {
      cacheControl = 'public, max-age=31536000, immutable'
    } else if (path.endsWith('.html')) {
      cacheControl = 'no-cache, no-store, must-revalidate'
    }

    // Créer la réponse avec les bons headers
    const response = new Response(fileResponse.body, {
      status: fileResponse.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
      },
    })

    // Mettre en cache les assets statiques
    if (path.includes('/assets/')) {
      fileCache.set(fileUrl, response.clone())
    }

    return response

  } catch (error) {
    console.error('Error serving app:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})