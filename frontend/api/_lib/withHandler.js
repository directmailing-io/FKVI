/**
 * Wraps a Vercel serverless handler so that any unhandled exception is caught
 * and returned as JSON. Without this, Node crashes leak Vercel's HTML error page,
 * which the frontend then fails to parse as JSON.
 */
export function withHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      console.error('[handler crash]', err)
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Internal server error' })
      }
    }
  }
}
