import { useState, useMemo, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, ChevronRight, Check, Loader2, X, Clock, Lightbulb } from 'lucide-react'
import { clsx } from 'clsx'
import { generateWbs, confirmWbs, type AiWbsEpic } from '../../api/tasks'
import { fetchMembers } from '../../api/market'

type Step = 'input' | 'generating' | 'preview' | 'saving'

const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' }
const priorityColor: Record<string, string> = {
  high: 'text-rose-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

// ─── Advice logic ───
interface Advice {
  message: string
  type: 'warn' | 'tip'
}

function analyzeInput(text: string): Advice[] {
  const hints: Advice[] = []
  const trimmed = text.trim()
  if (!trimmed) return []

  if (trimmed.length < 15) {
    hints.push({ message: 'もう少し詳しく書くと、精度の高いWBSが生成されます', type: 'tip' })
    return hints
  }

  const hasDeadline = /期[日限]|締[め切]|まで[にに]|納[品期]|\d{1,2}月|\d{4}[\/\-年]/.test(trimmed)
  if (!hasDeadline) {
    hints.push({ message: '期日や納期を入れると、スケジュール付きのWBSになります', type: 'warn' })
  }

  const hasStart = /開始|スタート|着手|から始|今[日週月]から/.test(trimmed)
  if (!hasStart && hasDeadline) {
    hints.push({ message: 'いつ開始するかも書くと、より正確な期間配分ができます', type: 'tip' })
  }

  const hasMembers = /@\S+/.test(trimmed)
  if (!hasMembers) {
    hints.push({ message: '@ でメンバーをメンションすると担当を自動割り振りします', type: 'tip' })
  }

  const vaguePhrases = /システム[をの作]|アプリ[をの作]|サービス[をの作]|プロジェクト[をの]/.test(trimmed)
  if (vaguePhrases && trimmed.length < 60) {
    hints.push({ message: 'タスクが大きそうです。具体的なゴールや機能を書くとより細かく分解できます', type: 'warn' })
  }

  const isDev = /アプリ|システム|サイト|Web|API|開発|実装|コーディング/.test(trimmed)
  const hasTech = /React|Flutter|Swift|Python|TypeScript|Go|Rails|Next|Vue|AWS|GCP|Firebase|Cloudflare/.test(trimmed)
  if (isDev && !hasTech && trimmed.length > 30) {
    hints.push({ message: '技術スタック（React, Flutter等）を書くと、技術に合ったタスク分解になります', type: 'tip' })
  }

  return hints
}

// ─── Main Wizard ───
export default function AiWbsWizard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ project: string; deadline: string | null; wbs: AiWbsEpic[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // @mention
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: fetchMembers })
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIdx, setMentionIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const showMention = mentionQuery !== null

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8)
  }, [mentionQuery, members])

  const advice = useMemo(() => analyzeInput(text), [text])

  // Detect @mention trigger
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const atMatch = before.match(/@([^\s@]*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIdx(0)
    } else {
      setMentionQuery(null)
    }
  }, [])

  const insertMention = useCallback((name: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart
    const before = text.slice(0, cursor)
    const after = text.slice(cursor)
    const replaced = before.replace(/@[^\s@]*$/, `@${name} `)
    setText(replaced + after)
    setMentionQuery(null)

    requestAnimationFrame(() => {
      ta.focus()
      const newCursor = replaced.length
      ta.setSelectionRange(newCursor, newCursor)
    })
  }, [text])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (mentionCandidates.length > 0 && mentionQuery !== null) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIdx((i) => Math.min(i + 1, mentionCandidates.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionCandidates[mentionIdx].name)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
            return
      }
    }

    // Cmd+Enter to generate
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }, [mentionCandidates, mentionQuery, mentionIdx, insertMention])

  const generateMutation = useMutation({
    mutationFn: generateWbs,
    onSuccess: (data) => {
      setResult({ project: data.project, deadline: data.deadline, wbs: data.wbs })
      setStep('preview')
    },
    onError: (e: Error) => {
      setError(e.message)
      setStep('input')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: confirmWbs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
    onError: (e: Error) => {
      setError(e.message)
      setStep('preview')
    },
  })

  const handleGenerate = useCallback(() => {
    if (!text.trim() || text.trim().length < 10) return
    setError(null)
    setStep('generating')
    generateMutation.mutate({ goal: text.trim() })
  }, [text])

  const handleConfirm = () => {
    if (!result) return
    setStep('saving')
    confirmMutation.mutate({
      project: result.project,
      deadline: result.deadline,
      epics: result.wbs,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#111111] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-fuchsia-400" />
            <h2 className="text-base font-semibold text-white">AI WBS生成</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-md px-4 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}

          {(step === 'input' || step === 'generating') && (
            <div className={clsx(step === 'generating' && 'opacity-50 pointer-events-none')}>
              <p className="text-sm text-gray-400 mb-3">
                やりたいことを自由に書いてください。AIがWBSに分解します。
              </p>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  autoFocus
                  placeholder={"例: 津軽海峡フェリーのシフト管理システムを作りたい。\nFlutterで開発、7月末までにプロトタイプ納品。\n@田中 と @佐藤 で担当。"}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/50 resize-none leading-relaxed"
                />

                {/* @mention popup */}
                {mentionCandidates.length > 0 && showMention && (
                  <div className="absolute z-20 bottom-1 left-1 right-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl overflow-hidden">
                    {mentionCandidates.map((m, i) => (
                      <button
                        key={m.id}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm flex items-center gap-2',
                          i === mentionIdx
                            ? 'bg-fuchsia-500/20 text-white'
                            : 'text-gray-400 hover:bg-white/5'
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          insertMention(m.name)
                        }}
                        onMouseEnter={() => setMentionIdx(i)}
                      >
                        <span className="w-6 h-6 rounded-full bg-fuchsia-500/30 text-fuchsia-300 text-[10px] flex items-center justify-center font-medium">
                          {m.name[0]}
                        </span>
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advice hints */}
              {advice.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {advice.map((a, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'flex items-start gap-2 px-3 py-2 rounded-md text-xs',
                        a.type === 'warn'
                          ? 'bg-amber-500/10 text-amber-300/90'
                          : 'bg-white/[0.03] text-gray-500'
                      )}
                    >
                      <Lightbulb size={12} className={clsx('mt-0.5 shrink-0', a.type === 'warn' ? 'text-amber-400' : 'text-gray-600')} />
                      {a.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="animate-spin text-fuchsia-400" />
              <p className="text-sm text-gray-400">AIがWBSを考えています...</p>
            </div>
          )}

          {(step === 'preview' || step === 'saving') && result && (
            <WbsPreview wbs={result.wbs} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
          {step === 'input' && (
            <>
              <span className="text-[10px] text-gray-600">Cmd+Enter で生成</span>
              <button
                onClick={handleGenerate}
                disabled={text.trim().length < 10}
                className="px-5 py-2 text-sm bg-fuchsia-500 text-white rounded-md font-medium hover:bg-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                WBSを生成
              </button>
            </>
          )}

          {step === 'generating' && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mx-auto">
              <Loader2 size={16} className="animate-spin text-fuchsia-400" />
              AIがWBSを考えています...
            </div>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('input'); setResult(null) }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
              >
                やり直す
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2 text-sm bg-emerald-500 text-white rounded-md font-medium hover:bg-emerald-600 flex items-center gap-1.5"
              >
                <Check size={14} />
                このWBSで登録
              </button>
            </>
          )}

          {step === 'saving' && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mx-auto">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              タスクを登録中...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── WBS Preview ───
function WbsPreview({ wbs }: { wbs: AiWbsEpic[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        以下のWBSが生成されました。確認して「登録」を押してください。
      </p>

      {wbs.map((epic, ei) => (
        <div key={ei} className="border border-white/5 rounded-md overflow-hidden">
          <div className="bg-fuchsia-500/10 px-3 py-2 flex items-center gap-2">
            <span className="text-xs bg-fuchsia-500/30 text-fuchsia-300 rounded px-1.5 py-0.5 font-mono">
              {ei + 1}
            </span>
            <span className="text-sm font-semibold text-gray-200">{epic.title}</span>
          </div>

          {epic.tasks.map((task, ti) => (
            <div key={ti}>
              <div className="px-3 py-1.5 pl-8 flex items-center gap-2 border-t border-white/5 bg-white/[0.02]">
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-xs font-mono text-gray-500">{ei + 1}.{ti + 1}</span>
                <span className="text-sm text-gray-300">{task.title}</span>
                {task.estimated_days && (
                  <span className="ml-auto flex items-center gap-0.5 text-[10px] text-sky-400 bg-sky-500/10 rounded px-1.5 py-0.5">
                    <Clock size={10} />
                    {task.estimated_days}日
                  </span>
                )}
              </div>

              {task.subtasks.map((sub, si) => (
                <div key={si} className="px-3 py-1 pl-14 flex items-center gap-2 border-t border-white/[0.03]">
                  <span className="text-[10px] font-mono text-gray-600">{ei + 1}.{ti + 1}.{si + 1}</span>
                  <span className="text-xs text-gray-400">{sub.title}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {sub.estimated_days && (
                      <span className="text-[10px] text-sky-400/70">{sub.estimated_days}日</span>
                    )}
                    {sub.assignee && (
                      <span className="text-[10px] bg-white/10 text-gray-400 rounded-full px-1.5 py-0.5">
                        {sub.assignee}
                      </span>
                    )}
                    {sub.priority && (
                      <span className={clsx('text-[10px] font-medium', priorityColor[sub.priority ?? 'medium'])}>
                        {priorityLabel[sub.priority ?? 'medium']}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
