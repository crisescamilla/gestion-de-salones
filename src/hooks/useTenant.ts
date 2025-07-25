import { useState, useEffect, createContext, useContext } from 'react';
import type { Tenant, TenantOwner } from '../types/tenant';

// Tenant Context interface
export interface TenantContext {
  tenant: Tenant | null;
  owner: TenantOwner | null;
  isLoading: boolean;
  error: string | null;
}

// Create the context
export const TenantContext = createContext<TenantContext>({
  tenant: null,
  owner: null,
  isLoading: true,
  error: null
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Tenant Provider Hook
export const useTenantProvider = (): TenantContext => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [owner, setOwner] = useState<TenantOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Intenta obtener el tenant desde la URL (localStorage)
        let currentTenant = getTenantFromURL();

        // 2. Si no está en la URL, intenta obtenerlo del almacenamiento local
        if (!currentTenant) {
          currentTenant = getCurrentTenant();
        }

        // 3. Si no está localmente, consulta Supabase por el slug de la URL
        if (!currentTenant) {
          const path = window.location.pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length > 0) {
            const slug = segments[0];
            console.log("Consultando Supabase por slug:", slug);
            currentTenant = await getTenantBySlugFromSupabase(slug);
            if (currentTenant) {
              console.log("Tenant encontrado en Supabase:", currentTenant);
              await setCurrentTenant(currentTenant); // Guardar en localStorage y sessionStorage
              
              // Inicializar datos del tenant desde Supabase
              await initializeTenantData(currentTenant.id, currentTenant.businessType);
            } else {
              console.log("No se encontró tenant en Supabase");
            }
          }
        } else {
          // Si el tenant existe localmente, asegurar que sus datos estén inicializados
          await initializeTenantData(currentTenant.id, currentTenant.businessType);
        }

        if (currentTenant) {
          setTenant(currentTenant);
          setCurrentTenant(currentTenant);

          // Cargar el owner si es necesario
          const tenantOwner = getTenantOwnerById(currentTenant.ownerId);
          setOwner(tenantOwner);

          // Sincronizar datos entre navegadores
          syncTenantData();
        } else {
          setError('No tenant found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, []);

  // Listen for URL changes
  useEffect(() => {
    // Nueva función para buscar tenant por slug, primero local, luego Supabase
    const fetchTenantBySlug = async (slug: string) => {
      let foundTenant = getTenantBySlug(slug);
      if (!foundTenant) {
        foundTenant = await getTenantBySlugFromSupabase(slug);
        if (foundTenant) {
          await setCurrentTenant(foundTenant);
          // Inicializar datos del tenant desde Supabase
          await initializeTenantData(foundTenant.id, foundTenant.businessType);
        }
      } else {
        // Si el tenant existe localmente, asegurar que sus datos estén inicializados
        await initializeTenantData(foundTenant.id, foundTenant.businessType);
      }
      return foundTenant;
    };

    const handlePopState = async () => {
      const path = window.location.pathname;
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 0) {
        const slug = segments[0];
        const urlTenant = await fetchTenantBySlug(slug);
        if (urlTenant && urlTenant.id !== tenant?.id) {
          setTenant(urlTenant);
          setCurrentTenant(urlTenant);
          const tenantOwner = getTenantOwnerById(urlTenant.ownerId);
          setOwner(tenantOwner);
        }
      }
    };
    
    // También verificar periódicamente
    const interval = setInterval(async () => {
      const path = window.location.pathname;
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 0) {
        const slug = segments[0];
        const urlTenant = await fetchTenantBySlug(slug);
        if (urlTenant && urlTenant.id !== tenant?.id) {
          setTenant(urlTenant);
          setCurrentTenant(urlTenant);
          const tenantOwner = getTenantOwnerById(urlTenant.ownerId);
          setOwner(tenantOwner);
        }
      }
    }, 1000);

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(interval);
    };
  }, [tenant]);

  return {
    tenant,
    owner,
    isLoading,
    error
  };
};

// Hook for tenant-specific data operations
export const useTenantData = () => {
  const { tenant } = useTenant();

  const getTenantSpecificData = (dataType: string) => {
    if (!tenant) return null;
    
    const tenantDataKey = `beauty-app-tenant-data-${tenant.id}`;
    const stored = localStorage.getItem(tenantDataKey);
    
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data[dataType] || null;
  };

  const saveTenantSpecificData = (dataType: string, data: any) => {
    if (!tenant) return;
    
    const tenantDataKey = `beauty-app-tenant-data-${tenant.id}`;
    const stored = localStorage.getItem(tenantDataKey);
    
    let tenantData = stored ? JSON.parse(stored) : {};
    tenantData[dataType] = data;
    
    localStorage.setItem(tenantDataKey, JSON.stringify(tenantData));
  };

  return {
    tenant,
    getTenantSpecificData,
    saveTenantSpecificData
  };
};

// Hook for tenant URL management
export const useTenantURL = () => {
  const { tenant } = useTenant();

  const generateBookingURL = () => {
    if (!tenant) return '';
    return `${window.location.origin}/${tenant.slug}`;
  };

  const generateAdminURL = () => {
    if (!tenant) return '';
    return `${window.location.origin}/${tenant.slug}/admin`;
  };

  const navigateToTenant = (slug: string) => {
    window.location.href = `${window.location.origin}/${slug}`;
  };

  return {
    tenant,
    generateBookingURL,
    generateAdminURL,
    navigateToTenant
  };
};

// Import functions from tenantManager
import { 
  getCurrentTenant, 
  setCurrentTenant, 
  getTenantFromURL,
  getTenantOwnerById,
  getTenantBySlug,
  syncTenantData,
  initializeTenantData
} from '../utils/tenantManager';
import { getTenantBySlug as getTenantBySlugFromSupabase } from '../utils/tenantSupabase';
