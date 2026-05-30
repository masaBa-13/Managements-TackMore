import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, ExternalLink, X } from 'lucide-react'
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">タイトル</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">内容</label>
        <textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm resize-none"
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
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ソースURL（任意）</label>
          <input
            type="url"
            value={form.source_url}
            onChange={(e) => set('source_url', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
          キャンセル
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.title || !form.content || isPending}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
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

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['market-notes'],
    queryFn: () => fetchMarketNotes(),
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

  return (
    <div className="space-y-5">
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトル・内容を検索..."
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-64"
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
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                )}
              >
                {tag}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
              >
                <X size={12} />
                クリア
              </button>
            )}
          </div>
        )}
        <div className="sm:ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 whitespace-nowrap"
          >
            <Plus size={14} />
            メモ追加
          </button>
        </div>
      </div>

      {showAdd && (
        <MarketForm
          onSubmit={(form) => createMutation.mutate(form)}
          onClose={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">読み込み中...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          {searchQuery || selectedTags.size > 0 ? '検索条件に一致するメモがありません' : 'メモがありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note: MarketNote) => (
            <div key={note.id}>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{note.title}</span>
                      {note.source_url && (
                        <a
                          href={note.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-700"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full cursor-pointer hover:bg-indigo-100"
                          onClick={() => toggleTag(tag)}
                        >
                          #{tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(note.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(note.id)}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`「${note.title}」を削除しますか？`)) {
                          deleteMutation.mutate(note.id)
                        }
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
