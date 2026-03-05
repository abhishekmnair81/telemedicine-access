"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaVideo,
  FaArrowLeft,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideoSlash,
  FaPhoneSlash,
  FaDesktop,
  FaPaperPlane,
  FaComments,
  FaUserMd,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaCalendarCheck,
  FaExclamationTriangle,
  FaRedo,
  FaPrescriptionBottle,
  FaPlus,
  FaTimes,
  FaFileMedical,
  FaSave
} from "react-icons/fa"
import { videoConsultationAPI, authAPI, appointmentsAPI, prescriptionsAPI } from "../../services/api"
import "./VideoConsultation.css"

const DoctorVideoConsultation = () => {
  const navigate = useNavigate()
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const websocketRef = useRef(null)
  const localStreamRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [showStatusBadge, setShowStatusBadge] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [confirmedAppointments, setConfirmedAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [videoStarting, setVideoStarting] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { sender: "System", message: "Ready to accept consultation", timestamp: new Date() },
  ])
  const [chatInput, setChatInput] = useState("")

  // Camera error handling states
  const [cameraError, setCameraError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  // Prescription states
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_name: '',
    patient_age: '',
    patient_gender: '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    follow_up_date: '',
  })
  const [sendingPrescription, setSendingPrescription] = useState(false)

  // ICE servers configuration for WebRTC
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  }

  // Check authentication and load appointments
  useEffect(() => {
    const checkAuth = async () => {
      const user = authAPI.getCurrentUser()
      if (!user || user.user_type !== 'doctor') {
        addChatMessage("System", "Doctors only - Please login as doctor")
        setTimeout(() => {
          navigate('/auth?type=doctor&view=login')
        }, 2000)
        return
      }
      setCurrentUser(user)
      await loadAppointments(user.id)
    }

    checkAuth()

    const interval = setInterval(() => {
      if (currentUser) {
        loadAppointments(currentUser.id)
      }
    }, 30000)

    return () => {
      console.log('[DoctorVideo] Component unmounting, cleaning up...')
      clearInterval(interval)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      closeConnection()
    }
  }, [navigate])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && localStreamRef.current) {
        console.log('[DoctorVideo] Tab hidden - pausing video')
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = false
        }
      } else if (!document.hidden && localStreamRef.current) {
        console.log('[DoctorVideo] Tab visible - resuming video')
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack && isVideoOn) {
          videoTrack.enabled = true
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isVideoOn])

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  // ✅ CRITICAL FIX 1: Attach local stream to video element when it changes
  useEffect(() => {
    console.log('[DoctorVideo] Local stream changed:', !!localStream)
    if (localStream && localVideoRef.current) {
      console.log('[DoctorVideo] ✅ Attaching local stream to video element')
      localVideoRef.current.srcObject = localStream

      // Force play
      localVideoRef.current.play().then(() => {
        console.log('[DoctorVideo] ✅ Local video playing')
      }).catch(err => {
        console.error('[DoctorVideo] Error playing local video:', err)
      })
    }
  }, [localStream])

  // ✅ CRITICAL FIX 2: Attach remote stream to video element when it changes
  useEffect(() => {
    console.log('[DoctorVideo] Remote stream changed:', !!remoteStream)
    if (remoteStream && remoteVideoRef.current) {
      console.log('[DoctorVideo] ✅ Attaching remote stream to video element')
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.style.display = "block"

      // Force play
      remoteVideoRef.current.play().then(() => {
        console.log('[DoctorVideo] ✅ Remote video playing')
      }).catch(err => {
        console.error('[DoctorVideo] Error playing remote video:', err)
      })
    }
  }, [remoteStream])

  const addChatMessage = (sender, message) => {
    setChatMessages((prev) => [
      ...prev,
      {
        sender,
        message,
        timestamp: new Date(),
      },
    ])
  }

  // Force release camera with multiple attempts
  const forceReleaseCameraMultiple = async () => {
    console.log('[Camera Release] Starting aggressive camera release...')

    const attempts = 3
    for (let i = 0; i < attempts; i++) {
      console.log(`[Camera Release] Attempt ${i + 1}/${attempts}`)

      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })

        tempStream.getTracks().forEach(track => {
          console.log(`[Camera Release] Stopping temporary track: ${track.kind}`)
          track.stop()
        })

        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.log(`[Camera Release] Attempt ${i + 1} failed:`, error.message)
      }
    }

    console.log('[Camera Release] Aggressive release completed')
  }

  // Auto-retry camera access
  const startLocalVideoWithRetry = async (maxRetries = 3) => {
    setIsRetrying(true)
    let currentRetry = retryCount

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`[DoctorVideo] Camera access attempt ${attempt + 1}/${maxRetries}`)

      try {
        await forceReleaseCameraMultiple()
        await new Promise(resolve => setTimeout(resolve, 1000))

        const success = await startLocalVideo()

        if (success) {
          console.log('[DoctorVideo] ✅ Camera started successfully!')
          setCameraError(null)
          setRetryCount(0)
          setIsRetrying(false)
          return true
        }

      } catch (error) {
        console.log(`[DoctorVideo] Attempt ${attempt + 1} failed:`, error.message)
        currentRetry = attempt + 1
        setRetryCount(currentRetry)

        if (attempt < maxRetries - 1) {
          addChatMessage("System", `Retrying camera access... (${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    setIsRetrying(false)
    setCameraError({
      type: 'NotReadableError',
      message: 'Camera is in use by another application',
      attempts: maxRetries
    })

    return false
  }

  // Load confirmed appointments for this doctor
  const loadAppointments = async (doctorId) => {
    try {
      setLoading(true)
      console.log('[DoctorVideo] Loading appointments for doctor:', doctorId)

      const response = await appointmentsAPI.getDoctorAppointments(doctorId)
      const appointments = Array.isArray(response) ? response : (response.results || [])

      const confirmed = appointments.filter(apt => apt.status === 'confirmed')

      console.log('[DoctorVideo] Confirmed appointments:', confirmed)
      setConfirmedAppointments(confirmed)

      if (confirmed.length === 0) {
        addChatMessage("System", "No confirmed appointments at this time")
      }
    } catch (error) {
      console.error("[DoctorVideo] Error loading appointments:", error)
      addChatMessage("System", "Error loading appointments: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Open prescription modal with patient info pre-filled
  const openPrescriptionModal = () => {
    if (!selectedAppointment) {
      alert('No active consultation')
      return
    }

    // Get doctor profile for specialization
    const doctorProfile = currentUser.doctor_profile || {}

    setPrescriptionForm({
      patient_name: selectedAppointment.patient_name,
      patient_age: selectedAppointment.patient_age || '',
      patient_gender: selectedAppointment.patient_gender || '',
      diagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      notes: '',
      follow_up_date: '',
    })
    setShowPrescriptionModal(true)
  }

  // Add medication to prescription
  const addMedication = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }))
  }

  // Remove medication from prescription
  const removeMedication = (index) => {
    if (prescriptionForm.medications.length === 1) {
      alert('At least one medication is required')
      return
    }
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  // Update medication field
  const updateMedication = (index, field, value) => {
    setPrescriptionForm(prev => {
      const newMedications = [...prev.medications]
      newMedications[index][field] = value
      return { ...prev, medications: newMedications }
    })
  }

  // Update form field
  const updateFormField = (field, value) => {
    setPrescriptionForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Send prescription
  const sendPrescription = async () => {
    try {
      // Validation
      if (!prescriptionForm.diagnosis.trim()) {
        alert('Please enter diagnosis')
        return
      }

      const invalidMeds = prescriptionForm.medications.filter(
        med => !med.name.trim() || !med.dosage.trim() || !med.frequency.trim() || !med.duration.trim()
      )

      if (invalidMeds.length > 0) {
        alert('Please fill all required medication fields (name, dosage, frequency, duration)')
        return
      }

      setSendingPrescription(true)

      // Get doctor profile
      const doctorProfile = currentUser.doctor_profile || {}

      const prescriptionData = {
        patient_name: prescriptionForm.patient_name,
        patient_age: prescriptionForm.patient_age,
        patient_gender: prescriptionForm.patient_gender,
        patient_phone: selectedAppointment.patient_phone,
        doctor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        doctor_specialization: doctorProfile.specialization || 'General Physician',
        diagnosis: prescriptionForm.diagnosis,
        medications: prescriptionForm.medications,
        notes: prescriptionForm.notes,
        follow_up_date: prescriptionForm.follow_up_date || null,
        date: new Date().toISOString().split('T')[0],
        appointment_id: selectedAppointment.id,
      }

      console.log('[Prescription] Creating prescription:', prescriptionData)

      const response = await prescriptionsAPI.createPrescription(prescriptionData)

      console.log('[Prescription] Created successfully:', response)

      addChatMessage("System", "✅ Prescription sent successfully to patient")

      // Notify patient via WebSocket
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({
            type: "prescription_sent",
            sender_id: currentUser.id,
            prescription_id: response.id,
            data: prescriptionData
          })
        )
        console.log('[WebSocket] Prescription notification sent to patient')
      }

      // Close modal and reset form
      setShowPrescriptionModal(false)
      setPrescriptionForm({
        patient_name: '',
        patient_age: '',
        patient_gender: '',
        diagnosis: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        notes: '',
        follow_up_date: '',
      })

      alert('✅ Prescription sent successfully!')

    } catch (error) {
      console.error('[Prescription] Error:', error)
      alert('❌ Error sending prescription: ' + (error.message || 'Unknown error'))
    } finally {
      setSendingPrescription(false)
    }
  }

  // Accept consultation with proper patient ID handling
  const acceptConsultation = async (appointment) => {
    try {
      setSelectedAppointment(appointment)
      addChatMessage("System", `Starting consultation with ${appointment.patient_name}...`)

      console.log('[DoctorVideo] === ACCEPT CONSULTATION ===')

      const doctorId = currentUser.id

      let patientId = appointment.patient_id ||
        appointment.patient?.id ||
        appointment.patient_details?.id ||
        appointment.patient ||
        `appointment_${appointment.id}`

      console.log('[DoctorVideo] Doctor ID:', doctorId)
      console.log('[DoctorVideo] Patient ID:', patientId)

      // Check for existing room
      let room = null

      try {
        const existingRoomsResponse = await videoConsultationAPI.getAllRooms(doctorId)

        let existingRooms = []
        if (Array.isArray(existingRoomsResponse)) {
          existingRooms = existingRoomsResponse
        } else if (existingRoomsResponse?.rooms) {
          existingRooms = existingRoomsResponse.rooms
        } else if (existingRoomsResponse?.results) {
          existingRooms = existingRoomsResponse.results
        }

        room = existingRooms.find(r =>
          r.appointment === appointment.id &&
          r.status !== 'completed' &&
          r.status !== 'cancelled'
        )

        if (room) {
          console.log('[DoctorVideo] ✅ Found existing room:', room)
          addChatMessage("System", "Rejoining existing consultation room...")
        }
      } catch (err) {
        console.log('[DoctorVideo] Error checking for existing room:', err.message)
      }

      // Create new room if needed
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

        try {
          room = await videoConsultationAPI.createRoom(roomData)
          addChatMessage("System", "New consultation room created")
        } catch (createError) {
          const minimalRoomData = {
            doctor_id: doctorId,
            appointment_id: appointment.id,
            scheduled_time: new Date().toISOString(),
            chat_enabled: true,
            screen_share_enabled: true,
            recording_enabled: false,
          }

          room = await videoConsultationAPI.createRoom(minimalRoomData)
          addChatMessage("System", "Consultation room created - waiting for patient")
        }
      }

      if (!room) {
        throw new Error('Failed to create or find consultation room')
      }

      setCurrentRoom(room)

      // Join the room
      await videoConsultationAPI.joinRoom({
        room_id: room.room_id,
        user_id: currentUser.id,
      })

      addChatMessage("System", `Connected to consultation room. Starting video...`)

      // ✅ Start video IMMEDIATELY
      console.log('[DoctorVideo] Starting local video immediately...')
      await startLocalVideo()

      // Initialize WebSocket after video starts
      initializeWebSocket(room.room_id, currentUser.id)

      await loadAppointments(currentUser.id)

    } catch (error) {
      console.error("[DoctorVideo] ❌ Error accepting consultation:", error)

      const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
      alert("Error starting consultation: " + errorMsg)
      addChatMessage("System", "Failed to start consultation: " + errorMsg)

      setSelectedAppointment(null)
      setCurrentRoom(null)
    }
  }

  // Initialize WebSocket connection
  const initializeWebSocket = (roomId, userId) => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/video/${roomId}/${userId}/`

    console.log('[WebSocket] Connecting to:', wsUrl)
    websocketRef.current = new WebSocket(wsUrl)

    websocketRef.current.onopen = () => {
      console.log("[WebSocket] ✅ Connected")
      setIsConnected(true)
      addChatMessage("System", "Connected to consultation room")

      // ✅ Create peer connection offer after WebSocket connects
      if (currentRoom && localStreamRef.current) {
        const patientId = currentRoom.patient ||
          currentRoom.patient_id ||
          selectedAppointment?.patient_id ||
          selectedAppointment?.patient?.id

        if (patientId) {
          console.log('[WebSocket] Creating offer for patient:', patientId)
          createOffer(patientId)
        } else {
          addChatMessage("System", "Waiting for patient to join...")
        }
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

  // Handle WebSocket messages
  const handleWebSocketMessage = async (data) => {
    console.log("[WebSocket] Message received:", data.type)

    switch (data.type) {
      case "user_connected":
        const userName = data.user_name || "User"
        addChatMessage("System", `${userName} connected to the room`)
        break

      case "user_disconnected":
        const disconnectedName = data.user_name || "User"
        addChatMessage("System", `${disconnectedName} disconnected`)
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

      case "user_status":
        addChatMessage("System", `Patient updated their status`)
        break

      case "screen_share":
        const action = data.action === "start" ? "started" : "stopped"
        addChatMessage("System", `Patient ${action} screen sharing`)
        break

      default:
        console.log("[WebSocket] Unknown message type:", data.type)
    }
  }

  // Initialize peer connection
  const createPeerConnection = () => {
    console.log('[WebRTC] Creating peer connection')
    const peerConnection = new RTCPeerConnection(iceServers)

    if (localStreamRef.current) {
      console.log('[WebRTC] Adding local tracks to peer connection')
      localStreamRef.current.getTracks().forEach((track) => {
        console.log('[WebRTC] Adding track:', track.kind)
        peerConnection.addTrack(track, localStreamRef.current)
      })
    }

    peerConnection.ontrack = (event) => {
      console.log("[WebRTC] ✅ Remote track received:", event.track.kind)
      const [stream] = event.streams
      console.log("[WebRTC] Remote stream:", stream)
      setRemoteStream(stream)
      addChatMessage("System", "Patient connected to video call")
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate generated')
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          sendICECandidate(event.candidate)
        }
      }
    }

    peerConnection.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", peerConnection.connectionState)
      if (peerConnection.connectionState === "connected") {
        addChatMessage("System", "Peer-to-peer connection established")
      } else if (peerConnection.connectionState === "disconnected") {
        addChatMessage("System", "Connection interrupted")
      } else if (peerConnection.connectionState === "failed") {
        addChatMessage("System", "Connection failed - attempting to reconnect")
      }
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }

  // Create and send offer
  const createOffer = async (receiverId) => {
    try {
      console.log('[WebRTC] Creating offer for receiver:', receiverId)
      const peerConnection = createPeerConnection()
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      console.log('[WebRTC] Offer created, setting local description')
      await peerConnection.setLocalDescription(offer)

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebRTC] Sending offer via WebSocket')
        websocketRef.current.send(
          JSON.stringify({
            type: "webrtc_offer",
            sender_id: currentUser.id,
            receiver_id: receiverId,
            sdp: offer,
          })
        )
      }
    } catch (error) {
      console.error("[WebRTC] Error creating offer:", error)
      addChatMessage("System", "Error establishing connection")
    }
  }

  // Handle receiving offer
  const handleReceiveOffer = async (offer, senderId) => {
    try {
      console.log('[WebRTC] Received offer from:', senderId)
      const peerConnection = createPeerConnection()
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

      console.log('[WebRTC] Creating answer')
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebRTC] Sending answer via WebSocket')
        websocketRef.current.send(
          JSON.stringify({
            type: "webrtc_answer",
            sender_id: currentUser.id,
            receiver_id: senderId,
            sdp: answer,
          })
        )
      }
    } catch (error) {
      console.error("[WebRTC] Error handling offer:", error)
    }
  }

  // Handle receiving answer
  const handleReceiveAnswer = async (answer) => {
    try {
      console.log('[WebRTC] Received answer')
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        console.log('[WebRTC] Remote description set from answer')
      }
    } catch (error) {
      console.error("[WebRTC] Error handling answer:", error)
    }
  }

  // Send ICE candidate
  const sendICECandidate = (candidate) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN && currentRoom) {
      const receiverId = currentRoom.patient ||
        currentRoom.patient_id ||
        selectedAppointment?.patient_id ||
        selectedAppointment?.patient?.id

      websocketRef.current.send(
        JSON.stringify({
          type: "ice_candidate",
          sender_id: currentUser.id,
          receiver_id: receiverId,
          candidate: candidate,
        })
      )
    }
  }

  // Handle receiving ICE candidate
  const handleReceiveIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('[WebRTC] ICE candidate added')
      }
    } catch (error) {
      console.error("[WebRTC] Error adding ICE candidate:", error)
    }
  }

  // Handle remote disconnect
  const handleRemoteDisconnect = () => {
    console.log('[DoctorVideo] Remote peer disconnected')
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
      remoteVideoRef.current.style.display = "none"
    }
    setRemoteStream(null)
  }

  // ✅ Start local video with better error handling
  const startLocalVideo = async () => {
    if (!currentUser) {
      addChatMessage("System", "Please login to start video")
      navigate('/auth?type=doctor&view=login')
      return false
    }

    if (videoStarting) {
      console.log('[DoctorVideo] Video already starting, skipping')
      return false
    }

    try {
      setVideoStarting(true)

      // Stop any existing stream first
      if (localStreamRef.current) {
        console.log('[DoctorVideo] Stopping existing stream...')
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        localStreamRef.current = null
        setLocalStream(null)
      }

      console.log('[DoctorVideo] === STARTING LOCAL VIDEO ===')
      addChatMessage("System", "Requesting camera access...")

      let stream = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (error) {
        console.log('[DoctorVideo] HD failed, trying basic...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
      }

      console.log('[DoctorVideo] ✅ Camera access granted')
      console.log('[DoctorVideo] Video tracks:', stream.getVideoTracks().length)
      console.log('[DoctorVideo] Audio tracks:', stream.getAudioTracks().length)

      localStreamRef.current = stream

      // ✅ Update state - this triggers useEffect to attach to video element
      setLocalStream(stream)

      setShowStatusBadge(true)
      setIsMicOn(true)
      setIsVideoOn(true)
      addChatMessage("System", "✅ Your video stream is active")

      console.log('[DoctorVideo] ✅ Local video started successfully')
      return true

    } catch (error) {
      console.error("[DoctorVideo] ❌ Camera error:", error.name, error.message)

      let errorMessage = "Could not access camera/microphone. "
      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone permissions."
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found."
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera is being used by another application."
      } else {
        errorMessage += error.message
      }

      addChatMessage("System", "❌ " + errorMessage)
      throw error

    } finally {
      setVideoStarting(false)
    }
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMicOn(audioTrack.enabled)
        addChatMessage("System", audioTrack.enabled ? "Microphone enabled" : "Microphone muted")

        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(
            JSON.stringify({
              type: "user_status",
              user_id: currentUser.id,
              audio_enabled: audioTrack.enabled,
              video_enabled: isVideoOn,
            })
          )
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
          websocketRef.current.send(
            JSON.stringify({
              type: "user_status",
              user_id: currentUser.id,
              audio_enabled: isMicOn,
              video_enabled: videoTrack.enabled,
            })
          )
        }
      }
    }
  }

  const closeConnection = () => {
    console.log('[DoctorVideo] Closing all connections...')

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log('[DoctorVideo] Stopped track:', track.kind)
      })
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close()
      }
      websocketRef.current = null
    }

    setLocalStream(null)
    setRemoteStream(null)
    setShowStatusBadge(false)
    setIsConnected(false)
  }

  const endCall = async () => {
    if (window.confirm("End consultation?")) {
      try {
        if (currentRoom) {
          await videoConsultationAPI.endConsultation({
            room_id: currentRoom.room_id,
            user_id: currentUser.id,
            duration: currentRoom.started_at
              ? Math.floor((new Date() - new Date(currentRoom.started_at)) / 1000)
              : 0
          })
          addChatMessage("System", "Call ended successfully")
        }
      } catch (error) {
        console.error("Error ending call:", error)
      } finally {
        closeConnection()
        setCurrentRoom(null)
        setSelectedAppointment(null)
        setCameraError(null)
        setRetryCount(0)
        setIsMicOn(true)
        setIsVideoOn(true)
        await loadAppointments(currentUser.id)
      }
    }
  }

  const shareScreen = async () => {
    if (!localStreamRef.current) {
      alert("Please start your video first")
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      })

      const screenTrack = screenStream.getVideoTracks()[0]

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")
        if (sender) {
          sender.replaceTrack(screenTrack)
        }
      }

      if (localVideoRef.current) {
        const newStream = new MediaStream([screenTrack, ...localStreamRef.current.getAudioTracks()])
        localVideoRef.current.srcObject = newStream
      }

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({
            type: "screen_share",
            user_id: currentUser.id,
            action: "start",
          })
        )
      }

      screenTrack.onended = () => {
        addChatMessage("System", "Screen sharing stopped")
        restoreCamera()
      }

      addChatMessage("System", "Screen sharing started")
    } catch (error) {
      console.error("Error sharing screen:", error)
      addChatMessage("System", "Screen sharing cancelled or failed")
    }
  }

  const restoreCamera = async () => {
    if (localStreamRef.current && peerConnectionRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack)
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({
            type: "screen_share",
            user_id: currentUser.id,
            action: "stop",
          })
        )
      }
    }
  }

  const sendChatMessage = () => {
    const message = chatInput.trim()
    if (message && websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: "chat_message",
          sender_id: currentUser.id,
          sender_name: `Dr. ${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
          content: message,
          message_type: "text",
        })
      )

      addChatMessage("You", message)
      setChatInput("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!currentUser) {
    return (
      <div className="apollo-video-page">
        <div className="apollo-wrapper">
          <div style={{
            textAlign: 'center',
            padding: '100px 20px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <h2>Doctor Authentication Required</h2>
            <p style={{ margin: '20px 0', color: 'var(--apollo-text-secondary)' }}>
              Please login as a doctor to access video consultations
            </p>
            <button
              className="apollo-primary-btn"
              onClick={() => navigate('/auth?type=doctor&view=login')}
              style={{ marginTop: '20px' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="apollo-video-page">
      <header className="apollo-video-header">
        <div className="apollo-wrapper">
          <div className="apollo-video-header-content">
            <div className="apollo-video-header-left">
              <button className="apollo-back-btn" onClick={() => navigate("/doctor-dashboard")}>
                <FaArrowLeft /> Back to Dashboard
              </button>
              <div className="apollo-video-title">
                <div className="apollo-video-icon">
                  <FaUserMd />
                </div>
                <h1>Doctor Video Consultations</h1>
              </div>
            </div>
            {showStatusBadge && (
              <div className="apollo-status-badge">
                <div className="apollo-status-dot"></div>
                <span>{isConnected ? "In Consultation" : "Connecting..."}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="apollo-wrapper">
        <div className="apollo-video-main">
          {!currentRoom ? (
            <div className="apollo-consultation-queue">
              <div className="apollo-queue-header">
                <h2><FaCalendarCheck /> Confirmed Appointments</h2>
                <button
                  className="apollo-primary-btn"
                  onClick={() => loadAppointments(currentUser.id)}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {confirmedAppointments.length > 0 ? (
                <div className="apollo-queue-section">
                  <div className="apollo-consultation-list">
                    {confirmedAppointments.map((appointment) => (
                      <div key={appointment.id} className="apollo-consultation-card">
                        <div className="apollo-card-header">
                          <div className="apollo-patient-info">
                            <FaUser />
                            <div>
                              <h4>{appointment.patient_name}</h4>
                              <p>{appointment.patient_phone}</p>
                            </div>
                          </div>
                          <span className="apollo-status-badge confirmed">
                            Confirmed
                          </span>
                        </div>
                        <div className="apollo-card-body">
                          <p><strong>Date:</strong> {formatDate(appointment.preferred_date)}</p>
                          <p><strong>Time:</strong> {appointment.preferred_time}</p>
                          <p><strong>Symptoms:</strong> {appointment.symptoms}</p>
                        </div>
                        <button
                          className="apollo-accept-btn"
                          onClick={() => acceptConsultation(appointment)}
                        >
                          <FaVideo /> Start Consultation
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="apollo-empty-state">
                  <FaCalendarCheck size={48} />
                  <h3>No Confirmed Appointments</h3>
                  <p>You have no confirmed appointments at this time</p>
                  <p style={{ fontSize: '14px', marginTop: '10px', color: 'var(--apollo-text-light)' }}>
                    Confirmed appointments from patients will appear here
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="apollo-video-grid">
              <div className="apollo-video-section">
                <div className="apollo-video-container">
                  {cameraError && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      padding: '40px',
                      textAlign: 'center'
                    }}>
                      <FaExclamationTriangle size={60} color="#ff9800" />
                      <h2 style={{ color: 'white', marginTop: '20px', marginBottom: '15px' }}>
                        Camera Access Issue
                      </h2>
                      <p style={{ color: '#ccc', fontSize: '16px', maxWidth: '500px', marginBottom: '20px' }}>
                        Your camera is being used by another application or browser tab.
                      </p>
                      <p style={{ color: '#aaa', fontSize: '14px', maxWidth: '500px', marginBottom: '30px' }}>
                        Attempted {cameraError.attempts} times. Please close other applications using the camera.
                      </p>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          className="apollo-primary-btn"
                          onClick={() => startLocalVideoWithRetry(3)}
                          disabled={isRetrying}
                          style={{ minWidth: '180px' }}
                        >
                          <FaRedo /> {isRetrying ? 'Retrying...' : 'Try Again'}
                        </button>
                        <button
                          className="apollo-secondary-btn"
                          onClick={endCall}
                          style={{ minWidth: '180px' }}
                        >
                          End Consultation
                        </button>
                      </div>
                      <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        maxWidth: '600px'
                      }}>
                        <h4 style={{ color: 'white', marginBottom: '10px' }}>Quick Fixes:</h4>
                        <ul style={{
                          color: '#ccc',
                          textAlign: 'left',
                          fontSize: '14px',
                          lineHeight: '1.8'
                        }}>
                          <li>Close ALL other browser tabs</li>
                          <li>Close Zoom, Teams, Skype, or Discord</li>
                          <li>Close Camera/Photo apps</li>
                          <li>Restart your browser completely</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {isRetrying && !cameraError && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(0,0,0,0.8)',
                      padding: '30px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      zIndex: 999
                    }}>
                      <div className="spinner" style={{
                        border: '4px solid rgba(255,255,255,0.3)',
                        borderTop: '4px solid white',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                      }}></div>
                      <p style={{ color: 'white', fontSize: '16px' }}>
                        Attempting to access camera... ({retryCount}/3)
                      </p>
                    </div>
                  )}

                  {!localStream && !cameraError && !isRetrying ? (
                    <div className="apollo-video-placeholder">
                      <div className="apollo-placeholder-icon">
                        <FaUserMd />
                      </div>
                      <h3>Starting Video...</h3>
                      <p>Connecting to patient: {selectedAppointment?.patient_name}</p>
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
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="apollo-local-video"
                      />
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
                  <button className="apollo-control-btn apollo-end-call-btn" onClick={endCall} title="End call">
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
                  <button
                    className="apollo-control-btn"
                    onClick={openPrescriptionModal}
                    title="Create prescription"
                    disabled={!selectedAppointment}
                    style={{ background: '#4CAF50' }}
                  >
                    <FaPrescriptionBottle />
                  </button>
                  {cameraError && (
                    <button
                      className="apollo-control-btn apollo-retry-btn"
                      onClick={() => startLocalVideoWithRetry(3)}
                      title="Retry camera"
                      disabled={isRetrying}
                      style={{ background: '#ff9800' }}
                    >
                      <FaRedo />
                    </button>
                  )}
                </div>
              </div>

              <div className="apollo-video-sidebar">
                {selectedAppointment && (
                  <div className="apollo-video-card">
                    <h2><FaCheckCircle style={{ color: 'var(--apollo-green-primary)' }} /> Active Consultation</h2>
                    <div className="apollo-patient-details">
                      <p><strong>Patient:</strong> {selectedAppointment.patient_name}</p>
                      <p><strong>Phone:</strong> {selectedAppointment.patient_phone}</p>
                      <p><strong>Date:</strong> {formatDate(selectedAppointment.preferred_date)}</p>
                      <p><strong>Time:</strong> {selectedAppointment.preferred_time}</p>
                      <p><strong>Symptoms:</strong> {selectedAppointment.symptoms}</p>
                    </div>
                  </div>
                )}

                <div className="apollo-video-card">
                  <h2>
                    <FaComments /> Chat
                  </h2>
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
          )}
        </div>
      </div>

      {/* Prescription Creation Modal */}
      {showPrescriptionModal && (
        <div className="apollo-modal-overlay apollo-active" onClick={() => !sendingPrescription && setShowPrescriptionModal(false)}>
          <div className="apollo-modal-content apollo-large" onClick={(e) => e.stopPropagation()}>
            <div className="apollo-modal-header">
              <h2><FaFileMedical /> Create Prescription</h2>
              <button
                className="apollo-close-btn"
                onClick={() => setShowPrescriptionModal(false)}
                disabled={sendingPrescription}
              >
                <FaTimes />
              </button>
            </div>

            <div className="apollo-prescription-modal-form">
              {/* Patient Info Section */}
              <div className="apollo-form-section">
                <h3 className="apollo-section-title">Patient Information</h3>
                <div className="apollo-form-row">
                  <div className="apollo-form-group">
                    <label>Patient Name</label>
                    <input
                      type="text"
                      value={prescriptionForm.patient_name}
                      disabled
                      style={{ background: 'var(--apollo-gray-100)' }}
                    />
                  </div>
                  <div className="apollo-form-group">
                    <label>Age</label>
                    <input
                      type="text"
                      value={prescriptionForm.patient_age}
                      onChange={(e) => updateFormField('patient_age', e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div className="apollo-form-group">
                    <label>Gender</label>
                    <select
                      value={prescriptionForm.patient_gender}
                      onChange={(e) => updateFormField('patient_gender', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Diagnosis Section */}
              <div className="apollo-form-section">
                <h3 className="apollo-section-title">Diagnosis</h3>
                <div className="apollo-form-group apollo-full-width">
                  <label>Diagnosis *</label>
                  <input
                    type="text"
                    value={prescriptionForm.diagnosis}
                    onChange={(e) => updateFormField('diagnosis', e.target.value)}
                    placeholder="Enter diagnosis"
                    required
                  />
                </div>
              </div>

              {/* Medications Section */}
              <div className="apollo-form-section">
                <h3 className="apollo-section-title">Medications</h3>
                <button
                  type="button"
                  className="apollo-btn-add-medication"
                  onClick={addMedication}
                >
                  <FaPlus /> Add Medication
                </button>
                <div className="apollo-medications-list">
                  {prescriptionForm.medications.map((med, index) => (
                    <div key={index} className="apollo-medication-entry">
                      <div className="apollo-medication-header">
                        <span className="apollo-med-number">Medicine #{index + 1}</span>
                        {prescriptionForm.medications.length > 1 && (
                          <button
                            type="button"
                            className="apollo-btn-remove"
                            onClick={() => removeMedication(index)}
                          >
                            <FaTimes /> Remove
                          </button>
                        )}
                      </div>
                      <div className="apollo-medication-fields">
                        <div className="apollo-form-group">
                          <label>Medicine Name *</label>
                          <input
                            type="text"
                            placeholder="e.g., Paracetamol"
                            value={med.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            required
                          />
                        </div>
                        <div className="apollo-form-group">
                          <label>Dosage *</label>
                          <input
                            type="text"
                            placeholder="e.g., 500mg"
                            value={med.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            required
                          />
                        </div>
                        <div className="apollo-form-group">
                          <label>Frequency *</label>
                          <input
                            type="text"
                            placeholder="e.g., Twice daily"
                            value={med.frequency}
                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            required
                          />
                        </div>
                        <div className="apollo-form-group">
                          <label>Duration *</label>
                          <input
                            type="text"
                            placeholder="e.g., 7 days"
                            value={med.duration}
                            onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                            required
                          />
                        </div>
                        <div className="apollo-form-group apollo-full-width">
                          <label>Instructions</label>
                          <input
                            type="text"
                            placeholder="e.g., Take after meals"
                            value={med.instructions}
                            onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="apollo-form-section">
                <h3 className="apollo-section-title">Additional Information</h3>
                <div className="apollo-form-group">
                  <label>Follow-up Date</label>
                  <input
                    type="date"
                    value={prescriptionForm.follow_up_date}
                    onChange={(e) => updateFormField('follow_up_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="apollo-form-group">
                  <label>Additional Notes</label>
                  <textarea
                    value={prescriptionForm.notes}
                    onChange={(e) => updateFormField('notes', e.target.value)}
                    placeholder="Any additional instructions or notes for the patient"
                    rows="3"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="apollo-form-actions">
                <button
                  type="button"
                  className="apollo-outline-btn"
                  onClick={() => setShowPrescriptionModal(false)}
                  disabled={sendingPrescription}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="apollo-primary-btn"
                  onClick={sendPrescription}
                  disabled={sendingPrescription}
                >
                  {sendingPrescription ? (
                    <>Sending...</>
                  ) : (
                    <><FaSave /> Send Prescription</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default DoctorVideoConsultation