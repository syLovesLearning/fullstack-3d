-- ============================================================================
-- scripts/init_db.sql
-- 厂区数字孪生与仓储维护 PostgreSQL 建表脚本
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

-- 1. 货品类型定义（含尺寸、重量与预留 3D 模型 Key）
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

-- 2. 货架生成与平面坐标布局（含尺寸、库位、单层承重与 3D 模型 Key）
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

-- 3. 特殊区域道路维护（主干道 is_locked=TRUE 宽度固定写死，非库位区域可开叉车）
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
<<<<<<< HEAD

-- 4. 货位台账（按货架的跨/层/位自动生成，删除货架级联清理）
CREATE TABLE IF NOT EXISTS rack_slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id         UUID NOT NULL REFERENCES rack_layouts(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    bay_no          INTEGER NOT NULL CHECK (bay_no >= 0),
    level_no        INTEGER NOT NULL CHECK (level_no >= 0),
    slot_no         INTEGER NOT NULL CHECK (slot_no >= 0),
    status          TEXT NOT NULL DEFAULT 'empty'
                    CHECK (status IN ('empty', 'occupied', 'maintenance', 'locked')),
    cargo_type_code TEXT,
    batch_no        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rack_id, bay_no, level_no, slot_no),
    UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_rack_slots_rack ON rack_slots (rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_slots_status ON rack_slots (status);
=======
>>>>>>> ini
