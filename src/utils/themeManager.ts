import { useEffect } from 'react';
import { ThemeSettings, ColorPalette, ThemePreset } from '../types';
import { getCurrentTenant } from './tenantManager';
import { supabase } from './supabaseClient';

export async function getThemeSettingsFromSupabase(tenant_id: string) {
  const { data, error } = await supabase
    .from('theme_settings')
    .select('*')
    .eq('tenant_id', tenant_id);
  if (error) throw error;
  return data;
}

export async function updateThemeSettingsInSupabase(id: string, updates: any) {
  const { data, error } = await supabase
    .from('theme_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createThemeSettingsInSupabase(themeSettings: any) {
  const { data, error } = await supabase
    .from('theme_settings')
    .insert([themeSettings])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Activa un tema en Supabase y desactiva los demás para el tenant dado.
 * @param tenant_id string
 * @param theme_id string
 */
export async function setActiveThemeInSupabase(tenant_id: string, theme_id: string) {
  // Desactivar todos los temas del tenant
  const { error: errorDeactivate } = await supabase
    .from('theme_settings')
    .update({ is_active: false })
    .eq('tenant_id', tenant_id);
  if (errorDeactivate) throw errorDeactivate;

  // Activar el tema seleccionado
  const { data, error: errorActivate } = await supabase
    .from('theme_settings')
    .update({ is_active: true })
    .eq('id', theme_id)
    .select()
    .single();
  if (errorActivate) throw errorActivate;
  return data;
}

const STORAGE_KEY = 'beauty-salon-themes';
const ACTIVE_THEME_KEY = 'beauty-salon-active-theme';

// Get tenant-specific storage key
const getTenantStorageKey = (key: string): string => {
  const tenant = getCurrentTenant();
  if (tenant) {
    return `tenant-${tenant.id}-${key}`;
  }
  return key; // Fallback to legacy key for backward compatibility
};

// Event system for real-time theme updates
const themeEventListeners: ((theme: ThemeSettings) => void)[] = [];

export const subscribeThemeChanges = (callback: (theme: ThemeSettings) => void): (() => void) => {
  themeEventListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = themeEventListeners.indexOf(callback);
    if (index > -1) {
      themeEventListeners.splice(index, 1);
    }
  };
};

const notifyThemeChange = (theme: ThemeSettings): void => {
  themeEventListeners.forEach(callback => {
    try {
      callback(theme);
    } catch (error) {
      console.error('Error in theme listener:', error);
    }
  });
};

// Get default colors based on tenant
const getDefaultColors = (): ColorPalette => {
  const tenant = getCurrentTenant();
  
  if (tenant) {
    return {
      primary: tenant.primaryColor,
      primaryLight: lightenColor(tenant.primaryColor, 0.3),
      primaryDark: darkenColor(tenant.primaryColor, 0.3),
      secondary: tenant.secondaryColor,
      secondaryLight: lightenColor(tenant.secondaryColor, 0.3),
      secondaryDark: darkenColor(tenant.secondaryColor, 0.3),
      accent: '#3b82f6',
      accentLight: '#a78bfa',
      accentDark: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)'
    };
  }
  
  // Default fallback colors
  return {
    primary: '#0ea5e9',
    primaryLight: '#38bdf8',
    primaryDark: '#0284c7',
    secondary: '#06b6d4',
    secondaryLight: '#22d3ee',
    secondaryDark: '#0891b2',
    accent: '#3b82f6',
    accentLight: '#a78bfa',
    accentDark: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.1)'
  };
};

// Color manipulation utilities
const lightenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const lightR = Math.min(255, Math.floor(r + (255 - r) * amount));
  const lightG = Math.min(255, Math.floor(g + (255 - g) * amount));
  const lightB = Math.min(255, Math.floor(b + (255 - b) * amount));
  
  return `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
};

const darkenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const darkR = Math.floor(r * (1 - amount));
  const darkG = Math.floor(g * (1 - amount));
  const darkB = Math.floor(b * (1 - amount));
  
  return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
};

// Expanded theme presets with beautiful color combinations
export const themePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'theme_default_name',
    description: 'theme_default_desc',
    preview: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    colors: {
      primary: '#0ea5e9',
      primaryLight: '#38bdf8',
      primaryDark: '#0284c7',
      secondary: '#06b6d4',
      secondaryLight: '#22d3ee',
      secondaryDark: '#0891b2',
      accent: '#3b82f6',
      accentLight: '#a78bfa',
      accentDark: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)'
    }
  },
  {
    id: 'colorblind-friendly',
    name: 'theme_colorblind_friendly_name',
    description: 'theme_colorblind_friendly_desc',
    preview: 'linear-gradient(135deg, #0066cc, #ff6600)',
    colors: {
      primary: '#0066cc',           // Azul fuerte (distinguible para todos los tipos de daltonismo)
      primaryLight: '#3399ff',      // Azul claro
      primaryDark: '#004499',       // Azul oscuro
      secondary: '#ff6600',         // Naranja fuerte (contrasta bien con azul)
      secondaryLight: '#ff9933',    // Naranja claro
      secondaryDark: '#cc3300',     // Naranja oscuro
      accent: '#9900cc',            // Púrpura fuerte (distinguible)
      accentLight: '#cc33ff',       // Púrpura claro
      accentDark: '#660099',        // Púrpura oscuro
      success: '#006600',           // Verde oscuro (más distinguible)
      warning: '#ffcc00',           // Amarillo fuerte (alta visibilidad)
      error: '#cc0000',             // Rojo oscuro (distinguible del verde)
      info: '#0066cc',              // Azul información
      background: '#ffffff',        // Blanco puro (máximo contraste)
      surface: '#f8f9fa',           // Gris muy claro
      text: '#000000',              // Negro puro (máximo contraste)
      textSecondary: '#333333',     // Gris muy oscuro (alto contraste)
      border: '#666666',            // Gris medio (visible)
      shadow: 'rgba(0, 0, 0, 0.2)'  // Sombra más visible
    }
  },
  {
    id: 'rose-gold',
    name: 'theme_rose_gold_name',
    description: 'theme_rose_gold_desc',
    preview: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
    colors: {
      primary: '#f43f5e',           // Rosa vibrante
      primaryLight: '#fb7185',      // Rosa claro
      primaryDark: '#e11d48',       // Rosa oscuro
      secondary: '#f59e0b',         // Dorado
      secondaryLight: '#fbbf24',    // Dorado claro
      secondaryDark: '#d97706',     // Dorado oscuro
      accent: '#ec4899',            // Rosa magenta
      accentLight: '#f472b6',       // Rosa magenta claro
      accentDark: '#db2777',        // Rosa magenta oscuro
      success: '#10b981',           // Verde esmeralda
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#fef7f0',        // Crema muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#f3e8ff',            // Lavanda muy claro
      shadow: 'rgba(170, 5, 5, 0.02)'
    }
  },
  {
    id: 'lavender-dream',
    name: 'theme_lavender_dream_name',
    description: 'theme_lavender_dream_desc',
    preview: 'linear-gradient(135deg, #3b82f6, #a78bfa)',
    colors: {
      primary: '#3b82f6',           // Púrpura
      primaryLight: '#a78bfa',      // Púrpura claro
      primaryDark: '#7c3aed',       // Púrpura oscuro
      secondary: '#c084fc',         // Lavanda
      secondaryLight: '#ddd6fe',    // Lavanda muy claro
      secondaryDark: '#a855f7',     // Lavanda oscuro
      accent: '#ec4899',            // Rosa magenta
      accentLight: '#f472b6',       // Rosa magenta claro
      accentDark: '#db2777',        // Rosa magenta oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#6366f1',              // Índigo
      background: '#faf5ff',        // Púrpura muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e9d5ff',            // Púrpura muy claro
      shadow: 'rgba(36, 10, 169, 0.15)'
    }
  },
  {
    id: 'ocean-breeze',
    name: 'theme_ocean_breeze_name',
    description: 'theme_ocean_breeze_desc',
    preview: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    colors: {
      primary: '#0ea5e9',           // Azul cielo
      primaryLight: '#38bdf8',      // Azul cielo claro
      primaryDark: '#0284c7',       // Azul cielo oscuro
      secondary: '#06b6d4',         // Cian
      secondaryLight: '#22d3ee',    // Cian claro
      secondaryDark: '#0891b2',     // Cian oscuro
      accent: '#14b8a6',            // Teal
      accentLight: '#5eead4',       // Teal claro
      accentDark: '#0d9488',        // Teal oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#f0f9ff',        // Azul muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e0f2fe',            // Azul muy claro
      shadow: 'rgba(14, 165, 233, 0.15)'
    }
  },
  {
    id: 'emerald-luxury',
    name: 'theme_emerald_luxury_name',
    description: 'theme_emerald_luxury_desc',
    preview: 'linear-gradient(135deg, #10b981, #059669)',
    colors: {
      primary: '#10b981',           // Verde esmeralda
      primaryLight: '#34d399',      // Verde esmeralda claro
      primaryDark: '#059669',       // Verde esmeralda oscuro
      secondary: '#f59e0b',         // Dorado
      secondaryLight: '#fbbf24',    // Dorado claro
      secondaryDark: '#d97706',     // Dorado oscuro
      accent: '#14b8a6',            // Teal
      accentLight: '#5eead4',       // Teal claro
      accentDark: '#0d9488',        // Teal oscuro
      success: '#10b981',           // Verde esmeralda
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#f0fdf4',        // Verde muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#dcfce7',            // Verde muy claro
      shadow: 'rgba(16, 185, 129, 0.15)'
    }
  },
  {
    id: 'sunset-glow',
    name: 'Resplandor Atardecer',
    description: 'Cálidos naranjas y rosas que evocan un hermoso atardecer',
    preview: 'linear-gradient(135deg, #f97316, #ec4899)',
    colors: {
      primary: '#f97316',           // Naranja
      primaryLight: '#fb923c',      // Naranja claro
      primaryDark: '#ea580c',       // Naranja oscuro
      secondary: '#ec4899',         // Rosa
      secondaryLight: '#f472b6',    // Rosa claro
      secondaryDark: '#db2777',     // Rosa oscuro
      accent: '#f59e0b',            // Ámbar
      accentLight: '#fbbf24',       // Ámbar claro
      accentDark: '#d97706',        // Ámbar oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#fff7ed',        // Naranja muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#fed7aa',            // Naranja muy claro
      shadow: 'rgba(249, 115, 22, 0.15)'
    }
  },
  {
    id: 'midnight-elegance',
    name: 'theme_midnight_elegance_name',
    description: 'theme_midnight_elegance_desc',
    preview: 'linear-gradient(135deg, #1f2937, #374151)',
    colors: {
      primary: '#374151',           // Gris oscuro
      primaryLight: '#6b7280',      // Gris medio
      primaryDark: '#1f2937',       // Gris muy oscuro
      secondary: '#f59e0b',         // Dorado
      secondaryLight: '#fbbf24',    // Dorado claro
      secondaryDark: '#d97706',     // Dorado oscuro
      accent: '#3b82f6',            // Púrpura
      accentLight: '#a78bfa',       // Púrpura claro
      accentDark: '#7c3aed',        // Púrpura oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#f9fafb',        // Gris muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e5e7eb',            // Gris claro
      shadow: 'rgba(55, 65, 81, 0.15)'
    }
  },
  {
    id: 'cherry-blossom',
    name: 'theme_cherry_blossom_name',
    description: 'theme_cherry_blossom_desc',
    preview: 'linear-gradient(135deg, #fda4af, #f9a8d4)',
    colors: {
      primary: '#fda4af',           // Rosa suave
      primaryLight: '#fecaca',      // Rosa muy claro
      primaryDark: '#fb7185',       // Rosa medio
      secondary: '#f9a8d4',         // Rosa lavanda
      secondaryLight: '#fbb6ce',    // Rosa lavanda claro
      secondaryDark: '#f472b6',     // Rosa lavanda oscuro
      accent: '#c084fc',            // Lavanda
      accentLight: '#ddd6fe',       // Lavanda claro
      accentDark: '#a855f7',        // Lavanda oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#fef7f7',        // Rosa muy muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#fce7f3',            // Rosa muy claro
      shadow: 'rgba(229, 28, 28, 0.15)'
    }
  },
  {
    id: 'forest-spa',
    name: 'theme_forest_spa_name',
    description: 'theme_forest_spa_desc',
    preview: 'linear-gradient(135deg, #16a34a, #15803d)',
    colors: {
      primary: '#16a34a',           // Verde bosque
      primaryLight: '#4ade80',      // Verde claro
      primaryDark: '#15803d',       // Verde oscuro
      secondary: '#a3a3a3',         // Gris neutro
      secondaryLight: '#d4d4d4',    // Gris claro
      secondaryDark: '#737373',     // Gris oscuro
      accent: '#14b8a6',            // Teal
      accentLight: '#5eead4',       // Teal claro
      accentDark: '#0d9488',        // Teal oscuro
      success: '#16a34a',           // Verde bosque
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#f7fdf7',        // Verde muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#dcfce7',            // Verde muy claro
      shadow: 'rgba(22, 163, 74, 0.15)'
    }
  },
  {
    id: 'royal-blue',
    name: 'theme_royal_blue_name',
    description: 'theme_royal_blue_desc',
    preview: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    colors: {
      primary: '#7c3aed',           // Púrpura real
      primaryLight: '#a78bfa',      // Púrpura claro
      primaryDark: '#5b21b6',       // Púrpura muy oscuro
      secondary: '#6b7280',         // Gris plateado
      secondaryLight: '#9ca3af',    // Gris plateado claro
      secondaryDark: '#4b5563',     // Gris plateado oscuro
      accent: '#ec4899',            // Rosa magenta
      accentLight: '#f472b6',       // Rosa magenta claro
      accentDark: '#db2777',        // Rosa magenta oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#6366f1',              // Índigo
      background: '#faf5ff',        // Púrpura muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e9d5ff',            // Púrpura muy claro
      shadow: 'rgba(64, 58, 237, 0.15)'
    }
  },
  {
    id: 'coral-reef',
    name: 'theme_coral_reef_name',
    description: 'theme_coral_reef_desc',
    preview: 'linear-gradient(135deg, #ff7849, #06b6d4)',
    colors: {
      primary: '#ff7849',           // Coral
      primaryLight: '#ff9472',      // Coral claro
      primaryDark: '#ea580c',       // Coral oscuro
      secondary: '#06b6d4',         // Turquesa
      secondaryLight: '#22d3ee',    // Turquesa claro
      secondaryDark: '#0891b2',     // Turquesa oscuro
      accent: '#f472b6',            // Rosa coral
      accentLight: '#f9a8d4',       // Rosa coral claro
      accentDark: '#ec4899',        // Rosa coral oscuro
      success: '#10b981',           // Verde
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul
      background: '#fff7ed',        // Coral muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#fed7aa',            // Coral muy claro
      shadow: 'rgba(238, 77, 52, 0.15)'
    }
  },
  {
    id: 'neutral-professional',
    name: 'theme_neutral_professional_name',
    description: 'theme_neutral_professional_desc',
    preview: 'linear-gradient(135deg, #6b7280, #9ca3af)',
    colors: {
      primary: '#6b7280',           // Gris medio profesional
      primaryLight: '#9ca3af',      // Gris claro
      primaryDark: '#4b5563',       // Gris oscuro
      secondary: '#d6d3d1',         // Beige claro
      secondaryLight: '#e7e5e4',    // Beige muy claro
      secondaryDark: '#a8a29e',     // Beige medio
      accent: '#78716c',            // Tierra medio
      accentLight: '#a8a29e',       // Tierra claro
      accentDark: '#57534e',        // Tierra oscuro
      success: '#059669',           // Verde profesional
      warning: '#d97706',           // Ámbar tierra
      error: '#dc2626',             // Rojo profesional
      info: '#0369a1',              // Azul profesional
      background: '#fafaf9',        // Blanco cálido
      surface: '#ffffff',           // Blanco puro
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e5e7eb',            // Gris muy claro
      shadow: 'rgba(107, 114, 128, 0.1)'
    }
  },
  {
    id: 'barber-classic',
    name: 'theme_barber_classic_name',
    description: 'theme_barber_classic_desc',
    preview: 'linear-gradient(135deg, #22304a, #b0b7bd)',
    colors: {
      primary: '#22304a',           // Azul oscuro
      primaryLight: '#3a4a6b',      // Azul medio
      primaryDark: '#101a2b',       // Azul muy oscuro
      secondary: '#b0b7bd',         // Gris claro
      secondaryLight: '#e5e7eb',    // Gris muy claro
      secondaryDark: '#6b7280',     // Gris medio
      accent: '#d97706',            // Dorado oscuro
      accentLight: '#fbbf24',       // Dorado claro
      accentDark: '#b45309',        // Dorado profundo
      success: '#059669',           // Verde oscuro
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#2563eb',              // Azul info
      background: '#f3f4f6',        // Gris muy claro
      surface: '#ffffff',           // Blanco
      text: '#1f2937',              // Gris muy oscuro
      textSecondary: '#6b7280',     // Gris medio
      border: '#e5e7eb',            // Gris claro
      shadow: 'rgba(34, 48, 74, 0.12)'
    }
  },
  {
    id: 'urban-night',
    name: 'theme_urban_night_name',
    description: 'theme_urban_night_desc',
    preview: 'linear-gradient(135deg, #18181b, #f59e0b)',
    colors: {
      primary: '#18181b',           // Negro profundo
      primaryLight: '#27272a',      // Gris oscuro
      primaryDark: '#0a0a0a',       // Negro absoluto
      secondary: '#f59e0b',         // Dorado
      secondaryLight: '#fbbf24',    // Dorado claro
      secondaryDark: '#b45309',     // Dorado oscuro
      accent: '#2563eb',            // Azul vibrante
      accentLight: '#60a5fa',       // Azul claro
      accentDark: '#1e40af',        // Azul oscuro
      success: '#059669',           // Verde oscuro
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul info
      background: '#232323',        // Negro grisáceo
      surface: '#18181b',           // Negro profundo
      text: '#f3f4f6',              // Gris muy claro
      textSecondary: '#a3a3a3',     // Gris medio
      border: '#27272a',            // Gris oscuro
      shadow: 'rgba(24, 24, 27, 0.18)'
    }
  },
  {
    id: 'steel-blue',
    name: 'theme_steel_blue_name',
    description: 'theme_steel_blue_desc',
    preview: 'linear-gradient(135deg, #1e293b, #64748b)',
    colors: {
      primary: '#1e293b',           // Azul acero oscuro
      primaryLight: '#334155',      // Azul acero medio
      primaryDark: '#0f172a',       // Azul acero profundo
      secondary: '#64748b',         // Plateado azulado
      secondaryLight: '#cbd5e1',    // Plateado claro
      secondaryDark: '#475569',     // Plateado oscuro
      accent: '#f59e0b',            // Dorado
      accentLight: '#fbbf24',       // Dorado claro
      accentDark: '#b45309',        // Dorado oscuro
      success: '#059669',           // Verde oscuro
      warning: '#f59e0b',           // Ámbar
      error: '#ef4444',             // Rojo
      info: '#3b82f6',              // Azul info
      background: '#f1f5f9',        // Azul muy claro
      surface: '#ffffff',           // Blanco
      text: '#1e293b',              // Azul acero oscuro
      textSecondary: '#64748b',     // Plateado azulado
      border: '#cbd5e1',            // Plateado claro
      shadow: 'rgba(30, 41, 59, 0.13)'
    }
  },
  {
    id: 'colorblind-protanopia',
    name: 'Accesible Daltonismo (Protanopía/Deuteranopía)',
    description: 'Colores de alto contraste y diferenciación para usuarios con protanopía o deuteranopía. Evita combinaciones rojo-verde y prioriza azul, amarillo y gris.',
    preview: 'linear-gradient(135deg, #0072b2, #f0e442)',
    colors: {
      primary: '#0072b2',           // Azul fuerte
      primaryLight: '#56b4e9',      // Azul claro
      primaryDark: '#003366',       // Azul muy oscuro
      secondary: '#f0e442',         // Amarillo
      secondaryLight: '#fff799',    // Amarillo claro
      secondaryDark: '#bdb800',     // Amarillo oscuro
      accent: '#009e73',            // Verde azulado (seguro para daltonismo)
      accentLight: '#a6d854',       // Verde claro
      accentDark: '#006d5b',        // Verde oscuro
      success: '#009e73',           // Verde azulado
      warning: '#f0e442',           // Amarillo
      error: '#000000',             // Negro (para alertas)
      info: '#56b4e9',              // Azul claro
      background: '#ffffff',        // Blanco
      surface: '#f7f7f7',           // Gris muy claro
      text: '#222222',              // Gris muy oscuro
      textSecondary: '#666666',     // Gris medio
      border: '#cccccc',            // Gris claro
      shadow: 'rgba(0, 114, 178, 0.10)'
    }
  },
  {
    id: 'autism-friendly',
    name: 'theme_autism_friendly_name',
    description: 'theme_autism_friendly_desc',
    preview: 'linear-gradient(135deg, #a7c7e7, #b7e4c7)',
    colors: {
      primary: '#a7c7e7',           // Azul pastel suave
      primaryLight: '#d0e6fa',      // Azul muy claro
      primaryDark: '#6fa3c7',       // Azul pastel medio
      secondary: '#b7e4c7',         // Verde menta suave
      secondaryLight: '#e0f7ef',    // Verde menta muy claro
      secondaryDark: '#7fc8a9',     // Verde menta medio
      accent: '#f6e7cb',            // Beige suave
      accentLight: '#fff8e1',       // Beige muy claro
      accentDark: '#e2c799',        // Beige medio
      success: '#8ecae6',           // Azul claro calmante
      warning: '#ffe066',           // Amarillo pastel
      error: '#bdbdbd',             // Gris (en vez de rojo)
      info: '#b5ead7',              // Verde agua
      background: '#f8fafc',        // Blanco azulado
      surface: '#ffffff',           // Blanco
      text: '#22223b',              // Azul grisáceo oscuro
      textSecondary: '#6c757d',     // Gris medio
      border: '#e0e1dd',            // Gris claro
      shadow: 'rgba(167, 199, 231, 0.10)'
    }
  }
];

// Get all themes
export const getThemes = (): ThemeSettings[] => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEY));
  const themes = stored ? JSON.parse(stored) : [];
  
  // Ensure default theme exists with tenant colors
  if (!themes.find((t: ThemeSettings) => t.id === 'default')) {
    const tenant = getCurrentTenant();
    const defaultTheme: ThemeSettings = {
      id: 'default',
      name: tenant ? `${tenant.name} (Predeterminado)` : 'Predeterminado',
      description: 'Tema basado en los colores de tu marca',
      colors: getDefaultColors(),
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    };
    themes.unshift(defaultTheme);
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(themes));
  }
  
  return themes;
};

// Save theme with real-time sync
export const saveTheme = (theme: ThemeSettings): void => {
  const themes = getThemes();
  const existingIndex = themes.findIndex((t: ThemeSettings) => t.id === theme.id);
  
  if (existingIndex >= 0) {
    themes[existingIndex] = { ...theme, updatedAt: new Date().toISOString() };
  } else {
    themes.push(theme);
  }
  
  localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(themes));
  
  // Notify listeners if this is the active theme
  if (theme.isActive) {
    notifyThemeChange(theme);
  }
};

// Delete theme
export const deleteTheme = (themeId: string): boolean => {
  const themes = getThemes();
  const theme = themes.find((t: ThemeSettings) => t.id === themeId);
  
  if (!theme || theme.isDefault) {
    return false; // Cannot delete default theme
  }
  
  const filteredThemes = themes.filter((t: ThemeSettings) => t.id !== themeId);
  localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(filteredThemes));
  
  // If deleted theme was active, switch to default
  const activeTheme = getActiveTheme();
  if (activeTheme?.id === themeId) {
    setActiveTheme('default');
  }
  
  return true;
};

// Get active theme
export const getActiveTheme = (): ThemeSettings | null => {
  const activeThemeId = localStorage.getItem(getTenantStorageKey(ACTIVE_THEME_KEY)) || 'default';
  const themes = getThemes();
  return themes.find((t: ThemeSettings) => t.id === activeThemeId) || themes[0] || null;
};

// Set active theme with real-time sync and immediate DOM application
export const setActiveTheme = (themeId: string): boolean => {
  const themes = getThemes();
  const theme = themes.find((t: ThemeSettings) => t.id === themeId);
  
  if (!theme) return false;
  
  // Update active status
  themes.forEach((t: ThemeSettings) => {
    t.isActive = t.id === themeId;
  });
  
  localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(themes));
  localStorage.setItem(getTenantStorageKey(ACTIVE_THEME_KEY), themeId);
  
  // Apply theme to DOM immediately
  applyThemeToDOM(theme.colors);
  
  // Notify all listeners about the theme change
  notifyThemeChange(theme);
  
  return true;
};

// Apply theme colors to DOM with smooth transitions
export const applyThemeToDOM = (colors: ColorPalette): void => {
  const root = document.documentElement;
  
  // Add transition class to body for smooth color changes
  document.body.classList.add('theme-transition');
  
  // Set CSS custom properties
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-secondary-light', colors.secondaryLight);
  root.style.setProperty('--color-secondary-dark', colors.secondaryDark);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-light', colors.accentLight);
  root.style.setProperty('--color-accent-dark', colors.accentDark);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-error', colors.error);
  root.style.setProperty('--color-info', colors.info);
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-shadow', colors.shadow);
  
  // Remove transition class after animation completes
  setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 300);
};

// Initialize theme system with real-time capabilities
export const initializeThemeSystem = (): void => {
  const activeTheme = getActiveTheme();
  if (activeTheme) {
    applyThemeToDOM(activeTheme.colors);
  }
  
  // Set up global theme change listener for cross-tab synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === getTenantStorageKey(ACTIVE_THEME_KEY) && e.newValue) {
      const newActiveTheme = getActiveTheme();
      if (newActiveTheme) {
        applyThemeToDOM(newActiveTheme.colors);
        notifyThemeChange(newActiveTheme);
      }
    }
  });
};

// Create theme from preset
export const createThemeFromPreset = (presetId: string, customName?: string, createdBy: string = 'user'): ThemeSettings | null => {
  const preset = themePresets.find(p => p.id === presetId);
  if (!preset) return null;
  
  const theme: ThemeSettings = {
    id: Date.now().toString(),
    name: customName || preset.name,
    description: preset.description,
    colors: { ...preset.colors },
    isDefault: false,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy
  };
  
  saveTheme(theme);
  return theme;
};

// Export theme
export const exportTheme = (themeId: string): string | null => {
  const themes = getThemes();
  const theme = themes.find((t: ThemeSettings) => t.id === themeId);
  
  if (!theme) return null;
  
  const exportData = {
    name: theme.name,
    description: theme.description,
    colors: theme.colors,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  return JSON.stringify(exportData, null, 2);
};

// Import theme
export const importTheme = (themeData: string, createdBy: string): ThemeSettings | null => {
  try {
    const data = JSON.parse(themeData);
    
    // Validate required fields
    if (!data.name || !data.colors) {
      throw new Error('Invalid theme data');
    }
    
    const theme: ThemeSettings = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description || 'Tema importado',
      colors: data.colors,
      isDefault: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy
    };
    
    saveTheme(theme);
    return theme;
  } catch (error) {
    console.error('Error importing theme:', error);
    return null;
  }
};

// Reset to default theme
export const resetToDefaultTheme = (): void => {
  setActiveTheme('default');
};

// Validate color palette
export const validateColorPalette = (colors: Partial<ColorPalette>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const requiredColors = [
    'primary', 'secondary', 'accent', 'success', 'warning', 'error',
    'background', 'surface', 'text', 'textSecondary', 'border'
  ];
  
  requiredColors.forEach(colorKey => {
    const color = colors[colorKey as keyof ColorPalette];
    if (!color) {
      errors.push(`Color ${colorKey} es requerido`);
    } else if (!/^#[0-9A-F]{6}$/i.test(color)) {
      errors.push(`Color ${colorKey} debe ser un código hexadecimal válido`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate color variations
export const generateColorVariations = (baseColor: string): { light: string; dark: string } => {
  return {
    light: lightenColor(baseColor, 0.3),
    dark: darkenColor(baseColor, 0.3)
  };
};

// Hook for real-time theme updates
export const useActiveTheme = () => {
  // Removed useState to fix build error
  
  useEffect(() => {
    const unsubscribe = subscribeThemeChanges((theme) => {
      // Just apply the theme directly
      applyThemeToDOM(theme.colors);
    });

    return unsubscribe;
  }, []);

  return getActiveTheme;
};