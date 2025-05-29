import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff
} from "lucide-react"
import { getSocket } from "@/lib/socket-client"

interface CallDialogProps {
  isOpen: boolean
  onClose: () => void
  otherUser: {
    id: string
    name: string | null
    image: string | null
  }
  currentUserId: string
  type: "audio" | "video"
}

interface CallSignal {
  type: "offer" | "answer" | "candidate";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  to: string;
}

export function CallDialog({
  isOpen,
  onClose,
  otherUser,
  type
}: CallDialogProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isCallEnded, setIsCallEnded] = useState(false)
  const { toast } = useToast()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const cleanupCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop())
    peerConnectionRef.current?.close()
    localStreamRef.current = null
    peerConnectionRef.current = null
  }, [])

  const handleCallEnded = useCallback(() => {
    setIsCallEnded(true)
    cleanupCall()
    onClose()
  }, [onClose, cleanupCall])

  const initializeCall = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: type === "video"
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      initializePeerConnection()
    } catch (error) {
      console.error("Error accessing media devices:", error)
      toast({
        title: "Error",
        description: "Failed to access camera/microphone",
        variant: "destructive"
      })
      onClose()
    }
  }, [type, onClose, toast])

  const handleCallSignal = useCallback(async (data: CallSignal) => {
    try {
      if (data.type === "offer") {
        await peerConnectionRef.current!.setRemoteDescription(
          new RTCSessionDescription(data.offer!)
        )
        const answer = await peerConnectionRef.current!.createAnswer()
        await peerConnectionRef.current!.setLocalDescription(answer)

        const socket = getSocket()
        socket.emit("callSignal", {
          type: "answer",
          answer,
          to: otherUser.id
        })
      } else if (data.type === "answer") {
        await peerConnectionRef.current!.setRemoteDescription(
          new RTCSessionDescription(data.answer!)
        )
      } else if (data.type === "candidate") {
        await peerConnectionRef.current!.addIceCandidate(
          new RTCIceCandidate(data.candidate!)
        )
      }
    } catch (error) {
      console.error("Error handling call signal:", error)
      toast({
        title: "Error",
        description: "Failed to handle call signal",
        variant: "destructive"
      })
      onClose()
    }
  }, [otherUser.id, onClose, toast])

  useEffect(() => {
    if (isOpen && !isCallEnded) {
      initializeCall()
    }

    return () => {
      cleanupCall()
    }
  }, [isOpen, isCallEnded, initializeCall, cleanupCall])

  useEffect(() => {
    const socket = getSocket()
    
    socket.on("callSignal", handleCallSignal)
    socket.on("callEnded", handleCallEnded)

    return () => {
      socket.off("callSignal")
      socket.off("callEnded")
    }
  }, [handleCallSignal, handleCallEnded])

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    localStreamRef.current?.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current!)
    })

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket()
        socket.emit("callSignal", {
          type: "candidate",
          candidate: event.candidate,
          to: otherUser.id
        })
      }
    }

    createAndSendOffer()
  }

  const createAndSendOffer = async () => {
    try {
      const offer = await peerConnectionRef.current!.createOffer()
      await peerConnectionRef.current!.setLocalDescription(offer)

      const socket = getSocket()
      socket.emit("callSignal", {
        type: "offer",
        offer,
        to: otherUser.id
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      toast({
        title: "Error",
        description: "Failed to establish call",
        variant: "destructive"
      })
      onClose()
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoOff(!videoTrack.enabled)
    }
  }

  const endCall = () => {
    const socket = getSocket()
    socket.emit("callEnded", { to: otherUser.id })
    handleCallEnded()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.image || undefined} />
              <AvatarFallback>
                {otherUser.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span>{otherUser.name || "User"}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative">
          {type === "video" && (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg"
              />
            </>
          )}
          {type === "audio" && (
            <div className="flex items-center justify-center h-full">
              <Avatar className="h-32 w-32">
                <AvatarImage src={otherUser.image || undefined} />
                <AvatarFallback>
                  {otherUser.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-4 p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={isMuted ? "bg-destructive" : ""}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          {type === "video" && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVideo}
              className={isVideoOff ? "bg-destructive" : ""}
            >
              {isVideoOff ? (
                <VideoOff className="h-4 w-4" />
              ) : (
                <Video className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={endCall}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 