import { supabase, syncData, getLatestSyncData, getCurrentDeviceId, testSupabaseConnection } from './supabaseClient';
import { getCurrentTenant } from './tenantManager';
import { getServices, saveService } from './servicesManager';
import { getStaffData, saveStaffMember } from './staffDataManager';
import { getAppointments, getClients, saveAppointment, saveClient } from './storage';
import { getThemes, saveTheme } from './themeManager';
import { getSalonSettings, saveSalonSettings } from './salonSettings';
import { emitEvent } from './eventManager';

// Tipos de datos que se pueden sincronizar
export enum SyncDataType {
  SERVICES = 'services',
  STAFF = 'staff',
  APPOINTMENTS = 'appointments',
  CLIENTS = 'clients',
  SETTINGS = 'settings',
  THEMES = 'themes'
}

// Interfaz para el estado de sincronización
interface SyncStatus {
  lastSync: number;
  inProgress: boolean;
  error: string | null;
  isOnline: boolean;
  dataTypes: Record<SyncDataType, {
    lastSync: number;
    version: number;
    status: 'synced' | 'pending' | 'error' | 'offline';
  }>;
}

// Estado global de sincronización
let syncStatus: SyncStatus = {
  lastSync: 0,
  inProgress: false,
  error: null,
  isOnline: navigator.onLine,
  dataTypes: {
    [SyncDataType.SERVICES]: { lastSync: 0, version: 0, status: 'pending' },
    [SyncDataType.STAFF]: { lastSync: 0, version: 0, status: 'pending' },
    [SyncDataType.APPOINTMENTS]: { lastSync: 0, version: 0, status: 'pending' },
    [SyncDataType.CLIENTS]: { lastSync: 0, version: 0, status: 'pending' },
    [SyncDataType.SETTINGS]: { lastSync: 0, version: 0, status: 'pending' },
    [SyncDataType.THEMES]: { lastSync: 0, version: 0, status: 'pending' }
  }
};

// Función para sincronizar datos con Supabase
export const syncToSupabase = async (dataType: SyncDataType): Promise<boolean> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    console.warn('No hay tenant actual para sincronizar');
    return false;
  }

  // Check if we're online and can connect to Supabase
  if (!navigator.onLine) {
    console.warn('Sin conexión a internet, marcando como offline');
    syncStatus.dataTypes[dataType].status = 'offline';
    return false;
  }

  try {
    // Test Supabase connection
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('No se puede conectar a Supabase, marcando como offline');
      syncStatus.dataTypes[dataType].status = 'offline';
      return false;
    }

    // Marcar como en progreso
    syncStatus.inProgress = true;
    syncStatus.dataTypes[dataType].status = 'pending';
    
    // Obtener datos locales según el tipo
    let localData;
    switch (dataType) {
      case SyncDataType.SERVICES:
        localData = getServices();
        break;
      case SyncDataType.STAFF:
        localData = getStaffData();
        break;
      case SyncDataType.APPOINTMENTS:
        localData = getAppointments();
        break;
      case SyncDataType.CLIENTS:
        localData = getClients();
        break;
      case SyncDataType.SETTINGS:
        localData = getSalonSettings();
        break;
      case SyncDataType.THEMES:
        localData = getThemes();
        break;
      default:
        throw new Error(`Tipo de datos no soportado: ${dataType}`);
    }

    // Sincronizar con Supabase
    const success = await syncData(tenant.id, dataType, localData);
    
    if (success) {
      // Actualizar estado de sincronización
      const now = Date.now();
      syncStatus.lastSync = now;
      syncStatus.dataTypes[dataType].lastSync = now;
      syncStatus.dataTypes[dataType].status = 'synced';
      syncStatus.error = null;
      syncStatus.isOnline = true;
      
      // Guardar timestamp de sincronización en localStorage
      localStorage.setItem(`sync-timestamp-${dataType}`, now.toString());
      
      // Emitir evento de sincronización exitosa
      emitEvent('sync_success', {
        dataType,
        timestamp: now,
        deviceId: getCurrentDeviceId()
      });
      
      console.log(`✅ Sincronización exitosa para ${dataType}`);
      return true;
    } else {
      throw new Error(`Error al sincronizar ${dataType}`);
    }
  } catch (error) {
    console.error(`Error sincronizando ${dataType}:`, error);
    
    // Actualizar estado de error
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    syncStatus.error = errorMessage;
    syncStatus.dataTypes[dataType].status = 'error';
    
    // Si es un error de red, marcar como offline
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      syncStatus.dataTypes[dataType].status = 'offline';
      syncStatus.isOnline = false;
    }
    
    // Emitir evento de error de sincronización
    emitEvent('sync_error', {
      dataType,
      error: errorMessage,
      timestamp: Date.now(),
      deviceId: getCurrentDeviceId()
    });
    
    return false;
  } finally {
    syncStatus.inProgress = false;
  }
};

// Función para obtener datos actualizados desde Supabase
export const syncFromSupabase = async (dataType: SyncDataType): Promise<boolean> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    console.warn('No hay tenant actual para sincronizar');
    return false;
  }

  // Check if we're online and can connect to Supabase
  if (!navigator.onLine) {
    console.warn('Sin conexión a internet, saltando sincronización desde Supabase');
    syncStatus.dataTypes[dataType].status = 'offline';
    return false;
  }

  try {
    // Test Supabase connection
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('No se puede conectar a Supabase, saltando sincronización desde Supabase');
      syncStatus.dataTypes[dataType].status = 'offline';
      return false;
    }

    // Obtener datos más recientes de Supabase
    const remoteData = await getLatestSyncData(tenant.id, dataType);
    
    if (!remoteData) {
      console.log(`No hay datos remotos para ${dataType}`);
      return false;
    }
    
    // Actualizar datos locales según el tipo
    switch (dataType) {
      case SyncDataType.SERVICES:
        // Actualizar servicios locales
        if (Array.isArray(remoteData)) {
          remoteData.forEach((service: any) => {
            saveService(service, 'sync_system');
          });
        }
        break;
      case SyncDataType.STAFF:
        // Actualizar personal local
        if (Array.isArray(remoteData)) {
          remoteData.forEach((staff: any) => {
            saveStaffMember(staff);
          });
        }
        break;
      case SyncDataType.APPOINTMENTS:
        // Actualizar citas locales
        if (Array.isArray(remoteData)) {
          remoteData.forEach((appointment: any) => {
            saveAppointment(appointment);
          });
        }
        break;
      case SyncDataType.CLIENTS:
        // Actualizar clientes locales
        if (Array.isArray(remoteData)) {
          remoteData.forEach((client: any) => {
            saveClient(client);
          });
        }
        break;
      case SyncDataType.SETTINGS:
        // Actualizar configuraciones locales
        if (remoteData && typeof remoteData === 'object') {
          saveSalonSettings(remoteData, 'sync_system');
        }
        break;
      case SyncDataType.THEMES:
        // Actualizar temas locales
        if (Array.isArray(remoteData)) {
          remoteData.forEach((theme: any) => {
            saveTheme(theme);
          });
        }
        break;
      default:
        throw new Error(`Tipo de datos no soportado: ${dataType}`);
    }
    
    // Actualizar estado de sincronización
    const now = Date.now();
    syncStatus.lastSync = now;
    syncStatus.dataTypes[dataType].lastSync = now;
    syncStatus.dataTypes[dataType].status = 'synced';
    syncStatus.isOnline = true;
    
    // Guardar timestamp de sincronización en localStorage
    localStorage.setItem(`sync-timestamp-${dataType}`, now.toString());
    
    // Emitir evento de sincronización exitosa
    emitEvent('sync_from_remote', {
      dataType,
      timestamp: now,
      deviceId: getCurrentDeviceId()
    });
    
    console.log(`✅ Datos actualizados desde Supabase para ${dataType}`);
    return true;
  } catch (error) {
    console.error(`Error obteniendo datos de ${dataType} desde Supabase:`, error);
    
    // Actualizar estado de error
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    syncStatus.error = errorMessage;
    syncStatus.dataTypes[dataType].status = 'error';
    
    // Si es un error de red, marcar como offline
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      syncStatus.dataTypes[dataType].status = 'offline';
      syncStatus.isOnline = false;
    }
    
    return false;
  }
};

// Función para sincronizar todos los tipos de datos
export const syncAllData = async (): Promise<Record<SyncDataType, boolean>> => {
  const results: Record<SyncDataType, boolean> = {} as Record<SyncDataType, boolean>;
  
  // Check if we're online first
  if (!navigator.onLine) {
    console.warn('Sin conexión a internet, saltando sincronización completa');
    for (const dataType of Object.values(SyncDataType)) {
      results[dataType] = false;
      syncStatus.dataTypes[dataType].status = 'offline';
    }
    syncStatus.isOnline = false;
    return results;
  }
  
  try {
    // Primero sincronizar datos locales a Supabase
    for (const dataType of Object.values(SyncDataType)) {
      results[dataType] = await syncToSupabase(dataType);
    }
    
    // Luego obtener datos actualizados de Supabase
    for (const dataType of Object.values(SyncDataType)) {
      const fromSupabase = await syncFromSupabase(dataType);
      // Solo actualizar resultado si fue exitoso
      if (fromSupabase) {
        results[dataType] = fromSupabase;
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error en sincronización manual:', error);
    return results;
  }
};

// Función para verificar si hay cambios remotos
export const checkForRemoteChanges = async (): Promise<boolean> => {
  const tenant = getCurrentTenant();
  if (!tenant) return false;
  
  // Check if we're online first
  if (!navigator.onLine) {
    console.warn('Sin conexión a internet, saltando verificación de cambios remotos');
    syncStatus.isOnline = false;
    return false;
  }
  
  try {
    // Test Supabase connection
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('No se puede conectar a Supabase, saltando verificación de cambios remotos');
      syncStatus.isOnline = false;
      return false;
    }

    // Obtener todos los datos de sincronización del tenant
    const allSyncData = await supabase
      .from('sync_data')
      .select('data_type, last_updated, version, device_id')
      .eq('tenant_id', tenant.id);
    
    if (allSyncData.error) {
      console.error('Error obteniendo datos de sincronización:', allSyncData.error);
      return false;
    }
    
    const currentDeviceId = getCurrentDeviceId();
    let hasChanges = false;
    
    // Verificar si hay cambios de otros dispositivos
    for (const item of allSyncData.data || []) {
      // Si el cambio es de otro dispositivo y es más reciente que nuestra última sincronización
      if (item.device_id !== currentDeviceId) {
        const localTimestamp = parseInt(localStorage.getItem(`sync-timestamp-${item.data_type}`) || '0');
        const remoteTimestamp = new Date(item.last_updated).getTime();
        
        if (remoteTimestamp > localTimestamp) {
          console.log(`Cambios remotos detectados en ${item.data_type} de dispositivo ${item.device_id}`);
          hasChanges = true;
          
          // Sincronizar este tipo de datos específico
          await syncFromSupabase(item.data_type as SyncDataType);
        }
      }
    }
    
    syncStatus.isOnline = true;
    return hasChanges;
  } catch (error) {
    console.error('Error verificando cambios remotos:', error);
    
    // Si es un error de red, marcar como offline
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      syncStatus.isOnline = false;
    }
    
    return false;
  }
};

// Función para inicializar el sistema de sincronización
export const initSyncSystem = (): (() => void) => {
  console.log('🔄 Inicializando sistema de sincronización entre navegadores...');
  
  // Cargar estado de sincronización desde localStorage
  for (const dataType of Object.values(SyncDataType)) {
    const lastSync = parseInt(localStorage.getItem(`sync-timestamp-${dataType}`) || '0');
    syncStatus.dataTypes[dataType].lastSync = lastSync;
  }
  
  // Verificar cambios al inicio (solo si estamos online)
  if (navigator.onLine) {
    checkForRemoteChanges();
  }
  
  // Configurar intervalo para sincronización periódica
  const syncInterval = setInterval(() => {
    if (navigator.onLine) {
      checkForRemoteChanges();
    } else {
      // Marcar todos los tipos de datos como offline
      for (const dataType of Object.values(SyncDataType)) {
        if (syncStatus.dataTypes[dataType].status !== 'offline') {
          syncStatus.dataTypes[dataType].status = 'offline';
        }
      }
      syncStatus.isOnline = false;
    }
  }, 30000); // Verificar cada 30 segundos
  
  // Configurar listeners para eventos de conexión
  const handleOnline = () => {
    console.log('🌐 Conexión restablecida, sincronizando datos...');
    syncStatus.isOnline = true;
    // Esperar un poco antes de sincronizar para asegurar que la conexión esté estable
    setTimeout(() => {
      syncAllData();
    }, 2000);
  };
  
  const handleOffline = () => {
    console.log('📴 Conexión perdida, modo offline');
    syncStatus.isOnline = false;
    for (const dataType of Object.values(SyncDataType)) {
      if (syncStatus.dataTypes[dataType].status !== 'offline') {
        syncStatus.dataTypes[dataType].status = 'offline';
      }
    }
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Devolver función para limpiar
  return () => {
    clearInterval(syncInterval);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Obtener el estado actual de sincronización
export const getSyncStatus = (): SyncStatus => {
  return { ...syncStatus };
};

// Función para forzar sincronización manual
export const forceSyncAll = async (): Promise<boolean> => {
  if (syncStatus.inProgress) {
    console.warn('Ya hay una sincronización en progreso');
    return false;
  }
  
  // Check if we're online first
  if (!navigator.onLine) {
    console.warn('Sin conexión a internet, no se puede forzar sincronización');
    return false;
  }
  
  try {
    const results = await syncAllData();
    const allSuccess = Object.values(results).every(result => result);
    
    if (allSuccess) {
      console.log('✅ Sincronización manual completada con éxito');
    } else {
      console.warn('⚠️ Sincronización manual completada con algunos errores');
    }
    
    return allSuccess;
  } catch (error) {
    console.error('❌ Error en sincronización manual:', error);
    return false;
  }
};

// Hacer funciones disponibles globalmente para debugging
if (typeof window !== 'undefined') {
  const w = window as any;
  w.syncToSupabase = syncToSupabase;
  w.syncFromSupabase = syncFromSupabase;
  w.syncAllData = syncAllData;
  w.checkForRemoteChanges = checkForRemoteChanges;
  w.getSyncStatus = getSyncStatus;
  w.forceSyncAll = forceSyncAll;
  w.testSupabaseConnection = testSupabaseConnection;
}