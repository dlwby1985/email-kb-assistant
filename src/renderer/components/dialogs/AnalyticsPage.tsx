import React, { useState, useEffect } from 'react'

interface AnalyticsStats {
  totalThreads: number
  totalContacts: number
  byChannel: Record<string, number>
  byDirection: Record<string, number>
  topContacts: Array<{ slug: string; name: string; count: number }>
  byMonth: Array<{ month: string; count: number }>
  topTags: Array<{ tag: string; count: number }>
  mostRecentThread: string | null
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  conversation: 'Conversation',
  wechat: 'WeChat',
  slack: 'Slack',
  zoom: 'Zoom',
}

const DIRECTION_LABELS: Record<string, string> = {
  outgoing: 'Outgoing',
  'incoming-reply': 'Incoming (reply)',
  'incoming-only': 'Incoming (no reply)',
}

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function shortMonth(iso: string): string {
  const parts = iso.split('-')
  return `${MONTH_SHORT[parts[1]] || parts[1]} '${parts[0].slice(2)}`
}

function BarChart({ items, colorClass }: {
  items: Array<{ label: string; value: number }>
  colorClass?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-24 text-right text-gray-500 truncate shrink-0">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass ?? 'bg-asu-maroon'}`}
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="w-6 text-gray-600 text-right shrink-0">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-asu-maroon">{value}</div>
      <div className="text-xs font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    window.electronAPI.analyticsGetStats()
      .then(setStats)
      .catch((err: Error) => console.error('Analytics error:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const topChannel = stats
    ? Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1])[0]
    : null

  const thisMonthKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  const thisMonth = stats?.byMonth.find((m) => m.month === thisMonthKey)?.count ?? 0

  const channelItems = stats
    ? Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
        label: CHANNEL_LABELS[k] ?? k, value: v,
      }))
    : []

  const directionItems = stats
    ? Object.entries(stats.byDirection).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
        label: DIRECTION_LABELS[k] ?? k, value: v,
      }))
    : []

  const monthItems = stats?.byMonth.slice(-6).map((m) => ({
    label: shortMonth(m.month), value: m.count,
  })) ?? []

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 shrink-0">
        <h2 className="text-base font-semibold text-gray-900">Communication Analytics</h2>
        <p className="text-xs text-gray-400 mt-0.5">Stats computed from your saved threads vault</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Computing stats…
          </div>
        ) : !stats ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            No data available. Save some threads first.
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total Threads" value={stats.totalThreads} />
              <StatCard label="Contacts" value={stats.totalContacts} />
              <StatCard
                label="Top Channel"
                value={topChannel ? (CHANNEL_LABELS[topChannel[0]] ?? topChannel[0]) : '—'}
                sub={topChannel ? `${topChannel[1]} threads` : undefined}
              />
              <StatCard label="This Month" value={thisMonth} sub="threads saved" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By Channel</h3>
                {channelItems.length > 0 ? (
                  <BarChart items={channelItems} colorClass="bg-asu-maroon" />
                ) : (
                  <p className="text-xs text-gray-400">No data</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By Direction</h3>
                {directionItems.length > 0 ? (
                  <BarChart items={directionItems} colorClass="bg-asu-blue" />
                ) : (
                  <p className="text-xs text-gray-400">No data</p>
                )}
              </div>
            </div>

            {/* Monthly trend */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Last 6 Months</h3>
              {monthItems.some((m) => m.value > 0) ? (
                <BarChart items={monthItems} colorClass="bg-asu-gold" />
              ) : (
                <p className="text-xs text-gray-400">No threads in the last 6 months</p>
              )}
            </div>

            {/* Top contacts + Top tags side by side */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Most Active Contacts</h3>
                {stats.topContacts.length > 0 ? (
                  <BarChart
                    items={stats.topContacts.map((c) => ({ label: c.name, value: c.count }))}
                    colorClass="bg-asu-green"
                  />
                ) : (
                  <p className="text-xs text-gray-400">No contacts with threads yet</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Tags</h3>
                {stats.topTags.length > 0 ? (
                  <BarChart
                    items={stats.topTags.map((t) => ({ label: t.tag, value: t.count }))}
                    colorClass="bg-asu-orange"
                  />
                ) : (
                  <p className="text-xs text-gray-400">No tagged threads yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
