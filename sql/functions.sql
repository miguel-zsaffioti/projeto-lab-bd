-- =========================================================
-- SCC-541 Lab BD — Funções Armazenadas para Dashboard
-- CONCEITO: procedimentos e funções com parâmetros
-- =========================================================

-- -------------------------------------------------------
-- fn_dashboard_escuderia
-- Retorna vitórias, pilotos distintos e período de atividade
-- CONCEITO: função com parâmetro; agregação sobre RESULTS
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_dashboard_escuderia(p_constructor_id VARCHAR)
RETURNS TABLE (
    total_vitorias   BIGINT,
    total_pilotos    BIGINT,
    primeiro_ano     INTEGER,
    ultimo_ano       INTEGER
) AS $$
BEGIN
    -- CONCEITO: JOINs e agregações para calcular estatísticas
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE r.position = 1)          AS total_vitorias,
        COUNT(DISTINCT r.driver_id)                      AS total_pilotos,
        MIN(ra.season)                                   AS primeiro_ano,
        MAX(ra.season)                                   AS ultimo_ano
    FROM results r
    JOIN races ra ON ra.race_id = r.race_id
    WHERE r.constructor_id = p_constructor_id;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- fn_dashboard_piloto
-- Retorna período de atividade do piloto
-- CONCEITO: função com parâmetro; agregação sobre RESULTS
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- fn_stats_piloto_por_circuito
-- Para cada ano e circuito em que o piloto correu:
--   pontos obtidos, vitórias e total de corridas
-- CONCEITO: função com parâmetro; JOIN múltiplo + GROUP BY
-- Usada na tela de dashboard do piloto (detalhe)
-- -------------------------------------------------------
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
        COALESCE(SUM(r.points), 0)             AS total_pontos,
        COUNT(*) FILTER (WHERE r.position = 1) AS total_vitorias,
        COUNT(*)                               AS total_corridas
    FROM results r
    JOIN races ra    ON ra.race_id    = r.race_id
    JOIN circuits c  ON c.circuit_id  = ra.circuit_id
    WHERE r.driver_id = p_driver_id
    GROUP BY ra.season, c.name
    ORDER BY ra.season, c.name;
END;
$$ LANGUAGE plpgsql;
