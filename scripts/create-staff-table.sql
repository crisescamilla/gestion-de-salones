-- Crear tabla de staff si no existe
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    specialties JSONB DEFAULT '[]'::jsonb,
    bio TEXT DEFAULT '',
    experience TEXT DEFAULT '',
    image TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    schedule JSONB DEFAULT '{}'::jsonb,
    rating DECIMAL(3,2) DEFAULT 5.0,
    completed_services INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para mejorar rendimiento
    CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_specialties ON staff USING GIN(specialties);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE staff IS 'Tabla para almacenar información del personal del salón';
COMMENT ON COLUMN staff.tenant_id IS 'ID del tenant/negocio al que pertenece el empleado';
COMMENT ON COLUMN staff.specialties IS 'Array JSON de especialidades del empleado';
COMMENT ON COLUMN staff.schedule IS 'Horario semanal del empleado en formato JSON';
COMMENT ON COLUMN staff.rating IS 'Calificación promedio del empleado (1.0 - 5.0)';
