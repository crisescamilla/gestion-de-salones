// Gestor centralizado de sincronización entre navegadores
import { getCurrentTenant, getTenantBySlug, setCurrentTenant } from './tenantManager';
import { invalidateStaffCache } from './staffDataManager';
import { clearServicesCache } from './servicesManager';
import { emitEvent } from './eventManager';
import { initSyncSystem as initCrossBrowserSyncSystem, forceSyncAll, checkForRemoteChanges } from './crossBrowserSync';

// Clave para almacenar la última sincronización
const LAST_SYNC_KEY = 'beauty-app-last-sync';

// Función para sincronizar datos entre navegadores
export const syncDataAcrossBrowsers = async (): Promise<void> => {
  try {
    console.log("🔄 Iniciando sincronización entre navegadores...");
    
    // Obtener el tenant actual
    const tenant = getCurrentTenant();
    if (!tenant) {
      console.warn("⚠️ No hay tenant actual para sincronizar");
      return;
    }
    
    // 1. Guardar slug en localStorage y sessionStorage
    localStorage.setItem('beauty-app-current-tenant-slug', tenant.slug);
    sessionStorage.setItem('beauty-app-current-tenant-slug', tenant.slug);
    
    // 2. Guardar slug en cookie para persistencia entre navegadores
    document.cookie = `current_tenant_slug=${tenant.slug}; path=/; max-age=2592000`; // 30 días
    console.log("🍪 Slug guardado en cookie:", tenant.slug);
    
    // 3. Guardar timestamp de última sincronización
    const syncTimestamp = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, syncTimestamp.toString());
    sessionStorage.setItem(LAST_SYNC_KEY, syncTimestamp.toString());
    
    // 4. Invalidar todas las cachés para forzar recarga de datos
    if (tenant.id) {
      invalidateStaffCache(tenant.id);
      clearServicesCache(tenant.id);
      console.log("🧹 Cachés invalidadas para tenant:", tenant.id);
    }
    
    // 5. Sincronizar con Supabase para compartir entre navegadores
    await forceSyncAll();
    
    // 6. Emitir evento de sincronización
    emitEvent('data_sync', {
      tenant: tenant.id,
      timestamp: syncTimestamp,
      source: 'manual_sync'
    });
    
    console.log("✅ Sincronización completada");
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
  }
};

// Función para verificar si hay datos nuevos desde otro navegador
export const checkForExternalChanges = async (): Promise<boolean> => {
  try {
    // Verificar si hay un slug en la cookie que no coincide con el tenant actual
    const cookieMatch = document.cookie.match(/current_tenant_slug=([^;]+)/);
    if (cookieMatch) {
      const cookieSlug = cookieMatch[1];
      const currentTenant = getCurrentTenant();
      
      if (!currentTenant || currentTenant.slug !== cookieSlug) {
        console.log("🔄 Detectado cambio de tenant desde cookie:", cookieSlug);
        
        // Cargar el tenant desde el slug
        const newTenant = getTenantBySlug(cookieSlug);
        if (newTenant) {
          // Actualizar el tenant actual
          setCurrentTenant(newTenant);
          return true;
        }
      }
    }
    
    // Verificar cambios en Supabase
    const hasRemoteChanges = await checkForRemoteChanges();
    if (hasRemoteChanges) {
      console.log("🔄 Detectados cambios remotos en Supabase");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("❌ Error verificando cambios externos:", error);
    return false;
  }
};

// Función para inicializar el sistema de sincronización
export const initSyncSystem = (): (() => void) => {
  console.log("🚀 Inicializando sistema de sincronización...");
  
  // Inicializar sistema de sincronización con Supabase
  const cleanupSupabaseSync = initCrossBrowserSyncSystem();
  
  // Verificar cambios al inicio
  checkForExternalChanges();
  
  // Configurar intervalo para verificar periódicamente
  const interval = setInterval(async () => {
    const hasChanges = await checkForExternalChanges();
    if (hasChanges) {
      // Si hay cambios, forzar recarga de datos
      syncDataAcrossBrowsers();
      
      // Notificar al usuario
      console.log("🔄 Datos sincronizados desde otro navegador");
    }
  }, 10000); // Verificar cada 10 segundos
  
  // Configurar listener para eventos de storage
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === LAST_SYNC_KEY && event.newValue) {
      const lastSyncLocal = localStorage.getItem(LAST_SYNC_KEY);
      
      // Si el timestamp de sincronización es más reciente, sincronizar datos
      if (lastSyncLocal && parseInt(event.newValue) > parseInt(lastSyncLocal)) {
        console.log("🔄 Detectado cambio en otro navegador, sincronizando datos...");
        checkForExternalChanges();
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Devolver función para limpiar
  return () => {
    clearInterval(interval);
    window.removeEventListener('storage', handleStorageChange);
    cleanupSupabaseSync();
  };
};

// Exponer funciones para debugging
if (typeof window !== 'undefined') {
  const w = window as any;
  w.syncDataAcrossBrowsers = syncDataAcrossBrowsers;
  w.checkForExternalChanges = checkForExternalChanges;
}