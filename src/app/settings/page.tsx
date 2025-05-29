"use client"

import { useState, useEffect } from "react"
import { Check, Lock, Bell, User, Shield, Sliders, Palette, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import Link from "next/link"
import axios from "axios"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { ThemeToggle, ColorSchemeSelector } from "@/components/theme-customizer"

interface UserSettings {
  name: string
  email: string
  bio: string
  image?: string
  emailVerified: boolean
  twoFactorAuth: {
    enabled: boolean
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [formData, setFormData] = useState<Partial<UserSettings>>({})
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailCheckError, setEmailCheckError] = useState<string | null>(null)
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationError, setVerificationError] = useState<string | null>(null)

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.user) return
      
      try {
        const response = await axios.get("/api/users/me/settings")
        setSettings(response.data)
        setFormData(response.data)
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchSettings()
  }, [session, toast])

  const handleInputChange = (field: keyof UserSettings, value: string | boolean | { enabled: boolean }) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveSettings = async () => {
    if (!session?.user) return

    setIsLoading(true)
    try {
      const response = await axios.put("/api/users/me/settings", formData)
      setSettings(response.data)
      toast({
        title: "Success",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckEmail = async () => {
    if (!newEmail) {
      setEmailCheckError("Please enter an email address")
      return
    }

    setIsCheckingEmail(true)
    setEmailCheckError(null)

    try {
      const response = await axios.post('/api/auth/verify-email', { email: newEmail })
      
      if (response.data.success) {
        setShowVerificationInput(true)
      } else {
        setEmailCheckError(response.data.error || "Failed to verify email")
      }
    } catch (error) {
      if (error instanceof Error) {
        setEmailCheckError(error.message)
      } else {
        setEmailCheckError("Failed to verify email")
      }
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!verificationCode) {
      setVerificationError("Please enter the verification code")
      return
    }

    setIsVerifyingEmail(true)
    setVerificationError(null)

    try {
      const response = await axios.post('/api/auth/verify-email', {
        email: newEmail,
        otp: verificationCode
      })

      if (response.data.success) {
        // Update the email in settings
        await handleInputChange("email", newEmail)
        await handleSaveSettings()
        
        setShowVerificationInput(false)
        setNewEmail("")
        setVerificationCode("")
        toast({
          title: "Success",
          description: "Email verified and updated successfully.",
        })
      } else {
        setVerificationError(response.data.error || "Invalid verification code")
      }
    } catch (error) {
      if (error instanceof Error) {
        setVerificationError(error.message)
      } else {
        setVerificationError("Failed to verify email")
      }
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-2xl font-bold">Please sign in to access settings</h1>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full" >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-64 flex-shrink-0">
            <TabsList className="flex flex-col h-auto p-0 bg-transparent space-y-1">
              <TabsTrigger
                value="general"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:font-medium"
              >
                <User className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:font-medium"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:font-medium"
              >
                <Lock className="h-4 w-4 mr-2" />
                Privacy & Security
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:font-medium"
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="w-full justify-start px-3 py-2 h-9 font-normal data-[state=active]:font-medium"
              >
                <Sliders className="h-4 w-4 mr-2" />
                Advanced
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 space-y-4">
            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your profile information visible to other users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name || ""} 
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself"
                      value={formData.bio || ""}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                  <CardDescription>Manage your email address and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Current Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email || ""} 
                        disabled
                      />
                      <div className={`flex items-center gap-1 ${!settings?.emailVerified ? 'text-yellow-500' : 'text-green-500'}`}>
                        {settings?.emailVerified ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span className="text-sm">Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Not Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="new-email">Change Email Address</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="new-email" 
                        type="email" 
                        placeholder="Enter new email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        disabled={isCheckingEmail || showVerificationInput}
                      />
                      <Button 
                        onClick={handleCheckEmail}
                        disabled={isCheckingEmail || showVerificationInput || !newEmail}
                      >
                        {isCheckingEmail ? "Checking..." : "Check Email"}
                      </Button>
                    </div>
                    {emailCheckError && (
                      <p className="text-sm text-destructive">{emailCheckError}</p>
                    )}
                  </div>

                  {showVerificationInput && (
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="verification-code" 
                          type="text" 
                          placeholder="Enter verification code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={isVerifyingEmail}
                        />
                        <Button 
                          onClick={handleVerifyEmail}
                          disabled={isVerifyingEmail || !verificationCode}
                        >
                          {isVerifyingEmail ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                      {verificationError && (
                        <p className="text-sm text-destructive">{verificationError}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how and when you want to be notified.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-events" className="flex-1">
                          Event invitations and updates
                        </Label>
                        <Switch id="email-events" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-announcements" className="flex-1">
                          Server announcements
                        </Label>
                        <Switch id="email-announcements" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-messages" className="flex-1">
                          Direct messages
                        </Label>
                        <Switch id="email-messages" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Push Notifications</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-events" className="flex-1">
                          Event reminders
                        </Label>
                        <Switch id="push-events" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-announcements" className="flex-1">
                          Server announcements
                        </Label>
                        <Switch id="push-announcements" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-messages" className="flex-1">
                          Direct messages
                        </Label>
                        <Switch id="push-messages" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-mentions" className="flex-1">
                          Mentions and replies
                        </Label>
                        <Switch id="push-mentions" defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Notification Schedule</h3>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-hours">Quiet Hours</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiet-start" className="text-xs">
                            Start Time
                          </Label>
                          <Select defaultValue="22">
                            <SelectTrigger id="quiet-start">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quiet-end" className="text-xs">
                            End Time
                          </Label>
                          <Select defaultValue="7">
                            <SelectTrigger id="quiet-end">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy & Security Settings */}
            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control who can see your profile and activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Profile Visibility</h3>
                    <RadioGroup defaultValue="friends">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="visibility-public" />
                        <Label htmlFor="visibility-public">Public - Anyone can view your profile</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="friends" id="visibility-friends" />
                        <Label htmlFor="visibility-friends">Friends - Only people you&apos;re connected with</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="visibility-private" />
                        <Label htmlFor="visibility-private">Private - Only you can view your profile</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Activity Status</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-online" className="flex-1">
                          Show when you&apos;re online
                        </Label>
                        <Switch id="show-online" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-activity" className="flex-1">
                          Show current activity
                        </Label>
                        <Switch id="show-activity" defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security and authentication methods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Password</h3>
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                      </div>
                      <Switch 
                        id="enable-2fa" 
                        checked={settings?.twoFactorAuth?.enabled}
                        onCheckedChange={(checked) => handleInputChange("twoFactorAuth", { enabled: checked })}
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      Manage 2FA Settings
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Login Sessions</h3>
                    <div className="rounded-md border p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Current Session</p>
                          <p className="text-sm text-muted-foreground">Windows • Chrome • New York, USA</p>
                          <p className="text-xs text-muted-foreground mt-1">Started 2 hours ago</p>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                          Active
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View All Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Theme Settings</CardTitle>
                  <CardDescription>Customize the look and feel of your interface.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium">Dark Mode</h3>
                    <ThemeToggle />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Custom Theme</h3>
                    <ColorSchemeSelector />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Font Size</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Small</span>
                        <span className="text-sm">Large</span>
                      </div>
                      <Slider defaultValue={[2]} max={4} step={1} className="w-full" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Interface Density</h3>
                    <RadioGroup defaultValue="comfortable">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="compact" id="density-compact" />
                        <Label htmlFor="density-compact">Compact</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="comfortable" id="density-comfortable" />
                        <Label htmlFor="density-comfortable">Comfortable</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>Adjust settings to improve your experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reduce-motion" className="flex-1">
                      Reduce motion
                    </Label>
                    <Switch id="reduce-motion" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-contrast" className="flex-1">
                      High contrast mode
                    </Label>
                    <Switch id="high-contrast" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>Configure advanced options for your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      Danger Zone <Shield className="h-4 w-4 text-destructive" />
                    </h3>
                    <div className="rounded-md border border-destructive/20 p-4">
                      <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Once you delete your account, there is no going back. This action cannot be undone.
                      </p>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

