import os
import hashlib
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

def hash_senha(senha: str) -> str:
    return hashlib.md5(senha.encode()).hexdigest()

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
            cur.execute(
                "SELECT * FROM users WHERE login = %s AND password = %s",
                (req.login, hash_senha(req.senha))
            )
            usuario = cur.fetchone()
            
            if not usuario:
                raise HTTPException(status_code=401, detail="Login ou senha inválidos.")

            cur.execute(
                "INSERT INTO users_log (userid, acao, data_hora) VALUES (%s, 'LOGIN', %s)",
                (usuario["userid"], datetime.now())
            )
            conn.commit()

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