# ============================================================
# AUTENTICAÇÃO
# ============================================================
# Esta rota recebe login e senha enviados pelo frontend.
# A senha digitada não é comparada em texto puro.
# O PostgreSQL aplica crypt(senha_digitada, password_salvo)
# para comparar com o hash armazenado na tabela USERS.
# Quando o login é válido, geramos um token JWT contendo:
# userid, login, tipo e id_original.
# Esses dados serão usados nas demais rotas para controlar permissões.

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from database import get_conn
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    login: str
    senha: str

def criar_token(dados: dict):
    to_encode = dados.copy()
    expiracao = datetime.now(timezone.utc) + timedelta(hours=4)
    to_encode.update({"exp": expiracao})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def obter_usuario_atual(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente ou mal formatado")
    
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")

@router.post("/login")
def login(req: LoginRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=__import__('psycopg2').extras.RealDictCursor) as cur:
            # Consulta explícita à tabela USERS.
            # O uso de crypt(%s, password) permite validar a senha digitada
            # contra o hash salvo no banco, sem armazenar senha em texto puro.
            cur.execute(
                "SELECT * FROM users WHERE login = %s AND password = crypt(%s, password)",
                (req.login, req.senha)
            )
            usuario = cur.fetchone()
            
            if not usuario:
                raise HTTPException(status_code=401, detail="Login ou senha inválidos.")

            # Auditoria de acesso exigida no enunciado.
            # Sempre que um login é realizado com sucesso, registramos
            # o usuário, a ação LOGIN e a data/hora na tabela USERS_LOG.
            cur.execute(
                "INSERT INTO users_log (userid, acao, data_hora) VALUES (%s, 'LOGIN', %s)",
                (usuario["userid"], datetime.now())
            )
            conn.commit()

            # Esta função valida o token JWT enviado pelo frontend.
            # Ela é usada como dependência nas rotas protegidas.
            # Se o token for inválido ou estiver ausente, o acesso é negado.
            token = criar_token({
                "userid": usuario["userid"],
                "login": usuario["login"],
                "tipo": usuario.get("tipo", "comum").lower(),
                "id_original": usuario.get("id_original")
            })

            return {
                "access_token": token, 
                "token_type": "bearer",
                "usuario": {
                    "userid": usuario["userid"],
                    "login": usuario["login"],
                    "tipo": usuario.get("tipo", "comum")
                }
            }
    finally:
        conn.close()

@router.post("/logout")
def logout(usuario: dict = Depends(obter_usuario_atual)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users_log (userid, acao, data_hora) VALUES (%s, 'LOGOUT', %s)",
                (usuario["userid"], datetime.now())
            )
            conn.commit()
            return {"mensagem": "Logout registrado com sucesso no banco de dados."}
    finally:
        conn.close()

# Controle de acesso por tipo de usuário.
# Cada rota informa quais perfis podem acessá-la.
# Exemplo: apenas Admin pode cadastrar escuderias e pilotos.
def requer_permissao(tipos_permitidos: list[str]):
    def verificador(usuario: dict = Depends(obter_usuario_atual)):
        if usuario.get("tipo", "").lower() not in tipos_permitidos:
            raise HTTPException(
                status_code=403, 
                detail=f"Acesso negado. Requer privilégios de: {', '.join(tipos_permitidos)}"
            )
        return usuario
    return verificador