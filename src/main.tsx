import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TenantProvider from './components/TenantProvider';
import TenantRouter from './components/TenantRouter';
import './index.css';
import { initSyncSystem } from './utils/syncManager';
import { testSupabaseConnection } from './utils/supabaseClient';

// Función para inicializar la aplicación
const initializeApp = () => {
  // Verificar conexión con Supabase de forma no bloqueante
  const checkSupabaseConnection = async () => {
    try {
      const isConnected = await testSupabaseConnection();
      if (isConnected) {
        console.log('✅ Conexión a Supabase establecida correctamente');
      } else {
        console.warn('⚠️ No se pudo conectar a Supabase - la aplicación funcionará en modo offline');
      }
    } catch (err) {
      console.warn('⚠️ Error al verificar conexión con Supabase - la aplicación funcionará en modo offline:', err);
    }
  };
  
  // Verificar conexión con Supabase de forma asíncrona (no bloqueante)
  checkSupabaseConnection();
  
  // Inicializar sistema de sincronización entre navegadores
  const cleanupSync = initSyncSystem();
  
  // Sincronizar datos entre localStorage y sessionStorage
  const syncLocalAndSessionStorage = () => {
    // Verificar si hay datos en localStorage
    const hasLocalStorage = typeof localStorage !== 'undefined';
    
    // Verificar si hay datos en sessionStorage
    const hasSessionStorage = typeof sessionStorage !== 'undefined';
    
    // Sincronizar datos entre localStorage y sessionStorage
    if (hasLocalStorage && hasSessionStorage) {
      // Tenants
      const localTenants = localStorage.getItem('beauty-app-tenants');
      const sessionTenants = sessionStorage.getItem('beauty-app-tenants');
      
      if (localTenants && !sessionTenants) {
        sessionStorage.setItem('beauty-app-tenants', localTenants);
      } else if (!localTenants && sessionTenants) {
        localStorage.setItem('beauty-app-tenants', sessionTenants);
      }
      
      // Tenant Owners
      const localOwners = localStorage.getItem('beauty-app-tenant-owners');
      const sessionOwners = sessionStorage.getItem('beauty-app-tenant-owners');
      
      if (localOwners && !sessionOwners) {
        sessionStorage.setItem('beauty-app-tenant-owners', localOwners);
      } else if (!localOwners && sessionOwners) {
        localStorage.setItem('beauty-app-tenant-owners', sessionOwners);
      }
      
      // Current Tenant
      const localCurrentTenant = localStorage.getItem('beauty-app-current-tenant');
      const sessionCurrentTenant = sessionStorage.getItem('beauty-app-current-tenant');
      
      if (localCurrentTenant && !sessionCurrentTenant) {
        sessionStorage.setItem('beauty-app-current-tenant', localCurrentTenant);
      } else if (!localCurrentTenant && sessionCurrentTenant) {
        localStorage.setItem('beauty-app-current-tenant', sessionCurrentTenant);
      }
      
      console.log("✅ Datos sincronizados entre localStorage y sessionStorage");
    }
  };
  
  // Ejecutar sincronización inicial
  syncLocalAndSessionStorage();
  
  // Configurar intervalo para sincronización periódica
  const syncInterval = setInterval(syncLocalAndSessionStorage, 5000);
  
  // Renderizar la aplicación
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <TenantProvider>
        <TenantRouter />
      </TenantProvider>
    </StrictMode>
  );
  
  // Limpiar recursos al desmontar
  window.addEventListener('beforeunload', () => {
    clearInterval(syncInterval);
    cleanupSync();
  });
};

// Inicializar la aplicación
initializeApp();