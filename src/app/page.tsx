"use client"

import React, { useState, useEffect } from "react"
import { Search, Compass, ChevronDown, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ServerSidebar from "@/components/server-sidebar"

export default function Home() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <ServerSidebar />
    </div>
  );
}
