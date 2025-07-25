import React, { useState, useEffect } from 'react';
import { 
  Key, 
  User, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  History,
  Lock,
  UserCheck,
  Clock,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { AdminUser } from '../types';
import { 
  getCurrentUser, 
  changePassword, 
  changeUsername, 
  validatePassword, 
  validateUsername,
  getCredentialUpdates,
  getLastCredentialUpdate,
  repairAuth
} from '../utils/auth';
import { getCurrentTenant } from '../utils/tenantManager';
import { useTranslation } from 'react-i18next';


const CredentialsManager: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<'password' | 'username' | 'history' | 'repair'>('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { t } = useTranslation();


  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Username change state
  const [usernameData, setUsernameData] = useState({
    currentPassword: '',
    newUsername: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // History state
  const [credentialHistory, setCredentialHistory] = useState(getCredentialUpdates());
  const [lastUpdates, setLastUpdates] = useState(getLastCredentialUpdate(currentUser?.id || ''));

  // Repair state
  const [repairData, setRepairData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showRepairPasswords, setShowRepairPasswords] = useState({
    password: false,
    confirm: false
  });
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairMessage, setRepairMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current tenant
  const currentTenant = getCurrentTenant();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (repairMessage) {
      const timer = setTimeout(() => setRepairMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [repairMessage]);

  useEffect(() => {
    // Refresh data when tab changes
    setCredentialHistory(getCredentialUpdates());
    if (currentUser) {
      setLastUpdates(getLastCredentialUpdate(currentUser.id));
    }
  }, [activeTab, currentUser]);

  const handlePasswordChange = async () => {
    if (!currentUser) return;

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: t('credentialsManager.allFieldsRequired') });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: t('credentialsManager.passwordsDoNotMatch') });
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setMessage({ type: 'error', text: t('credentialsManager.newPasswordMustBeDifferent') });
      return;
    }

    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      setMessage({ type: 'error', text: passwordValidation.errors.join(', ') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        currentUser
      );

      if (result.success) {
        setMessage({ type: 'success', text: t('credentialsManager.passwordUpdated') });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setCredentialHistory(getCredentialUpdates());
        setLastUpdates(getLastCredentialUpdate(currentUser.id));
      } else {
        setMessage({ type: 'error', text: result.error || t('credentialsManager.errorChangingPassword') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('credentialsManager.systemErrorChangingPassword') });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!currentUser) return;

    // Validation
    if (!usernameData.currentPassword || !usernameData.newUsername) {
      setMessage({ type: 'error', text: t('credentialsManager.allFieldsRequired') });
      return;
    }

    if (usernameData.newUsername === currentUser.username) {
      setMessage({ type: 'error', text: t('credentialsManager.newUsernameMustBeDifferent') });
      return;
    }

    const usernameValidation = validateUsername(usernameData.newUsername);
    if (!usernameValidation.isValid) {
      setMessage({ type: 'error', text: usernameValidation.errors.join(', ') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await changeUsername(
        usernameData.currentPassword,
        usernameData.newUsername,
        currentUser
      );

      if (result.success) {
        setMessage({ type: 'success', text: t('credentialsManager.usernameUpdated') });
        setUsernameData({ currentPassword: '', newUsername: '' });
        setCurrentUser(getCurrentUser()); // Refresh current user data
        setCredentialHistory(getCredentialUpdates());
        setLastUpdates(getLastCredentialUpdate(currentUser.id));
      } else {
        setMessage({ type: 'error', text: result.error || t('credentialsManager.errorChangingUsername') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('credentialsManager.systemErrorChangingUsername') });
    } finally {
      setLoading(false);
    }
  };

  const handleRepairCredentials = async () => {
    if (!currentTenant) {
      setRepairMessage({ type: 'error', text: t('credentialsManager.noTenantSelected') });
      return;
    }

    // Validation
    if (!repairData.email || !repairData.password || !repairData.confirmPassword) {
      setRepairMessage({ type: 'error', text: t('credentialsManager.allFieldsRequired') });
      return;
    }

    if (repairData.password !== repairData.confirmPassword) {
      setRepairMessage({ type: 'error', text: t('credentialsManager.passwordsDoNotMatch') });
      return;
    }

    const passwordValidation = validatePassword(repairData.password);
    if (!passwordValidation.isValid) {
      setRepairMessage({ type: 'error', text: passwordValidation.errors.join(', ') });
      return;
    }

    setRepairLoading(true);
    setRepairMessage(null);

    try {
      const result = await repairAuth(
        currentTenant.slug,
        repairData.email,
        repairData.password
      );

      if (result.success) {
        setRepairMessage({ type: 'success', text: t('credentialsManager.credentialsRepaired') });
        setRepairData({ email: '', password: '', confirmPassword: '' });
      } else {
        setRepairMessage({ type: 'error', text: result.error || t('credentialsManager.errorRepairingCredentials') });
      }
    } catch (error) {
      setRepairMessage({ type: 'error', text: t('credentialsManager.systemErrorRepairingCredentials') });
    } finally {
      setRepairLoading(false);
    }
  };

  const passwordValidation = validatePassword(passwordData.newPassword);
  const usernameValidation = validateUsername(usernameData.newUsername);
  const repairPasswordValidation = validatePassword(repairData.password);

  if (!currentUser) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('credentialsManager.accessDenied')}</h3>
          <p className="text-gray-600">{t('credentialsManager.couldNotVerifyIdentity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Key className="w-8 h-8 mr-3 text-blue-600" />
            {t('credentialsManager.title')}
          </h2>
          <p className="text-gray-600 mt-1">
            {t('credentialsManager.subtitle')}
          </p>
          {currentTenant && (
            <p className="text-sm text-blue-600 mt-1">
              {t('credentialsManager.tenant')}: {currentTenant.name}
            </p>
          )}
        </div>
        
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
          <div className="flex items-center">
            <UserCheck className="w-4 h-4 mr-2" />
            <span className="font-medium">{currentUser.username}</span>
          </div>
        </div>
      </div>

      {/* Last Updates Info */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          {t('credentialsManager.lastUpdates')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">{t('credentialsManager.username')}:</span>
            <p className="text-blue-600">
              {lastUpdates.username 
                ? new Date(lastUpdates.username).toLocaleString('es-ES')
                : t('credentialsManager.neverUpdated')
              }
            </p>
          </div>
          <div>
            <span className="text-blue-700 font-medium">{t('credentialsManager.password')}:</span>
            <p className="text-blue-600">
              {lastUpdates.password 
                ? new Date(lastUpdates.password).toLocaleString('es-ES')
                : t('credentialsManager.neverUpdated')
              }
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'password', label: t('credentialsManager.changePasswordTab'), icon: Lock },
              { id: 'username', label: t('credentialsManager.changeUsernameTab'), icon: User }, 
              { id: 'history', label: t('credentialsManager.historyTab'), icon: History },
              { id: 'repair', label: t('credentialsManager.repairTab'), icon: Wrench }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            </div>
          )}

          {/* Password Change Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">{t('credentialsManager.securityRequirements')}</h4>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• {t('credentialsManager.min8Chars')}</li>
                      <li>• {t('credentialsManager.lowerUpper')}</li>
                      <li>• {t('credentialsManager.atLeastOneNumber')}</li>
                      <li>• {t('credentialsManager.atLeastOneSpecial')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.currentPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterCurrentPassword')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.newPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterNewPassword')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Password Validation */}
                  {passwordData.newPassword && !passwordValidation.isValid && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-2">{t('credentialsManager.passwordErrors')}</p>
                      <ul className="text-xs space-y-1">
                        {passwordValidation.errors.map((error, index) => (
                          <li key={index} className="flex items-center text-red-700">
                            <AlertCircle className="w-3 h-3 mr-2" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.confirmNewPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.confirmNewPasswordPlaceholder')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t('credentialsManager.passwordsDoNotMatch')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={loading || !passwordValidation.isValid || passwordData.newPassword !== passwordData.confirmPassword}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {loading ? t('credentialsManager.updating') : t('credentialsManager.updatePassword')}
                </button>
              </div>
            </div>
          )}

          {/* Username Change Tab */}
          {activeTab === 'username' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <User className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">{t('credentialsManager.importantInfo')}</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {t('credentialsManager.changingUsernameLogsOut')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.currentUsername')}
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="font-medium text-gray-900">{currentUser.username}</span>
                  </div>
                </div>

                {/* New Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.newUsername')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={usernameData.newUsername}
                      onChange={(e) => setUsernameData(prev => ({ ...prev, newUsername: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterNewUsername')}
                      disabled={loading}
                    />
                  </div>
                  
                  {/* Username Validation */}
                  {usernameData.newUsername && !usernameValidation.isValid && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-2">{t('credentialsManager.usernameErrors')}</p>
                      <ul className="text-xs space-y-1">
                        {usernameValidation.errors.map((error, index) => (
                          <li key={index} className="flex items-center text-red-700">
                            <AlertCircle className="w-3 h-3 mr-2" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Current Password for Verification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.currentPasswordForVerification')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={usernameData.currentPassword}
                      onChange={(e) => setUsernameData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterCurrentPassword')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleUsernameChange}
                  disabled={loading || !usernameValidation.isValid || !usernameData.currentPassword}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {loading ? t('credentialsManager.updating') : t('credentialsManager.updateUsername')}
                </button>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('credentialsManager.credentialHistory')}</h3>
                <span className="text-sm text-gray-500">
                  {credentialHistory.length} {t('credentialsManager.record', { count: credentialHistory.length })}
                </span>
              </div>

              {credentialHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {credentialHistory.slice().reverse().map((update: any) => (
                    <div key={update.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {update.type === 'password' ? t('credentialsManager.passwordUpdatedHistory') : t('credentialsManager.usernameUpdatedHistory')}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(update.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p><strong>{t('credentialsManager.user')}:</strong> {update.userId}</p>
                        <p><strong>{t('credentialsManager.ip')}:</strong> {update.ipAddress}</p>
                        <p><strong>{t('credentialsManager.browser')}:</strong> {update.userAgent.substring(0, 50)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{t('credentialsManager.noCredentialChanges')}</p>
                </div>
              )}
            </div>
          )}

          {/* Repair Tab */}
          {activeTab === 'repair' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Wrench className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">{t('credentialsManager.repairTool')}</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t('credentialsManager.repairToolDescription')}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      <strong>{t('credentialsManager.currentTenant')}:</strong> {currentTenant?.name || t('credentialsManager.noTenantSelected')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Repair Message Display */}
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

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.emailOrUsername')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={repairData.email}
                      onChange={(e) => setRepairData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterEmail')}
                      disabled={repairLoading}
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.newPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showRepairPasswords.password ? 'text' : 'password'}
                      value={repairData.password}
                      onChange={(e) => setRepairData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.enterNewPassword')}
                      disabled={repairLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepairPasswords(prev => ({ ...prev, password: !prev.password }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showRepairPasswords.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Password Validation */}
                  {repairData.password && !repairPasswordValidation.isValid && (
                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800 mb-2">{t('credentialsManager.passwordErrors')}</p>
                      <ul className="text-xs space-y-1">
                        {repairPasswordValidation.errors.map((error, index) => (
                          <li key={index} className="flex items-center text-red-700">
                            <AlertCircle className="w-3 h-3 mr-2" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('credentialsManager.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showRepairPasswords.confirm ? 'text' : 'password'}
                      value={repairData.confirmPassword}
                      onChange={(e) => setRepairData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('credentialsManager.confirmPasswordPlaceholder')}
                      disabled={repairLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepairPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showRepairPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {repairData.confirmPassword && repairData.password !== repairData.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t('credentialsManager.passwordsDoNotMatch')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleRepairCredentials}
                  disabled={
                    repairLoading || 
                    !repairData.email || 
                    !repairPasswordValidation.isValid || 
                    repairData.password !== repairData.confirmPassword
                  }
                  className="w-full flex items-center justify-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {repairLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-2" />
                  )}
                  {repairLoading ? t('credentialsManager.repairing') : t('credentialsManager.repairCredentials')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialsManager;