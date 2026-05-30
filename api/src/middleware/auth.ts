import type { Context, Next } from 'hono'
import type { Bindings, Variables } from '../types'

export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) => {
  const email =
    c.req.header('CF-Access-Authenticated-User-Email') ??
    c.req.header('X-Dev-Email')
  const name =
    c.req.header('CF-Access-Authenticated-User-Displayname') ??
    c.req.header('X-Dev-Name') ??
    email

  if (!email) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  c.set('userEmail', email)
  c.set('userName', name ?? email)
  await next()
}
