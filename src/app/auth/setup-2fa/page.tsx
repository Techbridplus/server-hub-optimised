"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const verifyCodeSchema = z.object({
  code: z.string().min(6, { message: "Code must be at least 6 characters" }),
})

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>

export default function Setup2FAPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }

    if (status === "authenticated") {
      fetchTwoFactorSetup()
    }
  }, [status, router])

  const fetchTwoFactorSetup = async () => {
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch 2FA setup")
      }

      const data = await response.json()
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setBackupCodes(data.backupCodes)
    } catch (error) {
      setError("Failed to set up two-factor authentication")
    }
  }

  const onVerifyCode = async (data: VerifyCodeFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.code,
          secret,
        }),
      })

      if (!response.ok) {
        throw new Error("Invalid verification code")
      }

      setSuccess("Two-factor authentication has been enabled successfully")
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const skipSetup = () => {
    router.push("/")
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>Enhance your account security by setting up two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert
              variant="default"
              className="border-green-500 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100"
            >
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="app" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="app">Authenticator App</TabsTrigger>
              <TabsTrigger value="backup">Backup Codes</TabsTrigger>
            </TabsList>
            <TabsContent value="app" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. Download an authenticator app like Google Authenticator or Authy
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Open the app and tap the + button to add a new account
                </p>
                <p className="text-sm text-muted-foreground">
                  3. Choose "Scan QR code" and scan the code below, or tap "Enter setup key" and enter the secret key manually
                </p>
                <p className="text-sm text-muted-foreground">
                  4. Once added, enter the 6-digit code shown in your authenticator app
                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 py-4">
                {qrCode && (
                  <>
                    <div 
                      className="w-48 h-48 bg-white p-2 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: qrCode }}
                    />
                    <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app</p>
                  </>
                )}
              </div>

              {secret && (
                <div className="space-y-2">
                  <Label>Secret Key (for manual entry)</Label>
                  <div className="rounded-md bg-muted p-2 text-center font-mono text-sm">{secret}</div>
                  <p className="text-sm text-muted-foreground">Enter this code manually if you can't scan the QR code</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onVerifyCode)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    {...register("code")}
                    disabled={isLoading}
                  />
                  {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify and Enable 2FA"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="backup" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Save these backup codes in a secure place. You can use them to sign in if you lose access to your
                  authenticator app.
                </p>
                <p className="text-sm text-muted-foreground">Each code can only be used once.</p>
              </div>

              <div className="rounded-md bg-muted p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const text = backupCodes.join("\n")
                  navigator.clipboard.writeText(text)
                  setSuccess("Backup codes copied to clipboard")
                }}
              >
                Copy Backup Codes
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={skipSetup}>
            Skip for now
          </Button>
          <Button variant="default" onClick={() => router.push("/")}>
            Continue to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

