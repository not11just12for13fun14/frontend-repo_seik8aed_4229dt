import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    return data
  }

  const register = async (username, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    if (!res.ok) throw new Error('Register failed')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
  }

  return { token, headers, user, setUser, login, register, logout }
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, register } = useAuth()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      onAuthed()
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-xl rounded-xl p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Chat App</h1>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg ${mode==='login'?'bg-blue-600 text-white':'bg-slate-100'}`}>Login</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg ${mode==='register'?'bg-blue-600 text-white':'bg-slate-100'}`}>Register</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode==='register' && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">Username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 mt-2">{loading? 'Please wait...' : (mode==='login'? 'Login' : 'Create account')}</button>
        </form>
      </div>
    </div>
  )
}

function ChatApp() {
  const { token, headers, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (!token) return
    const loadUsers = async () => {
      const res = await fetch(`${API_BASE}/api/users`)
      const data = await res.json()
      setUsers(data)
      if (!activeUser && data.length) setActiveUser(data[0])
    }
    loadUsers()
  }, [token])

  useEffect(() => {
    if (!token || !activeUser) return
    const load = async () => {
      const res = await fetch(`${API_BASE}/api/messages/${activeUser.id}`, { headers })
      const data = await res.json()
      setMessages(data)
      setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 100)
    }
    load()
  }, [token, activeUser])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !activeUser) return
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ receiverId: activeUser.id, message: text })
    })
    const msg = await res.json()
    setMessages(prev => [...prev, msg])
    setText('')
    setTimeout(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 50)
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[320px_1fr] bg-slate-50">
      <aside className="bg-white border-r p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Contacts</h2>
          <button onClick={logout} className="text-sm text-red-600">Logout</button>
        </div>
        <div className="space-y-2 overflow-auto">
          {users.map(u => (
            <button key={u.id} onClick={()=>setActiveUser(u)} className={`w-full flex items-center gap-3 p-3 rounded-lg border ${activeUser?.id===u.id? 'bg-blue-50 border-blue-200':'bg-white hover:bg-slate-50'}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${u.status==='online'?'bg-green-500':'bg-slate-300'}`}></span>
              <div className="text-left">
                <div className="text-sm font-medium">{u.username}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex flex-col h-[100svh] md:h-screen">
        <header className="p-4 border-b bg-white">
          <div className="font-semibold">{activeUser? activeUser.username : 'Select a contact'}</div>
        </header>
        <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-2">
          {messages.map(m => (
            <div key={m.id} className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${m.senderId===activeUser?.id ? 'bg-white border self-start' : 'bg-blue-600 text-white ml-auto'}`}>{m.message}</div>
          ))}
        </div>
        <form onSubmit={send} className="p-4 border-t bg-white flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 border rounded-lg px-3 py-2" />
          <button className="bg-blue-600 text-white px-4 rounded-lg">Send</button>
        </form>
      </main>
    </div>
  )
}

export default function App(){
  const { token } = useAuth()
  const [ready, setReady] = useState(!!token)

  useEffect(()=>{
    if (token) setReady(true)
  },[token])

  if (!ready || !token) return <AuthScreen onAuthed={()=>setReady(true)} />
  return <ChatApp />
}
