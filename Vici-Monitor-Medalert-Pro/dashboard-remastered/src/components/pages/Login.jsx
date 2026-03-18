import { useState } from 'react'
import { Wifi, Eye, EyeOff, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import { useApp } from '@/context/AppContext'
import { login as apiLogin, pingGateway } from '@/lib/api'
import ThemeToggle from '@/components/layout/ThemeToggle'

export default function Login() {
  const { login, connectWs, toast, baseUrl: storedUrl } = useApp()
  const [url, setUrl] = useState(storedUrl || 'http://localhost:3100')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pinging, setPinging] = useState(false)

  async function handlePing() {
    setPinging(true)
    const ok = await pingGateway(url)
    setPinging(false)
    toast(ok ? 'Gateway is reachable' : 'Gateway not reachable — check URL', ok ? 'success' : 'error')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url || !username || !password) {
      toast('Fill in all fields', 'warning')
      return
    }
    setLoading(true)
    const result = await apiLogin(url, username, password)
    setLoading(false)
    if (!result.success) {
      toast(result.error || 'Login failed', 'error')
      return
    }
    login({ token: result.token, user: result.user, baseUrl: url })
    connectWs(url, result.token)
    toast(`Welcome, ${result.user?.username ?? 'user'}`, 'success')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Theme toggle top-right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 rounded-2xl bg-primary items-center justify-center shadow-lg mx-auto">
            <Shield className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Medalert Monitor Pro</h1>
          <p className="text-sm text-muted-foreground">Sign in to your monitor dashboard</p>
        </div>

        {/* Card */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Gateway URL */}
              <div className="space-y-1.5">
                <Label htmlFor="gateway-url">Gateway URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="gateway-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://localhost:3100"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePing}
                    disabled={pinging}
                    title="Ping gateway"
                  >
                    <Wifi className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Vicidial Monitor · Gateway must be running on port 3100
        </p>
      </div>
    </div>
  )
}
