import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export const initSocket = (userId?: string, serverId?: string) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      query: {
        userId,
        serverId
      },
      withCredentials:true
    })

    socket.on("connect", () => {
      console.log("Connected to Socket.io server")
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.io server")
    })

    socket.on("error", (error) => {
      console.error("Socket.io error:", error)
    })
  }

  return socket
}

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized")
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
} 