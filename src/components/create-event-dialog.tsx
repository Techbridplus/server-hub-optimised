"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { UploadButton } from "@/components/upload-button";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { getSocket, initSocket, disconnectSocket } from "@/lib/socket-client";

interface CreateEventDialogProps {
  serverId: string;
  buttonSize?: "default" | "sm";
  onEventCreated?: () => void;
}

export function CreateEventDialog({
  serverId,
  buttonSize = "default",
  onEventCreated,
}: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isExclusive, setIsExclusive] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("50");
  const [eventType, setEventType] = useState("gaming");
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const { data: session } = useSession();
  
  // Handle socket cleanup when component unmounts or page unloads
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Initialize socket when component mounts
    initSocket(session.user.id, serverId);
    
    // Cleanup function for when component unmounts or page changes
    const handleBeforeUnload = () => {
      disconnectSocket();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectSocket();
    };
  }, [session?.user?.id, serverId]);

  const validateStartTime = (time: string) => {
    const selectedDate = new Date(date || new Date());
    const [hours, minutes] = time.split(":");
    selectedDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (selectedDate < new Date()) {
      toast({
        title: "Invalid start time",
        description: "Start time cannot be in the past",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateEndTime = (time: string) => {
    if (!startTime) {
      toast({
        title: "Invalid end time",
        description: "Please select a valid start time first",
        variant: "destructive",
      });
      return false;
    }

    const startDate = new Date(date || new Date());
    const [startHours, startMinutes] = startTime.split(":");
    startDate.setHours(
      parseInt(startHours, 10),
      parseInt(startMinutes, 10),
      0,
      0
    );

    const endDate = new Date(date || new Date());
    const [endHours, endMinutes] = time.split(":");
    endDate.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);

    if (endDate <= startDate) {
      toast({
        title: "Invalid end time",
        description: "End time must be greater than start time",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateDate = (selectedDate: Date | undefined) => {
    if (!selectedDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison
    if (selectedDate < today) {
      toast({
        title: "Invalid date",
        description: "Date cannot be in the past",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!date || !startTime) {
        toast({
          title: "Missing information",
          description: "Please select a date and start time for the event",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create start date by combining date and time
      const startDate = new Date(date);
      const [startHours, startMinutes] = startTime.split(":");

      startDate.setHours(
        parseInt(startHours, 10),
        parseInt(startMinutes, 10),
        0,
        0
      );

      // Validate start time is not in the past
      if (startDate < new Date()) {
        toast({
          title: "Invalid start time",
          description: "Start time cannot be in the past",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create end date if end time is provided
      let endDate = null;
      if (endTime) {
        endDate = new Date(date);
        const [endHours, endMinutes] = endTime.split(":");
        endDate.setHours(
          parseInt(endHours, 10),
          parseInt(endMinutes, 10),
          0,
          0
        );

        // Validate end time is greater than start time
        if (endDate <= startDate) {
          toast({
            title: "Invalid end time",
            description: "End time must be greater than start time",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Prepare event data
      const eventData = {
        title,
        description,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        location,
        isExclusive,
        maxAttendees: parseInt(maxAttendees, 10),
        eventType,
        imageUrl: bannerImage, // Include banner image in the event data
      };

      // Send API request
      const response = await fetch(`/api/servers/${serverId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      // Extract the event data with ID from the response
      const createdEvent = await response.json();
      const eventId = createdEvent.id; // Get the event ID from the response

      // Reset form
      setTitle("");
      setDescription("");
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setLocation("");
      setIsExclusive(false);
      setMaxAttendees("50");
      setEventType("gaming");
      setBannerImage(null);

      // Close dialog
      setOpen(false);

      // Show success message
      toast({
        title: "Event created",
        description: "Your event has been created successfully",
      });

      //I will enter notification here
      // Ensure socket is initialized with both userId and serverId
      if (session?.user?.id) {
        await initSocket(session.user.id, serverId);
        
        // Create notification via API
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: session.user.id,
            heading: `New Event Created ⏳`,
            message: `"${eventData.title}" created successfully.`,
            link: `/server/${serverId}/event/${eventId}`, // Use the correct format with the event ID
          }),
        });
      }

      interface NotificationPayload {
        id?: string;
        userId: string;
        heading: string;
        message: string;
        read?: boolean;
        link?: string | null;
        createdAt?: Date;
      }

      // Get socket instance and emit notification
      const socket = getSocket();
      socket.emit("new-notification", {
        userId: session?.user?.id,
        heading: `New Event Created ⏳`,
        message: `New event "${eventData.title}" created successfully.`,
        link: `/servers/${serverId}/event/${eventId}`, // Optional - link to the events page
      } as NotificationPayload);

      // Call the callback if provided
      if (onEventCreated) {
        onEventCreated();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={buttonSize}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new event for your server.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bannerImage" className="text-lg font-semibold">
                Event Banner
              </Label>

              <div
                className="relative w-full overflow-hidden rounded-lg border"
                style={{ aspectRatio: "16/9" }}
              >
                {bannerImage ? (
                  <div className="group relative h-full w-full">
                    <Image
                      src={bannerImage}
                      alt="Banner preview"
                      width={800}
                      height={400}
                      className="object-cover h-full w-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setBannerImage(null);
                        }}
                        disabled={isLoading}
                      >
                        <span className="mr-2 h-4 w-4">✖</span>
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 h-full w-full items-center justify-center">
                    <UploadButton
                      type="image"
                      onUpload={(url) => setBannerImage(url)}
                      className="flex flex-col items-center gap-2"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 16:9 aspect ratio
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Please upload an image with a 16:9 aspect ratio for the best
                results.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event"
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        if (validateDate(selectedDate)) {
                          setDate(selectedDate);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="eventType">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const time = e.target.value;
                    if (validateStartTime(time)) {
                      setStartTime(time);
                    }
                  }}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    const time = e.target.value;
                    if (validateEndTime(time)) {
                      setEndTime(time);
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Discord Voice Channel, Zoom Meeting, etc."
                required
              />
            </div>

            {/* <div className="grid gap-2">
              <Label htmlFor="maxAttendees">Maximum Attendees</Label>
              <Input
                id="maxAttendees"
                type="number"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                min="1"
                required
              />
            </div> */}

            <div className="flex items-center space-x-2">
              <Switch
                id="exclusive"
                checked={isExclusive}
                onCheckedChange={setIsExclusive}
              />
              <Label htmlFor="exclusive">
                Make this event exclusive (members only)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
