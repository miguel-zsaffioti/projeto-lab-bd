// ============================================================
// TELA DE RELATÓRIOS
// ============================================================
// Exibe relatórios diferentes conforme o tipo do usuário logado.
 // Admin acessa R1, R2 e R3.
 // Escuderia acessa R4, R5 e busca por sobrenome.
 // Piloto acessa R6 e R7.

import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Componente principal de Relatórios ─────────────────────
export default function Relatorios({ token, usuario }) {
  const tipo = (usuario.tipo || '').toLowerCase()
  const [aberto, setAberto] = useState(null)   // número do relatório aberto
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Input para relatório 2 (cidade) e 3 (circuito drill-down)
  const [cidade, setCidade] = useState('')
  const [circuito, setCircuito] = useState(null)
  const [nivel3, setNivel3] = useState(null)

  // Input para busca de piloto por sobrenome (escuderia)
  const [sobrenome, setSobrenome] = useState('')

  async function buscar(endpoint) {
    setLoading(true)
    setErro('')
    setDados(null)
    setNivel3(null)

    try {
      const res = await fetch(`${API}/relatorios/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const json = await res.json()

      if (!res.ok) {
        setErro(json.detail || 'Erro ao buscar relatório.')
        return
      }

      setDados(json)
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  async function buscarNivel3(circ) {
    setNivel3(null)
    setCircuito(circ)

    try {
      const res = await fetch(
        `${API}/relatorios/3/circuito/${encodeURIComponent(circ)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const json = await res.json()

      if (!res.ok) {
        setErro(json.detail || 'Erro ao buscar detalhes do circuito.')
        return
      }

      setNivel3(json.dados ?? [])
    } catch {
      setErro('Erro de conexão ao buscar detalhes do circuito.')
    }
  }

  function abrirRelatorio(num) {
    setAberto(num)
    setDados(null)
    setErro('')
    setNivel3(null)
    setCidade('')
    setSobrenome('')

    // Relatórios sem input: busca imediato
    if ([1, 3, 4, 5, 6, 7].includes(num)) buscar(String(num))
  }

  function fechar() {
    setAberto(null)
    setDados(null)
    setErro('')
  }

  const relatoriosPorTipo = {
    admin: [
      { num: 1, nome: 'Resultados por status' },
      { num: 2, nome: 'Aeroportos próximos a uma cidade' },
      { num: 3, nome: 'Hierarquia de corridas' },
    ],
    escuderia: [
      { num: 4, nome: 'Pilotos com vitórias' },
      { num: 5, nome: 'Resultados por status da escuderia' },
      { num: 'busca', nome: 'Buscar piloto por sobrenome' },
    ],
    piloto: [
      { num: 6, nome: 'Pontos por ano e corrida' },
      { num: 7, nome: 'Resultados por status' },
    ],
  }

  const lista = relatoriosPorTipo[tipo] || []

  return (
    <div className="dashboard">
      <h2 className="dashboard-titulo">Relatórios</h2>

      {/* Lista de relatórios */}
      {!aberto && (
        <div className="relatorios-lista">
          {lista.map(r => (
            <div
              key={r.num}
              className="relatorio-card"
              onClick={() => abrirRelatorio(r.num)}
              style={{ cursor: 'pointer' }}
            >
              <span className="relatorio-num">R{r.num}</span>
              <span className="relatorio-nome">{r.nome}</span>
              <span className="btn-secondary">Abrir →</span>
            </div>
          ))}
        </div>
      )}

      {/* Relatório aberto */}
      {aberto && (
        <div>
          <button
            className="btn-secondary"
            onClick={fechar}
            style={{ marginBottom: '1.5rem' }}
          >
            ← Voltar aos relatórios
          </button>

          {/* R2: input cidade */}
          {aberto === 2 && (
            <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem' }}>
              <input
                className="input-busca"
                placeholder="Nome da cidade brasileira..."
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  cidade &&
                  buscar(`2/${encodeURIComponent(cidade)}`)
                }
              />

              <button
                className="btn-primary"
                onClick={() => cidade && buscar(`2/${encodeURIComponent(cidade)}`)}
                disabled={!cidade || loading}
              >
                Buscar
              </button>
            </div>
          )}

          {/* Busca por sobrenome */}
          {aberto === 'busca' && (
            <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem' }}>
              <input
                className="input-busca"
                placeholder="Sobrenome do piloto..."
                value={sobrenome}
                onChange={e => setSobrenome(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  sobrenome &&
                  buscar(`busca-piloto/${encodeURIComponent(sobrenome)}`)
                }
              />

              <button
                className="btn-primary"
                onClick={() =>
                  sobrenome &&
                  buscar(`busca-piloto/${encodeURIComponent(sobrenome)}`)
                }
                disabled={!sobrenome || loading}
              >
                Buscar
              </button>
            </div>
          )}

          {loading && <p className="estado-vazio carregando">Carregando...</p>}

          {erro && (
            <p className="estado-vazio" style={{ color: '#ff6b6b' }}>
              {erro}
            </p>
          )}

          {/* Resultados */}
          {dados && !loading && (
            <div>
              <h3 className="secao-titulo" style={{ marginBottom: '1rem' }}>
                {dados.titulo || `Relatório ${aberto}`}
              </h3>

              {/* R1, R4, R5, R6, R7: tabela simples */}
              {[1, 4, 5, 6, 7].includes(aberto) && (
                <TabelaRelatorio dados={dados.dados} />
              )}

              {/* Busca por sobrenome */}
              {aberto === 'busca' && (
                dados.encontrados === 0
                  ? (
                    <p className="estado-vazio">
                      Nenhum piloto encontrado com esse sobrenome nesta escuderia.
                    </p>
                  )
                  : (
                    <TabelaRelatorio dados={dados.dados} />
                  )
              )}

              {/* R2: tabela com distância */}
              {aberto === 2 && (
                dados.dados?.length === 0
                  ? (
                    <p className="estado-vazio">{dados.mensagem}</p>
                  )
                  : (
                    <TabelaRelatorio dados={dados.dados} />
                  )
              )}

              {/* R3: hierarquia com drill-down */}
              {aberto === 3 && (
                <div>
                  <div className="cards-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="card">
                      <span className="card-valor">
                        {dados.nivel1?.total_corridas}
                      </span>
                      <span className="card-label">Total de Corridas</span>
                    </div>

                    <div className="card">
                      <span className="card-valor">
                        {dados.nivel1?.total_escuderias}
                      </span>
                      <span className="card-label">Total de Escuderias</span>
                    </div>
                  </div>

                  {/* Lista de escuderias com quantidade de pilotos */}
                  <h4 className="secao-titulo" style={{ marginBottom: '.75rem' }}>
                    Escuderias cadastradas
                  </h4>

                  <TabelaRelatorio dados={dados.escuderias} />

                  <h4
                    className="secao-titulo"
                    style={{ marginTop: '1.5rem', marginBottom: '.75rem' }}
                  >
                    Corridas por circuito
                  </h4>

                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '.82rem',
                      marginBottom: '.75rem'
                    }}
                  >
                    Clique em um circuito para ver o detalhamento das corridas.
                  </p>

                  <div className="tabela-wrapper">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th>Circuito</th>
                          <th>Corridas</th>
                          <th>Mín. Voltas</th>
                          <th>Média Voltas</th>
                          <th>Máx. Voltas</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(dados.nivel2 || []).map((r, i) => (
                          <tr
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onClick={() => buscarNivel3(r.circuito)}
                          >
                            <td style={{ color: 'var(--red)' }}>{r.circuito}</td>
                            <td>{r.total_corridas}</td>
                            <td>{r.min_voltas ?? '—'}</td>
                            <td>{r.media_voltas ?? '—'}</td>
                            <td>{r.max_voltas ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Drill-down nível 3 — Modal */}
                  {circuito && nivel3 !== null && (
                    <Modal
                      titulo={circuito}
                      dados={nivel3}
                      onFechar={() => {
                        setCircuito(null)
                        setNivel3(null)
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tabela genérica ────────────────────────────────────────
function TabelaRelatorio({ dados }) {
  if (!dados || dados.length === 0) {
    return <p className="estado-vazio">Nenhum resultado encontrado.</p>
  }

  const colunas = Object.keys(dados[0])

  const label = {
    status: 'Status',
    quantidade: 'Quantidade',
    piloto: 'Piloto',
    total_vitorias: 'Vitórias',
    ano: 'Ano',
    total_pontos_ano: 'Total no Ano',
    corrida: 'Corrida',
    circuito: 'Circuito',
    pontos: 'Pontos',
    posicao: 'Posição',
    cidade_pesquisada: 'Cidade',
    iata_code: 'IATA',
    aeroporto_nome: 'Aeroporto',
    municipio: 'Município',
    distancia_km: 'Distância (km)',
    tipo: 'Tipo',
    nome_completo: 'Nome',
    data_nascimento: 'Nascimento',
    nacionalidade: 'Nacionalidade',
    temporada: 'Temporada',
    voltas: 'Voltas',
    total_pilotos: 'Pilotos',
    escuderia: 'Escuderia',
  }

  return (
    <div className="tabela-wrapper">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map(c => (
              <th key={c}>{label[c] || c}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {dados.map((row, i) => (
            <tr key={i}>
              {colunas.map(c => (
                <td key={c}>
                  {c === 'data_nascimento' && row[c]
                    ? new Date(row[c]).toLocaleDateString('pt-BR')
                    : row[c] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Modal({ titulo, dados, onFechar }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: 'var(--surface, #1a1a1a)',
          border: '1px solid var(--border, #333)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '1.5rem'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}
        >
          <h4 className="secao-titulo" style={{ margin: 0 }}>
            {titulo} — Corridas
          </h4>

          <button className="btn-secondary" onClick={onFechar}>
            ✕ Fechar
          </button>
        </div>

        <TabelaRelatorio dados={dados} />
      </div>
    </div>
  )
}