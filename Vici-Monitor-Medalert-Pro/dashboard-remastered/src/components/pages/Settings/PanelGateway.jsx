import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Skeleton from '@/components/ui/Skeleton'

export default function PanelGateway({ settings, onSave, saving }) {
  const gw = settings?.gateway ?? {}
  const [form, setForm] = useState({ wsPort: '', snapshotInterval: '', jwtSecret: '' })

  useEffect(() => {
    if (gw) setForm({
      wsPort: gw.wsPort ?? gw.port ?? '',
      snapshotInterval: gw.snapshotInterval ?? '',
      jwtSecret: gw.jwtSecret ?? '',
    })
  }, [settings])

  function handleChange(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ gateway: { ...gw, ...form } })
  }

  if (!settings) return <div className="py-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>

  return (
    <Card>
      <CardHeader><CardTitle>Gateway Configuration</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>WS Port</Label>
              <Input type="number" value={form.wsPort} onChange={(e) => handleChange('wsPort', e.target.value)} placeholder="3100" />
            </div>
            <div className="space-y-1.5">
              <Label>Snapshot Interval (ms)</Label>
              <Input type="number" value={form.snapshotInterval} onChange={(e) => handleChange('snapshotInterval', e.target.value)} placeholder="2000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>JWT Secret</Label>
            <Input type="password" value={form.jwtSecret} onChange={(e) => handleChange('jwtSecret', e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
