import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const BUCKET_COLORS = {
  chatting:       '#2563EB',
  email:          '#7C3AED',
  waiting_lt_1m:  '#16A34A',
  waiting_gt_1m:  '#D97706',
  paused:         '#94A3B8',
  dispo:          '#0EA5E9',
  dead:           '#DC2626',
}

export default function ShiftBarChart({ data, keys, height = 260 }) {
  if (!data?.length) return <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">No data</div>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          cursor={{ fill: 'currentColor', opacity: 0.04 }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
        {(keys || Object.keys(BUCKET_COLORS)).map((k) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="a"
            fill={BUCKET_COLORS[k] ?? '#64748B'}
            radius={[0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
