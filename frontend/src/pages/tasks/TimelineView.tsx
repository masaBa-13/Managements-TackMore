import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { List, LayoutGrid, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { fetchTasksWithOffline, updateTask, buildTaskTree, type TaskNode } from '../../api/tasks'

const priorityColor: Record<string, string> = {
  high: 'border-rose-500',
  medium: 'border-amber-500',
  low: 'border-emerald-500',
}

// ─── Zoom levels ───
type ZoomLevel = 'week' | 'month'

const ZOOM_CONFIG: Record<ZoomLevel, { pxPerDay: number; label: string }> = {
  week:  { pxPerDay: 40, label: '週' },
  month: { pxPerDay: 8,  label: '月' },
}

// ─── Date range from computed bar dates ───
function getDateRangeFromBarDates(barDatesMap: Map<number, BarDates>): { start: Date; end: Date } {
  const now = new Date()
  let minDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  let maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1)

  for (const bd of barDatesMap.values()) {
    if (bd.start < minDate) minDate = new Date(bd.start.getFullYear(), bd.start.getMonth(), 1)
    if (bd.end > maxDate) maxDate = new Date(bd.end.getFullYear(), bd.end.getMonth() + 1, 1)
  }

  // Padding
  minDate = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1)
  maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1)

  return { start: minDate, end: maxDate }
}

// Generate column headers based on zoom
function getColumns(start: Date, end: Date, zoom: ZoomLevel): { key: string; label: string; startDate: Date; days: number }[] {
  const cols: { key: string; label: string; startDate: Date; days: number }[] = []

  if (zoom === 'month') {
    const cur = new Date(start)
    while (cur < end) {
      const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
      cols.push({
        key: cur.toISOString().slice(0, 7),
        label: cur.toLocaleDateString('ja-JP', { year: '2-digit', month: 'short' }),
        startDate: new Date(cur),
        days: daysInMonth,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    // week
    const cur = new Date(start)
    // Align to Monday
    const dayOfWeek = cur.getDay()
    cur.setDate(cur.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    while (cur < end) {
      const weekEnd = new Date(cur)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const m = cur.getMonth() + 1
      const d = cur.getDate()
      cols.push({
        key: cur.toISOString().slice(0, 10),
        label: `${m}/${d}`,
        startDate: new Date(cur),
        days: 7,
      })
      cur.setDate(cur.getDate() + 7)
    }
  }

  return cols
}

// ─── Compute bar dates from tree structure ───
// Instead of using created_at (task creation time), calculate proper start/end:
// - Leaf nodes: end = due_date, siblings are laid out sequentially
// - Parent nodes: span from first child start to last child end
interface BarDates {
  start: Date
  end: Date
}

function computeBarDates(nodes: TaskNode[], parentStart?: Date): Map<number, BarDates> {
  const map = new Map<number, BarDates>()
  let cursor = parentStart ?? new Date()

  for (const node of nodes) {
    if (node.children.length > 0) {
      // Parent: compute children first, then derive own span
      const childMap = computeBarDates(node.children, cursor)
      childMap.forEach((v, k) => map.set(k, v))

      let minStart = Infinity
      let maxEnd = -Infinity
      for (const child of node.children) {
        const cd = childMap.get(child.id)
        if (cd) {
          if (cd.start.getTime() < minStart) minStart = cd.start.getTime()
          if (cd.end.getTime() > maxEnd) maxEnd = cd.end.getTime()
        }
      }

      const nodeStart = minStart !== Infinity ? new Date(minStart) : cursor
      const nodeEnd = maxEnd !== -Infinity
        ? new Date(maxEnd)
        : node.due_date
          ? new Date(node.due_date)
          : new Date(nodeStart.getTime() + 7 * 86400000)

      map.set(node.id, { start: nodeStart, end: nodeEnd })
      cursor = nodeEnd
    } else {
      // Leaf: starts at cursor, ends at due_date (or cursor + 3 days)
      const nodeEnd = node.due_date
        ? new Date(node.due_date)
        : new Date(cursor.getTime() + 3 * 86400000)

      // If due_date is before cursor (data issue), push end forward
      const effectiveEnd = nodeEnd.getTime() > cursor.getTime()
        ? nodeEnd
        : new Date(cursor.getTime() + 2 * 86400000)

      map.set(node.id, { start: new Date(cursor), end: effectiveEnd })
      cursor = effectiveEnd
    }
  }

  return map
}

function getBarPosition(
  dates: BarDates,
  rangeStart: Date,
  pxPerDay: number
) {
  const startOffset = (dates.start.getTime() - rangeStart.getTime()) / 86400000
  const duration = Math.max((dates.end.getTime() - dates.start.getTime()) / 86400000, 1)

  return {
    left: Math.max(0, startOffset * pxPerDay),
    width: Math.max(duration * pxPerDay, 12),
  }
}

function getTodayOffset(rangeStart: Date, pxPerDay: number): number {
  return ((new Date().getTime() - rangeStart.getTime()) / 86400000) * pxPerDay
}

// ─── Main Component ───
export default function TimelineView() {
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [zoom, setZoom] = useState<ZoomLevel>('month')
  const didInitScroll = useRef(false)

  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasksWithOffline(),
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'todo' | 'in_progress' | 'done' }) =>
      updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleToggleStatus = useCallback((id: number, currentStatus: string) => {
    const next = currentStatus === 'done' ? 'todo' : 'done'
    completeMutation.mutate({ id, status: next as 'todo' | 'in_progress' | 'done' })
  }, [completeMutation])

  const tree = useMemo(() => tasks ? buildTaskTree(tasks) : [], [tasks])
  const barDatesMap = useMemo(() => computeBarDates(tree), [tree])

  // Auto expand epics
  useEffect(() => {
    if (tasks && expanded.size === 0) {
      setExpanded(new Set(tasks.filter(t => t.level === 1).map(t => t.id)))
    }
  }, [tasks])

  const range = useMemo(() => getDateRangeFromBarDates(barDatesMap), [barDatesMap])
  const totalDays = (range.end.getTime() - range.start.getTime()) / 86400000
  const pxPerDay = ZOOM_CONFIG[zoom].pxPerDay
  const totalWidth = totalDays * pxPerDay
  const columns = useMemo(() => getColumns(range.start, range.end, zoom), [range, zoom])
  const todayPx = getTodayOffset(range.start, pxPerDay)

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sync header + body horizontal scroll
  const syncScroll = useCallback((source: 'header' | 'body') => {
    const header = headerScrollRef.current
    const body = bodyScrollRef.current
    if (!header || !body) return
    if (source === 'body') {
      header.scrollLeft = body.scrollLeft
    } else {
      body.scrollLeft = header.scrollLeft
    }
  }, [])

  // Scroll to today on mount
  useEffect(() => {
    if (didInitScroll.current || !tasks?.length) return
    didInitScroll.current = true
    const el = bodyScrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, todayPx - el.clientWidth / 3)
      syncScroll('body')
    })
  }, [tasks, todayPx, syncScroll])

  // Re-center on today when zoom changes
  useEffect(() => {
    if (!didInitScroll.current) return
    const el = bodyScrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, todayPx - el.clientWidth / 3)
      syncScroll('body')
    })
  }, [zoom, todayPx, syncScroll])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to="/tasks"
          className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-400 rounded-md hover:bg-white/10 flex items-center gap-1.5"
        >
          <List size={14} />
          ツリー
        </Link>
        <Link
          to="/tasks/kanban"
          className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-400 rounded-md hover:bg-white/10 flex items-center gap-1.5"
        >
          <LayoutGrid size={14} />
          カンバン
        </Link>
        <Link
          to="/tasks/timeline"
          className="px-3 py-1.5 text-sm bg-fuchsia-500 text-white rounded-md font-medium"
        >
          タイムライン
        </Link>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto md:ml-4 bg-white/5 border border-white/10 rounded-md p-0.5">
          <button
            onClick={() => setZoom('week')}
            className={clsx(
              'px-2.5 py-1 text-xs rounded flex items-center gap-1 transition-colors',
              zoom === 'week'
                ? 'bg-fuchsia-500 text-white font-medium'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <ZoomIn size={12} />
            週
          </button>
          <button
            onClick={() => setZoom('month')}
            className={clsx(
              'px-2.5 py-1 text-xs rounded flex items-center gap-1 transition-colors',
              zoom === 'month'
                ? 'bg-fuchsia-500 text-white font-medium'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <ZoomOut size={12} />
            月
          </button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 ml-2">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-[10px] text-gray-600">未着手</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /><span className="text-[10px] text-gray-600">進行中</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-gray-600">完了</span></div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-600">読み込み中...</div>
      ) : tree.length === 0 ? (
        <div className="p-8 text-center text-gray-600">タスクがありません</div>
      ) : (
        <div className="bg-[#111111] border border-white/5 rounded-md overflow-hidden">
          {/* Column headers */}
          <div className="flex border-b border-white/5">
            <div className="w-56 md:w-72 shrink-0 px-3 py-2 border-r border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">タスク</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div
                ref={headerScrollRef}
                className="overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
                onScroll={() => syncScroll('header')}
              >
                <div className="flex h-8" style={{ width: totalWidth }}>
                  {columns.map((col) => {
                    const w = col.days * pxPerDay
                    const now = new Date()
                    const isCurrent = zoom === 'month'
                      ? col.key === now.toISOString().slice(0, 7)
                      : now >= col.startDate && now < new Date(col.startDate.getTime() + 7 * 86400000)
                    return (
                      <div
                        key={col.key}
                        className={clsx(
                          'shrink-0 border-r border-white/5 flex items-center px-2',
                          isCurrent && 'bg-fuchsia-500/5'
                        )}
                        style={{ width: w }}
                      >
                        <span className={clsx(
                          'text-[10px] whitespace-nowrap',
                          isCurrent ? 'text-fuchsia-400 font-medium' : 'text-gray-600'
                        )}>
                          {col.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Body: task names + bars */}
          <div className="flex">
            {/* Left panel */}
            <div className="w-56 md:w-72 shrink-0">
              {tree.map((node) => (
                <TaskNameRows key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggleExpand} onToggleStatus={handleToggleStatus} />
              ))}
            </div>

            {/* Right panel: scrollable bars */}
            <div
              className="flex-1 overflow-x-auto border-l border-white/5"
              ref={bodyScrollRef}
              style={{ scrollbarWidth: 'thin' }}
              onScroll={() => syncScroll('body')}
            >
              <div style={{ width: totalWidth }} className="relative">
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-fuchsia-500/50 z-10"
                  style={{ left: todayPx }}
                >
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1 py-px bg-fuchsia-500 rounded text-[8px] text-white font-medium whitespace-nowrap">
                    TODAY
                  </div>
                </div>

                {/* Column grid lines */}
                {columns.map((col) => {
                  const offset = ((col.startDate.getTime() - range.start.getTime()) / 86400000) * pxPerDay
                  return (
                    <div
                      key={col.key}
                      className="absolute top-0 bottom-0 w-px bg-white/5"
                      style={{ left: offset }}
                    />
                  )
                })}

                {/* Task bars */}
                {tree.map((node) => (
                  <TaskBarRows key={node.id} node={node} rangeStart={range.start} pxPerDay={pxPerDay} depth={0} expanded={expanded} barDatesMap={barDatesMap} onToggleStatus={handleToggleStatus} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Task Name Rows ───
function TaskNameRows({
  node, depth, expanded, onToggle, onToggleStatus,
}: {
  node: TaskNode; depth: number; expanded: Set<number>; onToggle: (id: number) => void; onToggleStatus: (id: number, status: string) => void
}) {
  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children.length > 0

  return (
    <>
      <div className="group flex items-center gap-1.5 px-3 h-9 border-b border-white/5 hover:bg-white/[0.02]">
        <div style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={() => onToggle(node.id)}
              className="text-gray-500 hover:text-gray-300 text-[10px] w-4 shrink-0"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            onClick={() => onToggleStatus(node.id, node.status)}
            title={node.status === 'done' ? '完了を取り消す' : '完了にする'}
            className={clsx(
              'w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center transition-all',
              node.status === 'done'
                ? 'text-emerald-400'
                : 'text-gray-600 opacity-0 group-hover:opacity-100 hover:text-emerald-400'
            )}
          >
            <CheckCircle2 size={13} />
          </button>
          <span className={clsx(
            'text-xs truncate',
            node.level === 1 ? 'font-semibold text-gray-200' : 'text-gray-400',
            node.status === 'done' && 'line-through opacity-50'
          )}>
            {node.title}
          </span>
        </div>
      </div>
      {isExpanded && node.children.map((child) => (
        <TaskNameRows key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onToggleStatus={onToggleStatus} />
      ))}
    </>
  )
}

// ─── Task Bar Rows ───
function TaskBarRows({
  node, rangeStart, pxPerDay, depth, expanded, barDatesMap, onToggleStatus,
}: {
  node: TaskNode; rangeStart: Date; pxPerDay: number; depth: number; expanded: Set<number>; barDatesMap: Map<number, BarDates>; onToggleStatus: (id: number, status: string) => void
}) {
  const isExpanded = expanded.has(node.id)
  const dates = barDatesMap.get(node.id)
  const bar = dates
    ? getBarPosition(dates, rangeStart, pxPerDay)
    : { left: 0, width: 12 }

  return (
    <>
      <div className="h-9 relative border-b border-white/5">
        <button
          onClick={() => onToggleStatus(node.id, node.status)}
          title={node.status === 'done' ? '完了を取り消す' : '完了にする'}
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 rounded-sm border-l-2 transition-all group/bar cursor-pointer',
            priorityColor[node.priority],
            node.level === 1 ? 'h-6' : 'h-4',
            node.status === 'done'
              ? 'bg-emerald-500/25 hover:bg-emerald-500/35'
              : node.status === 'in_progress'
              ? 'bg-sky-500/20 hover:bg-emerald-500/20'
              : 'bg-white/[0.06] hover:bg-emerald-500/15'
          )}
          style={{ left: bar.left, width: bar.width }}
        >
          {node.level === 1 && node.progress > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-fuchsia-500/30 rounded-sm"
              style={{ width: `${node.progress}%` }}
            />
          )}
          <span className={clsx(
            'absolute inset-0 flex items-center px-1.5 text-[9px] truncate font-medium',
            node.status === 'done' ? 'text-emerald-300/80' : node.status === 'in_progress' ? 'text-sky-300/80' : 'text-gray-500'
          )}>
            {node.level > 1 ? (node.assignee ?? '') : ''}
          </span>
          {/* hover overlay */}
          <span className={clsx(
            'absolute inset-0 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity',
            node.status === 'done' ? 'text-emerald-300/60' : 'text-emerald-400'
          )}>
            <CheckCircle2 size={node.level === 1 ? 12 : 10} />
          </span>
        </button>
      </div>
      {isExpanded && node.children.map((child) => (
        <TaskBarRows key={child.id} node={child} rangeStart={rangeStart} pxPerDay={pxPerDay} depth={depth + 1} expanded={expanded} barDatesMap={barDatesMap} onToggleStatus={onToggleStatus} />
      ))}
    </>
  )
}
