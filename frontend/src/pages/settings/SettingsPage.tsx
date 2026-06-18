import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { fetchMembers, createMember, deleteMember } from '../../api/market'
import { fetchReminderSetting, updateReminderSetting } from '../../api/finance'
import {
  fetchCategories, createCategory, deleteCategory,
  fetchProjects, createProject, deleteProject,
  fetchAppSettings, updateAppSettings,
} from '../../api/settings'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState('both')
  const [newProjName, setNewProjName] = useState('')
  const [reminderDay, setReminderDay] = useState<number | null>(null)
  const [reminderActive, setReminderActive] = useState(true)
  const [discordWebhook, setDiscordWebhook] = useState('')

  const { data: members = [], isLoading: membersLoading } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const { data: appSettings } = useQuery({ queryKey: ['app-settings'], queryFn: fetchAppSettings })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const { data: reminderSetting } = useQuery({ queryKey: ['reminder-setting'], queryFn: fetchReminderSetting })

  const addMemberMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['members'] }); setNewName(''); setNewEmail('') },
    onError: (err: Error) => { alert(err.message) },
  })
  const deleteMemberMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  const addCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setNewCatName('') },
    onError: (err: Error) => { alert(err.message) },
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const addProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setNewProjName('') },
    onError: (err: Error) => { alert(err.message) },
  })
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const updateReminderMutation = useMutation({
    mutationFn: updateReminderSetting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-setting'] }),
  })

  const updateDiscordMutation = useMutation({
    mutationFn: (url: string) => updateAppSettings({ discord_webhook_url: url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
  })

  const currentDiscordWebhook = discordWebhook !== '' ? discordWebhook : (appSettings?.discord_webhook_url ?? '')

  const currentRemindDay = reminderDay ?? reminderSetting?.remind_day ?? 28
  const currentActive = reminderSetting !== undefined
    ? (reminderDay !== null ? reminderActive : reminderSetting.is_active === 1)
    : true

  return (
    <div className="max-w-2xl space-y-8">
      {/* Member Management */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-gray-200">メンバー管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">担当者として選択できるメンバーを管理します</p>
        </div>
        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2">
            <input type="text" placeholder="名前" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500" />
            <input type="email" placeholder="メールアドレス" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500" />
            <button onClick={() => { if (newName.trim() && newEmail.trim()) addMemberMutation.mutate({ name: newName.trim(), email: newEmail.trim() }) }}
              disabled={!newName.trim() || !newEmail.trim() || addMemberMutation.isPending}
              className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50 flex items-center gap-1.5">
              <Plus size={14} /> 追加
            </button>
          </div>
        </div>
        {membersLoading ? (
          <div className="p-6 text-center text-gray-600 text-sm">読み込み中...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">メンバーがいません</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-200">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                </div>
                <button onClick={() => { if (window.confirm(`「${m.name}」を削除しますか？`)) deleteMemberMutation.mutate(m.id) }}
                  className="p-1.5 text-rose-400 hover:bg-white/10 rounded"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category Management */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-gray-200">カテゴリ管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">取引や予算で使用するカテゴリを管理します</p>
        </div>
        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2">
            <input type="text" placeholder="カテゴリ名" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500" />
            <select value={newCatType} onChange={(e) => setNewCatType(e.target.value)}
              className="bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500">
              <option value="both">収入/支出共通</option>
              <option value="income">収入のみ</option>
              <option value="expense">支出のみ</option>
            </select>
            <button onClick={() => { if (newCatName.trim()) addCategoryMutation.mutate({ name: newCatName.trim(), type: newCatType }) }}
              disabled={!newCatName.trim() || addCategoryMutation.isPending}
              className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50 flex items-center gap-1.5">
              <Plus size={14} /> 追加
            </button>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">カテゴリがありません</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{c.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                    {c.type === 'both' ? '共通' : c.type === 'income' ? '収入' : '支出'}
                  </span>
                </div>
                <button onClick={() => { if (window.confirm(`「${c.name}」を削除しますか？`)) deleteCategoryMutation.mutate(c.id) }}
                  className="p-1.5 text-rose-400 hover:bg-white/10 rounded"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Project Management */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-gray-200">プロジェクト管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">タスクや入金見込みで使用するプロジェクトを管理します</p>
        </div>
        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2">
            <input type="text" placeholder="プロジェクト名" value={newProjName} onChange={(e) => setNewProjName(e.target.value)}
              className="flex-1 bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500" />
            <button onClick={() => { if (newProjName.trim()) addProjectMutation.mutate({ name: newProjName.trim() }) }}
              disabled={!newProjName.trim() || addProjectMutation.isPending}
              className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50 flex items-center gap-1.5">
              <Plus size={14} /> 追加
            </button>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">プロジェクトがありません</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-gray-200">{p.name}</span>
                <button onClick={() => { if (window.confirm(`「${p.name}」を削除しますか？`)) deleteProjectMutation.mutate(p.id) }}
                  className="p-1.5 text-rose-400 hover:bg-white/10 rounded"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Discord Integration */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-gray-200">Discord連携</h2>
          <p className="text-xs text-gray-500 mt-0.5">タスク完了時にDiscordへ通知します</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-300">Webhook URL</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={currentDiscordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
            <p className="text-xs text-gray-600">Discord サーバー設定 → 連携サービス → ウェブフックからURLを取得してください</p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => updateDiscordMutation.mutate(currentDiscordWebhook)}
              disabled={updateDiscordMutation.isPending}
              className="px-4 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50"
            >
              {updateDiscordMutation.isPending ? '保存中...' : '設定を保存'}
            </button>
          </div>
          {updateDiscordMutation.isSuccess && <p className="text-xs text-emerald-400 text-right">保存しました</p>}
          {currentDiscordWebhook && (
            <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-md border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs text-gray-400">Webhook URLが設定されています。タスク完了時にDiscordへ通知されます。</span>
            </div>
          )}
        </div>
      </div>

      {/* Balance Reminder Settings */}
      <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-gray-200">残高リマインダー設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">月次残高の未入力通知日を設定します</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 w-24">通知日</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={28} value={currentRemindDay}
                onChange={(e) => setReminderDay(parseInt(e.target.value))}
                className="w-20 bg-[#111111] border border-white/10 text-white rounded-md px-3 py-1.5 text-sm text-center" />
              <span className="text-sm text-gray-400">日以降</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 w-24">有効化</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={currentActive} onChange={(e) => setReminderActive(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#111111] text-fuchsia-500" />
              <span className="text-sm text-gray-400">リマインダーを有効にする</span>
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => updateReminderMutation.mutate({ remind_day: currentRemindDay, is_active: currentActive })}
              disabled={updateReminderMutation.isPending}
              className="px-4 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50">
              {updateReminderMutation.isPending ? '保存中...' : '設定を保存'}
            </button>
          </div>
          {updateReminderMutation.isSuccess && <p className="text-xs text-emerald-400 text-right">保存しました</p>}
        </div>
      </div>
    </div>
  )
}
