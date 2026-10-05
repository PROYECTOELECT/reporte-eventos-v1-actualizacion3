// Pegar en Cloudflare Workers. Binding R2: EVIDENCIAS. Variable PUBLIC_BASE = URL pública del bucket.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }
    if (request.method !== 'POST') {
      return new Response('Método no permitido', { status: 405, headers: cors })
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!file) {
      return Response.json({ error: 'Falta archivo' }, { status: 400, headers: cors })
    }
    const path = form.get('path') || `reportes/${Date.now()}.bin`
    await env.EVIDENCIAS.put(path, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    })
    const base = (env.PUBLIC_BASE || '').replace(/\/$/, '')
    return Response.json({ url: `${base}/${path}` }, { headers: cors })
  }
}
