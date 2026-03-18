import { ThemeProvider } from 'next-themes'
import { AppProvider, useApp } from '@/context/AppContext'
import Shell from '@/components/layout/Shell'
import Toast from '@/components/layout/Toast'
import Login from '@/components/pages/Login'
import Overview from '@/components/pages/Overview'
import ShiftAnalytics from '@/components/pages/ShiftAnalytics'
import Intelligence from '@/components/pages/Intelligence'
import Reports from '@/components/pages/Reports'
import Alerts from '@/components/pages/Alerts'
import AdvancedDB from '@/components/pages/AdvancedDB'
import Settings from '@/components/pages/Settings'
import { useEffect } from 'react'

function PageRouter() {
  const { page, token, navigate } = useApp()

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'overview'
      if (hash !== page) {
        navigate(hash)
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [page, navigate])

  if (!token || page === 'login') return <Login />

  const pages = {
    overview:     <Overview />,
    shift:        <ShiftAnalytics />,
    intelligence: <Intelligence />,
    reports:      <Reports />,
    alerts:       <Alerts />,
    advanced:     <AdvancedDB />,
    settings:     <Settings />,
  }

  return (
    <Shell>
      {pages[page] ?? <Overview />}
    </Shell>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="vmp-theme">
      <AppProvider>
        <PageRouter />
        <Toast />
      </AppProvider>
    </ThemeProvider>
  )
}
