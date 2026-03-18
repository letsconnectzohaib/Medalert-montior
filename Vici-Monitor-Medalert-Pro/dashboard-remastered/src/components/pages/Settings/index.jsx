import { useState, useEffect, useCallback } from 'react'
import { Save, RefreshCw, Settings2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import * as Tabs from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'
import { getAdminSettings, updateAdminSettings } from '@/lib/api'
import PanelGateway from './PanelGateway'
import PanelShift from './PanelShift'
import PanelRetention from './PanelRetention'
import PanelAlerts from './PanelAlerts'
import PanelSlack from './PanelSlack'

const TabsList = Tabs.List
const TabsTrigger = Tabs.Trigger
const TabsContent = Tabs.Content

export default function Settings() {
  const { baseUrl, token, adminSettingsCache, dispatch, toast } = useApp()
  const [settings, setSettings] = useState(adminSettingsCache ?? null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getAdminSettings(baseUrl, token)
    setLoading(false)
    if (!res.success) { toast(res.error || 'Failed to load settings', 'error'); return }
    setSettings(res.settings)
    dispatch({ type: 'SET_ADMIN_SETTINGS', payload: res.settings })
  }, [baseUrl, token, dispatch, toast])

  useEffect(() => {
    if (!adminSettingsCache) load()
    else setSettings(adminSettingsCache)
  }, [adminSettingsCache, load])

  async function handleSave(patch) {
    setSaving(true)
    const res = await updateAdminSettings(baseUrl, token, patch)
    setSaving(false)
    if (!res.success) { toast(res.error || 'Failed to save settings', 'error'); return }
    setSettings(res.settings)
    dispatch({ type: 'SET_ADMIN_SETTINGS', payload: res.settings })
    toast('Settings saved', 'success')
  }

  const panelProps = { settings, onSave: handleSave, saving }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Gateway and system configuration</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs defaultValue="gateway">
        <TabsList>
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
          <TabsTrigger value="shift">Shift</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <React.Fragment>
          <TabsContent value="gateway"><PanelGateway {...panelProps} /></TabsContent>
          <TabsContent value="shift"><PanelShift {...panelProps} /></TabsContent>
          <TabsContent value="retention"><PanelRetention {...panelProps} /></TabsContent>
          <TabsContent value="alerts"><PanelAlerts {...panelProps} /></TabsContent>
          <TabsContent value="notifications"><PanelSlack {...panelProps} /></TabsContent>
        </React.Fragment>
      </Tabs>
    </div>
  )
}
