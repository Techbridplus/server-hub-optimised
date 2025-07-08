"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { UploadButton } from "@/components/upload-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getSocket, initSocket, disconnectSocket } from "@/lib/socket-client"

const formSchema = z.object({
  name: z.string().min(2, "Server name must be at least 2 characters"),
  description: z.string().optional(),
  category: z.enum(["gaming", "technology", "creative", "education", "business", "other"]),
  isPrivate: z.boolean().default(false).optional(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateServerModalProps {
  buttonText?: string
  className?: string
  onServerCreated?: () => void
}
// I will add a page reload here

export function CreateServerModal({ buttonText = "Create Server", className = "", onServerCreated }: CreateServerModalProps) {
  const [open, setOpen] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  
  // Handle socket cleanup when component unmounts or page unloads
  useEffect(() => {
    // Cleanup function for when component unmounts or page changes
    const handleBeforeUnload = () => {
      disconnectSocket();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectSocket();
    };
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "gaming",
      isPrivate: false,
    },
  })

  const handleBannerUpload = (url: string) => {
    setBannerPreview(url)
    form.setValue("bannerUrl", url)
  }

  const handleLogoUpload = (url: string) => {
    setLogoPreview(url)
    form.setValue("logoUrl", url)
  }

  const isLoading = form.formState.isSubmitting

  async function onSubmit(values: FormValues) {
    try {
      const response = await axios.post("/api/servers", {
        name: values.name,
        description: values.description,
        category: values.category,
        isPrivate: values.isPrivate,
        imageUrl: values.logoUrl,
        bannerUrl: values.bannerUrl,
      })

      if (response.status !== 200) {
        throw new Error("Failed to create server")
      }
      
      // Get the server ID from the response
      const serverId = response.data.id;

      toast({
        title: "Success",
        description: "Server created successfully",
      })
      
      // Create notification in database
      try {
        if (session?.user?.id) {
          // Ensure socket is initialized with serverId
          await initSocket(session.user.id, serverId);
          
          // Create notification via API
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: session.user.id,
              heading: "New Server Created 🚀",
              message: `You've successfully created "${values.name}" server.`,
              link: `/server/${serverId}`
            }),
          });
          
          // Send real-time notification via Socket.io
          const socket = getSocket();
          socket.emit('new-notification', {
            userId: session.user.id,
            heading: "New Server Created 🚀",
            message: `You've successfully created "${values.name}" server.`,
            read: false,
            link: `/server/${serverId}`,
            createdAt: new Date()
          });
          
          // We don't disconnect here as the socket is managed by the useEffect cleanup
        }
      } catch (error) {
        // Don't block the flow if notification fails
        console.error("Failed to create notification:", error);
      }

      setOpen(false)
      form.reset()
      setBannerPreview(null)
      setLogoPreview(null)
      onServerCreated?.()
      router.refresh()
    } catch (error) {
      console.error("Error creating server:", error)
      toast({
        title: "Error",
        description: "Failed to create server",
        variant: "destructive",
      })
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`${className}`}>
          <Plus className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Create a new server</DialogTitle>
              <DialogDescription>
                Fill in the details below to create your server. You can customize it further after creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Server Banner</Label>
              <div className="relative w-full overflow-hidden rounded-lg border" style={{ aspectRatio: '16/9' }}>
                {bannerPreview ? (
                  <div className="group relative h-full w-full">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setBannerPreview(null)
                          form.setValue("bannerUrl", undefined)
                        }}
                        disabled={isLoading}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 h-full w-full items-center justify-center">
                    <UploadButton
                      type="image"
                      onUpload={handleBannerUpload}
                      className="flex flex-col items-center gap-2"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 16:9 aspect ratio</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Server Logo (Optional) <span className="text-xs text-muted-foreground">Recommended: 128x128px</span></Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border">
                  {logoPreview ? (
                    <div className="group relative h-full w-full">
                      <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => {
                          setLogoPreview(null)
                          form.setValue("logoUrl", undefined)
                        }}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <UploadButton
                      type="image"
                      onUpload={handleLogoUpload}
                      className="flex h-full w-full items-center justify-center hover:bg-muted/50 transition-colors"
                      disabled={isLoading}
                    />
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter server name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your server" className="resize-none" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-2"
                      disabled={isLoading}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gaming" id="gaming" disabled={isLoading} />
                        <Label htmlFor="gaming">Gaming</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="technology" id="technology" disabled={isLoading} />
                        <Label htmlFor="technology">Technology</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="creative" id="creative" disabled={isLoading} />
                        <Label htmlFor="creative">Creative</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="education" id="education" disabled={isLoading} />
                        <Label htmlFor="education">Education</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="business" id="business" disabled={isLoading} />
                        <Label htmlFor="business">Business</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" disabled={isLoading} />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                  </FormControl>
                  <FormLabel className="!mt-0">Make this server private</FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Server"}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

