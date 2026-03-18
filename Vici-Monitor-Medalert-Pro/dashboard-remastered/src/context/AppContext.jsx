import { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react'
import { loadSession, saveSession, savePage, clearSession } from '@/lib/storage'
import { wsUrl } from '@/lib/api'

/* ─── Initial state ─────────────────────────────────────────────────────────── */
const RING_MAX = 90

function makeInitialState() {
  const session = loadSession()
  return {
    page: session.token ? session.page : 'login',
    baseUrl: session.gatewayUrl,
    token: session.token,
    user: session.user,
    wsStatus: 'disconnected', // 'connecting' | 'connected' | 'unauthorized'
    latestSnapshot: null,
    recentPoints: [],
    adminSettingsCache: null,
    toasts: [],           // [{ id, type, message }]
    beepEnabled: true,
  }
}

/* ─── Reducer ───────────────────────────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.payload }

    case 'LOGIN':
      return {
        ...state,
        page: 'overview',
        token: action.payload.token,
        user: action.payload.user,
        baseUrl: action.payload.baseUrl,
      }

    case 'LOGOUT':
      return {
        ...makeInitialState(),
        baseUrl: state.baseUrl,
        token: null,
        user: null,
        page: 'login',
        wsStatus: 'disconnected',
        latestSnapshot: null,
        recentPoints: [],
      }

    case 'SET_WS_STATUS':
      return { ...state, wsStatus: action.payload }

    case 'SNAPSHOT': {
      const snap = action.payload
      const point = {
        ts: snap.ts || Date.now(),
        activeCalls: snap.summary?.activeCalls ?? 0,
        waitingCalls: snap.summary?.waitingCalls ?? 0,
        agentsOnline: snap.summary?.agentsOnline ?? 0,
      }
      const ring = [...state.recentPoints, point].slice(-RING_MAX)
      return { ...state, latestSnapshot: snap, recentPoints: ring }
    }

    case 'SET_ADMIN_SETTINGS':
      return { ...state, adminSettingsCache: action.payload }

    case 'ADD_TOAST': {
      const toast = { id: Date.now() + Math.random(), ...action.payload }
      return { ...state, toasts: [...state.toasts, toast] }
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) }

    case 'TOGGLE_BEEP':
      return { ...state, beepEnabled: !state.beepEnabled }

    default:
      return state
  }
}

/* ─── Context ───────────────────────────────────────────────────────────────── */
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, makeInitialState)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  /* ── Toast helpers ── */
  const toast = useCallback((message, type = 'info') => {
    dispatch({ type: 'ADD_TOAST', payload: { message, type } })
  }, [])

  const dismissToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  /* ── Navigation ── */
  const navigate = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', payload: page })
    savePage(page)
  }, [])

  /* ── Auth ── */
  const login = useCallback(({ token, user, baseUrl }) => {
    saveSession({ token, user, gatewayUrl: baseUrl })
    dispatch({ type: 'LOGIN', payload: { token, user, baseUrl } })
  }, [])

  const logout = useCallback(() => {
    clearSession()
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    clearTimeout(reconnectRef.current)
    dispatch({ type: 'LOGOUT' })
  }, [])

  /* ── WebSocket ── */
  const connectWs = useCallback((baseUrl, token) => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }
    const url = wsUrl(baseUrl)
    dispatch({ type: 'SET_WS_STATUS', payload: 'connecting' })
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', token }))
      dispatch({ type: 'SET_WS_STATUS', payload: 'connected' })
    }

    ws.onmessage = (evt) => {
      let msg
      try { msg = JSON.parse(evt.data) } catch { return }
      if (msg.type === 'snapshot') {
        dispatch({ type: 'SNAPSHOT', payload: msg.data ?? msg })
      } else if (msg.type === 'error' && msg.code === 'unauthorized') {
        dispatch({ type: 'SET_WS_STATUS', payload: 'unauthorized' })
        toast('Session expired — please log in again', 'error')
        logout()
      }
    }

    ws.onerror = () => {
      dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' })
    }

    ws.onclose = () => {
      dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' })
      reconnectRef.current = setTimeout(() => {
        const { token: t, baseUrl: b } = state
        if (t) connectWs(b, t)
      }, 1500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout, toast])

  /* ── Auto-connect on mount if session exists ── */
  useEffect(() => {
    if (state.token) {
      connectWs(state.baseUrl, state.token)
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      clearTimeout(reconnectRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    ...state,
    navigate,
    login,
    logout,
    connectWs,
    toast,
    dismissToast,
    dispatch,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
