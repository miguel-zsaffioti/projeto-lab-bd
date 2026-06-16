from pydantic import BaseModel
from datetime import date
from typing import Optional


class EscuderiaCreate(BaseModel):
    # O PDF chama de constructor_ref.
    # O banco usa constructor_id como identificador textual da escuderia.
    constructor_ref: Optional[str] = None
    constructor_id: Optional[str] = None

    name: str
    country_id: Optional[int] = None
    wikipedia_url: Optional[str] = None

    # Mantido apenas para compatibilidade com dados antigos, se precisar.
    nationality: Optional[str] = None


class PilotoCreate(BaseModel):
    driver_ref: str
    given_name: str
    family_name: str

    # O PDF chama de date_of_birth.
    date_of_birth: Optional[date] = None

    # Mantido apenas para compatibilidade com o front antigo.
    dob: Optional[date] = None

    country_id: Optional[int] = None

    # Mantido apenas para compatibilidade com dados antigos.
    nationality: Optional[str] = None

    # O banco ainda usa driver_id como chave textual.
    driver_id: Optional[str] = None