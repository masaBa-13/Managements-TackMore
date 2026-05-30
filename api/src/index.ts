import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './types'
import { authMiddleware } from './middleware/auth'
import tasksRouter from './routes/tasks'
import financeRouter from './routes/finance'
import legalRouter from './routes/legal'
import marketRouter from './routes/market'
import membersRouter from './routes/members'
import { runFixedExpensesCron } from './cron/fixedExpenses'
import { runBalanceReminderCron } from './cron/balanceReminder'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://tackmore-dashboard.pages.dev',
    ],
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
    }
  },
}
