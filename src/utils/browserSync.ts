// Utilidad para sincronización entre navegadores
import { getCurrentTenant } from './tenantManager';
import { cleanupTenantData } from './storage';
import { clearServicesCache } from './servicesManager';
import { invalidateStaffCache, repairTenantStaffData } from './staffDataManager';
//import { SyncDataType } from './crossBrowserSync';

// Función para sincronizar datos entre navegadores
export const syncBrowserData = (): void => {
  try {
    console.log("🔄 Iniciando sincronización entre navegadores...");
    
    // Obtener el tenant actual
    const tenant = getCurrentTenant();
    if (!tenant) {
      console.warn("⚠️ No hay tenant actual para sincronizar");
      return;
    }
    
    // 1. Guardar slug en cookie para persistencia entre navegadores
    document.cookie = `current_tenant_slug=${tenant.slug}; path=/; max-age=2592000`; // 30 días
    console.log("🍪 Slug guardado en cookie:", tenant.slug);
    
    // 2. Invalidar todas las cachés para forzar recarga de datos
    if (tenant.id) {
      invalidateStaffCache(tenant.id);
      clearServicesCache(tenant.id);
      console.log("🧹 Cachés invalidadas para tenant:", tenant.id);
    }
    
    console.log("✅ Sincronización completada");
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
  }
};

// Función para reparar datos de un tenant
export const repairTenantData = async (tenantId: string): Promise<boolean> => {
  try {
    console.log(`🔧 Reparando datos para tenant: ${tenantId}`);
    
    // 1. Limpiar datos de citas y clientes
    cleanupTenantData(tenantId);
    
    // 2. Reparar datos de personal
    repairTenantStaffData(tenantId);
    
    // 3. Limpiar cachés
    invalidateStaffCache(tenantId);
    clearServicesCache(tenantId);
    
    console.log(`✅ Datos reparados para tenant: ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error reparando datos para tenant: ${tenantId}`, error);
    return false;
  }
};

// Función para detectar cambios de tenant
export const setupTenantChangeDetection = (): () => void => {
  // Función para verificar cambios en la URL
  const checkTenantChange = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length > 0) {
      const slug = segments[0];
      // Guardar slug en cookie
      document.cookie = `last_visited_tenant=${slug}; path=/; max-age=2592000`; // 30 días
    }
  };
  
  // Ejecutar al inicio
  checkTenantChange();
  
  // Configurar listener para cambios de URL
  window.addEventListener('popstate', checkTenantChange);
  
  // Configurar intervalo para verificar periódicamente
  const interval = setInterval(checkTenantChange, 5000);
  
  // Devolver función para limpiar
  return () => {
    window.removeEventListener('popstate', checkTenantChange);
    clearInterval(interval);
  };
};

// Hacer funciones disponibles globalmente para debugging
if (typeof window !== "undefined") {
  const w = window as any;
  w.syncBrowserData = syncBrowserData;
  w.repairTenantData = repairTenantData;
}