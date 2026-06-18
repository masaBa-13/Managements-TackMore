import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, ExternalLink, X, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import {
  fetchMarketNotes,
  createMarketNote,
  updateMarketNote,
  deleteMarketNote,
  type MarketNote,
} from '../../api/market'

interface MarketFormData {
  title: string
  content: string
  tags: string
  source_url: string
}

const emptyForm: MarketFormData = {
  title: '',
  content: '',
  tags: '',
  source_url: '',
}

type SourceTab = 'all' | 'auto' | 'manual'

function MarketForm({
  initial,
  onSubmit,
  onClose,
  isPending,
}: {
  initial?: MarketFormData
  onSubmit: (data: MarketFormData) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<MarketFormData>(initial ?? emptyForm)
  const set = (field: keyof MarketFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="bg-[#111111] border border-white/5 rounded-md p-4 space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">タイトル</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">内容</label>
        <textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          rows={4}
          className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">タグ（カンマ区切り）</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="競合, 業界動向"
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ソースURL（任意）</label>
          <input
            type="url"
            value={form.source_url}
            onChange={(e) => set('source_url', e.target.value)}
            className="w-full bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.title || !form.content || isPending}
          className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md hover:bg-fuchsia-600 disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

function parseTags(form: MarketFormData): string[] {
  return form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function MarketPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceTab, setSourceTab] = useState<SourceTab>('all')

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['market-notes', sourceTab],
    queryFn: () =>
      fetchMarketNotes(sourceTab === 'all' ? undefined : { source: sourceTab }),
  })

  const createMutation = useMutation({
    mutationFn: (form: MarketFormData) =>
      createMarketNote({
        title: form.title,
        content: form.content,
        tags: parseTags(form),
        source_url: form.source_url || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-notes'] })
      setShowAdd(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: number; form: MarketFormData }) =>
      updateMarketNote(id, {
        title: form.title,
        content: form.content,
        tags: parseTags(form),
        source_url: form.source_url || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-notes'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMarketNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['market-notes'] }),
  })

  // Collect all tags
  const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort()

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesTag =
      selectedTags.size === 0 || note.tags.some((t) => selectedTags.has(t))
    const matchesSearch =
      !searchQuery ||
      note.title.includes(searchQuery) ||
      note.content.includes(searchQuery)
    return matchesTag && matchesSearch
  })

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const isAutoNote = (note: MarketNote) => note.created_by === 'system-auto'

  const tabs: { key: SourceTab; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'auto', label: '自動ニュース' },
    { key: 'manual', label: '手動メモ' },
  ]

  return (
    <div className="space-y-5">
      {/* Source tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSourceTab(tab.key)}
            className={clsx(
              'px-3 py-1.5 text-xs rounded transition-colors',
              sourceTab === tab.key
                ? 'bg-fuchsia-500 text-white font-medium'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {tab.key === 'auto' && <Zap size={11} className="inline mr-1 -mt-0.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトル・内容を検索..."
          className="bg-[#111111] border border-white/10 text-white placeholder:text-gray-600 rounded-md px-3 py-1.5 text-sm w-full sm:w-64"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  selectedTags.has(tag)
                    ? 'bg-fuchsia-500 text-white border-fuchsia-500'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-fuchsia-500/50'
                )}
              >
                {tag}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-0.5"
              >
                <X size={12} />
                クリア
              </button>
            )}
          </div>
        )}
        {sourceTab !== 'auto' && (
          <div className="sm:ml-auto">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-300 rounded-md hover:bg-white/10 whitespace-nowrap"
            >
              <Plus size={14} />
              メモ追加
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <MarketForm
          onSubmit={(form) => createMutation.mutate(form)}
          onClose={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-600">読み込み中...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-8 text-center text-gray-600">
          {searchQuery || selectedTags.size > 0
            ? '検索条件に一致するメモがありません'
            : sourceTab === 'auto'
            ? '自動取得されたニュースはまだありません'
            : 'メモがありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note: MarketNote) => (
            <div key={note.id}>
              <div className="bg-[#111111] border border-white/5 rounded-md p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAutoNote(note) && (
                        <span className="text-[10px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <Zap size={10} />
                          自動取得
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-200">{note.title}</span>
                      {note.source_url && (
                        <a
                          href={note.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fuchsia-400 hover:text-fuchsia-300"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded-full cursor-pointer hover:bg-fuchsia-500/20"
                          onClick={() => toggleTag(tag)}
                        >
                          #{tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-600 ml-auto">
                        {new Date(note.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>

                  {!isAutoNote(note) && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(note.id)}
                        className="p-1.5 text-gray-500 hover:bg-white/10 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`「${note.title}」を削除しますか？`)) {
                            deleteMutation.mutate(note.id)
                          }
                        }}
                        className="p-1.5 text-rose-400 hover:bg-white/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingId === note.id && (
                <div className="mt-2">
                  <MarketForm
                    initial={{
                      title: note.title,
                      content: note.content,
                      tags: note.tags.join(', '),
                      source_url: note.source_url ?? '',
                    }}
                    onSubmit={(form) => updateMutation.mutate({ id: note.id, form })}
                    onClose={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
