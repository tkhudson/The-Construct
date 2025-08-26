import React, { createContext, useContext, useState, useMemo } from "react";
import themes from "./themes";

// Create the ThemeContext
const ThemeContext = createContext({
  theme: themes["Classic D&D"],
  setThemeKey: () => {},
  themeKey: "Classic D&D",
});

// ThemeProvider component
export const ThemeProvider = ({
  initialThemeKey = "Classic D&D",
  children,
}) => {
  const [themeKey, setThemeKey] = useState(initialThemeKey);

  // Memoize the theme object for performance
  const value = useMemo(
    () => ({
      theme: themes[themeKey] || themes["Classic D&D"],
      setThemeKey,
      themeKey,
    }),
    [themeKey],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook for easy access
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
