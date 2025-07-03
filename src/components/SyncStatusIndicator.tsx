import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, WifiOff, Database, Cloud } from 'lucide-react';
import { syncDataAcrossBrowsers } from '../utils/syncManager';
import { useTheme } from '../hooks/useTheme';
import { forceSyncAll, getSyncStatus } from '../utils/crossBrowserSync';

interface SyncStatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  position = 'bottom-left' 
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [syncStats, setSyncStats] = useState<any>({});
  const { colors } = useTheme();

  useEffect(() => {
    // Manejar eventos de conexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Sincronizar datos al iniciar
    handleSync();
    
    // Configurar sincronización periódica
    const interval = setInterval(() => {
      if (isOnline && !isSyncing) {
        handleSync();
      }
    }, 60000); // Sincronizar cada minuto
    
    // Actualizar estadísticas de sincronización
    const statsInterval = setInterval(() => {
      setSyncStats(getSyncStatus());
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [isOnline]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    try {
      // Sincronizar datos locales entre pestañas
      await syncDataAcrossBrowsers();
      
      // Sincronizar con Supabase para compartir entre navegadores
      await forceSyncAll();
      
      setLastSync(new Date());
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Determinar posición
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }[position];

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{ 
            backgroundColor: isOnline ? (colors?.surface || '#ffffff') : (colors?.error || '#ef4444'),
            color: isOnline ? (colors?.primary || '#0ea5e9') : '#ffffff'
          }}
          title={isOnline ? 'Estado de sincronización' : 'Sin conexión'}
        >
          {isOnline ? (
            isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Cloud className="w-5 h-5" />
            )
          ) : (
            <WifiOff className="w-5 h-5" />
          )}
        </button>
        
        {/* Pulse animation for online status */}
        {isOnline && (
          <div 
            className="absolute inset-0 rounded-full opacity-30 animate-ping"
            style={{ backgroundColor: colors?.primary || '#0ea5e9' }}
          ></div>
        )}
        
        {/* Details popup */}
        {showDetails && (
          <div 
            className="absolute bottom-full mb-2 p-3 rounded-lg shadow-lg min-w-[250px] right-0"
            style={{ 
              backgroundColor: colors?.surface || '#ffffff',
              borderColor: colors?.border || '#e5e7eb',
              color: colors?.text || '#1f2937'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Estado de Sincronización</h4>
              <div 
                className="flex items-center text-xs"
                style={{ 
                  color: isOnline ? (colors?.success || '#10b981') : (colors?.error || '#ef4444')
                }}
              >
                {isOnline ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    <span>En línea</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    <span>Sin conexión</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-xs space-y-1" style={{ color: colors?.textSecondary || '#6b7280' }}>
              <p>
                <strong>Última sincronización:</strong> {lastSync 
                  ? lastSync.toLocaleTimeString() 
                  : 'Nunca'}
              </p>
              <p>
                <strong>Estado:</strong> {isSyncing 
                  ? 'Sincronizando...' 
                  : (isOnline ? 'Listo para sincronizar' : 'Esperando conexión')}
              </p>
              
              {/* Sync stats */}
              {Object.keys(syncStats.dataTypes || {}).length > 0 && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: colors?.border || '#e5e7eb' }}>
                  <p className="font-medium mb-1">Datos sincronizados:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {Object.entries(syncStats.dataTypes || {}).map(([type, data]: [string, any]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span>{type}</span>
                        <span 
                          className="px-1.5 py-0.5 rounded-full text-xs"
                          style={{ 
                            backgroundColor: data.status === 'synced' 
                              ? `${colors?.success || '#10b981'}1a` 
                              : data.status === 'error'
                                ? `${colors?.error || '#ef4444'}1a`
                                : `${colors?.warning || '#f59e0b'}1a`,
                            color: data.status === 'synced'
                              ? colors?.success || '#10b981'
                              : data.status === 'error'
                                ? colors?.error || '#ef4444'
                                : colors?.warning || '#f59e0b'
                          }}
                        >
                          {data.status === 'synced' ? 'Sincronizado' : data.status === 'error' ? 'Error' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-2 border-t" style={{ borderColor: colors?.border || '#e5e7eb' }}>
              <div className="flex space-x-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 text-xs py-1 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                  style={{ 
                    backgroundColor: colors?.primary ? `${colors.primary}1a` : '#0ea5e91a',
                    color: colors?.primary || '#0ea5e9'
                  }}
                >
                  {isSyncing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Cloud className="w-3 h-3 mr-1" />}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </button>
                
                <button
                  onClick={() => {
                    // Sincronizar datos locales entre pestañas
                    syncDataAcrossBrowsers();
                  }}
                  disabled={isSyncing}
                  className="flex-1 text-xs py-1 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                  style={{ 
                    backgroundColor: colors?.secondary ? `${colors.secondary}1a` : '#06b6d41a',
                    color: colors?.secondary || '#06b6d4'
                  }}
                >
                  <Database className="w-3 h-3 mr-1" />
                  Local
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatusIndicator;