import { ImageBackground, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Theme utility functions for consistent theming across components
 */

/**
 * Get background style for a component based on theme
 * @param {Object} theme - Theme object from themes.js
 * @param {Object} additionalStyles - Additional styles to merge
 * @returns {Object} Style object with background
 */
export const getBackgroundStyle = (theme, additionalStyles = {}) => {
  if (!theme?.background) {
    return {
      backgroundColor: theme?.background || "#232946",
      ...additionalStyles,
    };
  }

  const background = theme.background;

  if (background.type === "image") {
    return {
      ...additionalStyles,
      // Note: For ImageBackground, this should be used in the component itself
    };
  } else if (background.type === "gradient") {
    return {
      ...additionalStyles,
      // Note: For gradients, use LinearGradient component
    };
  }

  // Fallback to solid color
  return {
    backgroundColor: background.fallback || theme.background || "#232946",
    ...additionalStyles,
  };
};

/**
 * Render themed background component
 * @param {Object} theme - Theme object
 * @param {ReactNode} children - Child components
 * @param {Object} style - Additional styles
 * @returns {ReactElement} Background component
 */
export const renderThemedBackground = (theme, children, style = {}) => {
  if (!theme?.background) {
    return (
      <View
        style={{ ...style, backgroundColor: theme?.background || "#232946" }}
      >
        {children}
      </View>
    );
  }

  const background = theme.background;

  if (background.type === "image") {
    return (
      <ImageBackground
        source={background.image}
        style={style}
        resizeMode="cover"
        fallback={
          <View style={{ ...style, backgroundColor: background.fallback }} />
        }
      >
        {children}
      </ImageBackground>
    );
  } else if (background.type === "gradient" && LinearGradient) {
    return (
      <LinearGradient colors={background.colors || ["#232946"]} style={style}>
        {children}
      </LinearGradient>
    );
  }

  // Fallback to solid color
  return (
    <View
      style={{
        ...style,
        backgroundColor: background.fallback || theme.background || "#232946",
      }}
    >
      {children}
    </View>
  );
};

/**
 * Get themed shadow styles
 * @param {Object} theme - Theme object
 * @param {string} variant - 'light', 'medium', 'heavy'
 * @returns {Object} Shadow styles
 */
export const getShadowStyle = (theme, variant = "medium") => {
  const shadowConfigs = {
    light: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    heavy: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
  };

  return shadowConfigs[variant] || shadowConfigs.medium;
};

/**
 * Get themed border styles
 * @param {Object} theme - Theme object
 * @param {Object} options - Border options
 * @returns {Object} Border styles
 */
export const getBorderStyle = (theme, options = {}) => {
  const { width = 1, radius = 8, color = theme?.border || "#393e6e" } = options;

  return {
    borderWidth: width,
    borderRadius: radius,
    borderColor: color,
  };
};

/**
 * Get themed button styles
 * @param {Object} theme - Theme object
 * @param {Object} options - Button style options
 * @returns {Object} Button styles
 */
export const getButtonStyle = (theme, options = {}) => {
  const { variant = "primary", size = "medium" } = options;

  const baseStyle = {
    alignItems: "center",
    justifyContent: "center",
    ...getBorderStyle(theme, { radius: 8 }),
    ...getShadowStyle(theme, "light"),
  };

  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      minWidth: 80,
      minHeight: 32,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      minWidth: 120,
      minHeight: 44,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      minWidth: 160,
      minHeight: 52,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: theme?.button || "#7f9cf5",
      borderColor: theme?.button || "#7f9cf5",
    },
    secondary: {
      backgroundColor: theme?.card || "#2a2d3e",
      borderColor: theme?.border || "#393e6e",
    },
    accent: {
      backgroundColor: theme?.accent || "#7f9cf5",
      borderColor: theme?.accent || "#7f9cf5",
    },
    danger: {
      backgroundColor: "#b23b3b",
      borderColor: "#b23b3b",
    },
  };

  return {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
};

/**
 * Get themed text styles
 * @param {Object} theme - Theme object
 * @param {Object} options - Text style options
 * @returns {Object} Text styles
 */
export const getTextStyle = (theme, options = {}) => {
  const {
    variant = "body",
    color = theme?.text || "#eaeaea",
    weight = "normal",
  } = options;

  const baseStyle = {
    color,
    fontWeight: weight,
  };

  const variantStyles = {
    header: {
      fontSize: 20,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    subheader: {
      fontSize: 16,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      opacity: 0.8,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
  };
};

/**
 * Check if theme has a dark background
 * @param {Object} theme - Theme object
 * @returns {boolean} Whether the theme is dark
 */
export const isDarkTheme = (theme) => {
  // Simple heuristic based on background color
  const bgColor = theme?.background;
  if (typeof bgColor === "string") {
    // Check if it's a dark color by looking at brightness
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  return true; // Default to dark theme
};

/**
 * Get theme-aware opacity for overlays
 * @param {Object} theme - Theme object
 * @returns {number} Opacity value
 */
export const getOverlayOpacity = (theme) => {
  return isDarkTheme(theme) ? 0.6 : 0.4;
};
