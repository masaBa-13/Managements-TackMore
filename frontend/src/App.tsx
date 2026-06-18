import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/tasks/TasksPage'
import KanbanView from './pages/tasks/KanbanView'
import TimelineView from './pages/tasks/TimelineView'
import FinancePage from './pages/finance/FinancePage'
import FixedExpenses from './pages/finance/FixedExpenses'
import CashBalance from './pages/finance/CashBalance'
import InvoicesPage from './pages/finance/InvoicesPage'
import BudgetPage from './pages/finance/BudgetPage'
import ForecastPage from './pages/finance/ForecastPage'
import LegalPage from './pages/legal/LegalPage'
import MarketPage from './pages/market/MarketPage'
import SettingsPage from './pages/settings/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/kanban" element={<KanbanView />} />
        <Route path="tasks/timeline" element={<TimelineView />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="finance/fixed" element={<FixedExpenses />} />
        <Route path="finance/balance" element={<CashBalance />} />
        <Route path="finance/invoices" element={<InvoicesPage />} />
        <Route path="finance/forecast" element={<ForecastPage />} />
        <Route path="finance/budget" element={<BudgetPage />} />
        <Route path="legal" element={<LegalPage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
