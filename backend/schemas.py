# schemas.py
from pydantic import BaseModel
from datetime import date
from typing import Optional

class EscuderiaCreate(BaseModel):
    constructor_id: str   # Usado como referência textual e para o login
    name: str
    nationality: str      # Mudou de country_id
    wikipedia_url: Optional[str] = None

class PilotoCreate(BaseModel):
    driver_id: str        # Exigido pelo seu banco como UNIQUE NOT NULL
    driver_ref: str
    given_name: str
    family_name: str
    dob: date             # Mudou de date_of_birth
    nationality: str      # Mudou de country_id