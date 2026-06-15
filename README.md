# SCC-541 Laboratório de Bases de Dados - Projeto Final

## Configuração do Ambiente
O projeto exige as seguintes variáveis de ambiente no arquivo `.env` localizado na raiz do projeto:

```env
DB_HOST=pgdb.icmc.usp.br
DB_PORT=5432
DB_NAME=scc541_g10_db
DB_USER=scc541_g10
DB_PASSWORD=<SUA_SENHA_AQUI>

JWT_SECRET_KEY=grupo10

VITE_API_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
```

## Instruções de Execução

1. Certifique-se de que o arquivo `.env` está configurado corretamente na raiz.
2. Como o banco de dados se encontra hospedado no servidor externo, não é necessário inicializar um contêiner de banco de dados local.
3. Execute o comando abaixo na raiz do repositório para iniciar a API e o Frontend:
   ```bash
   docker-compose up --build
   ```
4. API: `http://localhost:8000`
5. Frontend: `http://localhost:5173`
