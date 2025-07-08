import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Shield, AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import { authenticateUser, validatePassword, repairAuth } from '../utils/auth';
import { AdminUser, AuthSession } from '../types';
import { getCurrentTenant } from '../utils/tenantManager';

interface LoginFormProps {
  onLoginSuccess: (user: AdminUser, session: AuthSession) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [repairMode, setRepairMode] = useState(false);
  const [repairEmail, setRepairEmail] = useState('');
  const [repairPassword, setRepairPassword] = useState('');
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairMessage, setRepairMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const currentTenant = getCurrentTenant();

  useEffect(() => {
    // Check for remembered username for this tenant
    if (currentTenant) {
      const rememberedKey = `remembered-username-${currentTenant.id}`;
      const rememberedUsername = localStorage.getItem(rememberedKey);
      if (rememberedUsername) {
        setFormData(prev => ({ ...prev, username: rememberedUsername }));
        setRememberMe(true);
      }
    }
  }, [currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!currentTenant) {
        setError('No hay negocio seleccionado');
        setLoading(false);
        return;
      }

      const result = await authenticateUser(formData.username, formData.password);

      if (result.success && result.user && result.session) {
        // Handle remember me for this tenant
        const rememberedKey = `remembered-username-${currentTenant.id}`;
        if (rememberMe) {
          localStorage.setItem(rememberedKey, formData.username);
        } else {
          localStorage.removeItem(rememberedKey);
        }

        onLoginSuccess(result.user, result.session);
      } else {
        setError(result.error || 'Error de autenticación');
        
        // Si hay error de autenticación, mostrar opción de reparación
        if (formData.username && formData.password) {
          setTimeout(() => {
            setRepairEmail(formData.username);
            setRepairPassword(formData.password);
          }, 100);
        }
      }
    } catch (err) {
      setError('Error del sistema. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    setShowPasswordRequirements(password.length > 0);
  };

  const handleRepair = async () => {
    if (!currentTenant) {
      setRepairMessage({type: 'error', text: 'No hay negocio seleccionado'});
      return;
    }
    
    setRepairLoading(true);
    setRepairMessage(null);
    
    try {
      const result = await repairAuth(currentTenant.slug, repairEmail, repairPassword);
      
      if (result.success) {
        setRepairMessage({type: 'success', text: 'Credenciales reparadas exitosamente. Intenta iniciar sesión ahora.'});
        setRepairMode(false);
        setFormData({
          username: repairEmail,
          password: repairPassword
        });
      } else {
        setRepairMessage({type: 'error', text: result.error || 'Error al reparar credenciales'});
      }
    } catch (error) {
      console.error("Repair error:", error);
      setRepairMessage({type: 'error', text: 'Error del sistema al reparar credenciales'});
    } finally {
      setRepairLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green=-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900 to-red-600 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Panel Administrativo
            </h1>
            <p className="text-blue-100">
              {currentTenant ? `${currentTenant.name}` : 'Acceso para administradores'}
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {repairMode ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <Wrench className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Reparación de Credenciales</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Esta herramienta reparará tus credenciales para este negocio. Ingresa el email y contraseña que usaste al registrar el negocio.
                      </p>
                    </div>
                  </div>
                </div>

                {repairMessage && (
                  <div className={`p-4 rounded-lg border ${
                    repairMessage.type === 'success' 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {repairMessage.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mr-2" />
                      )}
                      <span className="font-medium">{repairMessage.text}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de Registro
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={repairEmail}
                      onChange={(e) => setRepairEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Email que usaste al registrar"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña de Registro
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={repairPassword}
                      onChange={(e) => setRepairPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Contraseña que estableciste"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setRepairMode(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRepair}
                    disabled={repairLoading || !repairEmail || !repairPassword}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {repairLoading ? 'Reparando...' : 'Reparar Credenciales'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email / Nombre de Usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ingresa tu email o usuario"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ingresa tu contraseña"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {showPasswordRequirements && !passwordValidation.isValid && (
                    <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Requisitos de contraseña:</p>
                      <ul className="text-xs space-y-1">
                        {passwordValidation.errors.map((error, index) => (
                          <li key={index} className="flex items-center text-yellow-700">
                            <AlertCircle className="w-3 h-3 mr-2" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-600">Recordar usuario</span>
                  </label>

                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    disabled={loading}
                    onClick={() => setRepairMode(true)}
                  >
                    ¿Problemas para acceder?
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <div className="mt-2 text-xs text-red-600">
                      <button 
                        onClick={() => setRepairMode(true)}
                        className="font-medium underline"
                      >
                        Haz clic aquí para reparar tus credenciales
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !formData.username || !formData.password}
                  className="w-full bg-gradient-to-r from-red-900 to-red-600 text-white py-3 rounded-xl font-semibold hover:from-red-400 hover:to-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>
            )}

            {/* Security Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Información de Acceso</p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Acceso directo sin restricciones</li>
                    <li>• Sesión extendida (24 horas)</li>
                    {currentTenant ? (
                      <li>• Usa las credenciales que creaste al registrar el negocio</li>
                    ) : (
                      <li>• Contraseña predeterminada: Admin123!</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;