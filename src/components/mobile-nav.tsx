"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, Moon, Sun, Compass, TrendingUp, Star, Bookmark, LogOut, User, Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTrigger } from "@/components/ui/sheet"
import { CreateServerModal } from "@/components/create-server-modal"
import { ColorSchemeSelector } from "@/components/theme-customizer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { setTheme, theme } = useTheme()
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <div className="rounded-full bg-primary p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-primary-foreground"
                >
                  <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                </svg>
              </div>
              <span className="font-bold">Server Hub</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <SheetDescription className="mt-2 text-center text-sm">
            Create, join and manage servers in one place
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          {status === "authenticated" ? (
            <div className="mb-4 flex items-center gap-3 px-1">
              <Avatar>
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                <AvatarFallback>
                  {session.user?.name
                    ? session.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{session.user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/auth/signin" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/signup" onClick={() => setOpen(false)}>
                  Sign Up
                </Link>
              </Button>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="px-1">
              <h3 className="mb-2 text-sm font-medium">Discover</h3>
              <div className="space-y-1">
                <Button variant={isActive("/browse") ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                  <Link href="/browse" onClick={() => setOpen(false)}>
                    <Compass className="mr-2 h-4 w-4" />
                    Browse Servers
                  </Link>
                </Button>
                <Button
                  variant={isActive("/trending") ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/trending" onClick={() => setOpen(false)}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Trending
                  </Link>
                </Button>
                <Button
                  variant={isActive("/featured") ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/featured" onClick={() => setOpen(false)}>
                    <Star className="mr-2 h-4 w-4" />
                    Featured
                  </Link>
                </Button>
                {status === "authenticated" && (
                  <Button variant={isActive("/saved") ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                    <Link href="/saved" onClick={() => setOpen(false)}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      Saved Servers
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="px-1">
              <h3 className="mb-2 text-sm font-medium">Theme</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`justify-start ${theme === "light" ? "border-primary" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`justify-start ${theme === "dark" ? "border-primary" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
              </div>
            </div>

            <div className="px-1">
              <h3 className="mb-2 text-sm font-medium">Color Scheme</h3>
              <div className="flex items-center">
                <ColorSchemeSelector />
                <span className="ml-2 text-sm">Change accent color</span>
              </div>
            </div>

            {status === "authenticated" && (
              <>
                <Separator />
                <div className="px-1">
                  <h3 className="mb-2 text-sm font-medium">Account</h3>
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/profile" onClick={() => setOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/settings" onClick={() => setOpen(false)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive"
                      onClick={() => {
                        signOut({ callbackUrl: "/" })
                        setOpen(false)
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <SheetFooter className="border-t pt-4">
          <CreateServerModal buttonText="Create New Server" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

