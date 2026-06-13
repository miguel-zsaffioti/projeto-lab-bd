import { useState, useEffect } from 'react'
import './App.css'
import Relatorios from './Relatorios' 

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// ─── App root ──────────────────────────────────────────────
export default function App() {
  const [token, setToken]       = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario]   = useState(() => {
    const t = localStorage.getItem('token')
    return t ? parseJwt(t) : null
  })
  const [tela, setTela]         = useState('dashboard') 

  function handleLogin(novoToken) {
    localStorage.setItem('token', novoToken)
    setToken(novoToken)
    setUsuario(parseJwt(novoToken))
    setTela('dashboard')
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {}
    localStorage.removeItem('token')
    setToken(null)
    setUsuario(null)
  }

  if (!token || !usuario) return <TelaLogin onLogin={handleLogin} />

  return (
    <div className="app">
      <Navbar usuario={usuario} tela={tela} setTela={setTela} onLogout={handleLogout} />
      <main className="main-content">
        {tela === 'dashboard'   && <Dashboard token={token} usuario={usuario} />}
        {tela === 'relatorios'  && <Relatorios token={token} usuario={usuario} />}
      </main>
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────
function Navbar({ usuario, tela, setTela, onLogout }) {
  const badgeMap = { admin: 'badge-admin', escuderia: 'badge-escuderia', piloto: 'badge-piloto' }
  const tipoLabel = { admin: 'Admin', escuderia: 'Escuderia', piloto: 'Piloto' }
  const tipo = (usuario.tipo || '').toLowerCase()

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="f1-logo">F1</span>
        <span className="navbar-title">Pit Lane</span>
      </div>
      <div className="navbar-tabs">
        <button
          className={`tab ${tela === 'dashboard' ? 'tab--active' : ''}`}
          onClick={() => setTela('dashboard')}
        >Dashboard</button>
        <button
          className={`tab ${tela === 'relatorios' ? 'tab--active' : ''}`}
          onClick={() => setTela('relatorios')}
        >Relatórios</button>
      </div>
      <div className="navbar-user">
        <span className={`badge ${badgeMap[tipo] || ''}`}>{tipoLabel[tipo] || tipo}</span>
        <span className="navbar-login">{usuario.login}</span>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>
    </nav>
  )
}

// ─── Tela Login ────────────────────────────────────────────
function TelaLogin({ onLogin }) {
  const [login, setLogin]       = useState('')
  const [senha, setSenha]       = useState('')
  const [erro, setErro]         = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.detail || 'Credenciais inválidas.'); return }
      onLogin(data.access_token)
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="f1-logo f1-logo--lg">F1</span>
          <h1 className="login-title">Pit Lane</h1>
          <p className="login-sub">Sistema de Gestão — Fórmula 1 FIA</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Login
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="admin · hamilton_d · ferrari_c"
              required
              disabled={loading}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </label>
          {erro && <p className="login-erro">{erro}</p>}
          <button type="submit" className="btn-primary" disabled={loading || !login || !senha}>
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Dashboard (despacha por tipo) ─────────────────────────
function Dashboard({ token, usuario }) {
  const [dados, setDados]   = useState(null)
  const [erro, setErro]     = useState('')
  const tipo = (usuario.tipo || '').toLowerCase()

  useEffect(() => {
    fetch(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.detail) setErro(d.detail)
        else setDados(d)
      })
      .catch(() => setErro('Erro ao carregar dashboard.'))
  }, [token])

  if (erro)   return <div className="estado-vazio">{erro}</div>
  if (!dados) return <div className="estado-vazio carregando">Carregando...</div>

  if (tipo === 'admin')     return <DashboardAdmin dados={dados} />
  if (tipo === 'escuderia') return <DashboardEscuderia dados={dados} />
  if (tipo === 'piloto')    return <DashboardPiloto dados={dados} />
  return <div className="estado-vazio">Tipo de usuário desconhecido.</div>
}

// ─── Dashboard Admin ───────────────────────────────────────
function DashboardAdmin({ dados }) {
  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">Painel do Administrador</h2>

      {/* Cards de totais */}
      <div className="cards-grid">
        <Card label="Pilotos"     valor={dados.totais?.total_pilotos}     />
        <Card label="Escuderias"  valor={dados.totais?.total_escuderias}  />
        <Card label="Temporadas"  valor={dados.totais?.total_temporadas}  />
        <Card label="Temporada atual" valor={dados.temporada_recente} destaque />
      </div>

      {/* Corridas da temporada */}
      <Secao titulo={`Corridas — Temporada ${dados.temporada_recente}`}>
        <Tabela
          colunas={['Corrida', 'Circuito', 'Data', 'Horário', 'Voltas']}
          linhas={(dados.corridas || []).map(r => [
            r.corrida, r.circuito,
            r.data     ? new Date(r.data).toLocaleDateString('pt-BR') : '—',
            r.horario  || '—',
            r.max_voltas ?? '—',
          ])}
        />
      </Secao>

      <div className="duas-colunas">
        {/* Escuderias */}
        <Secao titulo="Escuderias — Pontos">
          <Tabela
            colunas={['Escuderia', 'Pontos']}
            linhas={(dados.escuderias || []).map(e => [e.escuderia, e.total_pontos])}
          />
        </Secao>

        {/* Pilotos */}
        <Secao titulo="Pilotos — Pontos">
          <Tabela
            colunas={['Piloto', 'Pontos']}
            linhas={(dados.pilotos || []).map(p => [p.piloto, p.total_pontos])}
          />
        </Secao>
      </div>
    </div>
  )
}

// ─── Dashboard Escuderia ───────────────────────────────────
function DashboardEscuderia({ dados }) {
  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">{dados.nome}</h2>
      <p className="dashboard-sub">Escuderia</p>
      <div className="cards-grid">
        <Card label="Vitórias"       valor={dados.total_vitorias} />
        <Card label="Pilotos"        valor={dados.total_pilotos}  />
        <Card label="Primeira temporada" valor={dados.primeiro_ano} />
        <Card label="Última temporada"   valor={dados.ultimo_ano}   />
      </div>
    </div>
  )
}

// ─── Dashboard Piloto ──────────────────────────────────────
function DashboardPiloto({ dados }) {
  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">{dados.nome_completo}</h2>
      <p className="dashboard-sub">
        {dados.escuderia_atual} &nbsp;·&nbsp; {dados.nacionalidade}
      </p>
      <div className="cards-grid">
        <Card label="Primeira temporada" valor={dados.primeiro_ano} />
        <Card label="Última temporada"   valor={dados.ultimo_ano}   />
      </div>

      <Secao titulo="Desempenho por temporada e circuito">
        <Tabela
          colunas={['Ano', 'Circuito', 'Pontos', 'Vitórias', 'Corridas']}
          linhas={(dados.stats_circuito || []).map(s => [
            s.ano, s.circuito, s.total_pontos, s.total_vitorias, s.total_corridas,
          ])}
        />
      </Secao>
    </div>
  )
}

// ─── Componentes reutilizáveis ─────────────────────────────
function Card({ label, valor, destaque }) {
  return (
    <div className={`card ${destaque ? 'card--destaque' : ''}`}>
      <span className="card-valor">{valor ?? '—'}</span>
      <span className="card-label">{label}</span>
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <section className="secao">
      <h3 className="secao-titulo">{titulo}</h3>
      {children}
    </section>
  )
}

function Tabela({ colunas, linhas }) {
  if (!linhas || linhas.length === 0) {
    return <p className="estado-vazio">Nenhum dado encontrado.</p>
  }
  return (
    <div className="tabela-wrapper">
      <table className="tabela">
        <thead>
          <tr>{colunas.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i}>
              {linha.map((cel, j) => <td key={j}>{cel ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}