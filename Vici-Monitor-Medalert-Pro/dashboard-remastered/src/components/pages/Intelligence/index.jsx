import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Calendar, Brain } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useApp } from '@/context/AppContext'
import { fetchIntelligenceBundle, fetchIntelligenceShiftDates } from '@/lib/api'
import { todayDateString } from '@/lib/utils'
import FoundationSection from './FoundationSection'
import PatternSection from './PatternSection'
import PredictionSection from './PredictionSection'
import RiskSection from './RiskSection'
import NarrativeSection from './NarrativeSection'
import AdvancedSection from './AdvancedSection'

export default function Intelligence() {
  const { baseUrl, token, toast } = useApp()
  const [date, setDate] = useState(todayDateString())
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    const res = await fetchIntelligenceBundle(baseUrl, token, date)
    setLoading(false)
    if (!res.success) { toast(res.error || 'Failed to load intelligence data', 'error'); return }
    setBundle(res)
  }, [baseUrl, token, date, toast])

  useEffect(() => { load() }, [load])

  const insights = bundle?.insights?.data ?? null
  const campaigns = bundle?.campaigns?.data?.campaigns ?? []
  const agents = bundle?.agents?.data?.agents ?? []
  const transitions = bundle?.transitions?.data?.transitions ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Intelligence</h1>
            <p className="text-sm text-muted-foreground">AI-driven shift analysis and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-8 w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabbed sections */}
      <Tabs defaultValue="foundation">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="foundation">Foundation</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="narratives">Narratives</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="foundation">
          <FoundationSection insights={insights} loading={loading} />
        </TabsContent>
        <TabsContent value="patterns">
          <PatternSection insights={insights} loading={loading} />
        </TabsContent>
        <TabsContent value="predictions">
          <PredictionSection insights={insights} loading={loading} />
        </TabsContent>
        <TabsContent value="risk">
          <RiskSection insights={insights} loading={loading} />
        </TabsContent>
        <TabsContent value="narratives">
          <NarrativeSection insights={insights} loading={loading} />
        </TabsContent>
        <TabsContent value="advanced">
          <AdvancedSection insights={insights} campaigns={campaigns} agents={agents} transitions={transitions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
