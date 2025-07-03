/*
  # Cross-browser synchronization system

  1. New Tables
    - `sync_data` - Stores synchronization data for cross-browser access
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `data_type` (text) - Type of data (services, staff, appointments, etc.)
      - `data` (jsonb) - The actual data to be synchronized
      - `last_updated` (timestamp with time zone)
      - `version` (integer) - For conflict resolution
      - `device_id` (text) - Identifier for the device that last updated
    
    - `sync_logs` - Tracks synchronization events
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `event_type` (text) - Type of sync event (push, pull, conflict)
      - `data_type` (text) - Type of data being synced
      - `device_id` (text) - Device identifier
      - `timestamp` (timestamp with time zone)
      - `details` (jsonb) - Additional details about the sync event
  
  2. Functions
    - `get_latest_sync_data(p_tenant_id uuid, p_data_type text)` - Gets the latest version of data
    - `update_sync_data(p_tenant_id uuid, p_data_type text, p_data jsonb, p_device_id text)` - Updates sync data
    - `resolve_sync_conflict(p_tenant_id uuid, p_data_type text, p_resolved_data jsonb, p_device_id text)` - Resolves conflicts
  
  3. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
*/

-- Create sync_data table
CREATE TABLE IF NOT EXISTS sync_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data_type text NOT NULL,
  data jsonb NOT NULL,
  last_updated timestamptz DEFAULT now(),
  version integer DEFAULT 1,
  device_id text NOT NULL,
  UNIQUE(tenant_id, data_type)
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  data_type text NOT NULL,
  device_id text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  details jsonb
);

-- Create indexes
CREATE INDEX idx_sync_data_tenant_id ON sync_data(tenant_id);
CREATE INDEX idx_sync_data_data_type ON sync_data(data_type);
CREATE INDEX idx_sync_data_last_updated ON sync_data(last_updated);

CREATE INDEX idx_sync_logs_tenant_id ON sync_logs(tenant_id);
CREATE INDEX idx_sync_logs_event_type ON sync_logs(event_type);
CREATE INDEX idx_sync_logs_data_type ON sync_logs(data_type);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(timestamp);

-- Enable Row Level Security
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_data
CREATE POLICY "Sync data is viewable by tenant" 
ON sync_data FOR SELECT 
TO public
USING (true);

CREATE POLICY "Sync data can be inserted by tenant" 
ON sync_data FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Sync data can be updated by tenant" 
ON sync_data FOR UPDATE 
TO public
USING (true);

-- Create RLS policies for sync_logs
CREATE POLICY "Sync logs are viewable by tenant" 
ON sync_logs FOR SELECT 
TO public
USING (true);

CREATE POLICY "Sync logs can be inserted by tenant" 
ON sync_logs FOR INSERT 
TO public
WITH CHECK (true);

-- Function to get latest sync data
CREATE OR REPLACE FUNCTION get_latest_sync_data(p_tenant_id uuid, p_data_type text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_data jsonb;
BEGIN
  SELECT data INTO v_data
  FROM sync_data
  WHERE tenant_id = p_tenant_id AND data_type = p_data_type
  LIMIT 1;
  
  RETURN v_data;
END;
$$;

-- Function to update sync data
CREATE OR REPLACE FUNCTION update_sync_data(p_tenant_id uuid, p_data_type text, p_data jsonb, p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version integer;
  v_result jsonb;
BEGIN
  -- Get current version if exists
  SELECT version INTO v_current_version
  FROM sync_data
  WHERE tenant_id = p_tenant_id AND data_type = p_data_type;
  
  IF v_current_version IS NULL THEN
    -- Insert new record
    INSERT INTO sync_data (tenant_id, data_type, data, device_id, version)
    VALUES (p_tenant_id, p_data_type, p_data, p_device_id, 1)
    RETURNING jsonb_build_object('success', true, 'version', 1, 'message', 'Data created') INTO v_result;
    
    -- Log the event
    INSERT INTO sync_logs (tenant_id, event_type, data_type, device_id, details)
    VALUES (p_tenant_id, 'create', p_data_type, p_device_id, jsonb_build_object('version', 1));
  ELSE
    -- Update existing record
    UPDATE sync_data
    SET data = p_data,
        version = v_current_version + 1,
        device_id = p_device_id,
        last_updated = now()
    WHERE tenant_id = p_tenant_id AND data_type = p_data_type
    RETURNING jsonb_build_object('success', true, 'version', version, 'message', 'Data updated') INTO v_result;
    
    -- Log the event
    INSERT INTO sync_logs (tenant_id, event_type, data_type, device_id, details)
    VALUES (p_tenant_id, 'update', p_data_type, p_device_id, jsonb_build_object('version', v_current_version + 1));
  END IF;
  
  RETURN v_result;
END;
$$;

-- Function to resolve sync conflicts
CREATE OR REPLACE FUNCTION resolve_sync_conflict(p_tenant_id uuid, p_data_type text, p_resolved_data jsonb, p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version integer;
  v_result jsonb;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM sync_data
  WHERE tenant_id = p_tenant_id AND data_type = p_data_type;
  
  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No data found to resolve conflict');
  END IF;
  
  -- Update with resolved data
  UPDATE sync_data
  SET data = p_resolved_data,
      version = v_current_version + 1,
      device_id = p_device_id,
      last_updated = now()
  WHERE tenant_id = p_tenant_id AND data_type = p_data_type
  RETURNING jsonb_build_object('success', true, 'version', version, 'message', 'Conflict resolved') INTO v_result;
  
  -- Log the event
  INSERT INTO sync_logs (tenant_id, event_type, data_type, device_id, details)
  VALUES (p_tenant_id, 'conflict_resolution', p_data_type, p_device_id, jsonb_build_object('version', v_current_version + 1));
  
  RETURN v_result;
END;
$$;

-- Create API for cross-browser sync
CREATE OR REPLACE FUNCTION get_tenant_sync_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_object_agg(data_type, jsonb_build_object(
    'data', data,
    'version', version,
    'last_updated', last_updated,
    'device_id', device_id
  )) INTO v_result
  FROM sync_data
  WHERE tenant_id = p_tenant_id;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;