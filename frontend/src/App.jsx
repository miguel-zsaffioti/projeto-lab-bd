import { useState, useEffect } from 'react'

function App() {
  const [loginStr, setLoginStr] = useState('')
  const [senha, setSenha] = useState('')
  
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [dashboardMsg, setDashboardMsg] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (token) {
      fetchDashboard(token)
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setErro('')
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, senha })
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.detail || 'Erro ao fazer login')
        return
      }

      setToken(data.access_token)
      localStorage.setItem('token', data.access_token)
    } catch (error) {
      setErro('Erro de conexão com a API')
    }
  }

  const fetchDashboard = async (currentToken) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/dashboard', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      })
      
      const data = await res.json()

      if (res.ok) {
        setDashboardMsg(data.mensagem)
      } else {
        handleLogoutLocal()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:8000/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (error) {
      console.error(error)
    } finally {
      handleLogoutLocal()
    }
  }

  const handleLogoutLocal = () => {
    setToken(null)
    setDashboardMsg('')
    setLoginStr('')
    setSenha('')
    localStorage.removeItem('token')
  }

  if (token) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h2>Painel Principal</h2>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <p><strong>Mensagem do Backend:</strong> {dashboardMsg}</p>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Fazer Logout
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '300px', margin: '0 auto' }}>
      <h2>Login do Sistema</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="text"
          placeholder="Seu Login"
          value={loginStr}
          onChange={(e) => setLoginStr(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Sua Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Entrar
        </button>
      </form>
      {erro && <p style={{ color: 'red', marginTop: '15px' }}>{erro}</p>}
    </div>
  )
}

export default App