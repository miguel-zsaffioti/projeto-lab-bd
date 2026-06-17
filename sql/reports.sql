-- =========================================================
-- REPORTS.SQL — views, índices e funções dos relatórios
-- =========================================================
-- Este arquivo implementa os relatórios pedidos no enunciado.
-- Conceitos destacados:
-- 1) ÍNDICES: aceleram filtros, junções e agrupamentos.
-- 2) VISÕES: centralizam joins reutilizados por vários relatórios.
-- 3) FUNÇÕES: encapsulam cada relatório em SQL explícito.
-- 4) CONSULTAS: usam JOIN, LEFT JOIN, CROSS JOIN, GROUP BY, filtros,
--    agregações e função janela.

-- =========================================================
-- ÍNDICES DOS RELATÓRIOS
-- =========================================================

-- Relatório 1 e 5: filtros e contagens por status
-- ÍNDICE: status é usado em GROUP BY nos relatórios 1, 5 e 7.
CREATE INDEX IF NOT EXISTS idx_results_status         ON results (status);
-- Relatório 2: busca de aeroportos por país e tipo
-- ÍNDICE: Relatório 2 filtra aeroportos brasileiros por country_code
-- e por tipo de aeroporto.
CREATE INDEX IF NOT EXISTS idx_airports_country_type  ON airports (country_code, airport_type_id);
-- ÍNDICE: Relatório 2 busca cidades brasileiras por nome.
CREATE INDEX IF NOT EXISTS idx_cities_country_name    ON cities (country_code, name);
-- Relatório 4 e 6: filtros por driver_id e position
-- ÍNDICE: usado em relatórios do piloto e em contagens de vitórias.
CREATE INDEX IF NOT EXISTS idx_results_driver_position ON results (driver_id, position);
-- Relatório 3 e 6: joins entre races e results
-- ÍNDICE: usado no Relatório 3 para agrupar corridas por circuito.
CREATE INDEX IF NOT EXISTS idx_races_circuit          ON races (circuit_id);

-- =========================================================
-- VIEWS 
-- =========================================================

-- VISÃO: junta resultados, corridas, circuitos, pilotos e escuderias.
-- Justificativa: vários relatórios precisam dos mesmos JOINs; a view evita
-- repetição e deixa as funções mais legíveis.
CREATE OR REPLACE VIEW vw_resultados_completos AS
SELECT
    r.id, r.race_id, r.driver_id, r.constructor_id,
    r.position, r.points, r.laps, r.status, r.grid,
    ra.season, ra.round, ra.race_name, ra.race_date, ra.circuit_id,
    c.name   AS circuito_nome,
    d.given_name AS piloto_nome,
    d.family_name AS piloto_sobrenome,
    d.given_name || ' ' || d.family_name AS piloto_completo,
    con.name AS escuderia_nome
FROM results r
JOIN races ra        ON ra.race_id        = r.race_id
JOIN circuits c      ON c.circuit_id      = ra.circuit_id
JOIN drivers d       ON d.driver_id       = r.driver_id
JOIN constructors con ON con.constructor_id = r.constructor_id;

-- VISÃO: pré-filtra aeroportos brasileiros dos tipos medium/large.
-- Justificativa: simplifica o Relatório 2 e deixa o filtro de tipo em um só lugar.
CREATE OR REPLACE VIEW vw_aeroportos_brasil AS
SELECT
    a.id, a.name AS aeroporto_nome, a.iata_code,
    a.latitude_deg, a.longitude_deg, a.municipality,
    at.type AS tipo
FROM airports a
JOIN airport_types at ON at.id = a.airport_type_id
WHERE a.country_code = 'BR'
  AND at.type IN ('medium_airport', 'large_airport');

-- =========================================================
-- RELATÓRIO 1 — Admin: resultados por status
-- =========================================================
-- FUNÇÃO RELATÓRIO 1:
-- Admin: conta resultados por status.
-- Usa GROUP BY + COUNT para produzir uma visão geral da base.
CREATE OR REPLACE FUNCTION fn_relatorio1()
RETURNS TABLE (status TEXT, quantidade BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.status::TEXT, COUNT(*) FROM results r
    GROUP BY r.status ORDER BY quantidade DESC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 2 — Admin: aeroportos até 100km de uma cidade
-- =========================================================
-- FUNÇÃO RELATÓRIO 2:
-- Admin: recebe o nome de uma cidade brasileira e retorna aeroportos
-- medium/large até 100 km. Usa CROSS JOIN com a view de aeroportos e
-- fórmula geográfica com latitude/longitude para calcular distância.
CREATE OR REPLACE FUNCTION fn_relatorio2(p_nome_cidade VARCHAR)
RETURNS TABLE (
    cidade_pesquisada VARCHAR, iata_code VARCHAR,
    aeroporto_nome VARCHAR, municipio VARCHAR,
    distancia_km NUMERIC, tipo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.name AS cidade_pesquisada,
        ab.iata_code,
        ab.aeroporto_nome,
        ab.municipality AS municipio,
        ROUND((6371 * ACOS(LEAST(1.0,
            COS(RADIANS(ci.latitude::FLOAT)) * COS(RADIANS(ab.latitude_deg::FLOAT))
            * COS(RADIANS(ab.longitude_deg::FLOAT) - RADIANS(ci.longitude::FLOAT))
            + SIN(RADIANS(ci.latitude::FLOAT)) * SIN(RADIANS(ab.latitude_deg::FLOAT))
        )))::NUMERIC, 2) AS distancia_km,
        ab.tipo
    FROM cities ci
    CROSS JOIN vw_aeroportos_brasil ab
    WHERE ci.country_code = 'BR'
      AND LOWER(ci.name) = LOWER(p_nome_cidade)
      AND 6371 * ACOS(LEAST(1.0,
            COS(RADIANS(ci.latitude::FLOAT)) * COS(RADIANS(ab.latitude_deg::FLOAT))
            * COS(RADIANS(ab.longitude_deg::FLOAT) - RADIANS(ci.longitude::FLOAT))
            + SIN(RADIANS(ci.latitude::FLOAT)) * SIN(RADIANS(ab.latitude_deg::FLOAT))
          )) <= 100
    ORDER BY ci.name, distancia_km;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 3 — Admin: hierarquia de corridas
-- =========================================================
-- FUNÇÃO RELATÓRIO 3 / NÍVEL 1:
-- Admin: totais gerais da hierarquia.
-- Conta corridas cadastradas e escuderias cadastradas.
CREATE OR REPLACE FUNCTION fn_relatorio3_nivel1()
RETURNS TABLE (
    total_corridas BIGINT,
    total_escuderias BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT FROM races),
        (SELECT COUNT(*)::BIGINT FROM constructors);
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO RELATÓRIO 3 / NÍVEL 2:
-- Admin: agrupa corridas por circuito e calcula mínimo, média e máximo de voltas.
-- LEFT JOIN mantém circuitos/corridas mesmo quando não houver resultado associado.
CREATE OR REPLACE FUNCTION fn_relatorio3_nivel2()
RETURNS TABLE (circuito VARCHAR, total_corridas BIGINT, min_voltas NUMERIC, media_voltas NUMERIC, max_voltas NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT c.name, COUNT(DISTINCT r.race_id),
           MIN(res.laps)::NUMERIC, ROUND(AVG(res.laps)::NUMERIC, 1), MAX(res.laps)::NUMERIC
    FROM races r
    JOIN circuits c ON c.circuit_id = r.circuit_id
    LEFT JOIN results res ON res.race_id = r.race_id
    GROUP BY c.name
    ORDER BY total_corridas DESC;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO RELATÓRIO 3 / NÍVEL 3:
-- Admin: ao clicar em um circuito no frontend, retorna as corridas daquele circuito,
-- suas temporadas, quantidade de voltas e total de pilotos participantes.
CREATE OR REPLACE FUNCTION fn_relatorio3_nivel3(p_circuito VARCHAR)
RETURNS TABLE (corrida VARCHAR, temporada INTEGER, voltas INTEGER, total_pilotos BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.race_name, r.season, MAX(res.laps), COUNT(DISTINCT res.driver_id)
    FROM races r
    JOIN circuits c ON c.circuit_id = r.circuit_id
    LEFT JOIN results res ON res.race_id = r.race_id
    WHERE c.name = p_circuito
    GROUP BY r.race_name, r.season
    ORDER BY r.season DESC;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO COMPLEMENTAR DO RELATÓRIO 3:
-- Lista todas as escuderias cadastradas e a quantidade de pilotos associados.
-- LEFT JOIN garante que escuderias sem resultados também apareçam com zero pilotos.
CREATE OR REPLACE FUNCTION fn_relatorio3_escuderias()
RETURNS TABLE (
    escuderia TEXT,
    total_pilotos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name::TEXT AS escuderia,
        COUNT(DISTINCT r.driver_id) AS total_pilotos
    FROM constructors c
    LEFT JOIN results r ON r.constructor_id = c.constructor_id
    GROUP BY c.name
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 4 — Escuderia: pilotos com vitórias
-- =========================================================
-- FUNÇÃO RELATÓRIO 4:
-- Escuderia: recebe o constructor_id da escuderia logada e lista seus pilotos
-- com total de vitórias. Usa a view vw_resultados_completos e agregação com FILTER.
CREATE OR REPLACE FUNCTION fn_relatorio4(p_constructor_id VARCHAR)
RETURNS TABLE (piloto TEXT, total_vitorias BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.piloto_completo,
        COUNT(*) FILTER (WHERE v.position = 1) AS total_vitorias
    FROM vw_resultados_completos v
    WHERE v.constructor_id = p_constructor_id
    GROUP BY v.piloto_completo
    ORDER BY total_vitorias DESC, piloto;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 5 — Escuderia: resultados por status
-- =========================================================
-- FUNÇÃO RELATÓRIO 5:
-- Escuderia: conta resultados por status apenas no escopo da escuderia logada.
-- O filtro p_constructor_id garante controle de acesso por dados.
CREATE OR REPLACE FUNCTION fn_relatorio5(p_constructor_id VARCHAR)
RETURNS TABLE (status TEXT, quantidade BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.status::TEXT, COUNT(*) FROM results r
    WHERE r.constructor_id = p_constructor_id
    GROUP BY r.status ORDER BY quantidade DESC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 6 — Piloto: pontos por ano e corrida
-- =========================================================
-- FUNÇÃO RELATÓRIO 6:
-- Piloto: mostra pontos por ano e as corridas em que os pontos foram obtidos.
-- Usa CTE para isolar as corridas pontuadas e função janela para calcular
-- o total anual sem perder o detalhamento por corrida.
CREATE OR REPLACE FUNCTION fn_relatorio6(p_driver_id VARCHAR)
RETURNS TABLE (
    ano INTEGER,
    total_pontos_ano NUMERIC,
    corrida VARCHAR,
    circuito VARCHAR,
    pontos NUMERIC,
    posicao INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH corridas_pontuadas AS (
        SELECT
            v.season AS ano,
            v.race_name AS corrida,
            v.circuito_nome AS circuito,
            v.points AS pontos,
            v.position AS posicao
        FROM vw_resultados_completos v
        WHERE v.driver_id = p_driver_id
          AND v.points > 0
    )
    SELECT
        c.ano,
        SUM(c.pontos) OVER (PARTITION BY c.ano) AS total_pontos_ano, -- função janela: total do ano mantendo cada corrida
        c.corrida,
        c.circuito,
        c.pontos,
        c.posicao
    FROM corridas_pontuadas c
    ORDER BY c.ano, c.corrida;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- RELATÓRIO 7 — Piloto: resultados por status
-- =========================================================
-- FUNÇÃO RELATÓRIO 7:
-- Piloto: conta resultados por status somente das corridas do piloto logado.
-- O filtro p_driver_id evita acesso a dados de outro piloto.
CREATE OR REPLACE FUNCTION fn_relatorio7(p_driver_id VARCHAR)
RETURNS TABLE (status TEXT, quantidade BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.status::TEXT, COUNT(*) FROM results r
    WHERE r.driver_id = p_driver_id
    GROUP BY r.status ORDER BY quantidade DESC;
END;
$$ LANGUAGE plpgsql;