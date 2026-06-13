# routes/acoes.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from database import get_conn
from routes.auth import obter_usuario_atual, requer_permissao
from schemas import EscuderiaCreate, PilotoCreate 
import psycopg2.extras
import codecs
import csv

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
    id_original = usuario.get("id_original")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Resolve o constructor_id real a partir do id surrogate (mesmo padrão do dashboard)
            cur.execute("SELECT constructor_id FROM constructors WHERE id = %s", (id_original,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")
            id_escuderia = row["constructor_id"]

            cur.execute("""
                SELECT DISTINCT 
                    d.given_name || ' ' || d.family_name AS nome_completo,
                    d.dob AS data_nascimento,
                    d.nationality AS pais_nacionalidade
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

@router.post("/escuderia/pilotos/upload", status_code=201)
def upload_pilotos_csv(
    arquivo: UploadFile = File(...),
    usuario: dict = Depends(requer_permissao(["escuderia"]))
):
    # Trava de segurança para aceitar apenas CSV
    if not arquivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um .csv")

    conn = get_conn()
    try:
        # Lendo o arquivo em memória e decodificando
        csv_reader = csv.reader(codecs.iterdecode(arquivo.file, 'utf-8'))
        
        pilotos_inseridos = 0

        with conn.cursor() as cur:
            for linha in csv_reader:
                # Pula linhas vazias ou mal formatadas
                if len(linha) < 5:
                    continue
                
                # O PDF pede a ordem: driver_ref, given_name, family_name, date_of_birth, country_id
                driver_ref = linha[0].strip()
                given_name = linha[1].strip()
                family_name = linha[2].strip()
                dob = linha[3].strip()
                nationality = linha[4].strip()

                # REGRA DO ENUNCIADO: Verificar se o piloto já existe pelo nome e sobrenome
                cur.execute("""
                    SELECT 1 FROM drivers 
                    WHERE given_name ILIKE %s AND family_name ILIKE %s
                """, (given_name, family_name))
                
                if cur.fetchone():
                    # Se achar, cancela TUDO dando um rollback automático ao subir a exceção
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Inserção cancelada: O piloto {given_name} {family_name} já existe na base."
                    )

                # Como o seu banco exige a coluna 'driver_id' (que é UNIQUE NOT NULL), 
                # vamos usar o próprio driver_ref para preencher ela e não quebrar o banco.
                cur.execute("""
                    INSERT INTO drivers (driver_id, driver_ref, given_name, family_name, dob, nationality)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (driver_ref, driver_ref, given_name, family_name, dob, nationality))
                
                pilotos_inseridos += 1
            
            # Se o loop terminar sem esbarrar em nenhum piloto repetido, ele salva no banco
            conn.commit()
            
            return {
                "mensagem": "Arquivo processado com sucesso!", 
                "pilotos_inseridos": pilotos_inseridos
            }
            
    except HTTPException as e:
        # Repassa o erro 400 de piloto duplicado para a interface
        conn.rollback()
        raise e
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")
    finally:
        conn.close()