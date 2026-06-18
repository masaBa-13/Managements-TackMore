import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './types'
import { authMiddleware } from './middleware/auth'
import tasksRouter from './routes/tasks'
import financeRouter from './routes/finance'
import legalRouter from './routes/legal'
import marketRouter from './routes/market'
import membersRouter from './routes/members'
import categoriesRouter from './routes/categories'
import projectsRouter from './routes/projects'
import settingsRouter from './routes/settings'
import { runFixedExpensesCron } from './cron/fixedExpenses'
import { runBalanceReminderCron } from './cron/balanceReminder'
import { runFetchNewsCron } from './cron/fetchNews'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'https://tackmore-dashboard.pages.dev',
      ]
      return allowed.includes(origin) || origin.endsWith('.pages.dev') ? origin : allowed[0]
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Dev-Email', 'X-Dev-Name'],
    credentials: true,
  })
)

// Auth middleware
app.use('/api/*', authMiddleware)

// Routes
app.route('/api/tasks', tasksRouter)
app.route('/api/finance', financeRouter)
app.route('/api/legal', legalRouter)
app.route('/api/market', marketRouter)
app.route('/api/members', membersRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/projects', projectsRouter)
app.route('/api/settings', settingsRouter)

// Health check
app.get('/', (c) => c.json({ status: 'ok', name: 'TackMore Dashboard API' }))

// Scheduled cron handler
export default {
  fetch: app.fetch,
  async scheduled(
    event: ScheduledEvent,
    env: Bindings,
    _ctx: ExecutionContext
  ): Promise<void> {
    const cron = event.cron

    if (cron === '0 0 1 * *') {
      // Monthly: first day of month - expand fixed expenses
      await runFixedExpensesCron(env.DB)
    } else if (cron === '0 0 * * *') {
      // Daily: check balance reminder
      await runBalanceReminderCron(env.DB)
    } else if (cron === '0 21 * * *') {
      // Daily 06:00 JST: fetch tech news
      await runFetchNewsCron(env.DB, env.AI)
    }
  },
}
