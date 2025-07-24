import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Save, 
  X, 
  DollarSign, 
  Clock, 
  Tag, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { Service, ServiceCategory } from '../types';
import { serviceCategories } from '../data/services';
import { useTheme } from '../hooks/useTheme';
import { 
  getServices, 
  saveService, 
  createService, 
  deleteService,
  clearServicesCache,
  debugServicesData
} from '../utils/servicesManager';
import { getCurrentTenant } from '../utils/tenantManager';
import { syncDataAcrossBrowsers } from '../utils/syncManager';
import { useTranslation } from 'react-i18next';

const ServicesManager: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [showRepairTools, setShowRepairTools] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currentTenant = getCurrentTenant();

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadServices = async () => {
    try {
      const allServices = await getServices();
      setServices(allServices);
      console.log(`📊 Loaded ${allServices.length} services`);
    } catch (error) {
      console.error('Error loading services:', error);
      setMessage({ type: 'error', text: t('error_cargar_servicios') });
    }
  };

  const handleSaveService = async (serviceData: Service) => {
    setLoading(true);
    try {
      const existingService = services.find(s => s.id === serviceData.id);
      
      if (existingService) {
        // Update existing service
        await saveService(serviceData, 'admin');
        setMessage({ type: 'success', text: t('servicio_guardado') });
      } else {
        // Create new service
        await createService(serviceData, 'admin');
        setMessage({ type: 'success', text: t('servicio_guardado') });
      }
      
      loadServices();
      setEditingService(null);
      setShowAddForm(false);
      
      // Sincronizar datos entre navegadores
      syncDataAcrossBrowsers();
    } catch (error) {
      console.error('Error saving service:', error);
      setMessage({ type: 'error', text: t('error_guardar_servicio') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm(t('confirmar_eliminar_servicio'))) {
      try {
        await deleteService(serviceId, 'admin');
        loadServices();
        setMessage({ type: 'success', text: t('servicio_eliminado') });
        
        // Sincronizar datos entre navegadores
        syncDataAcrossBrowsers();
      } catch (error) {
        console.error('Error deleting service:', error);
        setMessage({ type: 'error', text: t('error_eliminar_servicio') });
      }
    }
  };

  const handleRepairServices = async () => {
    if (!currentTenant) {
      setMessage({ type: 'error', text: t('no_negocio_seleccionado') });
      return;
    }
    
    if (window.confirm(t('confirmar_reparar_servicios', { name: currentTenant.name }))) {
      setRepairLoading(true);
      try {
        // Limpiar caché de servicios
        clearServicesCache(currentTenant.id);
        
        // Forzar recarga de servicios
        loadServices();
        
        // Sincronizar datos entre navegadores
        syncDataAcrossBrowsers();
        
        setMessage({ type: 'success', text: t('servicios_reparados') });
      } catch (error) {
        console.error('Error repairing services:', error);
        setMessage({ type: 'error', text: t('error_reparar_servicios') });
      } finally {
        setRepairLoading(false);
      }
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      filterCategory === 'all' || 
      service.category === filterCategory;
    
    const matchesActive = 
      filterActive === 'all' || 
      (filterActive === 'active' && service.isActive !== false) || 
      (filterActive === 'inactive' && service.isActive === false);
    
    return matchesSearch && matchesCategory && matchesActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 
            className="text-2xl font-bold flex items-center theme-transition"
            style={{ color: colors?.text || '#1f2937' }}
          >
            <Scissors className="w-8 h-8 mr-3" style={{ color: colors?.primary || '#0ea5e9' }} />
            {t('gestion_servicios')}
          </h2>
          <p 
            className="mt-1 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          >
            {t('administra_servicios')}
          </p>
          {currentTenant && (
            <p className="text-sm mt-1" style={{ color: colors?.primary || '#0ea5e9' }}>
              {t('negocio')}: {currentTenant.name}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRepairTools(!showRepairTools)}
            className="flex items-center px-3 py-2 rounded-lg transition-colors theme-transition"
            style={{
              backgroundColor: colors?.warning ? `${colors.warning}1a` : '#f59e0b1a',
              color: colors?.warning || '#f59e0b',
            }}
            title={t('herramientas_reparacion')}
          >
            <Wrench className="w-4 h-4" />
          </button>
          
          <button
            onClick={loadServices}
            className="flex items-center px-3 py-2 rounded-lg transition-colors theme-transition"
            style={{
              backgroundColor: colors?.background || '#f8fafc',
              color: colors?.textSecondary || '#6b7280',
            }}
            title={t('actualizar_datos')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingService(null);
            }}
            className="flex items-center px-4 py-2 text-white rounded-lg transition-colors theme-transition"
            style={{ backgroundColor: colors?.primary || '#0ea5e9' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('agregar_servicio')}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div 
          className="p-4 rounded-lg border theme-transition"
          style={{
            backgroundColor: 
              message.type === 'success' ? `${colors?.success || '#10b981'}0d` :
              message.type === 'warning' ? `${colors?.warning || '#f59e0b'}0d` :
              `${colors?.error || '#ef4444'}0d`,
            borderColor: 
              message.type === 'success' ? `${colors?.success || '#10b981'}33` :
              message.type === 'warning' ? `${colors?.warning || '#f59e0b'}33` :
              `${colors?.error || '#ef4444'}33`,
            color: 
              message.type === 'success' ? colors?.success || '#10b981' :
              message.type === 'warning' ? colors?.warning || '#f59e0b' :
              colors?.error || '#ef4444'
          }}
        >
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Repair Tools */}
      {showRepairTools && (
        <div 
          className="p-4 rounded-lg border theme-transition"
          style={{
            backgroundColor: `${colors?.warning || '#f59e0b'}0d`,
            borderColor: `${colors?.warning || '#f59e0b'}33`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="font-semibold theme-transition flex items-center"
              style={{ color: colors?.warning || '#f59e0b' }}
            >
              <Wrench className="w-5 h-5 mr-2" />
              Herramientas de Reparación
            </h3>
            <button
              onClick={() => setShowRepairTools(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white bg-opacity-50 p-4 rounded-lg">
              <p className="text-sm mb-4" style={{ color: colors?.text || '#1f2937' }}>
                Estas herramientas te permiten reparar problemas de sincronización de servicios entre navegadores.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleRepairServices}
                  disabled={repairLoading || !currentTenant}
                  className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {repairLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-2" />
                  )}
                  Reparar Servicios
                </button>
                
                <button
                  onClick={() => {
                    debugServicesData(currentTenant?.id);
                    setMessage({ type: 'info', text: 'Información de debug mostrada en consola' } as any);
                  }}
                  disabled={!currentTenant}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Debug Servicios
                </button>
                
                <button
                  onClick={() => {
                    syncDataAcrossBrowsers();
                    setMessage({ type: 'success', text: 'Datos sincronizados entre navegadores' });
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Datos
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p><strong>Nota:</strong> Usa estas herramientas si tienes problemas con la sincronización de servicios entre diferentes navegadores.</p>
                <p>Tenant ID: {currentTenant?.id || "No hay negocio seleccionado"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          />
          <input
            type="text"
            placeholder={t('buscar_servicios')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
            style={{ 
              border: `1px solid ${colors?.border || '#e5e7eb'}`,
              backgroundColor: colors?.background || '#f8fafc',
              color: colors?.text || '#1f2937'
            }}
          />
        </div>
        
        <div className="relative">
          <Filter 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ServiceCategory | 'all')}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
            style={{ 
              border: `1px solid ${colors?.border || '#e5e7eb'}`,
              backgroundColor: colors?.background || '#f8fafc',
              color: colors?.text || '#1f2937'
            }}
          >
            <option value="all">{t('todas_las_categorias')}</option>
            {serviceCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <CheckCircle 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          />
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
            style={{ 
              border: `1px solid ${colors?.border || '#e5e7eb'}`,
              backgroundColor: colors?.background || '#f8fafc',
              color: colors?.text || '#1f2937'
            }}
          >
            <option value="all">{t('todos_los_estados')}</option>
            <option value="active">{t('solo_activos')}</option>
            <option value="inactive">{t('solo_inactivos')}</option>
          </select>
        </div>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length === 0 ? (
          <div 
            className="col-span-full text-center py-12 theme-transition"
            style={{ backgroundColor: colors?.surface || '#ffffff' }}
          >
            <Scissors 
              className="w-12 h-12 mx-auto mb-4 theme-transition"
              style={{ color: colors?.textSecondary || '#6b7280' }}
            />
            <h3 
              className="text-lg font-medium mb-2 theme-transition"
              style={{ color: colors?.text || '#1f2937' }}
            >
              {t('no_se_encontraron_servicios')}
            </h3>
            <p className="theme-transition" style={{ color: colors?.textSecondary || '#6b7280' }}>
              {searchTerm || filterCategory !== 'all' || filterActive !== 'all' 
                ? t('intenta_cambiar_filtros') 
                : t('agrega_servicios_para_comenzar')}
            </p>
          </div>
        ) : (
          filteredServices.map(service => (
            <ServiceCard 
              key={service.id}
              service={service}
              onEdit={() => {
                setEditingService(service);
                setShowAddForm(true);
              }}
              onDelete={() => handleDeleteService(service.id)}
              colors={colors}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <ServiceForm 
          service={editingService}
          onSave={handleSaveService}
          onCancel={() => {
            setShowAddForm(false);
            setEditingService(null);
          }}
          loading={loading}
          colors={colors}
        />
      )}
    </div>
  );
};

// Service Card Component
interface ServiceCardProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  colors?: any;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onDelete, colors }) => {
  const category = serviceCategories.find(c => c.id === service.category);
  const { t } = useTranslation();
  return (
    <div 
      className="rounded-xl shadow-lg overflow-hidden theme-transition"
      style={{ backgroundColor: colors?.surface || '#ffffff' }}
    >
      <div 
        className="p-4 theme-transition"
        style={{ 
          backgroundColor: service.isActive !== false 
            ? `${colors?.primary || '#0ea5e9'}0d` 
            : `${colors?.error || '#ef4444'}0d`
        }}
      >
        <div className="flex items-center justify-between">
          <h3 
            className="text-lg font-semibold theme-transition"
            style={{ color: colors?.text || '#1f2937' }}
          >
            {service.name}
          </h3>
          <div 
            className="px-2 py-1 rounded-full text-xs font-medium theme-transition"
            style={{ 
              backgroundColor: service.isActive !== false 
                ? `${colors?.success || '#10b981'}1a` 
                : `${colors?.error || '#ef4444'}1a`,
              color: service.isActive !== false 
                ? colors?.success || '#10b981' 
                : colors?.error || '#ef4444'
            }}
          >
            {service.isActive !== false ? t('activo') : t('inactivo')}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p 
          className="text-sm mb-4 line-clamp-2 theme-transition"
          style={{ color: colors?.textSecondary || '#6b7280' }}
        >
          {service.description || t('sin_descripcion')}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center">
              <DollarSign 
                className="w-4 h-4 mr-1 theme-transition"
                style={{ color: colors?.primary || '#0ea5e9' }}
              />
              <span 
                className="text-sm font-medium theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('precio')}
              </span>
            </div>
            <p 
              className="text-lg font-bold theme-transition"
              style={{ color: colors?.primary || '#0ea5e9' }}
            >
              ${service.price}
            </p>
          </div>
          
          <div>
            <div className="flex items-center">
              <Clock 
                className="w-4 h-4 mr-1 theme-transition"
                style={{ color: colors?.secondary || '#06b6d4' }}
              />
              <span 
                className="text-sm font-medium theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('duracion')}
              </span>
            </div>
            <p 
              className="text-lg font-bold theme-transition"
              style={{ color: colors?.secondary || '#06b6d4' }}
            >
              {service.duration} {t('min')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <Tag 
            className="w-4 h-4 mr-1 theme-transition"
            style={{ color: colors?.accent || '#3b82f6' }}
          />
          <span 
            className="text-sm font-medium theme-transition"
            style={{ color: colors?.text || '#1f2937' }}
          >
            {t('categoria')}:
          </span>
          <span 
            className="ml-2 px-2 py-1 rounded-full text-xs font-medium theme-transition"
            style={{ 
              backgroundColor: `${colors?.accent || '#3b82f6'}1a`,
              color: colors?.accent || '#3b82f6'
            }}
          >
            {category?.name || service.category}
          </span>
        </div>
        
        <div className="flex justify-between pt-4 border-t theme-transition" style={{ borderColor: colors?.border || '#e5e7eb' }}>
          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-lg transition-colors theme-transition"
            style={{ 
              backgroundColor: `${colors?.primary || '#0ea5e9'}1a`,
              color: colors?.primary || '#0ea5e9'
            }}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg transition-colors theme-transition"
            style={{ 
              backgroundColor: `${colors?.error || '#ef4444'}1a`,
              color: colors?.error || '#ef4444'
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Service Form Component
interface ServiceFormProps {
  service: Service | null;
  onSave: (service: Service) => void;
  onCancel: () => void;
  loading: boolean;
  colors?: any;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ service, onSave, onCancel, loading, colors }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Service>({
    id: service?.id || '',
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 30,
    category: service?.category || 'servicios-cabello',
    isActive: service?.isActive !== false,
    createdAt: service?.createdAt || new Date().toISOString(),
    updatedAt: service?.updatedAt || new Date().toISOString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto theme-transition"
        style={{ backgroundColor: colors?.surface || '#ffffff' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-xl font-semibold theme-transition"
              style={{ color: colors?.text || '#1f2937' }}
            >
              {service ? t('editar_servicio') : t('nuevo_servicio')}
            </h3>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg transition-colors theme-transition"
              style={{ color: colors?.textSecondary || '#6b7280' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
            <div>
              <label 
                className="block text-sm font-medium mb-2 theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('nombre_servicio')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                style={{ 
                  border: `1px solid ${colors?.border || '#e5e7eb'}`,
                  backgroundColor: colors?.background || '#f8fafc',
                  color: colors?.text || '#1f2937'
                }}
                required
              />
            </div>
            
            {/* Category */}
            <div>
              <label 
                className="block text-sm font-medium mb-2 theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('categoria')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                style={{ 
                  border: `1px solid ${colors?.border || '#e5e7eb'}`,
                  backgroundColor: colors?.background || '#f8fafc',
                  color: colors?.text || '#1f2937'
                }}
                required
              >
                {serviceCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Price and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('precio')} ({t('dolar')})
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                  style={{ 
                    border: `1px solid ${colors?.border || '#e5e7eb'}`,
                    backgroundColor: colors?.background || '#f8fafc',
                    color: colors?.text || '#1f2937'
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('duracion')} ({t('minutos')})
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                  style={{ 
                    border: `1px solid ${colors?.border || '#e5e7eb'}`,
                    backgroundColor: colors?.background || '#f8fafc',
                    color: colors?.text || '#1f2937'
                  }}
                  min="5"
                  step="5"
                  required
                />
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label 
                className="block text-sm font-medium mb-2 theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('descripcion')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                style={{ 
                  border: `1px solid ${colors?.border || '#e5e7eb'}`,
                  backgroundColor: colors?.background || '#f8fafc',
                  color: colors?.text || '#1f2937'
                }}
                rows={3}
              />
            </div>
            
            {/* Active Status */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded theme-transition"
                  style={{ accentColor: colors?.primary || '#0ea5e9' }}
                />
                <span 
                  className="text-sm font-medium theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('servicio_activo')}
                </span>
              </label>
              <p 
                className="text-xs mt-1 theme-transition"
                style={{ color: colors?.textSecondary || '#6b7280' }}
              >
                {t('servicios_inactivos_no_aparecen')}
              </p>
            </div>
            
            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border rounded-lg transition-colors theme-transition"
                style={{ 
                  color: colors?.textSecondary || '#6b7280',
                  borderColor: colors?.border || '#e5e7eb',
                  backgroundColor: colors?.background || '#f8fafc'
                }}
                disabled={loading}
              >
                {t('cancelar')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center theme-transition"
                style={{ backgroundColor: colors?.primary || '#0ea5e9' }}
                disabled={loading || !formData.name || formData.price <= 0 || formData.duration <= 0}
              >
                {loading ? (
                  <div 
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? t('guardando') : t('guardar_servicio')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServicesManager;