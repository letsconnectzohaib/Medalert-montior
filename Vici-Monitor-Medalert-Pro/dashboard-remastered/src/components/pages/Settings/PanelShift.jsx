import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Users, TrendingUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export default function PanelShift({ settings, onSave, saving }) {
  const { baseUrl, token } = useApp()
  const [localSettings, setLocalSettings] = useState({
    shiftStart: settings?.shift?.start || '09:00',
    shiftEnd: settings?.shift?.end || '18:00',
    timezone: settings?.shift?.timezone || 'UTC',
    agentCapacity: settings?.shift?.agentCapacity || 20,
    breakInterval: settings?.shift?.breakInterval || 30,
  })

  const handleSave = useCallback(() => {
    const patch = {
      shift: {
        start: localSettings.shiftStart,
        end: localSettings.shiftEnd,
        timezone: localSettings.timezone,
        agentCapacity: localSettings.agentCapacity,
        breakInterval: localSettings.breakInterval,
      }
    }
    onSave(patch)
  }, [onSave, localSettings])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="size-5" />
          Shift Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Time</label>
            <input
              type="time"
              value={localSettings.shiftStart}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, shiftStart: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">End Time</label>
            <input
              type="time"
              value={localSettings.shiftEnd}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, shiftEnd: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Timezone</label>
          <select
            value={localSettings.timezone}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="UTC">UTC</option>
            <option value="EST">EST</option>
            <option value="PST">PST</option>
            <option value="CST">CST</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium flex items-center gap-2">
          <Users className="size-4" />
          Agent Settings
        </h4>
        
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium">Agent Capacity</label>
            <input
              type="number"
              value={localSettings.agentCapacity}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, agentCapacity: parseInt(e.target.value) || 20 }))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              min="1"
              max="100"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Break Interval (minutes)</label>
            <input
              type="number"
              value={localSettings.breakInterval}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, breakInterval: parseInt(e.target.value) || 30 }))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              min="5"
              max="60"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Configure shift timing and agent management settings
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
