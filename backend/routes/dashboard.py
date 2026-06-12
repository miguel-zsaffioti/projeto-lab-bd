from fastapi import APIRouter, Depends, HTTPException
from database import get_conn
from routes.auth import obter_usuario_atual
import psycopg2.extras

router = APIRouter()


# -------------------------------------------------------
# GET /dashboard
# Retorna dados específicos por tipo de usuário
# -------------------------------------------------------
@router.get("/dashboard")
def dashboard(usuario: dict = Depends(obter_usuario_atual)):
    tipo = usuario.get("tipo", "").lower()

    if tipo == "admin":
        return _dashboard_admin()
    elif tipo == "escuderia":
        return _dashboard_escuderia(usuario.get("id_original"))
    elif tipo == "piloto":
        return _dashboard_piloto(usuario.get("id_original"))
    else:
        raise HTTPException(status_code=403, detail="Tipo de usuário desconhecido.")


# -------------------------------------------------------
# Dashboard Admin
# -------------------------------------------------------
def _dashboard_admin():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # Totais gerais
            cur.execute("""
                SELECT
                    (SELECT COUNT(*) FROM drivers)      AS total_pilotos,
                    (SELECT COUNT(*) FROM constructors) AS total_escuderias,
                    (SELECT COUNT(*) FROM seasons)      AS total_temporadas
            """)
            totais = cur.fetchone()

            # Temporada mais recente
            cur.execute("SELECT MAX(year) AS temporada FROM seasons")
            temporada = cur.fetchone()["temporada"]

            # Corridas da temporada mais recente
            cur.execute("""
                SELECT
                    r.race_id,
                    r.race_name     AS corrida,
                    c.name          AS circuito,
                    r.race_date     AS data,
                    r.race_time     AS horario,
                    MAX(res.laps)   AS max_voltas
                FROM races r
                JOIN circuits c     ON c.circuit_id = r.circuit_id
                LEFT JOIN results res ON res.race_id = r.race_id
                WHERE r.season = %s
                GROUP BY r.race_id, r.race_name, c.name, r.race_date, r.race_time
                ORDER BY r.race_date
            """, (temporada,))
            corridas = cur.fetchall()

            # Escuderias da temporada com total de pontos
            cur.execute("""
                SELECT
                    c.name              AS escuderia,
                    SUM(cs.points)      AS total_pontos
                FROM constructor_standings cs
                JOIN constructors c ON c.constructor_id = cs.constructor_id
                WHERE cs.season = %s
                GROUP BY c.name
                ORDER BY total_pontos DESC
            """, (temporada,))
            escuderias = cur.fetchall()

            # Pilotos da temporada com total de pontos
            cur.execute("""
                SELECT
                    d.given_name || ' ' || d.family_name AS piloto,
                    SUM(ds.points)                       AS total_pontos
                FROM driver_standings ds
                JOIN drivers d ON d.driver_id = ds.driver_id
                WHERE ds.season = %s
                GROUP BY d.given_name, d.family_name
                ORDER BY total_pontos DESC
            """, (temporada,))
            pilotos = cur.fetchall()

            return {
                "tipo": "admin",
                "totais": dict(totais),
                "temporada_recente": temporada,
                "corridas": [dict(r) for r in corridas],
                "escuderias": [dict(e) for e in escuderias],
                "pilotos": [dict(p) for p in pilotos],
            }
    finally:
        conn.close()


# -------------------------------------------------------
# Dashboard Escuderia
# -------------------------------------------------------
def _dashboard_escuderia(id_original: int):
    if not id_original:
        raise HTTPException(status_code=400, detail="ID da escuderia não encontrado.")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # Busca dados da escuderia
            cur.execute(
                "SELECT constructor_id, name FROM constructors WHERE id = %s",
                (id_original,)
            )
            escuderia = cur.fetchone()
            if not escuderia:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")

            # CONCEITO: chamada de função armazenada
            cur.execute(
                "SELECT * FROM fn_dashboard_escuderia(%s)",
                (escuderia["constructor_id"],)
            )
            stats = cur.fetchone()

            return {
                "tipo": "escuderia",
                "nome": escuderia["name"],
                "total_vitorias": stats["total_vitorias"] if stats else 0,
                "total_pilotos":  stats["total_pilotos"]  if stats else 0,
                "primeiro_ano":   stats["primeiro_ano"]   if stats else None,
                "ultimo_ano":     stats["ultimo_ano"]     if stats else None,
            }
    finally:
        conn.close()


# -------------------------------------------------------
# Dashboard Piloto
# -------------------------------------------------------
def _dashboard_piloto(id_original: int):
    if not id_original:
        raise HTTPException(status_code=400, detail="ID do piloto não encontrado.")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # Busca dados do piloto
            cur.execute("""
                SELECT driver_id,
                       given_name || ' ' || family_name AS nome_completo,
                       nationality
                FROM drivers WHERE id = %s
            """, (id_original,))
            piloto = cur.fetchone()
            if not piloto:
                raise HTTPException(status_code=404, detail="Piloto não encontrado.")

            # Escuderia mais recente
            cur.execute("""
                SELECT c.name AS escuderia
                FROM results r
                JOIN constructors c ON c.constructor_id = r.constructor_id
                JOIN races ra       ON ra.race_id = r.race_id
                WHERE r.driver_id = %s
                ORDER BY ra.race_date DESC
                LIMIT 1
            """, (piloto["driver_id"],))
            esc_row = cur.fetchone()

            # CONCEITO: chamada de função armazenada
            cur.execute(
                "SELECT * FROM fn_dashboard_piloto(%s)",
                (piloto["driver_id"],)
            )
            stats = cur.fetchone()

            # Stats por ano e circuito
            cur.execute(
                "SELECT * FROM fn_stats_piloto_por_circuito(%s)",
                (piloto["driver_id"],)
            )
            stats_circuito = cur.fetchall()

            return {
                "tipo":            "piloto",
                "nome_completo":   piloto["nome_completo"],
                "nacionalidade":   piloto["nationality"],
                "escuderia_atual": esc_row["escuderia"] if esc_row else "—",
                "primeiro_ano":    stats["primeiro_ano"] if stats else None,
                "ultimo_ano":      stats["ultimo_ano"]   if stats else None,
                "stats_circuito":  [dict(s) for s in stats_circuito],
            }
    finally:
        conn.close()