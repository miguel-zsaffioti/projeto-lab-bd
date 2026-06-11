import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_conn   # ← importa daqui, não do main

router = APIRouter()

class LoginRequest(BaseModel):
    login: str
    senha: str

def hash_senha(senha: str) -> str:
    return hashlib.md5(senha.encode()).hexdigest()

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
            return dict(usuario)
    finally:
        conn.close()   # ← sempre fecha, mesmo se der erro