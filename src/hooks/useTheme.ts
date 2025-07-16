import { useState, useEffect } from 'react';
import { ThemeSettings } from '../types';
import { getActiveTheme, subscribeThemeChanges } from '../utils/themeManager';
import { getThemeSettingsFromSupabase, saveTheme } from "../utils/themeManager";
import { getCurrentTenant } from "../utils/tenantManager";

// Custom hook for real-time theme updates
export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeSettings | null>(getActiveTheme());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      setLoading(true);
      const tenant = getCurrentTenant();
      let localTheme = getActiveTheme();

      // Si no hay tema en localStorage, consulta Supabase
      if ((!localTheme || !localTheme.id || localTheme.id === "default") && tenant?.id) {
        try {
          const dbThemes = await getThemeSettingsFromSupabase(tenant.id);
          if (dbThemes && dbThemes.length > 0) {
            // Guarda todos los temas en localStorage
            dbThemes.forEach((theme: any) => saveTheme(theme));
            // Busca el activo
            const active = dbThemes.find((t: any) => t.is_active) || dbThemes[0];
            setActiveTheme(active);
          } else {
            setActiveTheme(localTheme);
          }
        } catch (e) {
          setActiveTheme(localTheme);
        }
      } else {
        setActiveTheme(localTheme);
      }
      setLoading(false);
    };

    fetchTheme();

    // Suscripción a cambios locales
    const unsubscribe = subscribeThemeChanges((newTheme) => {
      setActiveTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  const refreshTheme = () => {
    setLoading(true);
    try {
      const currentTheme = getActiveTheme();
      setActiveTheme(currentTheme);
    } finally {
      setLoading(false);
    }
  };

  return {
    activeTheme,
    loading,
    refreshTheme,
    colors: activeTheme?.colors,
    themeName: activeTheme?.name,
    themeId: activeTheme?.id
  };
};

// Hook for theme-aware components
export const useThemeColors = () => {
  const { colors } = useTheme();
  return colors;
};

// Hook for theme status
export const useThemeStatus = () => {
  const { activeTheme, loading } = useTheme();
  
  return {
    isThemeLoaded: !!activeTheme,
    isLoading: loading,
    themeId: activeTheme?.id,
    themeName: activeTheme?.name
  };
};