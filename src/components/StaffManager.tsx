import React, { useState, useEffect } from 'react';
import { 
  UserCog, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Star, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Wrench
} from 'lucide-react';
import { StaffMember, ServiceCategory } from '../types';
import { serviceCategories } from '../data/services';
import { useTheme } from '../hooks/useTheme';
import { useStaffData } from '../hooks/useStaffData';
import { saveStaffMember, deleteStaffMember, repairTenantStaffData } from '../utils/staffDataManager';
import { handleStaffDeletion } from '../utils/staffIntegrity';
import { getCurrentTenant } from '../utils/tenantManager';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';


const StaffManager: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<ServiceCategory | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [showRepairTools, setShowRepairTools] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  
  const { t } = useTranslation();

  const { colors } = useTheme();
  const { staff, loading: staffLoading, refreshData } = useStaffData();
  const currentTenant = getCurrentTenant();

  useEffect(() => {
    if (!staffLoading) {
      setStaffMembers(staff);
    }
  }, [staff, staffLoading]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSaveStaff = async (staffData: StaffMember) => {
    setLoading(true);
    setMessage(null);
    try {
      // Validar que specialties no esté vacío
      if (!staffData.specialties || staffData.specialties.length === 0) {
        setMessage({ type: 'error', text: t('selecciona_al_menos_una_especialidad') });
        setLoading(false);
        return;
      }
      // Validar que schedule sea un objeto
      if (!staffData.schedule || typeof staffData.schedule !== 'object') {
        setMessage({ type: 'error', text: t('horario_invalido') });
        setLoading(false);
        return;
      }
      // Usar UUID para el id si es nuevo
      const isNew = !staffData.id || staffData.id.length < 20;
      const newStaff: StaffMember = {
        ...staffData,
        id: isNew ? uuidv4() : staffData.id,
        createdAt: isNew ? new Date().toISOString() : staffData.createdAt,
        updatedAt: new Date().toISOString(),
        // Mapear imagen al campo correcto si es necesario
        image: staffData.image || '',
      };
      // Guardar primero en Supabase
      const supabaseResult = await saveStaffMember(newStaff, currentTenant?.id);
      if (!supabaseResult.ok) {
        setMessage({ type: 'error', text: supabaseResult.errorMsg || t('error_guardar_especialista') });
        setLoading(false);
        return;
      }
      setMessage({ type: 'success', text: t('especialista_guardado') });
      refreshData();
      setEditingStaff(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving staff:', error);
      setMessage({ type: 'error', text: t('error_guardar_especialista') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffMember: StaffMember) => {
    if (window.confirm(t('confirmar_eliminar_especialista', { name: staffMember.name }))) {
      setLoading(true);
      try {
        // Handle staff deletion with integrity checks
        const result = handleStaffDeletion(staffMember, 'cancel');
        
        if (result.success) {
          // Delete the staff member
          deleteStaffMember(staffMember.id, currentTenant?.id);
          setMessage({ 
            type: 'success', 
            text: t('especialista_eliminado')
          });
          refreshData();
        } else {
          setMessage({ type: 'error', text: t('error_eliminar_especialista') });
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
        setMessage({ type: 'error', text: t('error_eliminar_especialista') });
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para reparar datos de personal
  const handleRepairStaffData = async () => {
    if (!currentTenant) {
      setMessage({ type: 'error', text: t('no_negocio_seleccionado') });
      return;
    }
    
    if (window.confirm(t('confirmar_reparar_personal', { name: currentTenant.name }))) {
      setRepairLoading(true);
      try {
        const success = repairTenantStaffData(currentTenant.id);
        
        if (success) {
          setMessage({ type: 'success', text: t('personal_reparado') });
          refreshData();
        } else {
          setMessage({ type: 'error', text: t('error_reparar_personal') });
        }
      } catch (error) {
        console.error('Error repairing staff data:', error);
        setMessage({ type: 'error', text: t('error_reparar_personal') });
      } finally {
        setRepairLoading(false);
      }
    }
  };

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = 
      filterSpecialty === 'all' || 
      staff.specialties.includes(filterSpecialty);
    
    const matchesActive = 
      filterActive === 'all' || 
      (filterActive === 'active' && staff.isActive) || 
      (filterActive === 'inactive' && !staff.isActive);
    
    return matchesSearch && matchesSpecialty && matchesActive;
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
            <UserCog className="w-8 h-8 mr-3" style={{ color: colors?.accent || '#3b82f6' }} />
            {t('gestion_personal')}
          </h2>
          <p 
            className="mt-1 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          >
            {t('administra_personal')}
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
            onClick={refreshData}
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
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 text-white rounded-lg transition-colors theme-transition"
            style={{ backgroundColor: colors?.accent || '#3b82f6' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('agregar_especialista')}
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
              {t('herramientas_reparacion')}
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
                {t('herramientas_reparacion_descripcion')}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleRepairStaffData}
                  disabled={repairLoading || !currentTenant}
                  className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {repairLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-2" />
                  )}
                  {t('reiniciar_personal')}
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p><strong>{t('nota_reparacion')}:</strong> {t('reiniciar_personal_descripcion')}</p>
                <p>{t('tenant_id')}: {currentTenant?.id || t('no_negocio_seleccionado')}</p>
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
            placeholder={t('buscar_personal')}
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
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value as ServiceCategory | 'all')}
            className="w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
            style={{ 
              border: `1px solid ${colors?.border || '#e5e7eb'}`,
              backgroundColor: colors?.background || '#f8fafc',
              color: colors?.text || '#1f2937'
            }}
          >
            <option value="all">{t('todas_especialidades')}</option>
            {serviceCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <Users 
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
            <option value="all">{t('todos_estados')}</option>
            <option value="active">{t('solo_activos')}</option>
            <option value="inactive">{t('solo_inactivos')}</option>
          </select>
        </div>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffLoading ? (
          <div 
            className="col-span-full text-center py-12 theme-transition"
            style={{ backgroundColor: colors?.surface || '#ffffff' }}
          >
            <div 
              className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
              style={{ 
                borderColor: `${colors?.border || '#e5e7eb'}`,
                borderTopColor: colors?.primary || '#0ea5e9'
              }}
            ></div>
            <p style={{ color: colors?.textSecondary || '#6b7280' }}>{t('cargando_personal')}</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div 
            className="col-span-full text-center py-12 theme-transition"
            style={{ backgroundColor: colors?.surface || '#ffffff' }}
          >
            <UserCog 
              className="w-12 h-12 mx-auto mb-4 theme-transition"
              style={{ color: colors?.textSecondary || '#6b7280' }}
            />
            <h3 
              className="text-lg font-medium mb-2 theme-transition"
              style={{ color: colors?.text || '#1f2937' }}
            >
              {t('no_especialistas_encontrados')}
            </h3>
            <p className="theme-transition" style={{ color: colors?.textSecondary || '#6b7280' }}>
              {searchTerm || filterSpecialty !== 'all' || filterActive !== 'all' 
                ? t('intenta_cambiar_filtros') 
                : t('agrega_especialistas')}
            </p>
          </div>
        ) : (
          filteredStaff.map(staff => (
            <StaffCard 
              key={staff.id} 
              staff={staff}
              onEdit={() => setEditingStaff(staff)}
              onDelete={() => handleDeleteStaff(staff)}
              colors={colors}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingStaff) && (
        <StaffForm 
          staff={editingStaff}
          onSave={handleSaveStaff}
          onCancel={() => {
            setShowAddForm(false);
            setEditingStaff(null);
          }}
          loading={loading}
          colors={colors}
        />
      )}
    </div>
  );
};

// Staff Card Component
interface StaffCardProps {
  staff: StaffMember;
  onEdit: () => void;
  onDelete: () => void;
  colors?: any;
}

const StaffCard: React.FC<StaffCardProps> = ({ staff, onEdit, onDelete, colors }) => {
  const { t } = useTranslation();
  return (
    <div 
      className="rounded-xl shadow-lg overflow-hidden theme-transition"
      style={{ backgroundColor: colors?.surface || '#ffffff' }}
    >
      {/* Header with Image */}
      <div className="relative h-48">
        <img 
          src={staff.image || 'https://via.placeholder.com/400x200?text=No+Image'} 
          alt={staff.name}
          className="w-full h-full object-cover"
        />
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4"
        >
          <div>
            <h3 className="text-xl font-bold text-white">{staff.name}</h3>
            <p className="text-white/80">{staff.role}</p>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div 
          className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium theme-transition"
          style={{ 
            backgroundColor: staff.isActive 
              ? `${colors?.success || '#10b981'}cc` 
              : `${colors?.error || '#ef4444'}cc`,
            color: 'white'
          }}
        >
          {staff.isActive ? t('activo') : t('inactivo')}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Specialties */}
        <div className="mb-4">
          <h4 
            className="text-sm font-medium mb-2 theme-transition"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          >
            {t('especialidades')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {staff.specialties.map(specialty => {
              const category = serviceCategories.find(c => c.id === specialty);
              return (
                <span 
                  key={specialty}
                  className="px-2 py-1 rounded-full text-xs font-medium theme-transition"
                  style={{ 
                    backgroundColor: `${colors?.primary || '#0ea5e9'}1a`,
                    color: colors?.primary || '#0ea5e9'
                  }}
                >
                  {t('categoria_' + (category?.id || specialty))}
                </span>
              );
            })}
          </div>
        </div>
        
        {/* Stats */}
        <div 
          className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-lg theme-transition"
          style={{ backgroundColor: colors?.background || '#f8fafc' }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Star 
                className="w-4 h-4 mr-1 theme-transition"
                style={{ color: colors?.warning || '#f59e0b' }}
              />
              <span 
                className="font-semibold theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {staff.rating}
              </span>
            </div>
            <p 
              className="text-xs mt-1 theme-transition"
              style={{ color: colors?.textSecondary || '#6b7280' }}
            >
              {t('calificacion')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Calendar 
                className="w-4 h-4 mr-1 theme-transition"
                style={{ color: colors?.primary || '#0ea5e9' }}
              />
              <span 
                className="font-semibold theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {staff.completedServices}
              </span>
            </div>
            <p 
              className="text-xs mt-1 theme-transition"
              style={{ color: colors?.textSecondary || '#6b7280' }}
            >
              {t('servicios')}
            </p>
          </div>
        </div>
        
        {/* Bio */}
        <div className="mb-4">
          <p 
            className="text-sm theme-transition line-clamp-2"
            style={{ color: colors?.textSecondary || '#6b7280' }}
          >
            {staff.bio || t('sin_biografia')}
          </p>
        </div>
        
        {/* Experience */}
        <div 
          className="text-sm mb-4 theme-transition"
          style={{ color: colors?.text || '#1f2937' }}
        >
          <span className="font-medium">{t('experiencia')}:</span> {staff.experience}
        </div>
        
        {/* Actions */}
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

// Staff Form Component
interface StaffFormProps {
  staff: StaffMember | null;
  onSave: (staff: StaffMember) => void;
  onCancel: () => void;
  loading: boolean;
  colors?: any;
}

const StaffForm: React.FC<StaffFormProps> = ({ staff, onSave, onCancel, loading, colors }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StaffMember>({
    id: staff?.id || '',
    name: staff?.name || '',
    role: staff?.role || '',
    specialties: staff?.specialties || [],
    bio: staff?.bio || '',
    experience: staff?.experience || '',
    image: staff?.image || '',
    isActive: staff?.isActive !== false,
    schedule: staff?.schedule || {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '10:00', end: '16:00', available: true },
      sunday: { start: '10:00', end: '14:00', available: false }
    },
    rating: staff?.rating || 5.0,
    completedServices: staff?.completedServices || 0,
    createdAt: staff?.createdAt || new Date().toISOString(),
    updatedAt: staff?.updatedAt || new Date().toISOString()
  });

  const handleSpecialtyToggle = (specialty: ServiceCategory) => {
    if (formData.specialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: formData.specialties.filter(s => s !== specialty)
      });
    } else {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialty]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto theme-transition"
        style={{ backgroundColor: colors?.surface || '#ffffff' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-xl font-semibold theme-transition"
              style={{ color: colors?.text || '#1f2937' }}
            >
              {staff ? t('editar_especialista') : t('nuevo_especialista')}
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
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('nombre_completo')}
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
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('cargo_rol')}
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                  style={{ 
                    border: `1px solid ${colors?.border || '#e5e7eb'}`,
                    backgroundColor: colors?.background || '#f8fafc',
                    color: colors?.text || '#1f2937'
                  }}
                  required
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
  <label 
    className="block text-sm font-medium mb-2 theme-transition"
    style={{ color: colors?.text || '#1f2937' }}
  >
    {t('imagen')}
  </label>
  
  {/* Input para archivo de imagen */}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, image: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    }}
    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
    style={{ 
      border: `1px solid ${colors?.border || '#e5e7eb'}`,
      backgroundColor: colors?.background || '#f8fafc',
      color: colors?.text || '#1f2937'
    }}
  />

  {/* Vista previa de la imagen */}
  {formData.image && (
    <img
      src={formData.image}
      alt="Vista previa"
      className="mt-2 rounded-lg object-cover"
      style={{ width: 150, height: 150 }}
    />
  )}

  <p 
    className="text-xs mt-1 theme-transition"
    style={{ color: colors?.textSecondary || '#6b7280' }}
  >
    {t('recomendado_imagen')}
  </p>
</div>


            {/* Bio */}
            <div>
              <label 
                className="block text-sm font-medium mb-2 theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('biografia')}
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                style={{ 
                  border: `1px solid ${colors?.border || '#e5e7eb'}`,
                  backgroundColor: colors?.background || '#f8fafc',
                  color: colors?.text || '#1f2937'
                }}
                rows={3}
              />
            </div>

            {/* Experience and Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('experiencia')}
                </label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                  style={{ 
                    border: `1px solid ${colors?.border || '#e5e7eb'}`,
                    backgroundColor: colors?.background || '#f8fafc',
                    color: colors?.text || '#1f2937'
                  }}
                  placeholder={t('ej_experiencia')}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || '#1f2937' }}
                >
                  {t('calificacion')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:border-transparent theme-transition"
                  style={{ 
                    border: `1px solid ${colors?.border || '#e5e7eb'}`,
                    backgroundColor: colors?.background || '#f8fafc',
                    color: colors?.text || '#1f2937'
                  }}
                />
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label 
                className="block text-sm font-medium mb-2 theme-transition"
                style={{ color: colors?.text || '#1f2937' }}
              >
                {t('especialidades')}
              </label>
              <div 
                className="p-4 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-3 theme-transition"
                style={{ 
                  backgroundColor: colors?.background || '#f8fafc',
                  border: `1px solid ${colors?.border || '#e5e7eb'}`
                }}
              >
                {serviceCategories.map(category => (
                  <label 
                    key={category.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.specialties.includes(category.id)}
                      onChange={() => handleSpecialtyToggle(category.id)}
                      className="w-4 h-4 rounded theme-transition"
                      style={{ accentColor: colors?.primary || '#0ea5e9' }}
                    />
                    <span 
                      className="text-sm theme-transition"
                      style={{ color: colors?.text || '#1f2937' }}
                    >
                      {t('categoria_' + category.id)}
                    </span>
                  </label>
                ))}
              </div>
              {formData.specialties.length === 0 && (
                <p 
                  className="text-xs mt-1 theme-transition"
                  style={{ color: colors?.error || '#ef4444' }}
                >
                  {t('selecciona_al_menos_una_especialidad')}
                </p>
              )}
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
                  {t('especialista_activo')}
                </span>
              </label>
              <p 
                className="text-xs mt-1 theme-transition"
                style={{ color: colors?.textSecondary || '#6b7280' }}
              >
                {t('especialista_inactivo_descripcion')}
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
                style={{ backgroundColor: colors?.accent || '#3b82f6' }}
                disabled={loading || formData.specialties.length === 0}
              >
                {loading ? (
                  <div 
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? t('guardando') : t('guardar_especialista')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffManager;