"use client"

import React from "react"
import ServerSidebar from "@/components/server-sidebar"

export default function Home() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <ServerSidebar />
    </div>
  );
}
