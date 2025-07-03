import React, { useEffect, useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { migrateToMultiTenant, getTenantBySlug, syncTenantData } from '../utils/tenantManager';
import { migrateStaffDataToTenants } from '../utils/staffDataManager';
import { syncDataAcrossBrowsers, checkForExternalChanges } from '../utils/syncManager';
import TenantSelector from './TenantSelector';
import TenantRegistration from './TenantRegistration';
import AccessControl from './AccessControl';
import App from '../App';
import { Loader2, RefreshCw } from 'lucide-react';

const TenantRouter: React.FC = () => {
  const { tenant, isLoading, error } = useTenant();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Inicialización y migraciones
    const initialize = async () => {
      try {
        console.log("🚀 Initializing TenantRouter...");
        console.log("Current path:", window.location.pathname);
        
        // Run migrations on first load
        migrateToMultiTenant();
        
        // Migrate staff data to tenant-specific storage
        migrateStaffDataToTenants();
        
        // Sincronizar datos entre navegadores
        syncTenantData();
        
        // Verificar cambios externos
        checkForExternalChanges();
        
        // Check if user has valid access
        const accessGranted = localStorage.getItem('srcn-access-granted');
        if (accessGranted) {
          // Check if access is still valid (30 minutes)
          const grantedTime = parseInt(accessGranted);
          const now = Date.now();
          const validDuration = 30 * 60 * 1000; // 30 minutes
          
          if (now - grantedTime < validDuration) {
            setHasAccess(true);
          } else {
            // Access expired
            localStorage.removeItem('srcn-access-granted');
            setHasAccess(false);
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      } finally {
        setCheckingAccess(false);
        setInitializing(false);
      }
    };
    
    initialize();
  }, [forceRefresh]);

  // Manejar cambios de URL manualmente
  useEffect(() => {
    const handleURLChange = () => {
      const newPath = window.location.pathname;
      console.log("URL changed to:", newPath);
      
      if (currentPath !== newPath) {
        setCurrentPath(newPath);
        
        // Forzar actualización del tenant si cambia la URL
        const pathSegments = newPath.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          const slug = pathSegments[0];
          const newTenant = getTenantBySlug(slug);
          
          if (newTenant) {
            console.log("Found tenant for slug:", slug, newTenant.name);
            // Sincronizar datos entre navegadores
            setIsSyncing(true);
            syncDataAcrossBrowsers();
            setTimeout(() => setIsSyncing(false), 1000);
            
            // Forzar actualización
            setForceRefresh(prev => prev + 1);
          } else {
            console.log("No tenant found for slug:", slug);
          }
        }
      }
    };

    // Observar cambios en la URL
    window.addEventListener('popstate', handleURLChange);
    
    // También verificar periódicamente
    const interval = setInterval(() => {
      if (currentPath !== window.location.pathname) {
        handleURLChange();
      }
    }, 500);

    return () => {
      window.removeEventListener('popstate', handleURLChange);
      clearInterval(interval);
    };
  }, [currentPath]);

  const handleAccessGranted = () => {
    setHasAccess(true);
  };

  // Función para sincronizar manualmente
  const handleManualSync = () => {
    setIsSyncing(true);
    syncDataAcrossBrowsers();
    setTimeout(() => {
      setIsSyncing(false);
      setForceRefresh(prev => prev + 1);
    }, 1000);
  };

  // Show loading state
  if (isLoading || checkingAccess || initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
          <p className="text-xs text-gray-500 mt-2">
            {isLoading ? "Cargando información del negocio..." : 
             checkingAccess ? "Verificando acceso..." : 
             "Inicializando aplicación..."}
          </p>
        </div>
      </div>
    );
  }

  // ALWAYS check access control for protected routes
  const protectedRoutes = ['/', '/register'];
  const needsAccessControl = protectedRoutes.includes(currentPath);
  
  if (needsAccessControl && !hasAccess) {
    return <AccessControl onAccessGranted={handleAccessGranted} />;
  }

  // Handle routing based on path
  const pathSegments = currentPath.split('/').filter(Boolean);
  
  // Registration page (with access control)
  if (currentPath === '/register') {
    return <TenantRegistration />;
  }
  
  // Root path - show tenant selector (with access control)
  if (pathSegments.length === 0) {
    return <TenantSelector />;
  }
  
  // Tenant-specific routes
  if (tenant) {
    // Botón de sincronización flotante
    const SyncButton = () => (
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all"
        title="Sincronizar datos"
      >
        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    );
    
    // Admin routes
    if (pathSegments.length >= 2 && pathSegments[1] === 'admin') {
      return (
        <>
          <SyncButton />
          <App />
        </>
      );
    }
    
    // Public booking page
    return (
      <>
        <SyncButton />
        <App />
      </>
    );
  }
  
  // No tenant found for the URL
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Negocio no encontrado
          </h1>
          <p className="text-gray-600 mb-6">
            La URL que estás buscando no corresponde a ningún negocio registrado.
          </p>
          <button
            onClick={() => {
              window.location.href = '/';
              setForceRefresh(prev => prev + 1);
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
          >
            Ver Todos los Negocios
          </button>
        </div>
      </div>
    );
  }
  
  // Fallback to tenant selector
  return <TenantSelector />;
};

export default TenantRouter;