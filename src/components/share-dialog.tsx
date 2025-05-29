"use client"

import { useState } from "react"
import { Check, Copy, Facebook, Instagram, Link, Linkedin, Share, Twitter } from "lucide-react"
import { FaTelegram } from "react-icons/fa6";
import { BsWhatsapp } from "react-icons/bs";
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ShareDialogProps {
  title: string
  url: string
  type: "server" | "event" | "announcement" | "group"
}

export function ShareDialog({ title, url, type }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const fullUrl = `${url}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const socialShareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=Check out this ${type}: ${title}&url=${encodeURIComponent(fullUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out this ${type}: ${title}\n${fullUrl}`)}`, // Ensure proper formatting
    telegram: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(`Check out this ${type}: ${title}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
    instagram: `https://www.instagram.com/`, // Instagram does not support direct sharing via URL
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Share className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {type}</DialogTitle>
          <DialogDescription>Share this {type} with your friends and community</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Input value={fullUrl} readOnly className="flex-1" />
              <Button size="sm" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline hover:text-primary/80"
              >
                Open Link
              </a>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-2 text-sm font-medium">Preview</div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10">
                  <div className="flex h-full w-full items-center justify-center">
                    <Link className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">server-hub.vercel.app</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <a
                href={socialShareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Twitter className="mb-2 h-6 w-6 text-[#1DA1F2]" />
                <span className="text-sm font-medium">Twitter</span>
              </a>
              <a
                href={socialShareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Facebook className="mb-2 h-6 w-6 text-[#1877F2]" />
                <span className="text-sm font-medium">Facebook</span>
              </a>
              <a
                href={socialShareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <BsWhatsapp className="mb-2 h-6 w-6 text-[#25D366]" />
                <span className="text-sm font-medium">WhatsApp</span>
              </a>
              <a
                href={socialShareLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <FaTelegram className="mb-2 h-6 w-6 text-[#0088CC]"  />
                <span className="text-sm font-medium">Telegram</span>
              </a>
              <a
                href={socialShareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Linkedin className="mb-2 h-6 w-6 text-[#0077B5]" />
                <span className="text-sm font-medium">LinkedIn</span>
              </a>
              <a
                href={socialShareLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Instagram className="mb-2 h-6 w-6 text-[#E4405F]" />
                <span className="text-sm font-medium">Instagram</span>
              </a>
            </div>

            <Separator className="my-4" />

            <div className="text-center text-sm text-muted-foreground">Or copy the link and share it anywhere</div>

            <div className="mt-2 flex items-center space-x-2">
              <Input value={fullUrl} readOnly className="flex-1" />
              <Button size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

