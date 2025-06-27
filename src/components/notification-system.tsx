"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { CheckCheck} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Notification {
  id: string;
  userId: string;
  heading: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
}


// Format date to relative time
const formatDate = (CreationDate: Date) => {
  const date = new Date(CreationDate);
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return date.toLocaleDateString()
}

export default function NotificationSystem({className}:{className?:string}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFullModal, setShowFullModal] = useState(false)
  const [notificationData, setNotificationData] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  const unreadCount = notificationData.filter((n) => !n.read).length

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/notifications')

      if(!res.ok){
        throw new Error(`HTTP error! Status: ${res.status}`)
      }

      //check if response has content
      const text = await res.text()
      if(!text){
        console.warn('Empty response from notifications API')
        setNotificationData([]);
        return;
      }

      //parse JSON
      const data = JSON.parse(text)
      setNotificationData(data)

    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotificationData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch notifications when dropdown is opened
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications()
    }
  }, [showNotifications])

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        bellRef.current &&
        !notificationRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleMarkAllAsRead = async () => {
    try{
      //update local state immediately for better ux
      setNotificationData((prev) => prev.map((n) => ({ ...n, read: true })))

      const response = await fetch('/api/notifications/mark-all-read', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to mark notifications as read');
    }
    }
    catch(error){
      console.error('Error marking notifications as read:', error)
      //Revert local state on error
      fetchNotifications()
    }
  }

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev)
    setShowFullModal(false)
  }

  const openFullModal = () => {
    setShowFullModal(true)
    setShowNotifications(false)
  }

  return (
    <>
      {/* Bell Icon with notification indicator */}
      <div className="relative" ref={bellRef}>
        <Button onClick={toggleNotifications} className="p-2 rounded-full hover:bg-accent transition-colors" variant="default">
          <Bell className={`h-4 w-4 text-gray-700 ${className}`} />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          )}
        </Button>
      </div>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute top-16 right-4 z-50" ref={notificationRef}>
          <Card className="w-80 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Button
                variant="ghost"
                className="text-emerald-600 font-medium flex items-center gap-1 hover:text-emerald-700 hover:bg-emerald-50 p-1 h-auto"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-4 w-4" />
                <span className="text-sm">Mark all as read</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0 max-h-[350px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading notifications...</div>
              ) : notificationData.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No notifications</div>
              ) : (
                notificationData.slice(0, 3).map((notification) => (
                  <div key={notification.id} className={`border-b  'bg-white'}`}>
                    <div className="flex gap-3 p-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Bell className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!notification.read && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                          <h4 className="font-medium text-gray-800 text-sm">{notification.heading}</h4>
                          <span className="ml-auto text-gray-500 text-xs">{formatDate(notification.createdAt)}</span>
                        </div>
                        <p className="text-gray-600 text-xs">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="border-t py-2 px-4">
              <Button
                variant="ghost"
                className="w-full text-gray-700 hover:bg-gray-100 text-sm h-8"
                onClick={openFullModal}
              >
                View all notifications
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Full Modal */}
      <Dialog open={showFullModal} onOpenChange={setShowFullModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>All Notifications</DialogTitle>
          </DialogHeader>

          <div className="py-2 px-4 bg-blue-50/50 border-b">
            <h3 className="text-gray-500 font-medium">Today</h3>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading notifications...</div>
            ) : notificationData.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notificationData.map((notification) => (
                <div key={notification.id} className={`border-b  'bg-white'}`}>
                  <div className="flex gap-4 p-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                     
                        <Bell className="h-5 w-5 text-gray-500" />
                      
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!notification.read && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                        <h4 className="font-medium text-gray-800">{notification.heading}</h4>
                        <span className="ml-auto text-gray-500 text-sm">{formatDate(notification.createdAt)}</span>
                      </div>
                      <p className="text-gray-600">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
