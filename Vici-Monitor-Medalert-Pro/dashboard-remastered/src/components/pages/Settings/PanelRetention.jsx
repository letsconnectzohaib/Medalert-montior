import { useState, useEffect, useCallback } from 'react'
import { Database, Trash2, Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'

export default function PanelRetention({ settings, onSave, saving }) {
  const { baseUrl, token } = useApp()
  const [localSettings, setLocalSettings] = useState({
    snapshotRetention: settings?.retention?.snapshotRetention || 90,
    callflowRetention: settings?.retention?.callflowRetention || 30,
    intelligenceRetention: settings?.retention?.intelligenceRetention || 365,
    autoCleanup: settings?.retention?.autoCleanup || false,
    cleanupInterval: settings?.retention?.cleanupInterval || 24, // hours
  })

  const handleSave = useCallback(() => {
    const patch = {
      retention: {
        snapshotRetention: localSettings.snapshotRetention,
        callflowRetention: localSettings.callflowRetention,
        intelligenceRetention: localSettings.intelligenceRetention,
        autoCleanup: localSettings.autoCleanup,
        cleanupInterval: localSettings.cleanupInterval,
      }
    }
    onSave(patch)
  }, [onSave, localSettings])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="size-5" />
          Data Retention
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Snapshot Retention (days)</label>
              <input
                type="number"
                value={localSettings.snapshotRetention}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, snapshotRetention: parseInt(e.target.value) || 90 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="7"
                max="365"
              />
              <p className="text-xs text-muted-foreground">How long to keep raw snapshot data</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Callflow Retention (days)</label>
              <input
                type="number"
                value={localSettings.callflowRetention}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, callflowRetention: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="1"
                max="365"
              />
              <p className="text-xs text-muted-foreground">Hourly callflow data retention period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Intelligence Retention (days)</label>
              <input
                type="number"
                value={localSettings.intelligenceRetention}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, intelligenceRetention: parseInt(e.target.value) || 365 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="30"
                max="1095"
              />
              <p className="text-xs text-muted-foreground">Historical intelligence data retention</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cleanup Interval (hours)</label>
              <input
                type="number"
                value={localSettings.cleanupInterval}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, cleanupInterval: parseInt(e.target.value) || 24 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="1"
                max="168"
                disabled={!localSettings.autoCleanup}
              />
              <p className="text-xs text-muted-foreground">How often to run cleanup (if enabled)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoCleanup"
            checked={localSettings.autoCleanup}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, autoCleanup: e.target.checked }))}
            className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
          />
          <label htmlFor="autoCleanup" className="text-sm font-medium">
            Enable automatic cleanup
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically remove expired data based on retention settings
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Configure data retention and cleanup policies
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
