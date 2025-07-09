import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ensureTenantExistsInSupabase } from './tenantManager';
import { saveStaffToSupabase, deleteStaffFromSupabase } from './staffSupabase'

// Obtener las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Crear cliente de Supabase con configuración mejorada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth persistence for this app
    autoRefreshToken: false
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Función para verificar la conectividad con Supabase
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000); // 10 second timeout
    });

    const connectionPromise = supabase
      .from('tenants')
      .select('count')
      .limit(1);

    const { data: _data, error } = await Promise.race([connectionPromise, timeoutPromise]);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test error:', error);
    return false;
  }
};

// Generar un ID de dispositivo único para este navegador
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('beauty-app-device-id');
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('beauty-app-device-id', deviceId);
  }
  
  return deviceId;
};

// Ensure tenant exists in Supabase before syncing data
const ensureTenantExists = async (tenantId: string): Promise<boolean> => {
  try {
    // Test connection first with timeout
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping tenant check');
      return false;
    }

    // Check if tenant exists with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tenant check timeout')), 5000);
    });

    const tenantCheckPromise = supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle();

    const { data, error } = await Promise.race([tenantCheckPromise, timeoutPromise]);

    if (error) {
      console.error('Error checking tenant existence:', error);
      return false;
    }

    if (data) {
      return true; // Tenant exists
    }

    // Tenant doesn't exist, we need to create it
    return await ensureTenantExistsInSupabase(tenantId);
  } catch (error) {
    console.error('Error in ensureTenantExists:', error);
    return false;
  }
};

// Funciones para sincronización entre navegadores
export const syncData = async (tenantId: string, dataType: string, data: any): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping sync for:', dataType);
      return false;
    }

    // Ensure tenant exists in Supabase before syncing
    const tenantExists = await ensureTenantExists(tenantId);
    if (!tenantExists) {
      console.error('Cannot sync data: tenant does not exist in Supabase:', tenantId);
      return false;
    }

    const deviceId = getDeviceId();
    
    // Try to use the RPC function, fallback to direct insert if it doesn't exist
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), 10000);
      });

      const syncPromise = supabase.rpc('update_sync_data', {
        p_tenant_id: tenantId,
        p_data_type: dataType,
        p_data: data,
        p_device_id: deviceId
      });

      const { data: result, error } = await Promise.race([syncPromise, timeoutPromise]);
      
      if (error) {
        throw error;
      }
      
      console.log('Data synced successfully via RPC:', result);
      return true;
    } catch (rpcError) {
      console.warn('RPC function not available, using direct insert:', rpcError);
      
      // Fallback to direct insert/update with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Direct insert timeout')), 10000);
      });

      const insertPromise = supabase
        .from('sync_data')
        .upsert({
          tenant_id: tenantId,
          data_type: dataType,
          data: data,
          device_id: deviceId,
          last_updated: new Date().toISOString(),
          version: 1
        }, {
          onConflict: 'tenant_id,data_type'
        });

      const { data: result, error } = await Promise.race([insertPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error syncing data via direct insert:', error);
        return false;
      }
      
      console.log('Data synced successfully via direct insert:', result);
      return true;
    }
  } catch (error) {
    console.error('Error in syncData:', error);
    return false;
  }
};

export const getLatestSyncData = async (tenantId: string, dataType: string): Promise<any> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping data fetch for:', dataType);
      return null;
    }

    // Try to use the RPC function, fallback to direct select if it doesn't exist
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Data fetch timeout')), 10000);
      });

      const fetchPromise = supabase.rpc('get_latest_sync_data', {
        p_tenant_id: tenantId,
        p_data_type: dataType
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (rpcError) {
      console.warn('RPC function not available, using direct select:', rpcError);
      
      // Fallback to direct select with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Direct select timeout')), 10000);
      });

      const selectPromise = supabase
        .from('sync_data')
        .select('data')
        .eq('tenant_id', tenantId)
        .eq('data_type', dataType)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await Promise.race([selectPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error getting latest sync data via direct select:', error);
        return null;
      }
      
      return data?.data || null;
    }
  } catch (error) {
    console.error('Error in getLatestSyncData:', error);
    return null;
  }
};

export const getAllTenantSyncData = async (tenantId: string): Promise<any> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping tenant sync data fetch');
      return null;
    }

    // Try to use the RPC function, fallback to direct select if it doesn't exist
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tenant data fetch timeout')), 10000);
      });

      const fetchPromise = supabase.rpc('get_tenant_sync_data', {
        p_tenant_id: tenantId
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (rpcError) {
      console.warn('RPC function not available, using direct select:', rpcError);
      
      // Fallback to direct select with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Direct tenant select timeout')), 10000);
      });

      const selectPromise = supabase
        .from('sync_data')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_updated', { ascending: false });

      const { data, error } = await Promise.race([selectPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error getting all tenant sync data via direct select:', error);
        return null;
      }
      
      return data;
    }
  } catch (error) {
    console.error('Error in getAllTenantSyncData:', error);
    return null;
  }
};

export const logSyncEvent = async (tenantId: string, eventType: string, dataType: string, details: any = {}): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping sync event log');
      return false;
    }

    // Ensure tenant exists in Supabase before logging
    const tenantExists = await ensureTenantExists(tenantId);
    if (!tenantExists) {
      console.error('Cannot log sync event: tenant does not exist in Supabase:', tenantId);
      return false;
    }

    const deviceId = getDeviceId();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Log event timeout')), 5000);
    });

    const logPromise = supabase
      .from('sync_logs')
      .insert([{
        tenant_id: tenantId,
        event_type: eventType,
        data_type: dataType,
        device_id: deviceId,
        details
      }]);

    const { error } = await Promise.race([logPromise, timeoutPromise]);
    
    if (error) {
      console.error('Error logging sync event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in logSyncEvent:', error);
    return false;
  }
};

// Función para resolver conflictos
export const resolveSyncConflict = async (tenantId: string, dataType: string, resolvedData: any): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping conflict resolution');
      return false;
    }

    // Ensure tenant exists in Supabase before resolving conflict
    const tenantExists = await ensureTenantExists(tenantId);
    if (!tenantExists) {
      console.error('Cannot resolve sync conflict: tenant does not exist in Supabase:', tenantId);
      return false;
    }

    const deviceId = getDeviceId();
    
    // Try to use the RPC function, fallback to direct update if it doesn't exist
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Conflict resolution timeout')), 10000);
      });

      const resolvePromise = supabase.rpc('resolve_sync_conflict', {
        p_tenant_id: tenantId,
        p_data_type: dataType,
        p_resolved_data: resolvedData,
        p_device_id: deviceId
      });

      const { data: result, error } = await Promise.race([resolvePromise, timeoutPromise]);
      
      if (error) {
        throw error;
      }
      
      console.log('Conflict resolved successfully via RPC:', result);
      return true;
    } catch (rpcError) {
      console.warn('RPC function not available, using direct update:', rpcError);
      
      // Fallback to direct update with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Direct update timeout')), 10000);
      });

      const updatePromise = supabase
        .from('sync_data')
        .update({
          data: resolvedData,
          device_id: deviceId,
          last_updated: new Date().toISOString(),
          version: 1
        })
        .eq('tenant_id', tenantId)
        .eq('data_type', dataType);

      const { data: result, error } = await Promise.race([updatePromise, timeoutPromise]);
      
      if (error) {
        console.error('Error resolving conflict via direct update:', error);
        return false;
      }
      
      console.log('Conflict resolved successfully via direct update:', result);
      return true;
    }
  } catch (error) {
    console.error('Error in resolveSyncConflict:', error);
    return false;
  }
};

// Función para obtener el ID de dispositivo actual
export const getCurrentDeviceId = (): string => {
  return getDeviceId();
};