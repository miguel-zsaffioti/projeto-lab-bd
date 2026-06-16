from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from database import get_conn
from routes.auth import requer_permissao
from schemas import EscuderiaCreate, PilotoCreate
import psycopg2
import psycopg2.extras
import codecs
import csv

router = APIRouter()


def _buscar_nome_pais(cur, country_id):
    """
    Usa country_id como o PDF pede, mas mantém nationality preenchida
    para compatibilidade com as telas já existentes.
    """
    if country_id is None:
        return None

    cur.execute(
        "SELECT COALESCE(nationality, name) FROM countries WHERE id = %s",
        (country_id,)
    )
    row = cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=400,
            detail=f"country_id {country_id} não encontrado na tabela COUNTRIES."
        )

    return row[0]


@router.post("/admin/escuderias", status_code=201)
def cadastrar_escuderia(
    dados: EscuderiaCreate,
    usuario: dict = Depends(requer_permissao(["admin"]))
):
    constructor_ref = dados.constructor_ref or dados.constructor_id

    if not constructor_ref:
        raise HTTPException(
            status_code=400,
            detail="Informe constructor_ref."
        )

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            nome_pais = _buscar_nome_pais(cur, dados.country_id)

            cur.execute("""
                INSERT INTO constructors
                    (constructor_id, name, country_id, nationality, wikipedia_url)
                VALUES
                    (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                constructor_ref,
                dados.name,
                dados.country_id,
                nome_pais or dados.nationality,
                dados.wikipedia_url
            ))

            novo_id = cur.fetchone()[0]
            conn.commit()

            return {
                "mensagem": "Escuderia cadastrada com sucesso!",
                "id": novo_id
            }

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as e:
        conn.rollback()

        if e.pgcode == "23505":
            raise HTTPException(
                status_code=400,
                detail=f"A escuderia '{constructor_ref}' já existe na base."
            )

        mensagem_erro = (
            e.diag.message_primary
            if e.diag and e.diag.message_primary
            else "Erro ao cadastrar escuderia na base."
        )
        raise HTTPException(status_code=400, detail=mensagem_erro)

    finally:
        conn.close()


@router.post("/admin/pilotos", status_code=201)
def cadastrar_piloto(
    dados: PilotoCreate,
    usuario: dict = Depends(requer_permissao(["admin"]))
):
    date_of_birth = dados.date_of_birth or dados.dob
    driver_id = dados.driver_id or dados.driver_ref

    if not date_of_birth:
        raise HTTPException(
            status_code=400,
            detail="Informe date_of_birth."
        )

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            nome_pais = _buscar_nome_pais(cur, dados.country_id)

            cur.execute("""
                INSERT INTO drivers
                    (driver_id, driver_ref, given_name, family_name, country_id, nationality, dob)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                driver_id,
                dados.driver_ref,
                dados.given_name,
                dados.family_name,
                dados.country_id,
                nome_pais or dados.nationality,
                date_of_birth
            ))

            novo_id = cur.fetchone()[0]
            conn.commit()

            return {
                "mensagem": "Piloto cadastrado com sucesso!",
                "id": novo_id
            }

    except HTTPException:
        conn.rollback()
        raise

    except psycopg2.Error as e:
        conn.rollback()

        if e.pgcode == "23505":
            raise HTTPException(
                status_code=400,
                detail=f"O piloto '{dados.driver_ref}' já existe na base."
            )

        mensagem_erro = (
            e.diag.message_primary
            if e.diag and e.diag.message_primary
            else "Erro ao cadastrar piloto na base."
        )
        raise HTTPException(status_code=400, detail=mensagem_erro)

    finally:
        conn.close()


@router.get("/escuderia/pilotos/busca")
def buscar_piloto_por_sobrenome(
    sobrenome: str,
    usuario: dict = Depends(requer_permissao(["escuderia"]))
):
    id_original = usuario.get("id_original")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT constructor_id FROM constructors WHERE id = %s",
                (id_original,)
            )
            row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Escuderia não encontrada.")

            id_escuderia = row["constructor_id"]

            cur.execute("""
                SELECT DISTINCT
                    d.given_name || ' ' || d.family_name AS nome_completo,
                    d.dob AS data_nascimento,
                    COALESCE(cou.name, d.nationality) AS pais_nacionalidade
                FROM drivers d
                JOIN results r
                    ON d.driver_id = r.driver_id
                LEFT JOIN countries cou
                    ON cou.id = d.country_id
                WHERE d.family_name ILIKE %s
                  AND r.constructor_id = %s
                ORDER BY nome_completo
            """, (f"%{sobrenome}%", id_escuderia))

            pilotos = cur.fetchall()

            if not pilotos:
                return {
                    "mensagem": "Nenhum piloto com esse sobrenome correu por esta escuderia."
                }

            return [dict(p) for p in pilotos]

    finally:
        conn.close()


@router.post("/escuderia/pilotos/upload", status_code=201)
def upload_pilotos_csv(
    arquivo: UploadFile = File(...),
    usuario: dict = Depends(requer_permissao(["escuderia"]))
):
    if not arquivo.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um .csv")

    conn = get_conn()

    try:
        csv_reader = csv.reader(codecs.iterdecode(arquivo.file, "utf-8"))
        pilotos_inseridos = 0

        with conn.cursor() as cur:
            for linha in csv_reader:
                if not linha:
                    continue

                # Permite ignorar cabeçalho, caso o usuário envie com cabeçalho.
                if linha[0].strip().lower() in ("driver_ref", "driver_id"):
                    continue

                if len(linha) < 5:
                    raise HTTPException(
                        status_code=400,
                        detail="Cada linha deve conter: driver_ref, given_name, family_name, date_of_birth, country_id."
                    )

                driver_ref = linha[0].strip()
                given_name = linha[1].strip()
                family_name = linha[2].strip()
                date_of_birth = linha[3].strip()
                country_id_txt = linha[4].strip()

                try:
                    country_id = int(country_id_txt)
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"country_id inválido para o piloto {given_name} {family_name}: {country_id_txt}"
                    )

                nome_pais = _buscar_nome_pais(cur, country_id)

                cur.execute("""
                    SELECT 1
                    FROM drivers
                    WHERE LOWER(given_name) = LOWER(%s)
                      AND LOWER(family_name) = LOWER(%s)
                """, (given_name, family_name))

                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Inserção cancelada: o piloto {given_name} {family_name} já existe na base."
                    )

                cur.execute("""
                    INSERT INTO drivers
                        (driver_id, driver_ref, given_name, family_name, dob, country_id, nationality)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    driver_ref,
                    driver_ref,
                    given_name,
                    family_name,
                    date_of_birth,
                    country_id,
                    nome_pais
                ))

                pilotos_inseridos += 1

            conn.commit()

            return {
                "mensagem": "Arquivo processado com sucesso!",
                "pilotos_inseridos": pilotos_inseridos
            }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )

    finally:
        conn.close()