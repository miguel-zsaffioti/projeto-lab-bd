CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS users_log             CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
DROP TABLE IF EXISTS constructor_standings CASCADE;
DROP TABLE IF EXISTS driver_standings      CASCADE;
DROP TABLE IF EXISTS results               CASCADE;
DROP TABLE IF EXISTS qualifying            CASCADE;
DROP TABLE IF EXISTS races                 CASCADE;
DROP TABLE IF EXISTS circuits              CASCADE;
DROP TABLE IF EXISTS constructors          CASCADE;
DROP TABLE IF EXISTS drivers               CASCADE;
DROP TABLE IF EXISTS seasons               CASCADE;
DROP TABLE IF EXISTS airports              CASCADE;
DROP TABLE IF EXISTS airport_types         CASCADE;
DROP TABLE IF EXISTS cities                CASCADE;
DROP TABLE IF EXISTS feature_codes         CASCADE;
DROP TABLE IF EXISTS time_zones            CASCADE;
DROP TABLE IF EXISTS iso_language_codes    CASCADE;
DROP TABLE IF EXISTS regions               CASCADE;
DROP TABLE IF EXISTS countries             CASCADE;
DROP TABLE IF EXISTS continents            CASCADE;

CREATE TABLE continents (
    code CHAR(2)     PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO continents VALUES
  ('AF','Africa'),('AN','Antarctica'),('AS','Asia'),
  ('EU','Europe'),('NA','North America'),('OC','Oceania'),('SA','South America');

CREATE TABLE countries (
    id             BIGINT        PRIMARY KEY,
    code           CHAR(2)       UNIQUE NOT NULL,
    name           VARCHAR(200)  NOT NULL,
    continent_code CHAR(2)       REFERENCES continents(code),
    wikipedia_link VARCHAR(500),
    keywords       TEXT,
    capital        VARCHAR(200)  DEFAULT NULL,
    area_sq_km     NUMERIC(15,2) DEFAULT NULL,
    population     BIGINT        DEFAULT NULL,
    nationality    VARCHAR(100)  DEFAULT NULL
);

CREATE TABLE time_zones (
    id           SERIAL        PRIMARY KEY,
    country_code CHAR(2),
    name         VARCHAR(100)  NOT NULL UNIQUE,
    gmt_offset   NUMERIC(5,1),
    dst_offset   NUMERIC(5,1),
    raw_offset   NUMERIC(5,1)
);

CREATE TABLE feature_codes (
    id            SERIAL       PRIMARY KEY,
    feature_class CHAR(1)      NOT NULL,
    feature_code  VARCHAR(10)  NOT NULL,
    name          VARCHAR(200),
    description   TEXT,
    UNIQUE (feature_class, feature_code)
);

CREATE TABLE cities (
    id                BIGINT        PRIMARY KEY,
    name              VARCHAR(200)  NOT NULL,
    ascii_name        VARCHAR(200),
    alternate_names   TEXT,
    latitude          NUMERIC(10,7),
    longitude         NUMERIC(10,7),
    feature_class     CHAR(1),
    feature_code      VARCHAR(10),
    country_code      CHAR(2),
    cc2               VARCHAR(200),
    admin1_code       VARCHAR(20),
    admin2_code       VARCHAR(80),
    admin3_code       VARCHAR(20),
    admin4_code       VARCHAR(20),
    population        BIGINT,
    elevation         INTEGER,
    dem               INTEGER,
    time_zone_name    VARCHAR(100),
    modification_date DATE
);

CREATE TABLE regions (
    id             BIGINT        PRIMARY KEY,
    code           VARCHAR(20)   NOT NULL UNIQUE,
    local_code     VARCHAR(10),
    name           VARCHAR(200)  NOT NULL,
    continent_code CHAR(2)       REFERENCES continents(code),
    country_code   CHAR(2),
    wikipedia_link VARCHAR(500),
    keywords       TEXT
);

CREATE TABLE iso_language_codes (
    id            SERIAL       PRIMARY KEY,
    iso_639_3     CHAR(3),
    iso_639_2     VARCHAR(10),
    iso_639_1     CHAR(2),
    language_name VARCHAR(200)
);

CREATE TABLE airport_types (
    id   SERIAL      PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE airports (
    id                BIGINT        PRIMARY KEY,
    ident             VARCHAR(10)   NOT NULL UNIQUE,
    airport_type_id   INTEGER       REFERENCES airport_types(id),
    name              VARCHAR(300)  NOT NULL,
    latitude_deg      NUMERIC(10,7),
    longitude_deg     NUMERIC(10,7),
    elevation_ft      INTEGER,
    continent_code    CHAR(2),
    country_code      CHAR(2),
    iso_region        VARCHAR(20),
    municipality      VARCHAR(200),
    city_id           INTEGER       DEFAULT NULL,
    scheduled_service VARCHAR(5),
    icao_code         VARCHAR(10),
    iata_code         VARCHAR(10),
    gps_code          VARCHAR(10),
    local_code        VARCHAR(10),
    home_link         TEXT,
    wikipedia_link    TEXT,
    keywords          TEXT
);

CREATE TABLE seasons (
    year INTEGER PRIMARY KEY
);

CREATE TABLE circuits (
    circuit_id    VARCHAR(100)  PRIMARY KEY,
    name          VARCHAR(200)  NOT NULL,
    lat           NUMERIC(10,7),
    long          NUMERIC(10,7),
    locality      VARCHAR(100),
    country       VARCHAR(100),
    city_id       INTEGER       DEFAULT NULL,
    wikipedia_url VARCHAR(500)
);

CREATE TABLE constructors (
    id             SERIAL        PRIMARY KEY,
    constructor_id VARCHAR(100)  UNIQUE NOT NULL,
    name           VARCHAR(200)  NOT NULL,
    country_id     BIGINT        REFERENCES countries(id),
    nationality    VARCHAR(100),
    wikipedia_url  VARCHAR(500)
);

CREATE TABLE drivers (
    id          SERIAL        PRIMARY KEY,
    driver_id   VARCHAR(100)  UNIQUE NOT NULL,
    driver_ref  VARCHAR(100),
    given_name  VARCHAR(100)  NOT NULL,
    family_name VARCHAR(100)  NOT NULL,
    country_id  BIGINT        REFERENCES countries(id),
    nationality VARCHAR(100),
    dob         DATE
);

CREATE TABLE races (
    race_id    VARCHAR(20)   PRIMARY KEY,
    season     INTEGER       NOT NULL REFERENCES seasons(year),
    round      INTEGER       NOT NULL,
    race_name  VARCHAR(200)  NOT NULL,
    race_date  DATE,
    race_time  TIME,
    circuit_id VARCHAR(100)
);

CREATE TABLE qualifying (
    id             SERIAL       PRIMARY KEY,
    race_id        VARCHAR(20)  NOT NULL,
    driver_id      VARCHAR(100) NOT NULL,
    constructor_id VARCHAR(100) NOT NULL,
    position       INTEGER,
    q1             VARCHAR(20),
    q2             VARCHAR(20),
    q3             VARCHAR(20)
);

CREATE TABLE results (
    id             SERIAL       PRIMARY KEY,
    race_id        VARCHAR(20)  NOT NULL,
    driver_id      VARCHAR(100) NOT NULL,
    constructor_id VARCHAR(100) NOT NULL,
    grid           INTEGER,
    position       INTEGER,
    position_order INTEGER      NOT NULL,
    points         NUMERIC(6,2),
    laps           INTEGER,
    status         VARCHAR(100)
);

CREATE TABLE driver_standings (
    id        SERIAL        PRIMARY KEY,
    season    INTEGER       NOT NULL,
    round     INTEGER       NOT NULL,
    driver_id VARCHAR(100)  NOT NULL,
    position  INTEGER,
    points    NUMERIC(8,2),
    wins      INTEGER
);

CREATE TABLE constructor_standings (
    id             SERIAL        PRIMARY KEY,
    season         INTEGER       NOT NULL,
    round          INTEGER       NOT NULL,
    constructor_id VARCHAR(100)  NOT NULL,
    position       INTEGER,
    points         NUMERIC(8,2),
    wins           INTEGER
);

CREATE TABLE users (
    userid      SERIAL       PRIMARY KEY,
    login       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(64)  NOT NULL,
    tipo        VARCHAR(20)  NOT NULL CHECK (tipo IN ('Admin', 'Escuderia', 'Piloto')),
    id_original INTEGER      DEFAULT NULL
);

CREATE TABLE users_log (
    id         SERIAL       PRIMARY KEY,
    userid     INTEGER      NOT NULL REFERENCES users(userid),
    acao       VARCHAR(20)  NOT NULL CHECK (acao IN ('LOGIN', 'LOGOUT')),
    data_hora  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION gerar_senha_hash(senha TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN crypt(senha, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_criar_usuario_piloto()
RETURNS TRIGGER AS $$
DECLARE
    v_login   VARCHAR(150);
    v_senha   VARCHAR(64);
BEGIN
    v_login := NEW.driver_id || '_d';
    v_senha := gerar_senha_hash(NEW.driver_id);

    IF EXISTS (SELECT 1 FROM users WHERE login = v_login) THEN
        RAISE EXCEPTION 'Login "%" já existe na tabela USERS. Inserção cancelada.', v_login;
    END IF;

    INSERT INTO users (login, password, tipo, id_original)
    VALUES (v_login, v_senha, 'Piloto', NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_driver
    AFTER INSERT ON drivers
    FOR EACH ROW EXECUTE FUNCTION trg_criar_usuario_piloto();

CREATE OR REPLACE FUNCTION trg_atualizar_usuario_piloto()
RETURNS TRIGGER AS $$
DECLARE
    v_login_novo VARCHAR(150);
BEGIN
    IF OLD.driver_id <> NEW.driver_id THEN
        v_login_novo := NEW.driver_id || '_d';

        IF EXISTS (SELECT 1 FROM users WHERE login = v_login_novo AND id_original <> OLD.id) THEN
            RAISE EXCEPTION 'Novo login "%" já existe na tabela USERS.', v_login_novo;
        END IF;

        UPDATE users
        SET login    = v_login_novo,
            password = gerar_senha_hash(NEW.driver_id)
        WHERE login = OLD.driver_id || '_d';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_update_driver
    AFTER UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION trg_atualizar_usuario_piloto();

CREATE OR REPLACE FUNCTION trg_criar_usuario_escuderia()
RETURNS TRIGGER AS $$
DECLARE
    v_login VARCHAR(150);
    v_senha VARCHAR(64);
BEGIN
    v_login := NEW.constructor_id || '_c';
    v_senha := gerar_senha_hash(NEW.constructor_id);

    IF EXISTS (SELECT 1 FROM users WHERE login = v_login) THEN
        RAISE EXCEPTION 'Login "%" já existe na tabela USERS. Inserção cancelada.', v_login;
    END IF;

    INSERT INTO users (login, password, tipo, id_original)
    VALUES (v_login, v_senha, 'Escuderia', NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_insert_constructor
    AFTER INSERT ON constructors
    FOR EACH ROW EXECUTE FUNCTION trg_criar_usuario_escuderia();

CREATE OR REPLACE FUNCTION trg_atualizar_usuario_escuderia()
RETURNS TRIGGER AS $$
DECLARE
    v_login_novo VARCHAR(150);
BEGIN
    IF OLD.constructor_id <> NEW.constructor_id THEN
        v_login_novo := NEW.constructor_id || '_c';

        IF EXISTS (SELECT 1 FROM users WHERE login = v_login_novo AND id_original <> OLD.id) THEN
            RAISE EXCEPTION 'Novo login "%" já existe na tabela USERS.', v_login_novo;
        END IF;

        UPDATE users
        SET login    = v_login_novo,
            password = gerar_senha_hash(NEW.constructor_id)
        WHERE login = OLD.constructor_id || '_c';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_update_constructor
    AFTER UPDATE ON constructors
    FOR EACH ROW EXECUTE FUNCTION trg_atualizar_usuario_escuderia();

INSERT INTO users (login, password, tipo, id_original)
VALUES ('admin', crypt('admin', gen_salt('bf')), 'Admin', NULL);

SET client_encoding TO 'UTF8';

CREATE TEMP TABLE staging_countries (
    id TEXT, code TEXT, name TEXT, continent_code TEXT, wikipedia_link TEXT, keywords TEXT
);
\copy staging_countries FROM '../data/countries.csv' DELIMITER ',' CSV HEADER
INSERT INTO countries (id, code, name, continent_code, wikipedia_link, keywords)
SELECT id::BIGINT, code, name, continent_code, wikipedia_link, keywords
FROM staging_countries
ON CONFLICT (id) DO NOTHING;
DROP TABLE staging_countries;

\copy time_zones (country_code, name, gmt_offset, dst_offset, raw_offset) FROM '../data/timeZones.tsv' DELIMITER E'\t' CSV HEADER

CREATE TEMP TABLE staging_fc (code VARCHAR(15), name VARCHAR(200), description TEXT);
\copy staging_fc FROM '../data/featureCodes_en.tsv' DELIMITER E'\t' CSV
INSERT INTO feature_codes (feature_class, feature_code, name, description)
SELECT SPLIT_PART(code, '.', 1), SPLIT_PART(code, '.', 2), name, description
FROM staging_fc WHERE code LIKE '%.%';
DROP TABLE staging_fc;

\copy cities FROM '../data/cities.tsv' WITH (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', ENCODING 'UTF8')

\copy regions (id, code, local_code, name, continent_code, country_code, wikipedia_link, keywords) FROM '../data/regions.csv' DELIMITER ',' CSV HEADER

\copy iso_language_codes (iso_639_3, iso_639_2, iso_639_1, language_name) FROM '../data/iso-languagecodes.tsv' DELIMITER E'\t' CSV HEADER

CREATE TEMP TABLE staging_ap (
    id BIGINT, ident VARCHAR(10), type VARCHAR(50), name VARCHAR(300),
    lat NUMERIC, long NUMERIC, elev INT, cont CHAR(2), country CHAR(2),
    region VARCHAR(20), muni VARCHAR(200), sch VARCHAR(5),
    icao VARCHAR(10), iata VARCHAR(10), gps VARCHAR(10),
    local VARCHAR(10), home TEXT, wiki TEXT, keyw TEXT
);
\copy staging_ap FROM '../data/airports.csv' DELIMITER ',' CSV HEADER

INSERT INTO airport_types (type)
SELECT DISTINCT type FROM staging_ap ON CONFLICT DO NOTHING;

INSERT INTO airports (
    id, ident, airport_type_id, name, latitude_deg, longitude_deg,
    elevation_ft, continent_code, country_code, iso_region,
    municipality, scheduled_service, icao_code, iata_code,
    gps_code, local_code, home_link, wikipedia_link, keywords
)
SELECT s.id, s.ident, at.id, s.name, s.lat, s.long, s.elev,
       s.cont, s.country, s.region, s.muni, s.sch,
       s.icao, s.iata, s.gps, s.local, s.home, s.wiki, s.keyw
FROM staging_ap s JOIN airport_types at ON at.type = s.type;
DROP TABLE staging_ap;

\copy circuits (circuit_id, name, lat, long, locality, country, wikipedia_url) FROM '../data/circuits.csv' WITH (FORMAT csv, DELIMITER ',', HEADER true, ENCODING 'UTF8')

\copy constructors (constructor_id, name, nationality, wikipedia_url) FROM '../data/constructors.csv' WITH (FORMAT csv, DELIMITER ',', HEADER true, ENCODING 'UTF8')

CREATE TEMP TABLE staging_drivers (
    driver_ref VARCHAR(100),
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    nationality VARCHAR(100),
    dob DATE
);

\copy staging_drivers FROM '../data/drivers.csv' WITH (FORMAT csv, DELIMITER ',', HEADER true, ENCODING 'UTF8')

INSERT INTO drivers (driver_id, driver_ref, given_name, family_name, nationality, dob)
SELECT
    driver_ref,
    driver_ref,
    given_name,
    family_name,
    nationality,
    dob
FROM staging_drivers;

DROP TABLE staging_drivers;

CREATE TEMP TABLE staging_races (rid VARCHAR(20), sea INTEGER, rou INTEGER, rna VARCHAR(200), rda DATE, rti TIME, cid VARCHAR(100));
\copy staging_races FROM '../data/races.csv' DELIMITER ',' CSV HEADER
INSERT INTO seasons (year) SELECT DISTINCT sea FROM staging_races ON CONFLICT (year) DO NOTHING;
INSERT INTO races (race_id, season, round, race_name, race_date, race_time, circuit_id)
SELECT rid, sea, rou, rna, rda, rti, cid FROM staging_races;
DROP TABLE staging_races;

CREATE TEMP TABLE staging_qualy (
    race_id VARCHAR(20), driver_id VARCHAR(100), constructor_id VARCHAR(100),
    position_text TEXT, q1 VARCHAR(20), q2 VARCHAR(20), q3 VARCHAR(20)
);
\copy staging_qualy FROM '../data/qualifying.csv' DELIMITER ',' CSV HEADER
INSERT INTO qualifying (race_id, driver_id, constructor_id, position, q1, q2, q3)
SELECT race_id, driver_id, constructor_id,
    CASE WHEN position_text ~ '^[0-9]+$' THEN position_text::INTEGER ELSE NULL END,
    q1, q2, q3
FROM staging_qualy;
DROP TABLE staging_qualy;

CREATE TEMP TABLE staging_results (
    race_id VARCHAR(20), driver_id VARCHAR(100), constructor_id VARCHAR(100),
    grid_text TEXT, pos_text TEXT, position_order_text TEXT,
    points_text TEXT, laps_text TEXT, status VARCHAR(100)
);
\copy staging_results FROM '../data/results.csv' DELIMITER ',' CSV HEADER
INSERT INTO results (race_id, driver_id, constructor_id, grid, position, position_order, points, laps, status)
SELECT race_id, driver_id, constructor_id,
    NULLIF(TRIM(grid_text), '')::INTEGER,
    CASE WHEN pos_text ~ '^[0-9]+$' THEN pos_text::INTEGER ELSE NULL END,
    NULLIF(TRIM(position_order_text), '')::NUMERIC::INTEGER,
    NULLIF(TRIM(points_text), '')::NUMERIC,
    NULLIF(TRIM(laps_text), '')::INTEGER,
    status
FROM staging_results;
DROP TABLE staging_results;

CREATE TEMP TABLE staging_ds (
    season_text TEXT, round_text TEXT, driver_id VARCHAR(100),
    pos_text TEXT, points_text TEXT, wins_text TEXT
);
\copy staging_ds FROM '../data/driver_standings.csv' DELIMITER ',' CSV HEADER
INSERT INTO driver_standings (season, round, driver_id, position, points, wins)
SELECT
    NULLIF(TRIM(season_text), '')::INTEGER,
    NULLIF(TRIM(round_text), '')::INTEGER,
    driver_id,
    NULLIF(TRIM(pos_text), '')::NUMERIC::INTEGER,
    NULLIF(TRIM(points_text), '')::NUMERIC,
    NULLIF(TRIM(wins_text), '')::NUMERIC::INTEGER
FROM staging_ds;
DROP TABLE staging_ds;

CREATE TEMP TABLE staging_cs (
    season_text TEXT, round_text TEXT, constructor_id VARCHAR(100),
    pos_text TEXT, points_text TEXT, wins_text TEXT
);
\copy staging_cs FROM '../data/constructor_standings.csv' DELIMITER ',' CSV HEADER
INSERT INTO constructor_standings (season, round, constructor_id, position, points, wins)
SELECT
    NULLIF(TRIM(season_text), '')::INTEGER,
    NULLIF(TRIM(round_text), '')::INTEGER,
    constructor_id,
    NULLIF(TRIM(pos_text), '')::NUMERIC::INTEGER,
    NULLIF(TRIM(points_text), '')::NUMERIC,
    NULLIF(TRIM(wins_text), '')::NUMERIC::INTEGER
FROM staging_cs;
DROP TABLE staging_cs;

CREATE INDEX IF NOT EXISTS idx_users_login        ON users (login);
CREATE INDEX IF NOT EXISTS idx_users_log_userid   ON users_log (userid);
CREATE INDEX IF NOT EXISTS idx_results_driver     ON results (driver_id);
CREATE INDEX IF NOT EXISTS idx_results_constructor ON results (constructor_id);
CREATE INDEX IF NOT EXISTS idx_results_race       ON results (race_id);
CREATE INDEX IF NOT EXISTS idx_airports_country   ON airports (country_code);
CREATE INDEX IF NOT EXISTS idx_airports_type      ON airports (airport_type_id);

SELECT tabela, registros FROM (
    SELECT 'continents'   AS tabela, COUNT(*) AS registros FROM continents   UNION ALL
    SELECT 'countries',              COUNT(*) FROM countries                  UNION ALL
    SELECT 'cities',                 COUNT(*) FROM cities                     UNION ALL
    SELECT 'airports',               COUNT(*) FROM airports                   UNION ALL
    SELECT 'circuits',               COUNT(*) FROM circuits                   UNION ALL
    SELECT 'drivers',                COUNT(*) FROM drivers                    UNION ALL
    SELECT 'constructors',           COUNT(*) FROM constructors               UNION ALL
    SELECT 'races',                  COUNT(*) FROM races                      UNION ALL
    SELECT 'users',                  COUNT(*) FROM users                      UNION ALL
    SELECT 'users_log',              COUNT(*) FROM users_log
) t ORDER BY tabela;