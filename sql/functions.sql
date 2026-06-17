-- =========================================================
-- FUNCTIONS.SQL — funções armazenadas para dashboards
-- =========================================================
-- Este arquivo concentra funções usadas pelo backend para montar dashboards.
-- Conceitos destacados:
-- 1) funções armazenadas PL/pgSQL;
-- 2) junções entre RESULTS, RACES e CIRCUITS;
-- 3) agregações com COUNT, SUM, MIN e MAX;
-- 4) filtros por usuário logado, enviados como parâmetro pelo backend.

-- FUNÇÃO/DASHBOARD ESCUDERIA:
-- Recebe o constructor_id da escuderia logada.
-- Retorna vitórias, quantidade de pilotos diferentes e intervalo de anos.
-- O backend passa esse parâmetro com base no id_original do usuário autenticado.
CREATE OR REPLACE FUNCTION fn_dashboard_escuderia(p_constructor_id VARCHAR)
RETURNS TABLE (
    total_vitorias   BIGINT,
    total_pilotos    BIGINT,
    primeiro_ano     INTEGER,
    ultimo_ano       INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE r.position = 1)          AS total_vitorias,
        COUNT(DISTINCT r.driver_id)                      AS total_pilotos, -- DISTINCT evita contar o mesmo piloto várias vezes
        MIN(ra.season)                                   AS primeiro_ano,
        MAX(ra.season)                                   AS ultimo_ano
    FROM results r
    JOIN races ra ON ra.race_id = r.race_id
    WHERE r.constructor_id = p_constructor_id;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO/DASHBOARD PILOTO:
-- Recebe o driver_id do piloto logado.
-- Usa JOIN com races para descobrir primeiro e último ano em que há resultados.
CREATE OR REPLACE FUNCTION fn_dashboard_piloto(p_driver_id VARCHAR)
RETURNS TABLE (
    primeiro_ano INTEGER,
    ultimo_ano   INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        MIN(ra.season) AS primeiro_ano,
        MAX(ra.season) AS ultimo_ano
    FROM results r
    JOIN races ra ON ra.race_id = r.race_id
    WHERE r.driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO/DASHBOARD PILOTO DETALHADO:
-- Para cada ano e circuito, calcula pontos, vitórias e corridas do piloto.
-- Usa GROUP BY para agrupar por temporada e circuito.
CREATE OR REPLACE FUNCTION fn_stats_piloto_por_circuito(p_driver_id VARCHAR)
RETURNS TABLE (
    ano            INTEGER,
    circuito       VARCHAR,
    total_pontos   NUMERIC,
    total_vitorias BIGINT,
    total_corridas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ra.season                              AS ano,
        c.name                                 AS circuito,
        COALESCE(SUM(r.points), 0)             AS total_pontos,   -- soma pontos; COALESCE evita retorno NULL
        COUNT(*) FILTER (WHERE r.position = 1) AS total_vitorias, -- agregação com filtro: conta apenas vitórias
        COUNT(*)                               AS total_corridas
    FROM results r
    JOIN races ra    ON ra.race_id    = r.race_id
    JOIN circuits c  ON c.circuit_id  = ra.circuit_id
    WHERE r.driver_id = p_driver_id
    GROUP BY ra.season, c.name
    ORDER BY ra.season, c.name;
END;
$$ LANGUAGE plpgsql;