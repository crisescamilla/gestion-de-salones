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

        // Try to get tenant from URL first
        let currentTenant = getTenantFromURL();
        
        // If no tenant in URL, try to get from storage
        if (!currentTenant) {
          currentTenant = getCurrentTenant();
        }

        // Si no se encuentra localmente, buscar en Supabase por slug
        if (!currentTenant) {
          const path = window.location.pathname;
          const segments = path.split("/").filter(Boolean);
          if (segments.length > 0) {
            const slug = segments[0];
            currentTenant = await getTenantBySlugFromSupabase(slug);
            if (currentTenant) {
              setCurrentTenant(currentTenant); // Guardar en localStorage para futuras visitas
            }
          }
        }

        

        if (currentTenant) {
          setTenant(currentTenant);

          // Load tenant owner
          const tenantOwner = getTenantOwnerById(currentTenant.ownerId);
          setOwner(tenantOwner);

          // Sincronizar datos entre navegadores
          syncTenantData();
        } else {
          // No tenant found, redirect to tenant selection or registration
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
    const handlePopState = () => {
      const urlTenant = getTenantFromURL();
      if (urlTenant && urlTenant.id !== tenant?.id) {
        setTenant(urlTenant);
        setCurrentTenant(urlTenant);
        
        const tenantOwner = getTenantOwnerById(urlTenant.ownerId);
        setOwner(tenantOwner);
      }
    };
    
    // También verificar periódicamente
    const interval = setInterval(() => {
      const path = window.location.pathname;
      const segments = path.split("/").filter(Boolean);
      
      if (segments.length > 0) {
        const potentialSlug = segments[0];
        const urlTenant = getTenantBySlug(potentialSlug);
        
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
  syncTenantData
} from '../utils/tenantManager';
import { getTenantBySlug as getTenantBySlugFromSupabase } from '../utils/tenantSupabase';