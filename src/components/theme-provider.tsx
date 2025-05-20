"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

type ColorScheme = "default" | "blue" | "green" | "purple" | "orange" | "pink"

type ThemeContextType = {
  colorScheme: ColorScheme
  setColorScheme: (colorScheme: ColorScheme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("default")

  useEffect(() => {
    // Load color scheme from localStorage
    const savedColorScheme = localStorage.getItem("colorScheme") as ColorScheme
    if (savedColorScheme) {
      setColorScheme(savedColorScheme)
      document.documentElement.setAttribute("data-color-scheme", savedColorScheme)
    }
  }, [])

  const handleSetColorScheme = (scheme: ColorScheme) => {
    setColorScheme(scheme)
    localStorage.setItem("colorScheme", scheme)
    document.documentElement.setAttribute("data-color-scheme", scheme)
  }

  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme: handleSetColorScheme }}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeContext.Provider>
  )
}

export const useThemeContext = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider")
  }
  return context
}

