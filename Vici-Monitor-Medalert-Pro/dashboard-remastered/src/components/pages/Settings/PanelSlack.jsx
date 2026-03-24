import React, { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, TestTube } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'
import { testSlack } from '@/lib/api'

export default function PanelSlack({ settings, onSave, saving }) {
  const { baseUrl, token } = useApp()
  const [localSettings, setLocalSettings] = useState({
    slackWebhook: settings?.notifications?.slack?.webhook || '',
    slackChannel: settings?.notifications?.slack?.channel || '#alerts',
    slackUsername: settings?.notifications?.slack?.username || 'Medalert Bot',
    enableSlackNotifications: settings?.notifications?.slack?.enabled || false,
    mentionUsers: settings?.notifications?.slack?.mentionUsers || '',
    testResult: null,
  })

  const handleSave = useCallback(() => {
    const patch = {
      notifications: {
        slack: {
          webhook: localSettings.slackWebhook,
          channel: localSettings.slackChannel,
          username: localSettings.slackUsername,
          enabled: localSettings.enableSlackNotifications,
          mentionUsers: localSettings.mentionUsers,
        }
      }
    }
    onSave(patch)
  }, [onSave, localSettings])

  const handleTest = useCallback(async () => {
    setLocalSettings(prev => ({ ...prev, testResult: 'Testing...' }))
    
    const result = await testSlack(baseUrl, token, {
      severity: 'info',
      message: 'Test notification from Medalert Monitor'
    })
    
    if (result.success) {
      setLocalSettings(prev => ({ ...prev, testResult: '✅ Test successful!' }))
    } else {
      setLocalSettings(prev => ({ ...prev, testResult: `❌ Test failed: ${result.error}` }))
    }
  }, [baseUrl, token])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="size-5" />
          Slack Integration
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Enable Slack Notifications</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableSlackNotifications"
                checked={localSettings.enableSlackNotifications}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, enableSlackNotifications: e.target.checked }))}
                className="h-4 w-4 text-primary border-input rounded focus:ring-2 focus:ring-ring"
              />
              <label htmlFor="enableSlackNotifications" className="text-sm">
                Send alerts to Slack
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <input
                type="url"
                value={localSettings.slackWebhook}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, slackWebhook: e.target.value }))}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Slack incoming webhook URL</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <input
                type="text"
                value={localSettings.slackChannel}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, slackChannel: e.target.value }))}
                placeholder="#alerts"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground">Slack channel to post notifications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bot Username</label>
              <input
                type="text"
                value={localSettings.slackUsername}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, slackUsername: e.target.value }))}
                placeholder="Medalert Bot"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground">Display name for Slack notifications</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Mention Users</label>
              <input
                type="text"
                value={localSettings.mentionUsers}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, mentionUsers: e.target.value }))}
                placeholder="@user1 @user2"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground">Users to mention in alerts (comma separated)</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleTest} 
              disabled={!localSettings.slackWebhook || !localSettings.enableSlackNotifications}
              variant="outline"
              size="sm"
            >
              <TestTube className="size-3 mr-1" />
              Test Connection
            </Button>
            
            {localSettings.testResult && (
              <div className={cn(
                "text-sm px-3 py-2 rounded-md",
                localSettings.testResult.includes('✅') 
                  ? "bg-success/10 text-success border" 
                  : "bg-danger/10 text-danger border"
              )}>
                {localSettings.testResult}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Configure Slack webhook and notification settings
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
