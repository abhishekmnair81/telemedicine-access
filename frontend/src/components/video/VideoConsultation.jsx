"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { generatePrescriptionPDF } from './generatePrescriptionPDF'
import {
  FaVideo,
  FaArrowLeft,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
  FaPhoneSlash,
  FaDesktop,
  FaPaperPlane,
  FaCalendarCheck,
  FaComments,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaPrescriptionBottle,
  FaTimes,
  FaFileMedical,
  FaDownload,
  FaPrint,
  FaFilePdf,
  FaSpinner,
} from "react-icons/fa"
import { videoConsultationAPI, authAPI, appointmentsAPI, prescriptionsAPI } from "../../services/api"
import "./VideoConsultation.css"

// ─────────────────────────────────────────────────────────────
// PrescriptionDownloadButton – standalone component (extracted)
// ─────────────────────────────────────────────────────────────
const PrescriptionDownloadButton = ({
  prescription,
  size = 'md',
  variant = 'primary',
  label,
  showIcon = true,
  style = {},
  className = '',
}) => {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = async () => {
    if (status === 'loading') return
    if (!prescription) {
      setErrorMsg('No prescription data available')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      await generatePrescriptionPDF(prescription)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      console.error('[PrescriptionDownloadButton] PDF generation failed:', err)
      setErrorMsg('Could not generate PDF. Please try again.')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const sizeMap = {
    sm: { padding: '8px 14px', fontSize: '13px', iconSize: '14px' },
    md: { padding: '10px 18px', fontSize: '14px', iconSize: '16px' },
    lg: { padding: '13px 24px', fontSize: '15px', iconSize: '18px' },
  }

  const variantMap = {
    primary: {
      background: status === 'success' ? '#4CAF50' : status === 'error' ? '#f44336' : '#1a6b4a',
      color: '#fff',
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: status === 'success' ? '#4CAF50' : status === 'error' ? '#f44336' : '#1a6b4a',
      border: `2px solid ${status === 'success' ? '#4CAF50' : status === 'error' ? '#f44336' : '#1a6b4a'}`,
    },
    ghost: {
      background: 'transparent',
      color: status === 'success' ? '#4CAF50' : status === 'error' ? '#f44336' : '#1a6b4a',
      border: 'none',
    },
  }

  const sz = sizeMap[size] || sizeMap.md
  const vr = variantMap[variant] || variantMap.primary

  const getIcon = () => {
    if (status === 'loading') return <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: sz.iconSize }} />
    if (status === 'success') return <FaCheckCircle style={{ fontSize: sz.iconSize }} />
    if (status === 'error') return <FaTimes style={{ fontSize: sz.iconSize }} />
    return <FaFilePdf style={{ fontSize: sz.iconSize }} />
  }

  const getLabel = () => {
    if (status === 'loading') return 'Generating PDF…'
    if (status === 'success') return 'Downloaded!'
    if (status === 'error') return 'Retry Download'
    return label || 'Download PDF'
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={status === 'loading'}
        className={className}
        style={{
          ...sz,
          ...vr,
          borderRadius: '8px',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          opacity: status === 'loading' ? 0.8 : 1,
          ...style,
        }}
      >
        {showIcon && getIcon()}
        {getLabel()}
      </button>
      {status === 'error' && errorMsg && (
        <p style={{ color: '#f44336', fontSize: '12px', marginTop: '6px' }}>{errorMsg}</p>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ICE servers config (module-level constant – not inside render)
// ─────────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

// ─────────────────────────────────────────────────────────────
// Main VideoConsultation component
// ─────────────────────────────────────────────────────────────
const VideoConsultation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const websocketRef = useRef(null)
  const localStreamRef = useRef(null)

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [showStatusBadge, setShowStatusBadge] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [userAppointments, setUserAppointments] = useState([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [videoStarting, setVideoStarting] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { sender: "System", message: "Select an appointment to start video consultation", timestamp: new Date() },
  ])
  const [chatInput, setChatInput] = useState("")

  // Prescription states
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [receivedPrescriptions, setReceivedPrescriptions] = useState([])
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false)

  // ── Auth + initial load ──────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const user = authAPI.getCurrentUser()
      if (!user) {
        addChatMessage("System", "Please login to access video consultation")
        setTimeout(() => navigate('/auth?type=patient&view=login'), 2000)
        return
      }
      if (user.user_type === 'doctor') {
        navigate('/doctor-video')
        return
      }
      console.log('[VideoConsultation] Current patient:', user)
      setCurrentUser(user)
      await loadAppointments(user)
      await loadPrescriptions(user.id)
    }

    checkAuth()

    if (location.state?.appointment) {
      setSelectedAppointment(location.state.appointment)
    }

    return () => {
      console.log('[VideoConsultation] Component unmounting - cleaning up')
      closeConnection()
    }
  }, [navigate, location])

  // ── Auto-scroll chat ─────────────────────────────────────────
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  // ── Attach local stream to video element ─────────────────────
  useEffect(() => {
    console.log('[VideoConsultation] Local stream changed:', !!localStream)
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(err =>
        console.error('[VideoConsultation] Error playing local video:', err)
      )
    }
  }, [localStream])

  // ── Attach remote stream to video element ────────────────────
  useEffect(() => {
    console.log('[VideoConsultation] Remote stream changed:', !!remoteStream)
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.style.display = "block"
      remoteVideoRef.current.play().catch(err =>
        console.error('[VideoConsultation] Error playing remote video:', err)
      )
    }
  }, [remoteStream])

  // ── Load appointments ────────────────────────────────────────
  const loadAppointments = async (user) => {
    try {
      setLoadingAppointments(true)
      const response = await appointmentsAPI.getPatientAppointments(user.id)
      const appointments = Array.isArray(response) ? response : (response.results || [])
      const confirmed = appointments.filter(apt => apt.status === 'confirmed')
      setUserAppointments(confirmed)
    } catch (error) {
      console.error('[VideoConsultation] Error loading appointments:', error)
      addChatMessage("System", "Failed to load appointments")
    } finally {
      setLoadingAppointments(false)
    }
  }

  // ── Load prescriptions ───────────────────────────────────────
  const loadPrescriptions = async (patientId) => {
    try {
      setLoadingPrescriptions(true)
      const response = await prescriptionsAPI.getPatientPrescriptions(patientId)
      const prescriptions = Array.isArray(response) ? response : (response.results || [])
      setReceivedPrescriptions(prescriptions)
      return prescriptions
    } catch (error) {
      console.error('[Prescriptions] Error loading prescriptions:', error)
      return []
    } finally {
      setLoadingPrescriptions(false)
    }
  }

  // ── Chat helpers ─────────────────────────────────────────────
  const addChatMessage = (sender, message) => {
    setChatMessages(prev => [...prev, { sender, message, timestamp: new Date() }])
  }

  // ── Start consultation ───────────────────────────────────────
  const startConsultation = async (appointment) => {
    if (!currentUser) { alert("Please login to start consultation"); return }

    try {
      setSelectedAppointment(appointment)
      addChatMessage("System", `Starting consultation with ${appointment.doctor_details?.user?.first_name || 'doctor'}...`)

      const patientId = currentUser.id
      let doctorId =
        appointment.doctor_details?.user?.id ||
        appointment.doctor?.id ||
        appointment.doctor

      if (!doctorId) throw new Error('Could not determine doctor ID from appointment')

      let room = null
      try {
        const existingRooms = await videoConsultationAPI.getPatientRooms(currentUser.id)
        const roomsList = existingRooms.rooms || existingRooms || []
        room = roomsList.find(r =>
          r.appointment === appointment.id &&
          r.status !== 'completed' &&
          r.status !== 'cancelled'
        )
        if (room) addChatMessage("System", "Rejoining existing consultation room...")
      } catch (err) {
        console.log('[VideoConsultation] Error checking for existing room:', err.message)
      }

      if (!room) {
        const roomData = {
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_id: appointment.id,
          scheduled_time: new Date().toISOString(),
          chat_enabled: true,
          screen_share_enabled: true,
          recording_enabled: false,
        }
        room = await videoConsultationAPI.createRoom(roomData)
        addChatMessage("System", "New consultation room created")
      }

      setCurrentRoom(room)

      await videoConsultationAPI.joinRoom({ room_id: room.room_id, user_id: currentUser.id })
      addChatMessage("System", "Connected to consultation room. Starting video...")

      await startLocalVideo()
      initializeWebSocket(room.room_id, currentUser.id)
    } catch (error) {
      console.error("[VideoConsultation] ❌ Error starting consultation:", error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      alert("Error starting consultation: " + errorMessage)
      addChatMessage("System", "Failed to start consultation: " + errorMessage)
    }
  }

  // ── WebSocket ────────────────────────────────────────────────
  const initializeWebSocket = (roomId, userId) => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/video/${roomId}/${userId}/`

    console.log('[WebSocket] Connecting to:', wsUrl)
    websocketRef.current = new WebSocket(wsUrl)

    websocketRef.current.onopen = () => {
      console.log("[WebSocket] ✅ Connected")
      setIsConnected(true)
      addChatMessage("System", "Connected to consultation room")
      if (currentRoom) {
        const doctorId = currentRoom.doctor || currentRoom.doctor_id
        createOffer(doctorId)
      }
    }

    websocketRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        await handleWebSocketMessage(data)
      } catch (error) {
        console.error("[WebSocket] Error handling message:", error)
      }
    }

    websocketRef.current.onerror = (error) => {
      console.error("[WebSocket] Error:", error)
      addChatMessage("System", "Connection error occurred")
    }

    websocketRef.current.onclose = () => {
      console.log("[WebSocket] Disconnected")
      setIsConnected(false)
      addChatMessage("System", "Disconnected from consultation room")
    }
  }

  // ── Handle WebSocket messages ────────────────────────────────
  const handleWebSocketMessage = async (data) => {
    console.log("[WebSocket] Message received:", data.type)

    switch (data.type) {
      case "user_connected":
        addChatMessage("System", `${data.user_name || 'Doctor'} connected to the room`)
        break

      case "user_disconnected":
        addChatMessage("System", `${data.user_name || 'Doctor'} disconnected from the room`)
        handleRemoteDisconnect()
        break

      case "webrtc_offer":
        if (data.receiver_id === currentUser?.id) {
          await handleReceiveOffer(data.sdp, data.sender_id)
        }
        break

      case "webrtc_answer":
        if (data.receiver_id === currentUser?.id) {
          await handleReceiveAnswer(data.sdp)
        }
        break

      case "ice_candidate":
        if (data.receiver_id === currentUser?.id) {
          await handleReceiveIceCandidate(data.candidate)
        }
        break

      case "chat_message":
        if (data.sender_id !== currentUser?.id) {
          addChatMessage(data.sender_name, data.content)
        }
        break

      case "prescription_sent":
        console.log('[Prescription] Received prescription notification:', data)
        addChatMessage("System", "🩺 Doctor has sent you a prescription")
        const updatedPrescriptions = await loadPrescriptions(currentUser.id)
        if (updatedPrescriptions.length > 0) {
          setShowPrescriptionModal(true)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Prescription', {
              body: 'Your doctor has sent you a prescription',
              icon: '/prescription-icon.png',
            })
          }
        }
        break

      case "user_status":
        addChatMessage("System", `Doctor updated their status`)
        break

      case "screen_share":
        const action = data.action === "start" ? "started" : "stopped"
        addChatMessage("System", `Doctor ${action} screen sharing`)
        break

      default:
        console.log("[WebSocket] Unknown message type:", data.type)
    }
  }

  // ── WebRTC ───────────────────────────────────────────────────
  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS)

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track =>
        peerConnection.addTrack(track, localStreamRef.current)
      )
    }

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams
      setRemoteStream(stream)
      addChatMessage("System", "Doctor connected to video call")
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        sendICECandidate(event.candidate)
      }
    }

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      if (state === "connected") addChatMessage("System", "Peer-to-peer connection established")
      else if (state === "disconnected") addChatMessage("System", "Connection interrupted")
      else if (state === "failed") addChatMessage("System", "Connection failed - attempting to reconnect")
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }

  const createOffer = async (receiverId) => {
    try {
      const peerConnection = createPeerConnection()
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await peerConnection.setLocalDescription(offer)
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "webrtc_offer",
          sender_id: currentUser.id,
          receiver_id: receiverId,
          sdp: offer,
        }))
      }
    } catch (error) {
      console.error("[WebRTC] Error creating offer:", error)
      addChatMessage("System", "Error establishing connection")
    }
  }

  const handleReceiveOffer = async (offer, senderId) => {
    try {
      const peerConnection = createPeerConnection()
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "webrtc_answer",
          sender_id: currentUser.id,
          receiver_id: senderId,
          sdp: answer,
        }))
      }
    } catch (error) {
      console.error("[WebRTC] Error handling offer:", error)
    }
  }

  const handleReceiveAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      }
    } catch (error) {
      console.error("[WebRTC] Error handling answer:", error)
    }
  }

  const sendICECandidate = (candidate) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN && currentRoom) {
      const doctorId = currentRoom.doctor || currentRoom.doctor_id
      websocketRef.current.send(JSON.stringify({
        type: "ice_candidate",
        sender_id: currentUser.id,
        receiver_id: doctorId,
        candidate,
      }))
    }
  }

  const handleReceiveIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error("[WebRTC] Error adding ICE candidate:", error)
    }
  }

  const handleRemoteDisconnect = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
      remoteVideoRef.current.style.display = "none"
    }
    setRemoteStream(null)
  }

  // ── Local video ──────────────────────────────────────────────
  const startLocalVideo = async () => {
    if (!currentUser) {
      addChatMessage("System", "Please login to start video")
      navigate('/auth?type=patient&view=login')
      return
    }
    if (videoStarting) return

    try {
      setVideoStarting(true)
      addChatMessage("System", "Requesting camera and microphone access...")

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch (error) {
        console.log('[VideoConsultation] HD failed, trying basic...')
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        } catch (fallbackError) {
          console.warn("[VideoConsultation] ⚠️ Camera access completely failed:", fallbackError)
          let errorMessage = "Could not access camera/microphone. "
          if (fallbackError.name === "NotAllowedError") errorMessage += "Permissions denied."
          else if (fallbackError.name === "NotFoundError") errorMessage += "No hardware found."
          else errorMessage += fallbackError.message

          addChatMessage("System", "⚠️ " + errorMessage + " Proceeding without media.")
          stream = null;
        }
      }

      if (stream) {
        localStreamRef.current = stream
        setLocalStream(stream)
        setShowStatusBadge(true)
        setIsMicOn(true)
        setIsVideoOn(true)
        addChatMessage("System", "✅ Your video stream is active")
      } else {
        console.log('[VideoConsultation] Proceeding without camera/microphone')
        setShowStatusBadge(true)
        setIsMicOn(false)
        setIsVideoOn(false)
      }
    } catch (error) {
      console.error("[VideoConsultation] ❌ Unexpected Error:", error)
      addChatMessage("System", "❌ Failed to start video system: " + error.message)
    } finally {
      setVideoStarting(false)
    }
  }

  // ── Controls ─────────────────────────────────────────────────
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMicOn(audioTrack.enabled)
        addChatMessage("System", audioTrack.enabled ? "Microphone enabled" : "Microphone muted")
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: "user_status",
            user_id: currentUser.id,
            audio_enabled: audioTrack.enabled,
            video_enabled: isVideoOn,
          }))
        }
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        addChatMessage("System", videoTrack.enabled ? "Camera enabled" : "Camera disabled")
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: "user_status",
            user_id: currentUser.id,
            audio_enabled: isMicOn,
            video_enabled: videoTrack.enabled,
          }))
        }
      }
    }
  }

  const closeConnection = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null }
    if (websocketRef.current) { websocketRef.current.close(); websocketRef.current = null }
    setLocalStream(null)
    setRemoteStream(null)
    setShowStatusBadge(false)
    setIsConnected(false)
  }

  const endCall = async () => {
    if (window.confirm("End consultation?")) {
      try {
        if (currentRoom) {
          await videoConsultationAPI.endConsultation({ room_id: currentRoom.room_id, user_id: currentUser.id })
          addChatMessage("System", "Call ended successfully")
        }
      } catch (error) {
        console.error("Error ending call:", error)
      } finally {
        closeConnection()
        setCurrentRoom(null)
        setSelectedAppointment(null)
        setIsMicOn(true)
        setIsVideoOn(true)
      }
    }
  }

  const shareScreen = async () => {
    if (!localStreamRef.current) { alert("Please start your video first"); return }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false })
      const screenTrack = screenStream.getVideoTracks()[0]
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video")
        if (sender) sender.replaceTrack(screenTrack)
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([screenTrack, ...localStreamRef.current.getAudioTracks()])
      }
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: "screen_share", user_id: currentUser.id, action: "start" }))
      }
      screenTrack.onended = () => { addChatMessage("System", "Screen sharing stopped"); restoreCamera() }
      addChatMessage("System", "Screen sharing started")
    } catch (error) {
      console.error("Error sharing screen:", error)
      addChatMessage("System", "Screen sharing cancelled or failed")
    }
  }

  const restoreCamera = async () => {
    if (localStreamRef.current && peerConnectionRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === "video")
      if (sender && videoTrack) await sender.replaceTrack(videoTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: "screen_share", user_id: currentUser.id, action: "stop" }))
      }
    }
  }

  const sendChatMessage = () => {
    const message = chatInput.trim()
    if (message && websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: "chat_message",
        sender_id: currentUser.id,
        sender_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        content: message,
        message_type: "text",
      }))
      addChatMessage("You", message)
      setChatInput("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage() }
  }

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })

  const viewPrescription = (prescription) => setSelectedPrescription(prescription)
  const printPrescription = () => window.print()

  // ── Auth guard ───────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="apollo-video-page">
        <div className="apollo-wrapper">
          <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '500px', margin: '0 auto' }}>
            <h2>Authentication Required</h2>
            <p style={{ margin: '20px 0', color: 'var(--apollo-text-secondary)' }}>
              Please login to access video consultation services
            </p>
            <button
              className="apollo-primary-btn"
              onClick={() => navigate('/auth?type=patient&view=login')}
              style={{ marginTop: '20px' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="apollo-video-page">
      {/* Header */}
      <header className="apollo-video-header">
        <div className="apollo-wrapper">
          <div className="apollo-video-header-content">
            <div className="apollo-video-header-left">
              <button className="apollo-back-btn" onClick={() => navigate("/")}>
                <FaArrowLeft /> Back to Dashboard
              </button>
              <div className="apollo-video-title">
                <div className="apollo-video-icon"><FaVideo /></div>
                <h1>Video Consultation</h1>
              </div>
            </div>
            {showStatusBadge && (
              <div className="apollo-status-badge">
                <div className="apollo-status-dot" />
                <span>{isConnected ? "Connected" : "Connecting..."}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="apollo-wrapper">
        <div className="apollo-video-main">
          <div className="apollo-video-grid">

            {/* Video + Controls */}
            <div className="apollo-video-section">
              <div className="apollo-video-container">
                {!localStream ? (
                  <div className="apollo-video-placeholder">
                    <div className="apollo-placeholder-icon"><FaUser /></div>
                    <h3>Waiting to Connect</h3>
                    <p>Select a confirmed appointment to start video consultation</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="apollo-remote-video"
                      style={{ display: remoteStream ? "block" : "none" }}
                    />
                    <video ref={localVideoRef} autoPlay muted playsInline className="apollo-local-video" />
                  </>
                )}
              </div>

              <div className="apollo-video-controls">
                <button
                  className={`apollo-control-btn ${localStream ? (isMicOn ? "apollo-active" : "apollo-inactive") : "apollo-disabled"}`}
                  onClick={toggleMic}
                  title={isMicOn ? "Mute microphone" : "Unmute microphone"}
                  disabled={!localStream}
                >
                  {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>
                <button
                  className={`apollo-control-btn ${localStream ? (isVideoOn ? "apollo-active" : "apollo-inactive") : "apollo-disabled"}`}
                  onClick={toggleVideo}
                  title={isVideoOn ? "Turn off camera" : "Turn on camera"}
                  disabled={!localStream}
                >
                  {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
                </button>
                <button
                  className="apollo-control-btn apollo-end-call-btn"
                  onClick={endCall}
                  title="End call"
                  disabled={!currentRoom}
                >
                  <FaPhoneSlash />
                </button>
                <button
                  className={`apollo-control-btn ${localStream ? "apollo-active" : "apollo-disabled"}`}
                  onClick={shareScreen}
                  title="Share screen"
                  disabled={!localStream}
                >
                  <FaDesktop />
                </button>
                {receivedPrescriptions.length > 0 && (
                  <button
                    className="apollo-control-btn"
                    onClick={() => setShowPrescriptionModal(true)}
                    title="View prescriptions"
                    style={{ background: '#4CAF50', position: 'relative' }}
                  >
                    <FaPrescriptionBottle />
                    <span style={{
                      position: 'absolute', top: '-5px', right: '-5px',
                      background: '#f44336', color: 'white', borderRadius: '50%',
                      width: '20px', height: '20px', fontSize: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {receivedPrescriptions.length}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="apollo-video-sidebar">
              {/* Appointment selector */}
              {!currentRoom && (
                <div className="apollo-video-card">
                  <h2><FaCalendarCheck /> Confirmed Appointments</h2>
                  {loadingAppointments ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><p>Loading appointments...</p></div>
                  ) : userAppointments.length > 0 ? (
                    <div className="apollo-appointments-list">
                      {userAppointments.map((apt) => {
                        const doctorName = apt.doctor_details?.user
                          ? `Dr. ${apt.doctor_details.user.first_name} ${apt.doctor_details.user.last_name}`
                          : 'Doctor'
                        return (
                          <div key={apt.id} className="apollo-appointment-item">
                            <div className="apollo-appointment-info">
                              <div className="apollo-info-row"><strong>Doctor: {doctorName}</strong></div>
                              <div className="apollo-info-row">
                                <FaClock /> {formatDate(apt.preferred_date)} at {apt.preferred_time}
                              </div>
                              <div className="apollo-info-row">
                                <span className="apollo-symptoms-text">
                                  {apt.symptoms.length > 50 ? `${apt.symptoms.substring(0, 50)}...` : apt.symptoms}
                                </span>
                              </div>
                            </div>
                            <button className="apollo-start-consultation-btn" onClick={() => startConsultation(apt)}>
                              <FaVideo /> Start Consultation
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--apollo-text-secondary)' }}>
                      <FaCalendarCheck size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <p>No confirmed appointments found</p>
                      <p style={{ fontSize: '14px', marginTop: '10px' }}>
                        Book and confirm an appointment to start video consultation
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Active consultation info */}
              {currentRoom && selectedAppointment && (
                <div className="apollo-video-card">
                  <h2><FaCheckCircle style={{ color: 'var(--apollo-green-primary)' }} /> Active Consultation</h2>
                  <div className="apollo-patient-details">
                    <p>
                      <strong>Doctor:</strong>
                      {` Dr. ${selectedAppointment.doctor_details?.user?.first_name} ${selectedAppointment.doctor_details?.user?.last_name}`}
                    </p>
                    <p><strong>Date:</strong> {formatDate(selectedAppointment.preferred_date)}</p>
                    <p><strong>Time:</strong> {selectedAppointment.preferred_time}</p>
                    <p><strong>Your Symptoms:</strong> {selectedAppointment.symptoms}</p>
                  </div>
                </div>
              )}

              {/* Chat */}
              <div className="apollo-video-card">
                <h2><FaComments /> Chat</h2>
                <div className="apollo-chat-messages" ref={chatMessagesRef}>
                  {chatMessages.map((msg, index) => (
                    <div key={index} className="apollo-chat-message">
                      <div className="apollo-message-header">
                        <strong>{msg.sender}</strong>
                        <span className="apollo-message-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="apollo-message-text">{msg.message}</div>
                    </div>
                  ))}
                </div>
                <div className="apollo-chat-input-wrapper">
                  <input
                    type="text"
                    className="apollo-chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    maxLength={500}
                    disabled={!isConnected}
                  />
                  <button
                    className="apollo-chat-send-btn"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || !isConnected}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prescription List Modal ── */}
      {showPrescriptionModal && (
        <div className="apollo-modal-overlay apollo-active" onClick={() => setShowPrescriptionModal(false)}>
          <div className="apollo-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="apollo-modal-header">
              <h2><FaPrescriptionBottle /> Your Prescriptions</h2>
              <button className="apollo-close-btn" onClick={() => setShowPrescriptionModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="apollo-modal-body" style={{ padding: '24px' }}>
              {loadingPrescriptions ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><p>Loading prescriptions...</p></div>
              ) : receivedPrescriptions.length > 0 ? (
                <div className="apollo-prescriptions-list">
                  {receivedPrescriptions.map((prescription) => (
                    <div key={prescription.id} className="apollo-prescription-summary">
                      <div className="apollo-prescription-header">
                        <span className="apollo-prescription-id">Rx #{prescription.id.toString().substring(0, 8)}</span>
                        <span className="apollo-prescription-date">
                          {formatDate(prescription.date || prescription.created_at)}
                        </span>
                      </div>
                      <div className="apollo-prescription-body">
                        <p><strong>Doctor:</strong> Dr. {prescription.doctor_name}</p>
                        <p><strong>Diagnosis:</strong> {prescription.diagnosis}</p>
                        <p><strong>Medications:</strong> {prescription.medications?.length || 0} items</p>
                      </div>
                      <button
                        className="apollo-view-prescription-btn"
                        onClick={() => { viewPrescription(prescription); setShowPrescriptionModal(false) }}
                      >
                        <FaFileMedical /> View Details
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--apollo-text-secondary)' }}>
                  <FaPrescriptionBottle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>No prescriptions received yet</p>
                  <p style={{ fontSize: '14px', marginTop: '10px' }}>Prescriptions from your doctor will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Prescription Details Modal ── */}
      {selectedPrescription && (
        <div className="apollo-modal-overlay apollo-active" onClick={() => setSelectedPrescription(null)}>
          <div className="apollo-modal-content apollo-prescription-view" onClick={(e) => e.stopPropagation()}>
            <div className="apollo-prescription-document">
              <div className="apollo-document-header">
                <div className="apollo-header-left">
                  <h1 className="apollo-clinic-name">
                    {selectedPrescription.hospital_name || 'Digital Prescription'}
                  </h1>
                  <p className="apollo-header-subtitle">Electronic Medical Prescription</p>
                </div>
                <div className="apollo-header-right">
                  <div className="apollo-prescription-id">
                    Rx #{selectedPrescription.id.toString().substring(0, 8)}
                  </div>
                </div>
              </div>

              <div className="apollo-document-body">
                <div className="apollo-info-grid">
                  <div className="apollo-info-block">
                    <h4>Patient Details</h4>
                    <p><strong>Name:</strong> {selectedPrescription.patient_name}</p>
                    {selectedPrescription.patient_age && (
                      <p>
                        <strong>Age/Gender:</strong> {selectedPrescription.patient_age} years / {selectedPrescription.patient_gender}
                      </p>
                    )}
                    <p><strong>Date:</strong> {formatDate(selectedPrescription.date || selectedPrescription.created_at)}</p>
                  </div>
                  <div className="apollo-info-block">
                    <h4>Doctor Details</h4>
                    <p><strong>Name:</strong> Dr. {selectedPrescription.doctor_name}</p>
                    {selectedPrescription.doctor_specialization && (
                      <p><strong>Specialization:</strong> {selectedPrescription.doctor_specialization}</p>
                    )}
                  </div>
                </div>

                <div className="apollo-diagnosis-block">
                  <h4>Diagnosis</h4>
                  <p>{selectedPrescription.diagnosis}</p>
                </div>

                <div className="apollo-medications-block">
                  <h4>℞ Prescription</h4>
                  {selectedPrescription.medications?.length > 0 ? (
                    <table className="apollo-medications-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Medicine Name</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.medications.map((med, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="apollo-med-name-cell">{med.name}</td>
                            <td>{med.dosage}</td>
                            <td>{med.frequency}</td>
                            <td>{med.duration}</td>
                            <td>{med.instructions || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No medications prescribed</p>
                  )}
                </div>

                {selectedPrescription.notes && (
                  <div className="apollo-notes-block">
                    <h4>Additional Notes</h4>
                    <p>{selectedPrescription.notes}</p>
                  </div>
                )}

                {selectedPrescription.follow_up_date && (
                  <div className="apollo-followup-block">
                    <h4>Follow-up</h4>
                    <p>Next consultation: {formatDate(selectedPrescription.follow_up_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons – Download uses the proper component */}
            <div className="apollo-viewer-actions">
              <button className="apollo-btn-action apollo-print" onClick={printPrescription}>
                <FaPrint /> Print
              </button>

              <PrescriptionDownloadButton
                prescription={selectedPrescription}
                size="md"
                variant="primary"
                style={{ borderRadius: '8px' }}
                className="apollo-btn-action apollo-download"
              />

              <button className="apollo-btn-action apollo-close" onClick={() => setSelectedPrescription(null)}>
                <FaTimes /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoConsultation