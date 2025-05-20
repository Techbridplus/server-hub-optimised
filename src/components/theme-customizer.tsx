"use client"

import { useState } from "react"
import { Check, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useThemeContext } from "./theme-provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import React from "react"

type ColorScheme = "default" | "blue" | "green" | "purple" | "orange" | "pink"

const colorSchemes = [
  {
    name: "Default",
    value: "default",
    bgColor: "bg-violet-500",
  },
  {
    name: "Blue",
    value: "blue",
    bgColor: "bg-blue-500",
  },
  {
    name: "Green",
    value: "green",
    bgColor: "bg-emerald-500",
  },
  {
    name: "Purple",
    value: "purple",
    bgColor: "bg-purple-500",
  },
  {
    name: "Orange",
    value: "orange",
    bgColor: "bg-orange-500",
  },
  {
    name: "Pink",
    value: "pink",
    bgColor: "bg-pink-500",
  },
]

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-none">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {theme === "light" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <span>System</span>
          {theme === "system" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ColorSchemeSelector() {
  const [open, setOpen] = useState(false)
  const { colorScheme, setColorScheme } = useThemeContext()

  // Initialize color scheme from localStorage
  React.useEffect(() => {
    const storedScheme = localStorage.getItem('colorScheme') || 'blue'
    setColorScheme(storedScheme as ColorScheme)
  }, [setColorScheme])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-none">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change color scheme</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose a color scheme</DialogTitle>
          <DialogDescription>
            Select a color scheme for the application. This will change the accent colors throughout the app.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 py-4">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.value}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-md border-2 transition-all hover:border-primary",
                colorScheme === scheme.value ? "border-primary" : "border-transparent",
              )}
              onClick={() => {
                setColorScheme(scheme.value as ColorScheme)
                localStorage.setItem('colorScheme', scheme.value)
                setOpen(false)
              }}
            >
              <div className={cn("h-6 w-6 rounded-full", scheme.bgColor)} />
              <span className="mt-1 text-xs">{scheme.name}</span>
              {colorScheme === scheme.value && <Check className="absolute -right-1 -top-1 h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

