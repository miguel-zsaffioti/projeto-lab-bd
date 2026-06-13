# routes/acoes.py
from fastapi import APIRouter, Depends, HTTPException
from database import get_conn
from .auth import obter_usuario_atual, requer_permissao
from schemas import EscuderiaCreate, PilotoCreate
import psycopg2.extras

router = APIRouter()

@router.post("/admin/escuderias", status_code=201)
def cadastrar_escuderia(
    dados: EscuderiaCreate, 
    usuario: dict = Depends(requer_permissao(["admin"]))
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Colunas idênticas ao seu DDL
            cur.execute("""
                INSERT INTO constructors (constructor_id, name, nationality, wikipedia_url)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (dados.constructor_id, dados.name, dados.nationality, dados.wikipedia_url))
            
            novo_id = cur.fetchone()[0]
            conn.commit()
            return {"mensagem": "Escuderia cadastrada com sucesso!", "id": novo_id}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Erro. Constructor ID já existe na base.")
    finally:
        conn.close()


@router.post("/admin/pilotos", status_code=201)
def cadastrar_piloto(
    dados: PilotoCreate, 
    usuario: dict = Depends(requer_permissao(["admin"]))
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Colunas idênticas ao seu DDL
            cur.execute("""
                INSERT INTO drivers (driver_id, driver_ref, given_name, family_name, nationality, dob)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (dados.driver_id, dados.driver_ref, dados.given_name, dados.family_name, dados.nationality, dados.dob))
            
            novo_id = cur.fetchone()[0]
            conn.commit()
            return {"mensagem": "Piloto cadastrado com sucesso!", "id": novo_id}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Erro. Driver ID já existe na base.")
    finally:
        conn.close()


# -------------------------------------------------------
# AÇÕES DA ESCUDERIA
# -------------------------------------------------------

@router.get("/escuderia/pilotos/busca")
def buscar_piloto_por_sobrenome(
    sobrenome: str, 
    usuario: dict = Depends(requer_permissao(["escuderia"])) # <-- TRAVA AQUI
):
    id_escuderia = usuario.get("id_original")
    
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT DISTINCT 
                    d.given_name || ' ' || d.family_name AS nome_completo,
                    d.date_of_birth AS data_nascimento,
                    d.country_id AS pais_nacionalidade
                FROM drivers d
                JOIN results r ON d.driver_id = r.driver_id
                WHERE d.family_name ILIKE %s 
                  AND r.constructor_id = %s
            """, (f"%{sobrenome}%", id_escuderia))
            
            pilotos = cur.fetchall()
            
            if not pilotos:
                return {"mensagem": "Nenhum piloto com esse sobrenome correu por esta escuderia."}
                
            return [dict(p) for p in pilotos]
    finally:
        conn.close()