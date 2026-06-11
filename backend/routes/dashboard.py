from fastapi import APIRouter, Depends
from .auth import obter_usuario_atual

router = APIRouter()

@router.get("/dashboard")
def dashboard(usuario: dict = Depends(obter_usuario_atual)):
    tipo_usuario = usuario.get("tipo", "").lower()
    
    if tipo_usuario == "admin":
        return {
            "mensagem": "Painel do Administrador. Retornará estatísticas gerais em breve."
        }
    elif tipo_usuario == "escuderia":
        return {
            "mensagem": f"Painel da Escuderia. Retornará dados da equipe com ID {usuario.get('id_original')}."
        }
    elif tipo_usuario == "piloto":
        return {
            "mensagem": f"Painel do Piloto. Retornará estatísticas do piloto com ID {usuario.get('id_original')}."
        }
    else:
        return {
            "mensagem": "Tipo de usuário desconhecido."
        }