import React, { useState, useEffect } from 'react';
import {
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  History,
  Edit3,
  MapPin,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Globe,
} from 'lucide-react';
import type { SalonSettings as SalonSettingsType } from "../types"
import {
  getSalonSettings,
  saveSalonSettings,
  getSalonSettingsHistory,
  saveSalonSettingsHistory,
  getSalonSettingsFromSupabase,
  saveSalonSettingsToSupabase,
} from "../utils/salonSettings"
import { getCurrentUser } from "../utils/auth"
import { useTheme } from "../hooks/useTheme"
import { getCurrentTenant } from "../utils/tenantManager"
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { useTranslation } from 'react-i18next';

const SalonSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SalonSettingsType>(getSalonSettings())
  const [formData, setFormData] = useState({
    salonName: settings.salonName,
    salonMotto: settings.salonMotto,
    address: settings.address || "Av. Revolución 1234, Zona Centro, Tijuana, BC 22000, México",
    phone: settings.phone || "664-563-6423",
    email: settings.email || "info@bellavitaspa.com",
    whatsapp: settings.whatsapp || "526645636423",
    instagram: settings.instagram || "https://instagram.com/bellavitaspa",
    facebook: settings.facebook || "https://facebook.com/bellavitaspa",
    website: settings.website || "https://bellavitaspa.com",
    logo: settings.logo || "",
    hours: settings.hours || {
      monday: { open: "09:00", close: "19:00", isOpen: true },
      tuesday: { open: "09:00", close: "19:00", isOpen: true },
      wednesday: { open: "09:00", close: "19:00", isOpen: true },
      thursday: { open: "09:00", close: "19:00", isOpen: true },
      friday: { open: "09:00", close: "19:00", isOpen: true },
      saturday: { open: "09:00", close: "18:00", isOpen: true },
      sunday: { open: "10:00", close: "18:00", isOpen: true },
    },
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(getSalonSettingsHistory())
  const [activeTab, setActiveTab] = useState<"basic" | "contact" | "hours">("basic")

  const currentUser = getCurrentUser()
  const currentTenant = getCurrentTenant()

  // Real-time theme
  const { colors } = useTheme()

  const fetchFromSupabase = async () => {
    if (!currentTenant?.id) return;
    try {
      const dbSettings = await getSalonSettingsFromSupabase(currentTenant.id);
      if (dbSettings) {
        setSettings({
          id: dbSettings.id,
          salonName: dbSettings.salon_name,
          salonMotto: dbSettings.salon_motto,
          address: dbSettings.address,
          phone: dbSettings.phone,
          email: dbSettings.email,
          whatsapp: dbSettings.whatsapp,
          instagram: dbSettings.instagram,
          facebook: dbSettings.facebook,
          website: dbSettings.website,
          logo: dbSettings.logo,
          hours: dbSettings.hours,
          updatedAt: dbSettings.updated_at,
          updatedBy: dbSettings.updated_by,
        });
        setFormData({
          salonName: dbSettings.salon_name,
          salonMotto: dbSettings.salon_motto,
          address: dbSettings.address,
          phone: dbSettings.phone,
          email: dbSettings.email,
          whatsapp: dbSettings.whatsapp,
          instagram: dbSettings.instagram,
          facebook: dbSettings.facebook,
          website: dbSettings.website,
          logo: dbSettings.logo,
          hours: dbSettings.hours,
        });
      }
    } catch (e) {
      setMessage({ type: "error", text: "No se pudo cargar la configuración desde Supabase" });
    }
  };

  // Cargar configuración desde Supabase al montar
  useEffect(() => {
    fetchFromSupabase();
  }, []);

  // Suscripción en tiempo real a cambios en salon_settings
  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase
      .channel('salon-settings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'salon_settings',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          // Recargar configuración silenciosamente
          fetchFromSupabase();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id]);

  useEffect(() => {
    // Clear message after 5 seconds
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setMessage(null) // Clear any existing messages when user types
  }

  const handleHoursChange = (day: string, field: "open" | "close" | "isOpen", value: any) => {
    console.log(`🕒 Changing ${day} ${field} to:`, value)
    setFormData((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day as keyof typeof prev.hours],
          [field]: value,
        },
      },
    }))
  }

  const handleSaveChanges = async () => {
    if (!currentUser || !currentTenant?.id) {
      setMessage({ type: "error", text: "Usuario o tenant no autenticado" });
      return;
    }
    setLoading(true)
    setMessage(null)
    try {
      const oldSettings = getSalonSettings()
      // Guardar en Supabase
      const saved = await saveSalonSettingsToSupabase(currentTenant.id, {
        salon_name: formData.salonName,
        salon_motto: formData.salonMotto,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        whatsapp: formData.whatsapp,
        instagram: formData.instagram,
        facebook: formData.facebook,
        website: formData.website,
        logo: formData.logo,
        hours: formData.hours,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.username,
      });
      // Guardar en localStorage
      const result = await saveSalonSettings(
        {
          salonName: saved.salon_name,
          salonMotto: saved.salon_motto,
          address: saved.address,
          phone: saved.phone,
          email: saved.email,
          whatsapp: saved.whatsapp,
          instagram: saved.instagram,
          facebook: saved.facebook,
          website: saved.website,
          logo: saved.logo,
          hours: saved.hours,
          updatedAt: saved.updated_at,
          updatedBy: saved.updated_by,
        },
        currentUser.username,
      );
      if (result.success) {
        setSettings(getSalonSettings())
        saveSalonSettingsHistory(oldSettings, getSalonSettings())
        setHistory(getSalonSettingsHistory())
        setMessage({ type: "success", text: "¡Configuración guardada exitosamente!" })
        setTimeout(() => { window.location.reload() }, 1500)
      } else {
        setMessage({ type: "error", text: result.error || "Error al guardar" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar en Supabase" })
    } finally {
      setLoading(false)
    }
  }

  const hasChanges =
    formData.salonName !== settings.salonName ||
    formData.salonMotto !== settings.salonMotto ||
    formData.address !== (settings.address || "") ||
    formData.phone !== (settings.phone || "") ||
    formData.email !== (settings.email || "") ||
    formData.whatsapp !== (settings.whatsapp || "") ||
    formData.instagram !== (settings.instagram || "") ||
    formData.facebook !== (settings.facebook || "") ||
    formData.website !== (settings.website || "") ||
    formData.logo !== (settings.logo || "") ||
    JSON.stringify(formData.hours) !== JSON.stringify(settings.hours || {})

  const isFormValid =
    formData.salonName.trim().length > 0 &&
    formData.salonMotto.trim().length > 0 &&
    formData.salonName.length <= 50 &&
    formData.salonMotto.length <= 100

  // Definir el orden de los días para mostrarlos correctamente
  const orderedDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];

  // Valores por defecto para cada día
  const defaultHours: Record<string, { open: string; close: string; isOpen: boolean }> = {
    monday: { open: "09:00", close: "19:00", isOpen: true },
    tuesday: { open: "09:00", close: "19:00", isOpen: true },
    wednesday: { open: "09:00", close: "19:00", isOpen: true },
    thursday: { open: "09:00", close: "19:00", isOpen: true },
    friday: { open: "09:00", close: "19:00", isOpen: true },
    saturday: { open: "09:00", close: "18:00", isOpen: true },
    sunday: { open: "10:00", close: "18:00", isOpen: true },
  };
  // Mezclar los valores actuales con los defaults
  const hours: Record<string, { open: string; close: string; isOpen: boolean }> = { ...defaultHours, ...(formData.hours || {}) };

  const getDayName = (day: string) => {
    const names = {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    }
    return names[day as keyof typeof names] || day
  }

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <div className="flex justify-end mb-2">
        <select
          value={i18n.language}
          onChange={e => {
            i18n.changeLanguage(e.target.value);
            localStorage.setItem('appLanguage', e.target.value);
          }}
          className="border rounded px-2 py-1"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold flex items-center theme-transition"
            style={{ color: colors?.text || "#1f2937" }}
          >
            <Settings className="w-8 h-8 mr-3" style={{ color: colors?.accent || "#3b82f6" }} />
            {t('configuracion_salon')}
          </h2>
          <p className="mt-1 theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
            {t('personaliza_info')}
          </p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center px-4 py-2 rounded-lg transition-colors theme-transition"
          style={{
            backgroundColor: colors?.background || "#f8fafc",
            color: colors?.textSecondary || "#6b7280",
          }}
        >
          <History className="w-4 h-4 mr-2" />
          Historial
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className="p-4 rounded-lg border theme-transition"
          style={{
            backgroundColor:
              message.type === "success" ? `${colors?.success || "#10b981"}0d` : `${colors?.error || "#ef4444"}0d`,
            borderColor:
              message.type === "success" ? `${colors?.success || "#10b981"}33` : `${colors?.error || "#ef4444"}33`,
            color: message.type === "success" ? colors?.success || "#10b981" : colors?.error || "#ef4444",
          }}
        >
          <div className="flex items-center">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl shadow-lg theme-transition" style={{ backgroundColor: colors?.surface || "#ffffff" }}>
        <div className="border-b theme-transition" style={{ borderColor: colors?.border || "#e5e7eb" }}>
          <nav className="flex space-x-8 px-6">
            {[
              { id: "basic", label: t('informacion_basica'), icon: Edit3 },
              { id: "contact", label: t('informacion_contacto'), icon: Phone },
              { id: "hours", label: t('horarios_atencion'), icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors theme-transition"
                  style={{
                    borderBottomColor: isActive ? colors?.accent || "#3b82f6" : "transparent",
                    color: isActive ? colors?.accent || "#3b82f6" : colors?.textSecondary || "#6b7280",
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Information Tab */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              {/* Salon Name Field */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || "#1f2937" }}
                >
                  {t('nombre_salon')}
                  <span style={{ color: colors?.error || "#ef4444" }} className="ml-1">
                    *
                  </span>
                </label>
                <div className="relative">
                  <Edit3
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: colors?.textSecondary || "#6b7280" }}
                  />
                  <input
                    type="text"
                    value={formData.salonName}
                    onChange={(e) => handleInputChange("salonName", e.target.value)}
                    placeholder={t('nombre_salon')}
                    maxLength={50}
                    className="w-full pl-10 pr-16 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                  <div
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm theme-transition"
                    style={{ color: colors?.textSecondary || "#6b7280" }}
                  >
                    {formData.salonName.length}/50
                  </div>
                </div>
                {formData.salonName.length > 50 && (
                  <p className="text-xs mt-1 flex items-center" style={{ color: colors?.error || "#ef4444" }}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    El nombre no puede exceder 50 caracteres
                  </p>
                )}
              </div>

              {/* Salon Motto Field */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || "#1f2937" }}
                >
                  {t('lema_salon')}
                  <span style={{ color: colors?.error || "#ef4444" }} className="ml-1">
                    *
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    value={formData.salonMotto}
                    onChange={(e) => handleInputChange("salonMotto", e.target.value)}
                    placeholder={t('lema_salon')}
                    maxLength={100}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all resize-none theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                  <div
                    className="absolute bottom-3 right-3 text-sm theme-transition"
                    style={{ color: colors?.textSecondary || "#6b7280" }}
                  >
                    {formData.salonMotto.length}/100
                  </div>
                </div>
                {formData.salonMotto.length > 100 && (
                  <p className="text-xs mt-1 flex items-center" style={{ color: colors?.error || "#ef4444" }}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    El lema no puede exceder 100 caracteres
                  </p>
                )}
              </div>

              {/* Logo URL Field */}
              <div>
                <label
                  className="block text-sm font-medium mb-2 theme-transition"
                  style={{ color: colors?.text || "#1f2937" }}
                >
                  {t('url_logo')}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.logo || ""}
                    onChange={(e) => handleInputChange("logo", e.target.value)}
                    placeholder="https://ejemplo.com/logo.png"
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: colors?.textSecondary || "#6b7280" }}>
                  {i18n.language === 'es'
                    ? 'Ingresa la URL de tu logo. Para mejores resultados, usa una imagen con fondo transparente.'
                    : 'Enter your logo URL. For best results, use an image with a transparent background.'}
                </p>
                {formData.logo && (
                  <div className="mt-2 p-3 border rounded-lg flex items-center" style={{ borderColor: colors?.border || "#e5e7eb" }}>
                    <img 
                      src={formData.logo} 
                      alt="Vista previa del logo" 
                      className="h-12 w-auto object-contain mr-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://via.placeholder.com/100x100?text=Error";
                        target.alt = "Error al cargar imagen";
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors?.text || "#1f2937" }}>Vista previa del logo</p>
                      <p className="text-xs" style={{ color: colors?.textSecondary || "#6b7280" }}>
                        Este logo aparecerá en la pantalla principal
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div
                className="flex items-center justify-between pt-4 border-t theme-transition"
                style={{ borderColor: colors?.border || "#e5e7eb" }}
              >
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" style={{ color: colors?.success || "#10b981" }} />
                  <span style={{ color: colors?.textSecondary || "#6b7280" }}>Protección CSRF deshabilitada</span>
                </div>

                <button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || !isFormValid || loading}
                  className="flex items-center px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                  style={{ backgroundColor: colors?.accent || "#3b82f6" }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {loading ? t('guardando') : t('guardar_cambios')}
                </button>
              </div>
            </div>
          )}

          {/* Contact Information Tab */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Address */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {i18n.language === 'es' ? 'Dirección' : 'Address'}
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder={i18n.language === 'es' ? 'Ingresa la dirección del salón' : 'Enter the salon address'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <Phone className="w-4 h-4 inline mr-1" />
                    {i18n.language === 'es' ? 'Teléfono' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder={i18n.language === 'es' ? '664-563-6423' : 'Phone number'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder={i18n.language === 'es' ? 'info@ejemplo.com' : 'info@example.com'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    💬 WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                    placeholder={i18n.language === 'es' ? '526645636423' : 'WhatsApp number'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <Instagram className="w-4 h-4 inline mr-1" />
                    Instagram (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                    placeholder={i18n.language === 'es' ? 'https://instagram.com/tunegocio' : 'https://instagram.com/yourbusiness'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                  <p className="text-xs mt-1" style={{ color: colors?.textSecondary || "#6b7280" }}>
                    {i18n.language === 'es'
                      ? 'Ingresa la URL completa, por ejemplo: https://instagram.com/tunegocio'
                      : 'Enter the full URL, e.g.: https://instagram.com/yourbusiness'}
                  </p>
                </div>

                {/* Facebook */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <Facebook className="w-4 h-4 inline mr-1" />
                    Facebook (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.facebook}
                    onChange={(e) => handleInputChange("facebook", e.target.value)}
                    placeholder={i18n.language === 'es' ? 'https://facebook.com/tunegocio' : 'https://facebook.com/yourbusiness'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                  <p className="text-xs mt-1" style={{ color: colors?.textSecondary || "#6b7280" }}>
                    {i18n.language === 'es'
                      ? 'Ingresa la URL completa, por ejemplo: https://facebook.com/tunegocio'
                      : 'Enter the full URL, e.g.: https://facebook.com/yourbusiness'}
                  </p>
                </div>

                {/* Website */}
                <div className="md:col-span-2">
                  <label
                    className="block text-sm font-medium mb-2 theme-transition"
                    style={{ color: colors?.text || "#1f2937" }}
                  >
                    <Globe className="w-4 h-4 inline mr-1" />
                    {i18n.language === 'es' ? 'Sitio Web' : 'Website'}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder={i18n.language === 'es' ? 'https://tu-sitio-web.com' : 'https://your-website.com'}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all theme-transition"
                    style={{
                      border: `1px solid ${colors?.border || "#e5e7eb"}`,
                      backgroundColor: colors?.background || "#f8fafc",
                      color: colors?.text || "#1f2937",
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Save Button for Contact Tab */}
              <div
                className="flex items-center justify-end pt-4 border-t theme-transition"
                style={{ borderColor: colors?.border || "#e5e7eb" }}
              >
                <button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || loading}
                  className="flex items-center px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                  style={{ backgroundColor: colors?.accent || "#3b82f6" }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {loading ? t('guardando') : (i18n.language === 'es' ? 'Guardar Información de Contacto' : 'Save Contact Information')}
                </button>
              </div>
            </div>
          )}

          {/* Hours Tab */}
          {activeTab === "hours" && (
            <div className="space-y-6">
              <div
                className="rounded-lg p-4 border theme-transition"
                style={{
                  backgroundColor: `${colors?.warning || "#f59e0b"}0d`,
                  borderColor: `${colors?.warning || "#f59e0b"}33`,
                }}
              >
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-2 mt-0.5" style={{ color: colors?.warning || "#f59e0b" }} />
                  <div>
                    <h4 className="font-medium theme-transition" style={{ color: colors?.warning || "#f59e0b" }}>
                      {i18n.language === 'es' ? 'Horarios de Atención' : 'Opening Hours'}
                    </h4>
                    <p className="text-sm mt-1 theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                      {i18n.language === 'es'
                        ? 'Estos horarios se muestran en la página principal para informar a los clientes.'
                        : 'These hours are shown on the main page to inform customers.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {orderedDays.map((day) => (
                  <div
                    key={day}
                    className="flex items-center justify-between p-4 border rounded-lg theme-transition"
                    style={{
                      backgroundColor: colors?.surface || "#ffffff",
                      borderColor: colors?.border || "#e5e7eb",
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-20">
                        <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                          {i18n.language === 'es'
                            ? getDayName(day)
                            : {
                                monday: 'Monday',
                                tuesday: 'Tuesday',
                                wednesday: 'Wednesday',
                                thursday: 'Thursday',
                                friday: 'Friday',
                                saturday: 'Saturday',
                                sunday: 'Sunday',
                              }[day]}
                        </span>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!hours[day]?.isOpen}
                          onChange={(e) => handleHoursChange(day, "isOpen", e.target.checked)}
                          className="w-4 h-4 rounded focus:ring-2 theme-transition"
                          style={{ accentColor: colors?.accent || "#3b82f6" }}
                        />
                        <span className="ml-2 text-sm theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                          {i18n.language === 'es' ? 'Abierto' : 'Open'}
                        </span>
                      </label>
                    </div>
                    {hours[day]?.isOpen ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={hours[day]?.open || ""}
                          onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                          className="px-3 py-2 rounded-lg focus:ring-2 theme-transition"
                          style={{
                            border: `1px solid ${colors?.border || "#e5e7eb"}`,
                            backgroundColor: colors?.background || "#f8fafc",
                            color: colors?.text || "#1f2937",
                          }}
                        />
                        <span style={{ color: colors?.textSecondary || "#6b7280" }}>a</span>
                        <input
                          type="time"
                          value={hours[day]?.close || ""}
                          onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                          className="px-3 py-2 rounded-lg focus:ring-2 theme-transition"
                          style={{
                            border: `1px solid ${colors?.border || "#e5e7eb"}`,
                            backgroundColor: colors?.background || "#f8fafc",
                            color: colors?.text || "#1f2937",
                          }}
                        />
                      </div>
                    ) : (
                      <span className="font-medium theme-transition" style={{ color: colors?.error || "#ef4444" }}>
                        {i18n.language === 'es' ? 'Cerrado' : 'Closed'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg p-4 border theme-transition"
                style={{
                  backgroundColor: `${colors?.success || "#10b981"}0d`,
                  borderColor: `${colors?.success || "#10b981"}33`,
                }}
              >
                <h4 className="font-medium mb-2 theme-transition" style={{ color: colors?.success || "#10b981" }}>
                  {i18n.language === 'es' ? 'Vista Previa de Horarios' : 'Hours Preview'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {orderedDays.map((day) => (
                    <div key={day} className="flex justify-between">
                      <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                        {i18n.language === 'es'
                          ? getDayName(day)
                          : {
                              monday: 'Monday',
                              tuesday: 'Tuesday',
                              wednesday: 'Wednesday',
                              thursday: 'Thursday',
                              friday: 'Friday',
                              saturday: 'Saturday',
                              sunday: 'Sunday',
                            }[day]}:
                      </span>
                      <span className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
                        {hours[day as keyof typeof hours].isOpen 
                          ? `${hours[day as keyof typeof hours].open} - ${hours[day as keyof typeof hours].close}` 
                          : (i18n.language === 'es' ? 'Cerrado' : 'Closed')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Save Button for Hours Tab */}
          {activeTab === "hours" && (
            <div
              className="flex items-center justify-end pt-4 border-t theme-transition"
              style={{ borderColor: colors?.border || "#e5e7eb" }}
            >
              <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || loading}
                className="flex items-center px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                style={{ backgroundColor: colors?.accent || "#3b82f6" }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? t('guardando') : (i18n.language === 'es' ? 'Guardar Horarios' : 'Save Hours')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Settings Preview */}
      <div
        className="rounded-xl p-6 border theme-transition"
        style={{
          background: `linear-gradient(135deg, ${colors?.accent || "#3b82f6"}0d, ${colors?.secondary || "#06b6d4"}0d)`,
          borderColor: `${colors?.accent || "#3b82f6"}33`,
        }}
      >
        <h3 className="text-lg font-semibold mb-4 theme-transition" style={{ color: colors?.accent || "#3b82f6" }}>
          {t('vista_previa_actual')}
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {t('nombre_salon')}:
            </span>
            <p className="text-xl font-bold theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {settings.salonName}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {t('lema_salon')}:
            </span>
            <p className="italic theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              "{settings.salonMotto}"
            </p>
          </div>
          <div>
            <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              Instagram:
            </span>
            <p className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              {settings.instagram || (i18n.language === 'es' ? 'No configurado' : 'Not set')}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              Facebook:
            </span>
            <p className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              {settings.facebook || (i18n.language === 'es' ? 'No configurado' : 'Not set')}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {i18n.language === 'es' ? 'Domingo' : 'Sunday'}:
            </span>
            <p className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              {settings.hours?.sunday?.isOpen
                ? `${settings.hours.sunday.open} - ${settings.hours.sunday.close}`
                : (i18n.language === 'es' ? 'Cerrado' : 'Closed')}
            </p>
          </div>
          <div
            className="text-xs pt-2 border-t theme-transition"
            style={{
              color: colors?.textSecondary || "#6b7280",
              borderColor: `${colors?.accent || "#3b82f6"}33`,
            }}
          >
            {i18n.language === 'es'
              ? `Última actualización: ${new Date(settings.updatedAt).toLocaleString('es-ES')} por ${settings.updatedBy}`
              : `Last update: ${new Date(settings.updatedAt).toLocaleString('en-US')} by ${settings.updatedBy}`}
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div
          className="rounded-xl shadow-lg p-6 theme-transition"
          style={{ backgroundColor: colors?.surface || "#ffffff" }}
        >
          <h3
            className="text-lg font-semibold mb-4 flex items-center theme-transition"
            style={{ color: colors?.text || "#1f2937" }}
          >
            <History className="w-5 h-5 mr-2" style={{ color: colors?.textSecondary || "#6b7280" }} />
            Historial de Cambios
          </h3>

          {history.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {history
                .slice()
                .reverse()
                .map((change: any) => (
                  <div
                    key={change.id}
                    className="border rounded-lg p-4 theme-transition"
                    style={{
                      backgroundColor: colors?.background || "#f8fafc",
                      borderColor: colors?.border || "#e5e7eb",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium theme-transition"
                        style={{ color: colors?.text || "#1f2937" }}
                      >
                        Cambio realizado por {change.updatedBy}
                      </span>
                      <span className="text-xs theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
                        {new Date(change.timestamp).toLocaleString("es-ES")}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {change.changes.salonName.from !== change.changes.salonName.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Nombre:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.salonName.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.salonName.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.salonMotto.from !== change.changes.salonMotto.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Lema:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>
                              - {change.changes.salonMotto.from}
                            </span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>
                              + {change.changes.salonMotto.to}
                            </span>
                          </div>
                        </div>
                      )}

                      {change.changes.logo && change.changes.logo.from !== change.changes.logo.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Logo:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>
                              - {change.changes.logo.from || "(Sin logo)"}
                            </span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>
                              + {change.changes.logo.to || "(Sin logo)"}
                            </span>
                          </div>
                        </div>
                      )}

                      {change.changes.address && change.changes.address.from !== change.changes.address.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Dirección:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.address.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.address.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.phone && change.changes.phone.from !== change.changes.phone.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Teléfono:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.phone.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.phone.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.email && change.changes.email.from !== change.changes.email.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Email:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.email.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.email.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.whatsapp && change.changes.whatsapp.from !== change.changes.whatsapp.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            WhatsApp:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.whatsapp.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.whatsapp.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.instagram && change.changes.instagram.from !== change.changes.instagram.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Instagram:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.instagram.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.instagram.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.facebook && change.changes.facebook.from !== change.changes.facebook.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Facebook:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.facebook.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.facebook.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.website && change.changes.website.from !== change.changes.website.to && (
                        <div>
                          <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                            Sitio Web:
                          </span>
                          <div className="ml-4">
                            <span style={{ color: colors?.error || "#ef4444" }}>- {change.changes.website.from}</span>
                            <br />
                            <span style={{ color: colors?.success || "#10b981" }}>+ {change.changes.website.to}</span>
                          </div>
                        </div>
                      )}

                      {change.changes.hours &&
                        JSON.stringify(change.changes.hours.from) !== JSON.stringify(change.changes.hours.to) && (
                          <div>
                            <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                              Horarios:
                            </span>
                            <div className="ml-4">
                              <span style={{ color: colors?.error || "#ef4444" }}>
                                - {JSON.stringify(change.changes.hours.from)}
                              </span>
                              <br />
                              <span style={{ color: colors?.success || "#10b981" }}>
                                + {JSON.stringify(change.changes.hours.to)}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto mb-3" style={{ color: colors?.textSecondary || "#6b7280" }} />
              <p style={{ color: colors?.textSecondary || "#6b7280" }}>No hay cambios registrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SalonSettings