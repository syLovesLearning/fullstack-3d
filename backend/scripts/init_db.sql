-- ============================================================================
-- scripts/init_db.sql
-- 厂区数字孪生与 WMS 库位主数据 PostgreSQL 建表脚本
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT NOT NULL UNIQUE,
    email           TEXT UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('admin', 'user', 'readonly', 'external_guest')),
    allowed_tools   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    groups          TEXT[] NOT NULL DEFAULT ARRAY['public']::TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cargo_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    length_m        DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    width_m         DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    height_m        DOUBLE PRECISION NOT NULL DEFAULT 1.1,
    weight_kg       DOUBLE PRECISION NOT NULL DEFAULT 500,
    model_key       TEXT NOT NULL DEFAULT 'cargo_carton',
    color_hex       TEXT NOT NULL DEFAULT '#d97706',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rack_layouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    length_m        DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    width_m         DOUBLE PRECISION NOT NULL DEFAULT 1.6,
    height_m        DOUBLE PRECISION NOT NULL DEFAULT 6.8,
    bays            INTEGER NOT NULL DEFAULT 3 CHECK (bays >= 1),
    levels          INTEGER NOT NULL DEFAULT 4 CHECK (levels >= 1),
    slots_per_bay   INTEGER NOT NULL DEFAULT 2 CHECK (slots_per_bay >= 1),
    max_load_kg     DOUBLE PRECISION NOT NULL DEFAULT 2000,
    pos_x           DOUBLE PRECISION NOT NULL DEFAULT 0,
    pos_z           DOUBLE PRECISION NOT NULL DEFAULT 0,
    rotation_deg    INTEGER NOT NULL DEFAULT 0 CHECK (rotation_deg IN (0, 90)),
    model_key       TEXT NOT NULL DEFAULT 'rack_heavy_4l',
    cargo_type_code TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_zones (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    pos_x             DOUBLE PRECISION NOT NULL,
    pos_z             DOUBLE PRECISION NOT NULL,
    length_m          DOUBLE PRECISION NOT NULL,
    width_m           DOUBLE PRECISION NOT NULL,
    is_locked         BOOLEAN NOT NULL DEFAULT FALSE,
    drivable_forklift BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WMS 库位主数据（纯物理库位、合并跨度、作业类型与 ABC 策略）
CREATE TABLE IF NOT EXISTS warehouse_slots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id             UUID NOT NULL REFERENCES rack_layouts(id) ON DELETE CASCADE,
    bay_idx             INTEGER NOT NULL CHECK (bay_idx >= 1),
    level_idx           INTEGER NOT NULL CHECK (level_idx >= 1),
    slot_idx            INTEGER NOT NULL CHECK (slot_idx >= 1),
    slot_code           TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'available',
    span_slots          INTEGER NOT NULL DEFAULT 1 CHECK (span_slots IN (1, 2)),
    merged_into_slot_id UUID REFERENCES warehouse_slots(id) ON DELETE SET NULL,
    slot_type           TEXT NOT NULL DEFAULT 'storage',
    abc_class           TEXT NOT NULL DEFAULT 'B',
    allow_mixed         BOOLEAN NOT NULL DEFAULT TRUE,
    max_weight_kg       DOUBLE PRECISION NOT NULL DEFAULT 1000,
    remark              TEXT NOT NULL DEFAULT '',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rack_id, bay_idx, level_idx, slot_idx)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_slots_rack ON warehouse_slots (rack_id, bay_idx, level_idx);

-- 5. 园区厂区位置与道路维护（680m × 420m 物流园区）
CREATE TABLE IF NOT EXISTS campus_zones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    zone_type       TEXT NOT NULL DEFAULT 'warehouse',
    x               DOUBLE PRECISION NOT NULL,
    y               DOUBLE PRECISION NOT NULL,
    w               DOUBLE PRECISION NOT NULL,
    h               DOUBLE PRECISION NOT NULL,
    color           TEXT NOT NULL DEFAULT '#1e3a8a',
    doors_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
    sub_layout_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campus_roads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    x               DOUBLE PRECISION NOT NULL,
    y               DOUBLE PRECISION NOT NULL,
    w               DOUBLE PRECISION NOT NULL,
    h               DOUBLE PRECISION NOT NULL,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
