from fastapi import APIRouter, Depends, HTTPException
from database import get_conn
from routes.auth import obter_usuario_atual
import psycopg2.extras

router = APIRouter(prefix="/relatorios")


def _cur(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


# ── helpers de acesso ──────────────────────────────────────
def _exige_admin(usuario):
    if usuario.get("tipo", "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")

def _exige_escuderia(usuario):
    if usuario.get("tipo", "").lower() != "escuderia":
        raise HTTPException(status_code=403, detail="Acesso restrito à escuderia.")

def _exige_piloto(usuario):
    if usuario.get("tipo", "").lower() != "piloto":
        raise HTTPException(status_code=403, detail="Acesso restrito ao piloto.")


# ── Relatório 1 — Admin ────────────────────────────────────
@router.get("/1")
def relatorio1(usuario: dict = Depends(obter_usuario_atual)):
    _exige_admin(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            # CONCEITO: chama função armazenada fn_relatorio1
            cur.execute("SELECT * FROM fn_relatorio1()")
            return {"relatorio": 1, "titulo": "Resultados por Status",
                    "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Relatório 2 — Admin ────────────────────────────────────
@router.get("/2/{cidade}")
def relatorio2(cidade: str, usuario: dict = Depends(obter_usuario_atual)):
    _exige_admin(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            # CONCEITO: chama fn_relatorio2 com parâmetro de cidade
            cur.execute("SELECT * FROM fn_relatorio2(%s)", (cidade,))
            dados = cur.fetchall()
            if not dados:
                return {"relatorio": 2, "titulo": f"Aeroportos próximos a {cidade}",
                        "dados": [], "mensagem": f"Nenhum aeroporto encontrado próximo a '{cidade}'."}
            return {"relatorio": 2, "titulo": f"Aeroportos próximos a {cidade}",
                    "dados": [dict(r) for r in dados]}
    finally:
        conn.close()


# ── Relatório 3 — Admin ────────────────────────────────────
@router.get("/3")
def relatorio3(usuario: dict = Depends(obter_usuario_atual)):
    _exige_admin(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT * FROM fn_relatorio3_nivel1()")
            nivel1 = dict(cur.fetchone())
            cur.execute("SELECT * FROM fn_relatorio3_nivel2()")
            nivel2 = [dict(r) for r in cur.fetchall()]
            return {"relatorio": 3, "titulo": "Hierarquia de Corridas",
                    "nivel1": nivel1, "nivel2": nivel2}
    finally:
        conn.close()


@router.get("/3/circuito/{circuito}")
def relatorio3_nivel3(circuito: str, usuario: dict = Depends(obter_usuario_atual)):
    _exige_admin(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT * FROM fn_relatorio3_nivel3(%s)", (circuito,))
            return {"circuito": circuito, "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Relatório 4 — Escuderia ────────────────────────────────
@router.get("/4")
def relatorio4(usuario: dict = Depends(obter_usuario_atual)):
    _exige_escuderia(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            # Busca constructor_id a partir do id_original do token
            cur.execute("SELECT constructor_id FROM constructors WHERE id = %s",
                        (usuario.get("id_original"),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")
            # CONCEITO: chama fn_relatorio4 com parâmetro
            cur.execute("SELECT * FROM fn_relatorio4(%s)", (row["constructor_id"],))
            return {"relatorio": 4, "titulo": "Pilotos com Vitórias",
                    "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Relatório 5 — Escuderia ────────────────────────────────
@router.get("/5")
def relatorio5(usuario: dict = Depends(obter_usuario_atual)):
    _exige_escuderia(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT constructor_id FROM constructors WHERE id = %s",
                        (usuario.get("id_original"),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")
            cur.execute("SELECT * FROM fn_relatorio5(%s)", (row["constructor_id"],))
            return {"relatorio": 5, "titulo": "Resultados por Status da Escuderia",
                    "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Relatório 6 — Piloto ───────────────────────────────────
@router.get("/6")
def relatorio6(usuario: dict = Depends(obter_usuario_atual)):
    _exige_piloto(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT driver_id FROM drivers WHERE id = %s",
                        (usuario.get("id_original"),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Piloto não encontrado.")
            cur.execute("SELECT * FROM fn_relatorio6(%s)", (row["driver_id"],))
            return {"relatorio": 6, "titulo": "Pontos por Ano e Corrida",
                    "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Relatório 7 — Piloto ───────────────────────────────────
@router.get("/7")
def relatorio7(usuario: dict = Depends(obter_usuario_atual)):
    _exige_piloto(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT driver_id FROM drivers WHERE id = %s",
                        (usuario.get("id_original"),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Piloto não encontrado.")
            cur.execute("SELECT * FROM fn_relatorio7(%s)", (row["driver_id"],))
            return {"relatorio": 7, "titulo": "Resultados por Status do Piloto",
                    "dados": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Busca piloto por sobrenome — Escuderia ─────────────────
@router.get("/busca-piloto/{sobrenome}")
def busca_piloto_sobrenome(sobrenome: str, usuario: dict = Depends(obter_usuario_atual)):
    _exige_escuderia(usuario)
    conn = get_conn()
    try:
        with _cur(conn) as cur:
            cur.execute("SELECT constructor_id FROM constructors WHERE id = %s",
                        (usuario.get("id_original"),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")
            constructor_id = row["constructor_id"]

            # CONCEITO: JOIN entre drivers e results filtrado por escuderia e sobrenome
            cur.execute("""
                SELECT DISTINCT
                    d.given_name || ' ' || d.family_name AS nome_completo,
                    d.dob AS data_nascimento,
                    d.nationality AS nacionalidade
                FROM drivers d
                JOIN results r ON r.driver_id = d.driver_id
                WHERE r.constructor_id = %s
                  AND LOWER(d.family_name) = LOWER(%s)
                ORDER BY nome_completo
            """, (constructor_id, sobrenome))
            dados = cur.fetchall()
            return {"dados": [dict(r) for r in dados],
                    "encontrados": len(dados)}
    finally:
        conn.close()