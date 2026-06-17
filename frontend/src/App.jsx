import { useState, useEffect, useRef } from 'react'
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
  const [token, setToken]     = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(() => {
    const t = localStorage.getItem('token')
    return t ? parseJwt(t) : null
  })
  const [tela, setTela] = useState('dashboard')

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
    } catch (e) {
  console.warn('Falha ao registrar logout no servidor.', e)
    }
    localStorage.removeItem('token')
    setToken(null)
    setUsuario(null)
  }

  if (!token || !usuario) return <TelaLogin onLogin={handleLogin} />

  return (
    <div className="app">
      <Navbar usuario={usuario} tela={tela} setTela={setTela} onLogout={handleLogout} />
      <main className="main-content">
        {tela === 'dashboard' && <Dashboard token={token} usuario={usuario} />}
        {tela === 'relatorios' && <Relatorios token={token} usuario={usuario} />}
        {tela === 'acoes' && <Acoes token={token} usuario={usuario} />}
      </main>
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────
function Navbar({ usuario, tela, setTela, onLogout }) {
  const badgeMap  = { admin: 'badge-admin', escuderia: 'badge-escuderia', piloto: 'badge-piloto' }
  const tipoLabel = { admin: 'Admin', escuderia: 'Escuderia', piloto: 'Piloto' }
  const tipo = (usuario.tipo || '').toLowerCase()

  // Pilotos não têm acesso à página de ações
  const mostrarAcoes = tipo !== 'piloto'

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="f1-logo">F1</span>
        <span className="navbar-title">Ciber Track</span>
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
        {mostrarAcoes && (
          <button
            className={`tab ${tela === 'acoes' ? 'tab--active' : ''}`}
            onClick={() => setTela('acoes')}
          >Ações</button>
        )}
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
// Envia login e senha para o backend.
// Se a autenticação for válida, o backend retorna um JWT.
// O token é salvo no localStorage para manter a sessão ativa.
function TelaLogin({ onLogin }) {
  const [login, setLogin]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

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
          <h1 className="login-title">Ciber Track</h1>
          <p className="login-sub">Sistema de Gestão da Fórmula 1</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Login
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="Ex.: admin · hamilton_d · ferrari_c"
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
  const [dados, setDados] = useState(null)
  const [erro, setErro]   = useState('')
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

      <div className="cards-grid">
        <Card label="Pilotos"         valor={dados.totais?.total_pilotos}    />
        <Card label="Escuderias"      valor={dados.totais?.total_escuderias} />
        <Card label="Temporadas"      valor={dados.totais?.total_temporadas} />
        <Card label="Temporada atual" valor={dados.temporada_recente} destaque />
      </div>

      <Secao titulo={`Corridas — Temporada ${dados.temporada_recente}`}>
        <Tabela
          colunas={['Corrida', 'Circuito', 'Data', 'Horário', 'Voltas']}
          linhas={(dados.corridas || []).map(r => [
            r.corrida, r.circuito,
            r.data    ? new Date(r.data).toLocaleDateString('pt-BR') : '—',
            r.horario || '—',
            r.max_voltas ?? '—',
          ])}
        />
      </Secao>

      <div className="duas-colunas">
        <Secao titulo="Escuderias — Pontos">
          <Tabela
            colunas={['Escuderia', 'Pontos']}
            linhas={(dados.escuderias || []).map(e => [e.escuderia, e.total_pontos])}
          />
        </Secao>
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
        <Card label="Vitórias"           valor={dados.total_vitorias} />
        <Card label="Pilotos"            valor={dados.total_pilotos}  />
        <Card label="Primeira temporada" valor={dados.primeiro_ano}   />
        <Card label="Última temporada"   valor={dados.ultimo_ano}     />
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

// ═══════════════════════════════════════════════════════════
// ─── TELA DE AÇÕES ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
// Renderização condicional por perfil de usuário.
// Admin, Escuderia e Piloto visualizam telas diferentes,
// respeitando as permissões definidas no backend.
function Acoes({ token, usuario }) {
  const tipo = (usuario.tipo || '').toLowerCase()

  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">Ações</h2>
      <p className="dashboard-sub">
        {tipo === 'admin'
          ? 'Cadastro de escuderias e pilotos'
          : 'Consulta e inserção de pilotos da sua escuderia'}
      </p>

      {tipo === 'admin'    && <AcoesAdmin token={token} />}
      {tipo === 'escuderia' && <AcoesEscuderia token={token} />}
    </div>
  )
}

// ─── Ações Admin ───────────────────────────────────────────
function AcoesAdmin({ token }) {
  return (
    <div className="acoes-grid">
      <FormCadastrarEscuderia token={token} />
      <FormCadastrarPiloto    token={token} />
    </div>
  )
}

function AcoesEscuderia({ token }) {
  return (
    <div className="acoes-grid">
      <FormBuscarPiloto token={token} />
      <FormUploadPilotos token={token} />
    </div>
  )
}

// ─── Formulário: Cadastrar Escuderia (Admin) ───────────────
function FormCadastrarEscuderia({ token }) {
  const inicial = {
    constructor_ref: '',
    name: '',
    country_id: '',
    wikipedia_url: ''
  }

  const [form, setForm] = useState(inicial)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)

    try {
      const payload = {
        ...form,
        country_id: Number(form.country_id)
      }

      const res = await fetch(`${API}/acoes/admin/escuderias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        setFeedback({ ok: true, msg: data.mensagem || 'Escuderia cadastrada com sucesso!' })
        setForm(inicial)
      } else {
        setFeedback({ ok: false, msg: data.detail || 'Erro ao cadastrar escuderia.' })
      }
    } catch {
      setFeedback({ ok: false, msg: 'Não foi possível conectar ao servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="acao-card">
      <div className="acao-card-header">
        <span className="acao-icone">🏎</span>
        <div>
          <h3 className="acao-titulo">Nova Escuderia</h3>
          <p className="acao-sub">Adiciona uma entrada na tabela CONSTRUCTORS</p>
        </div>
      </div>

      <form className="acao-form" onSubmit={handleSubmit}>
        <div className="form-campo">
          <label htmlFor="esc-constructor_ref">Referência da Escuderia (constructor_ref)</label>
          <input
            id="esc-constructor_ref"
            name="constructor_ref"
            value={form.constructor_ref}
            onChange={handleChange}
            placeholder="ex: mclaren"
            required
            disabled={loading}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="esc-name">Nome</label>
          <input
            id="esc-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="ex: McLaren"
            required
            disabled={loading}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="esc-country_id">ID do País (country_id)</label>
          <input
            id="esc-country_id"
            name="country_id"
            type="number"
            value={form.country_id}
            onChange={handleChange}
            placeholder="ex: 302791"
            required
            disabled={loading}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="esc-wikipedia_url">
            URL Wikipedia <span className="opcional">(opcional)</span>
          </label>
          <input
            id="esc-wikipedia_url"
            name="wikipedia_url"
            value={form.wikipedia_url}
            onChange={handleChange}
            placeholder="https://en.wikipedia.org/wiki/…"
            disabled={loading}
          />
        </div>

        {feedback && (
          <p className={feedback.ok ? 'feedback-ok' : 'feedback-erro'}>
            {feedback.msg}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !form.constructor_ref || !form.name || !form.country_id}
        >
          {loading ? 'Cadastrando…' : 'Cadastrar Escuderia'}
        </button>
      </form>
    </div>
  )
}

// ─── Formulário: Cadastrar Piloto (Admin) ──────────────────
function FormCadastrarPiloto({ token }) {
  const inicial = {
    driver_ref: '',
    given_name: '',
    family_name: '',
    date_of_birth: '',
    country_id: ''
  }

  const [form, setForm] = useState(inicial)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)

    try {
      const payload = {
        ...form,
        country_id: Number(form.country_id)
      }

      const res = await fetch(`${API}/acoes/admin/pilotos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        setFeedback({ ok: true, msg: data.mensagem || 'Piloto cadastrado com sucesso!' })
        setForm(inicial)
      } else {
        setFeedback({ ok: false, msg: data.detail || 'Erro ao cadastrar piloto.' })
      }
    } catch {
      setFeedback({ ok: false, msg: 'Não foi possível conectar ao servidor.' })
    } finally {
      setLoading(false)
    }
  }

  const camposObrigatorios =
    form.driver_ref &&
    form.given_name &&
    form.family_name &&
    form.date_of_birth &&
    form.country_id

  return (
    <div className="acao-card">
      <div className="acao-card-header">
        <span className="acao-icone">🪖</span>
        <div>
          <h3 className="acao-titulo">Novo Piloto</h3>
          <p className="acao-sub">Adiciona uma entrada na tabela DRIVERS</p>
        </div>
      </div>

      <form className="acao-form" onSubmit={handleSubmit}>
        <div className="form-campo">
          <label htmlFor="pil-driver_ref">Referência do Piloto (driver_ref)</label>
          <input
            id="pil-driver_ref"
            name="driver_ref"
            value={form.driver_ref}
            onChange={handleChange}
            placeholder="ex: hamilton"
            required
            disabled={loading}
          />
        </div>

        <div className="form-linha-dupla">
          <div className="form-campo">
            <label htmlFor="pil-given_name">Nome</label>
            <input
              id="pil-given_name"
              name="given_name"
              value={form.given_name}
              onChange={handleChange}
              placeholder="ex: Lewis"
              required
              disabled={loading}
            />
          </div>

          <div className="form-campo">
            <label htmlFor="pil-family_name">Sobrenome</label>
            <input
              id="pil-family_name"
              name="family_name"
              value={form.family_name}
              onChange={handleChange}
              placeholder="ex: Hamilton"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-linha-dupla">
          <div className="form-campo">
            <label htmlFor="pil-date_of_birth">Data de Nascimento</label>
            <input
              id="pil-date_of_birth"
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-campo">
            <label htmlFor="pil-country_id">ID do País (country_id)</label>
            <input
              id="pil-country_id"
              name="country_id"
              type="number"
              value={form.country_id}
              onChange={handleChange}
              placeholder="ex: 302791"
              required
              disabled={loading}
            />
          </div>
        </div>

        {feedback && (
          <p className={feedback.ok ? 'feedback-ok' : 'feedback-erro'}>
            {feedback.msg}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !camposObrigatorios}
        >
          {loading ? 'Cadastrando…' : 'Cadastrar Piloto'}
        </button>
      </form>
    </div>
  )
}

// ─── Formulário: Buscar Piloto por Sobrenome (Escuderia) ───
function FormBuscarPiloto({ token }) {
  const [sobrenome, setSobrenome] = useState('')
  const [loading, setLoading]     = useState(false)
  const [resultado, setResultado] = useState(null)   // array | { mensagem }
  const [erro, setErro]           = useState('')

  async function handleBusca(e) {
    e.preventDefault()
    setErro('')
    setResultado(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ sobrenome })
      const res = await fetch(`${API}/acoes/escuderia/pilotos/busca?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.detail || 'Erro na consulta.')
      } else if (data.mensagem) {
        setResultado({ mensagem: data.mensagem })
      } else {
        setResultado(data)
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  function formatarData(iso) {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
  }

  return (
    <div className="acao-card">
      <div className="acao-card-header">
        <span className="acao-icone">🔍</span>
        <div>
          <h3 className="acao-titulo">Buscar Piloto</h3>
          <p className="acao-sub">Consulta pilotos que já correram por esta escuderia</p>
        </div>
      </div>

      <form className="acao-form" onSubmit={handleBusca}>
        <div className="form-campo">
          <label htmlFor="busca-sobrenome">Sobrenome do piloto</label>
          <input
            id="busca-sobrenome"
            value={sobrenome}
            onChange={e => setSobrenome(e.target.value)}
            placeholder="ex: Hamilton"
            required
            disabled={loading}
          />
        </div>

        {erro && <p className="feedback-erro">{erro}</p>}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !sobrenome.trim()}
        >
          {loading ? 'Buscando…' : 'Buscar Piloto'}
        </button>
      </form>

      {/* Resultado da busca */}
      {resultado && (
        <div className="acao-resultado">
          {resultado.mensagem ? (
            <p className="estado-vazio" style={{ padding: '1rem 0' }}>{resultado.mensagem}</p>
          ) : (
            <Tabela
              colunas={['Nome Completo', 'Data de Nascimento', 'Nacionalidade']}
              linhas={resultado.map(p => [
                p.nome_completo,
                formatarData(p.data_nascimento),
                p.pais_nacionalidade,
              ])}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulário: Upload de Pilotos via CSV (Escuderia) ─────
function FormUploadPilotos({ token }) {
  const [arquivo, setArquivo]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [feedback, setFeedback]   = useState(null)
  const inputRef                  = useRef(null)

  function handleArquivo(e) {
    const f = e.target.files[0]
    setArquivo(f || null)
    setFeedback(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setArquivo(f); setFeedback(null) }
  }

  function handleDragOver(e) { e.preventDefault() }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!arquivo) return
    setFeedback(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)

      const res = await fetch(`${API}/acoes/escuderia/pilotos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({
          ok: true,
          msg: `${data.mensagem} (${data.pilotos_inseridos} piloto(s) inserido(s))`,
        })
        setArquivo(null)
        if (inputRef.current) inputRef.current.value = ''
      } else {
        setFeedback({ ok: false, msg: data.detail || 'Erro ao processar arquivo.' })
      }
    } catch {
      setFeedback({ ok: false, msg: 'Não foi possível conectar ao servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="acao-card">
      <div className="acao-card-header">
        <span className="acao-icone">📂</span>
        <div>
          <h3 className="acao-titulo">Importar Pilotos</h3>
          <p className="acao-sub">Insere pilotos em lote a partir de um arquivo CSV</p>
        </div>
      </div>

      <form className="acao-form" onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          className={`dropzone ${arquivo ? 'dropzone--ativo' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleArquivo}
            disabled={loading}
          />
          {arquivo ? (
            <span className="dropzone-nome">📄 {arquivo.name}</span>
          ) : (
            <>
              <span className="dropzone-icone">⬆</span>
              <span className="dropzone-texto">Arraste o CSV ou clique para selecionar</span>
            </>
          )}
        </div>

        {/* Formato esperado */}
        <div className="formato-csv">
          <span className="formato-label">Formato esperado (sem cabeçalho):</span>
          <code className="formato-code">driver_ref, given_name, family_name, date_of_birth, country_id</code>
        </div>

        {feedback && (
          <p className={feedback.ok ? 'feedback-ok' : 'feedback-erro'}>
            {feedback.msg}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !arquivo}
        >
          {loading ? 'Enviando…' : 'Enviar Arquivo'}
        </button>
      </form>
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
