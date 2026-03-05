import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  FaVideo,
  FaCalendarCheck,
  FaUsers,
  FaPrescriptionBottle,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserMd,
  FaSignOutAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaHeartbeat,
  FaBell,
  FaChevronDown,
  FaStethoscope,
  FaNotesMedical,
  FaClipboardList,
  FaAward,
  FaEye,
  FaStar,
  FaQuoteLeft,
  FaThumbsUp,
  FaThumbsDown,
} from "react-icons/fa"
import { authAPI, videoConsultationAPI, appointmentsAPI, prescriptionsAPI, patientsAPI, doctorsAPI } from "../services/api"
import "./DoctorDashboard.css"

const DoctorDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [stats, setStats] = useState({
    totalConsultations: 0,
    todayAppointments: 0,
    pendingConsultations: 0,
    completedToday: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
    totalPrescriptions: 0,
    totalPatients: 0,
    averageRating: 0,
    totalRatings: 0,
  })
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [patients, setPatients] = useState([])
  const [ratings, setRatings] = useState([])
  const [ratingsSummary, setRatingsSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('consultations') // 'consultations', 'appointments', 'prescriptions', 'patients', 'ratings'

  // Auth check - runs once on mount
  useEffect(() => {
    const checkAuth = () => {
      console.log('[DoctorDashboard] Checking authentication...')
      const userData = authAPI.getCurrentUser()
      console.log('[DoctorDashboard] User data from localStorage:', userData)
      
      if (!userData) {
        console.log('[DoctorDashboard] ❌ No user data found - redirecting to login')
        setIsCheckingAuth(false)
        navigate('/auth?type=doctor&view=login')
        return
      }
      
      if (userData.user_type !== 'doctor') {
        console.log('[DoctorDashboard] ❌ User is not a doctor, type:', userData.user_type)
        alert(`This is the doctor dashboard. You are logged in as ${userData.user_type}. Please logout and login as a doctor.`)
        setIsCheckingAuth(false)
        navigate('/')
        return
      }
      
      console.log('[DoctorDashboard] ✅ Doctor authenticated:', userData.first_name, userData.last_name)
      console.log('[DoctorDashboard] Doctor ID:', userData.id)
      setUser(userData)
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [navigate])

  // Load data when user is set
  useEffect(() => {
    if (user && !isCheckingAuth) {
      console.log('[DoctorDashboard] Loading dashboard data for doctor:', user.id)
      loadDashboardData(user.id)
    }
  }, [user, isCheckingAuth])

  // Auto-refresh
  useEffect(() => {
    if (!user || isCheckingAuth) return

    const interval = setInterval(() => {
      console.log('[DoctorDashboard] Auto-refreshing data...')
      loadDashboardData(user.id)
    }, 30000)

    return () => clearInterval(interval)
  }, [user, isCheckingAuth])

  const loadDashboardData = async (doctorId) => {
  try {
    setLoading(true)
    console.log('\n' + '='.repeat(60))
    console.log('LOADING DASHBOARD DATA FOR DOCTOR:', doctorId)
    console.log('='.repeat(60))

    // ============================================================
    // 🔧 FIX: GET DOCTOR PROFILE ID FIRST
    // ============================================================
    console.log('\n📋 Fetching doctor profile to get DoctorProfile ID...')
    let doctorProfileId = null
    
    try {
      const doctorProfileResponse = await doctorsAPI.getDoctorById(doctorId)
      console.log('✅ Doctor profile response:', doctorProfileResponse)
      
      // The DoctorProfile ID should be in the response
      if (doctorProfileResponse && doctorProfileResponse.id) {
        doctorProfileId = doctorProfileResponse.id
        console.log(`✅ Found DoctorProfile ID: ${doctorProfileId}`)
      } else {
        console.error('❌ No DoctorProfile ID in response')
      }
    } catch (error) {
      console.error('❌ Error fetching doctor profile:', error)
    }

    // ============================================================
    // 1. GET VIDEO CONSULTATIONS
    // ============================================================
    console.log('\n📹 Fetching video consultations...')
    let allRoomsResponse = await videoConsultationAPI.getAllRooms(doctorId)
    console.log('✅ Raw video consultations response:', allRoomsResponse)
    
    let allRooms = []
    if (Array.isArray(allRoomsResponse)) {
      allRooms = allRoomsResponse
    } else if (allRoomsResponse && Array.isArray(allRoomsResponse.rooms)) {
      allRooms = allRoomsResponse.rooms
    } else if (allRoomsResponse && Array.isArray(allRoomsResponse.results)) {
      allRooms = allRoomsResponse.results
    }
    
    console.log('✅ Final consultations array length:', allRooms.length)

    // ============================================================
    // 2. GET APPOINTMENTS
    // ============================================================
    console.log('\n📅 Fetching appointments for doctor ID:', doctorId)
    let doctorAppointments = []
    
    try {
      let appointmentsResponse = await appointmentsAPI.getDoctorAppointments(doctorId)
      console.log('✅ Raw appointments response:', appointmentsResponse)
      
      if (Array.isArray(appointmentsResponse)) {
        doctorAppointments = appointmentsResponse
      } else if (appointmentsResponse && appointmentsResponse.results) {
        doctorAppointments = appointmentsResponse.results
      }
      
      console.log('✅ Number of appointments:', doctorAppointments.length)
      
    } catch (error) {
      console.error('❌ Error fetching appointments:', error)
      doctorAppointments = []
    }

    // ============================================================
    // 3. GET PRESCRIPTIONS
    // ============================================================
    console.log('\n💊 Fetching prescriptions for doctor ID:', doctorId)
    let doctorPrescriptions = []
    
    try {
      let prescriptionsResponse = await prescriptionsAPI.getDoctorPrescriptions(doctorId)
      console.log('✅ Raw prescriptions response:', prescriptionsResponse)
      
      if (Array.isArray(prescriptionsResponse)) {
        doctorPrescriptions = prescriptionsResponse
      } else if (prescriptionsResponse && prescriptionsResponse.results) {
        doctorPrescriptions = prescriptionsResponse.results
      }
      
      console.log('✅ Number of prescriptions:', doctorPrescriptions.length)
      
    } catch (error) {
      console.error('❌ Error fetching prescriptions:', error)
      doctorPrescriptions = []
    }

    // ============================================================
    // 4. GET RATINGS & REVIEWS - 🔧 FIXED
    // ============================================================
    console.log('\n⭐ Fetching ratings...')
    let doctorRatings = []
    let ratingSummary = null
    
    if (doctorProfileId) {
      try {
        console.log(`⭐ Using DoctorProfile ID: ${doctorProfileId}`)
        const ratingsResponse = await doctorsAPI.getDoctorRatings(doctorProfileId)
        console.log('✅ Raw ratings response:', ratingsResponse)
        
        if (ratingsResponse && ratingsResponse.success) {
          doctorRatings = ratingsResponse.ratings || []
          ratingSummary = ratingsResponse.summary || null
          console.log('✅ Number of ratings:', doctorRatings.length)
          console.log('✅ Rating summary:', ratingSummary)
        }
      } catch (error) {
        console.error('❌ Error fetching ratings:', error)
        doctorRatings = []
      }
    } else {
      console.warn('⚠️ Skipping ratings fetch - no DoctorProfile ID available')
    }

    // ============================================================
    // 5. GET UNIQUE PATIENTS
    // ============================================================
    console.log('\n👥 Extracting unique patients...')
    const uniquePatientIds = new Set()
    const patientMap = new Map()

    // Extract from appointments
    doctorAppointments.forEach(apt => {
      if (apt.patient_phone) {
        if (!uniquePatientIds.has(apt.patient_phone)) {
          uniquePatientIds.add(apt.patient_phone)
          patientMap.set(apt.patient_phone, {
            id: apt.patient_phone,
            name: apt.patient_name,
            phone: apt.patient_phone,
            lastVisit: apt.preferred_date,
            totalAppointments: 1,
            totalPrescriptions: 0,
          })
        } else {
          const patient = patientMap.get(apt.patient_phone)
          patient.totalAppointments++
        }
      }
    })

    // Add prescription counts
    doctorPrescriptions.forEach(pres => {
      if (pres.patient_phone && patientMap.has(pres.patient_phone)) {
        const patient = patientMap.get(pres.patient_phone)
        patient.totalPrescriptions++
      }
    })

    const uniquePatients = Array.from(patientMap.values())
    console.log('✅ Number of unique patients:', uniquePatients.length)

    // ============================================================
    // 6. CALCULATE STATS
    // ============================================================
    const today = new Date().toDateString()
    
    // Consultation stats
    const pending = allRooms.filter(r => r.status === 'scheduled' || r.status === 'waiting')
    const completedToday = allRooms.filter(r => {
      if (!r.ended_at) return false
      return new Date(r.ended_at).toDateString() === today
    })
    const todayConsultations = allRooms.filter(r => {
      return new Date(r.scheduled_time).toDateString() === today
    })

    // Appointment stats
    const pendingApts = doctorAppointments.filter(apt => apt.status === 'pending')
    const confirmedApts = doctorAppointments.filter(apt => apt.status === 'confirmed')
    const todayApts = doctorAppointments.filter(apt => {
      return new Date(apt.preferred_date).toDateString() === today
    })

    setStats({
      totalConsultations: allRooms.filter(r => r.status === 'completed').length,
      todayAppointments: todayConsultations.length,
      pendingConsultations: pending.length,
      completedToday: completedToday.length,
      pendingAppointments: pendingApts.length,
      confirmedAppointments: confirmedApts.length,
      todayAppointmentsCount: todayApts.length,
      totalPrescriptions: doctorPrescriptions.length,
      totalPatients: uniquePatients.length,
      averageRating: ratingSummary?.average_rating || 0,
      totalRatings: ratingSummary?.total_ratings || 0,
    })

    // Set data for each section
    setConsultations(allRooms.sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time)).slice(0, 10))
    setAppointments(doctorAppointments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10))
    setPrescriptions(doctorPrescriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10))
    setPatients(uniquePatients.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit)))
    setRatings(doctorRatings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setRatingsSummary(ratingSummary)

    console.log('\n' + '='.repeat(60))
    console.log('DASHBOARD DATA LOADED SUCCESSFULLY')
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error("\n❌ ERROR LOADING DASHBOARD DATA")
    console.error("Error:", error)
  } finally {
    setLoading(false)
  }
}

  const handleLogout = () => {
    console.log('[DoctorDashboard] Logging out...')
    authAPI.logout()
    navigate('/auth?type=doctor&view=login')
  }

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      console.log(`\n🔄 ${action}ing appointment ${appointmentId}`)
      
      let newStatus
      switch (action) {
        case 'confirm':
          newStatus = 'confirmed'
          break
        case 'complete':
          newStatus = 'completed'
          break
        case 'cancel':
          newStatus = 'cancelled'
          break
        default:
          return
      }

      console.log('  New status:', newStatus)
      await appointmentsAPI.updateAppointmentStatus(appointmentId, newStatus)
      console.log('  ✅ Status updated successfully')
      
      if (user) {
        await loadDashboardData(user.id)
      }
      
      alert(`Appointment ${action}ed successfully!`)
    } catch (error) {
      console.error(`❌ Error ${action}ing appointment:`, error)
      alert(`Failed to ${action} appointment: ${error.message}`)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'pending': 
        return '#4338ca'
      case 'waiting': 
        return '#92400e'
      case 'ongoing':
      case 'confirmed':
      case 'active':
        return '#047857'
      case 'completed': 
        return '#059669'
      case 'cancelled': 
        return '#dc2626'
      default: 
        return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'pending': return 'Pending'
      case 'waiting': return 'Patient Waiting'
      case 'ongoing': return 'Ongoing'
      case 'confirmed': return 'Confirmed'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      case 'active': return 'Active'
      default: return status
    }
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        size={18}
        color={index < rating ? '#fbbf24' : '#d1d5db'}
      />
    ))
  }

  const quickActions = [
    {
      icon: <FaVideo size={24} />,
      title: "Video Consultations",
      description: "Join or view pending consultations",
      path: "/doctor-video",
      color: "#00b38e",
      urgent: stats.pendingConsultations > 0,
      badge: stats.pendingConsultations || null,
    },
    {
      icon: <FaCalendarCheck size={24} />,
      title: "Appointments",
      description: "Manage your appointment schedule",
      onClick: () => setActiveTab('appointments'),
      color: "#0070cd",
      urgent: stats.pendingAppointments > 0,
      badge: stats.pendingAppointments || null,
    },
    {
      icon: <FaPrescriptionBottle size={24} />,
      title: "Prescriptions",
      description: "View and manage prescriptions",
      onClick: () => setActiveTab('prescriptions'),
      color: "#ff6b35",
    },
    {
      icon: <FaUsers size={24} />,
      title: "My Patients",
      description: "View patient records and history",
      onClick: () => setActiveTab('patients'),
      color: "#8b5cf6",
    },
  ]

  if (isCheckingAuth) {
    return (
      <div className="doctor-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="doctor-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="doctor-dashboard">
      {/* Header */}
      <header className="doctor-header">
        <div className="doctor-info-strip">
          <div className="doctor-wrapper">
            <div className="doctor-contact-info">
              <span>
                <FaPhone size={14} /> Emergency: 108 / 102
              </span>
              <span>
                <FaClock size={14} /> 24/7 Support
              </span>
            </div>
            <div>
              <span>
                <FaMapMarkerAlt size={14} /> Rural HealthCare Network
              </span>
            </div>
          </div>
        </div>

        <div className="doctor-navbar-wrap">
          <div className="doctor-wrapper">
            <nav className="doctor-navigation">
              <div className="doctor-brand" onClick={() => navigate("/doctor-dashboard")}>
                <div className="doctor-brand-icon">
                  <FaHeartbeat size={24} />
                </div>
                <span className="doctor-brand-name">Doctor Portal</span>
              </div>

              <div className="doctor-menu-items">
                <Link to="/" className="doctor-nav-link">Home</Link>
                <Link to="/doctor-video" className="doctor-nav-link">
                  Video Consultations
                  {stats.pendingConsultations > 0 && (
                    <span className="doctor-notification-badge">{stats.pendingConsultations}</span>
                  )}
                </Link>
                <div 
                  className="doctor-nav-link" 
                  onClick={() => setActiveTab('appointments')}
                  style={{ cursor: 'pointer' }}
                >
                  Appointments
                  {stats.pendingAppointments > 0 && (
                    <span className="doctor-notification-badge">{stats.pendingAppointments}</span>
                  )}
                </div>
                <div 
                  className="doctor-nav-link" 
                  onClick={() => setActiveTab('patients')}
                  style={{ cursor: 'pointer' }}
                >
                  Patients
                </div>

                <div 
                  className="doctor-profile-dropdown"
                  onMouseEnter={() => setShowProfileDropdown(true)}
                  onMouseLeave={() => setShowProfileDropdown(false)}
                >
                  <button className="doctor-profile-btn">
                    <FaUserMd size={16} />
                    <span>Dr. {user.first_name} {user.last_name}</span>
                    <FaChevronDown size={12} />
                  </button>
                  {showProfileDropdown && (
                    <div className="doctor-dropdown-menu">
                      <Link to="/doctor-profile" className="doctor-dropdown-item">
                        <FaUserMd /> My Profile
                      </Link>
                      <div className="doctor-dropdown-divider"></div>
                      <div className="doctor-dropdown-item" onClick={handleLogout}>
                        <FaSignOutAlt /> Logout
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="doctor-wrapper">
        {/* Welcome Banner */}
        <div className="doctor-welcome-banner">
          <div className="welcome-content">
            <h1>Welcome back, Dr. {user.first_name} {user.last_name}!</h1>
            <p>You have {stats.todayAppointmentsCount || 0} appointments scheduled for today</p>
          </div>
          <div className="welcome-illustration">
            <FaStethoscope size={80} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="doctor-stats-grid">
          <div className="doctor-stat-card">
            <div className="stat-icon" style={{ background: '#e6f9f5' }}>
              <FaUsers style={{ color: '#00b38e' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.totalPatients}</h3>
              <p>Total Patients</p>
            </div>
          </div>

          <div className="doctor-stat-card">
            <div className="stat-icon" style={{ background: '#e0e7ff' }}>
              <FaCalendarCheck style={{ color: '#4338ca' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.todayAppointmentsCount || 0}</h3>
              <p>Today's Appointments</p>
            </div>
          </div>

          <div className="doctor-stat-card urgent">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <FaClock style={{ color: '#92400e' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.pendingAppointments}</h3>
              <p>Pending Appointments</p>
            </div>
            {stats.pendingAppointments > 0 && (
              <div className="stat-alert">
                <FaBell /> Action Needed
              </div>
            )}
          </div>

          <div className="doctor-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('ratings')}>
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <FaStar style={{ color: '#fbbf24' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.averageRating.toFixed(1)}/5.0</h3>
              <p>{stats.totalRatings} Rating{stats.totalRatings !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="doctor-quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`action-card ${action.urgent ? 'urgent' : ''}`}
                onClick={() => action.path ? navigate(action.path) : action.onClick()}
              >
                <div className="action-icon" style={{ background: `${action.color}15` }}>
                  <div style={{ color: action.color }}>{action.icon}</div>
                </div>
                <div className="action-content">
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
                {action.badge && (
                  <div className="action-badge">{action.badge}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="doctor-tabs">
          <button 
            className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            <FaVideo /> Video Consultations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <FaUsers /> Patients ({stats.totalPatients})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            <FaStar /> Ratings & Reviews ({stats.totalRatings})
          </button>
        </div>

        {/* Consultations Tab */}
        {activeTab === 'consultations' && (
          <div className="doctor-recent-section">
            <div className="section-header">
              <h2><FaVideo /> Recent Video Consultations</h2>
              <button 
                className="refresh-btn" 
                onClick={() => loadDashboardData(user.id)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {consultations.length > 0 ? (
              <div className="consultations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Scheduled Time</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((consultation) => (
                      <tr key={consultation.id}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {consultation.patient_details?.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="patient-name">{consultation.patient_details?.name || 'Unknown'}</div>
                              <div className="patient-phone">{consultation.patient_details?.phone || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td>{formatDateTime(consultation.scheduled_time)}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              background: `${getStatusColor(consultation.status)}20`,
                              color: getStatusColor(consultation.status)
                            }}
                          >
                            {getStatusLabel(consultation.status)}
                          </span>
                        </td>
                        <td>
                          {consultation.duration 
                            ? `${Math.floor(consultation.duration / 60)} min` 
                            : '-'}
                        </td>
                        <td>
                          {(consultation.status === 'scheduled' || consultation.status === 'waiting') && (
                            <button
                              className="action-btn join-btn"
                              onClick={() => navigate('/doctor-video')}
                            >
                              <FaVideo /> Join
                            </button>
                          )}
                          {consultation.status === 'ongoing' && (
                            <button
                              className="action-btn rejoin-btn"
                              onClick={() => navigate('/doctor-video')}
                            >
                              <FaVideo /> Rejoin
                            </button>
                          )}
                          {consultation.status === 'completed' && (
                            <button
                              className="action-btn view-btn"
                              onClick={() => {/* View details */}}
                            >
                              <FaNotesMedical /> View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaVideo size={48} />
                <h3>No Recent Consultations</h3>
                <p>Your recent video consultations will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="doctor-recent-section">
            <div className="section-header">
              <h2><FaCalendarCheck /> Patient Appointments ({appointments.length})</h2>
              <button 
                className="refresh-btn" 
                onClick={() => loadDashboardData(user.id)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading appointments...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="consultations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date & Time</th>
                      <th>Symptoms</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {appointment.patient_name.charAt(0)}
                            </div>
                            <div>
                              <div className="patient-name">{appointment.patient_name}</div>
                              <div className="patient-phone">{appointment.patient_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{formatDate(appointment.preferred_date)}</div>
                            <div className="patient-phone">{appointment.preferred_time}</div>
                          </div>
                        </td>
                        <td>
                          <div className="symptoms-cell">
                            {appointment.symptoms.length > 50 
                              ? `${appointment.symptoms.substring(0, 50)}...` 
                              : appointment.symptoms}
                          </div>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              background: `${getStatusColor(appointment.status)}20`,
                              color: getStatusColor(appointment.status)
                            }}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-group">
                            {appointment.status === 'pending' && (
                              <>
                                <button
                                  className="action-btn confirm-btn"
                                  onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                                  title="Confirm Appointment"
                                >
                                  <FaCheckCircle /> Confirm
                                </button>
                                <button
                                  className="action-btn cancel-btn"
                                  onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                                  title="Cancel Appointment"
                                >
                                  <FaTimesCircle /> Cancel
                                </button>
                              </>
                            )}
                            {appointment.status === 'confirmed' && (
                              <>
                                <button
                                  className="action-btn complete-btn"
                                  onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                                  title="Mark as Completed"
                                >
                                  <FaCheckCircle /> Complete
                                </button>
                                <button
                                  className="action-btn cancel-btn"
                                  onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                                  title="Cancel Appointment"
                                >
                                  <FaTimesCircle /> Cancel
                                </button>
                              </>
                            )}
                            {appointment.status === 'completed' && (
                              <button
                                className="action-btn view-btn"
                                onClick={() => {/* View details */}}
                                title="View Details"
                              >
                                <FaNotesMedical /> View
                              </button>
                            )}
                            {appointment.status === 'cancelled' && (
                              <span className="text-muted">No actions available</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaCalendarCheck size={48} />
                <h3>No Appointments Found</h3>
                <p>Patient appointments will appear here once they book appointments with you</p>
              </div>
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="doctor-recent-section">
            <div className="section-header">
              <h2><FaPrescriptionBottle /> Prescriptions ({prescriptions.length})</h2>
              <button 
                className="refresh-btn" 
                onClick={() => loadDashboardData(user.id)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading prescriptions...</p>
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="consultations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date Issued</th>
                      <th>Diagnosis</th>
                      <th>Medications</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((prescription) => (
                      <tr key={prescription.id}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {prescription.patient_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="patient-name">{prescription.patient_name}</div>
                              <div className="patient-phone">{prescription.patient_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(prescription.date)}</td>
                        <td>
                          <div className="symptoms-cell">
                            {prescription.diagnosis?.length > 40 
                              ? `${prescription.diagnosis.substring(0, 40)}...` 
                              : prescription.diagnosis}
                          </div>
                        </td>
                        <td>
                          <span className="medication-count">
                            {prescription.medications?.length || 0} medication(s)
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              background: `${getStatusColor(prescription.status || 'active')}20`,
                              color: getStatusColor(prescription.status || 'active')
                            }}
                          >
                            {getStatusLabel(prescription.status || 'active')}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn view-btn"
                            onClick={() => {/* View prescription details */}}
                            title="View Prescription"
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaPrescriptionBottle size={48} />
                <h3>No Prescriptions Found</h3>
                <p>Your prescriptions will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="doctor-recent-section">
            <div className="section-header">
              <h2><FaUsers /> My Patients ({patients.length})</h2>
              <button 
                className="refresh-btn" 
                onClick={() => loadDashboardData(user.id)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading patients...</p>
              </div>
            ) : patients.length > 0 ? (
              <div className="consultations-table">
                <table>
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Phone</th>
                      <th>Last Visit</th>
                      <th>Appointments</th>
                      <th>Prescriptions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient, index) => (
                      <tr key={patient.id || index}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {patient.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="patient-name">{patient.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{patient.phone}</td>
                        <td>{formatDate(patient.lastVisit)}</td>
                        <td>
                          <span className="stat-badge">{patient.totalAppointments}</span>
                        </td>
                        <td>
                          <span className="stat-badge">{patient.totalPrescriptions}</span>
                        </td>
                        <td>
                          <button
                            className="action-btn view-btn"
                            onClick={() => navigate(`/doctor-patient-health?patient=${patient.id}`)}
                            title="View Patient Health Records"
                          >
                            <FaEye /> View Records
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaUsers size={48} />
                <h3>No Patients Found</h3>
                <p>Your patients will appear here once they book appointments</p>
              </div>
            )}
          </div>
        )}

        {/* Ratings & Reviews Tab */}
        {activeTab === 'ratings' && (
          <div className="doctor-ratings-section">
            <div className="section-header">
              <h2><FaStar /> Ratings & Reviews</h2>
              <button 
                className="refresh-btn" 
                onClick={() => loadDashboardData(user.id)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading ratings...</p>
              </div>
            ) : ratingsSummary && ratings.length > 0 ? (
              <>
                {/* Ratings Overview */}
                <div className="ratings-overview-grid">
                  <div className="rating-score-box">
                    <div className="rating-score-number">
                      {ratingsSummary.average_rating.toFixed(1)}
                    </div>
                    <div className="rating-stars-display">
                      {renderStars(Math.round(ratingsSummary.average_rating))}
                    </div>
                    <div className="rating-count-text">
                      Based on {ratingsSummary.total_ratings} review{ratingsSummary.total_ratings !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="rating-distribution-box">
                    <h3 className="rating-distribution-title">Rating Distribution</h3>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingsSummary.rating_distribution[star] || 0
                      const percentage = ratingsSummary.total_ratings > 0 
                        ? (count / ratingsSummary.total_ratings) * 100 
                        : 0
                      
                      return (
                        <div key={star} className="rating-bar-row">
                          <div className="rating-bar-label">
                            <FaStar size={16} color="#fbbf24" />
                            <span>{star}</span>
                          </div>
                          <div className="rating-bar-container">
                            <div 
                              className="rating-bar-fill" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="rating-bar-count">{count}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rating Metrics */}
                <div className="rating-metrics-grid">
                  <div className="rating-metric-card">
                    <div className="rating-metric-icon" style={{ background: '#d1fae5' }}>
                      <FaThumbsUp size={28} style={{ color: '#047857' }} />
                    </div>
                    <div className="rating-metric-content">
                      <h3>{ratingsSummary.recommend_percentage}%</h3>
                      <p>Recommend Rate</p>
                    </div>
                  </div>

                  <div className="rating-metric-card">
                    <div className="rating-metric-icon" style={{ background: '#fef3c7' }}>
                      <FaStar size={28} style={{ color: '#fbbf24' }} />
                    </div>
                    <div className="rating-metric-content">
                      <h3>{ratingsSummary.five_star_count}</h3>
                      <p>5-Star Reviews</p>
                    </div>
                  </div>

                  <div className="rating-metric-card">
                    <div className="rating-metric-icon" style={{ background: '#e0e7ff' }}>
                      <FaUsers size={28} style={{ color: '#4338ca' }} />
                    </div>
                    <div className="rating-metric-content">
                      <h3>{ratingsSummary.total_ratings}</h3>
                      <p>Total Reviews</p>
                    </div>
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="reviews-section">
                  <h3 className="reviews-section-title">
                    <FaQuoteLeft /> Patient Reviews
                  </h3>
                  <div className="reviews-grid">
                    {ratings.map((rating) => (
                      <div key={rating.id} className="review-card">
                        <div className="review-card-header">
                          <div className="review-patient-avatar">
                            {rating.patient_name?.charAt(0) || 'P'}
                          </div>
                          <div className="review-patient-info">
                            <h4>{rating.patient_name || 'Anonymous Patient'}</h4>
                            <div className="review-meta">
                              <div className="review-stars">
                                {renderStars(rating.rating)}
                              </div>
                              <span className="review-date">
                                {formatDate(rating.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {rating.review && (
                          <div className="review-body">
                            <FaQuoteLeft className="review-quote-icon" size={20} />
                            <p className="review-text">"{rating.review}"</p>
                          </div>
                        )}

                        {(rating.pros || rating.cons) && (
                          <div className="review-feedback">
                            {rating.pros && (
                              <div className="feedback-row pros">
                                <FaThumbsUp size={14} />
                                <strong>Pros:</strong> {rating.pros}
                              </div>
                            )}
                            {rating.cons && (
                              <div className="feedback-row cons">
                                <FaThumbsDown size={14} />
                                <strong>Cons:</strong> {rating.cons}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="review-footer">
                          {rating.would_recommend && (
                            <span className="recommend-badge">
                              <FaThumbsUp size={14} />
                              Recommends
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="ratings-empty-state">
                <FaStar size={64} />
                <h3>No Ratings Yet</h3>
                <p>Patient ratings and reviews will appear here once patients rate your consultations.</p>
              </div>
            )}
          </div>
        )}

        {/* Professional Info */}
        <div className="doctor-info-cards">
          <div className="info-card">
            <div className="info-icon">
              <FaAward />
            </div>
            <h3>Professional Excellence</h3>
            <p>Providing quality healthcare to rural communities through telemedicine</p>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <FaChartLine />
            </div>
            <h3>Performance Tracking</h3>
            <p>Monitor your consultation metrics and patient satisfaction</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="doctor-footer">
        <div className="doctor-wrapper">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Rural HealthCare</h4>
              <p>Connecting doctors with patients in rural areas through technology</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/doctor-video">Video Consultations</Link></li>
                <li><div onClick={() => setActiveTab('appointments')}>Appointments</div></li>
                <li><div onClick={() => setActiveTab('patients')}>Patients</div></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#contact">Contact Support</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Rural HealthCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default DoctorDashboard