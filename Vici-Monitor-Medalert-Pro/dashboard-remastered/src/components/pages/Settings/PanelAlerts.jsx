import React, { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'

export default function PanelAlerts({ settings, onSave, saving }) {
  const { baseUrl, token } = useApp()
  const [localSettings, setLocalSettings] = useState({
    enableEmailAlerts: settings?.alerts?.enableEmailAlerts || false,
    enableSlackAlerts: settings?.alerts?.enableSlackAlerts || false,
    alertThreshold: settings?.alerts?.alertThreshold || 10,
    severityFilter: settings?.alerts?.severityFilter || ['high', 'medium'],
    autoAcknowledge: settings?.alerts?.autoAcknowledge || false,
    cooldownMinutes: settings?.alerts?.cooldownMinutes || 5,
  })

  const handleSave = useCallback(() => {
    const patch = {
      alerts: {
        enableEmailAlerts: localSettings.enableEmailAlerts,
        enableSlackAlerts: localSettings.enableSlackAlerts,
        alertThreshold: localSettings.alertThreshold,
        severityFilter: localSettings.severityFilter,
        autoAcknowledge: localSettings.autoAcknowledge,
        cooldownMinutes: localSettings.cooldownMinutes,
      }
    }
    onSave(patch)
  }, [onSave, localSettings])

  const toggleSeverity = (severity) => {
    setLocalSettings(prev => ({
      ...prev,
      severityFilter: prev.severityFilter.includes(severity)
        ? prev.severityFilter.filter(s => s !== severity)
        : [...prev.severityFilter, severity]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="size-5" />
          Alert Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Alert Threshold</label>
              <input
                type="number"
                value={localSettings.alertThreshold}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) || 10 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">Minimum value to trigger alerts</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cooldown (minutes)</label>
              <input
                type="number"
                value={localSettings.cooldownMinutes}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, cooldownMinutes: parseInt(e.target.value) || 5 }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                min="1"
                max="60"
              />
              <p className="text-xs text-muted-foreground">Minimum time between similar alerts</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Alert Channels</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableEmailAlerts"
                  checked={localSettings.enableEmailAlerts}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, enableEmailAlerts: e.target.checked }))}
                  className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
                />
                <label htmlFor="enableEmailAlerts" className="text-sm">Enable Email Alerts</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableSlackAlerts"
                  checked={localSettings.enableSlackAlerts}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, enableSlackAlerts: e.target.checked }))}
                  className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
                />
                <label htmlFor="enableSlackAlerts" className="text-sm">Enable Slack Alerts</label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Severity Filter</label>
            <div className="flex flex-wrap gap-2">
              {['high', 'medium', 'low'].map(severity => (
                <div key={severity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`severity-${severity}`}
                    checked={localSettings.severityFilter.includes(severity)}
                    onChange={() => toggleSeverity(severity)}
                    className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
                  />
                  <label htmlFor={`severity-${severity}`} className="text-sm flex items-center gap-1">
                    {severity === 'high' && <AlertTriangle className="size-3 text-red-500" />}
                    {severity === 'medium' && <Info className="size-3 text-yellow-500" />}
                    {severity === 'low' && <CheckCircle className="size-3 text-green-500" />}
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoAcknowledge"
              checked={localSettings.autoAcknowledge}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, autoAcknowledge: e.target.checked }))}
              className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
            />
            <label htmlFor="autoAcknowledge" className="text-sm">
              Auto-acknowledge low severity alerts
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Configure alert thresholds and notification channels
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
