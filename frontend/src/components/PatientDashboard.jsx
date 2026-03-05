import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  FaVideo,
  FaCalendarCheck,
  FaPrescriptionBottle,
  FaChartLine,
  FaClock,
  FaUserMd,
  FaSignOutAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaHeartbeat,
  FaBell,
  FaChevronDown,
  FaPills,
  FaNotesMedical,
  FaClipboardList,
  FaAward,
  FaEye,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaRobot,
  FaRunning,
  FaBullseye,
  FaTint,
  FaWeight,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa"
import { doctorRatingsAPI } from "../services/api"
import { 
  authAPI, 
  videoConsultationAPI, 
  appointmentsAPI, 
  prescriptionsAPI,
  healthTrackingAPI 
} from "../services/api"
import "./PatientDashboard.css"

const PatientDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    totalAppointments: 0,
    activePrescriptions: 0,
    healthMetrics: 0,
    pendingConsultations: 0,
    completedConsultations: 0,
    activeGoals: 0,
    medicationReminders: 0,
  })
  const [myDoctors, setMyDoctors] = useState([])
  const [consultations, setConsultations] = useState([])
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') 
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [ratingData, setRatingData] = useState({
    rating: 0,
    review: '',
    pros: '',
    cons: '',
    would_recommend: true,
  })
 
  useEffect(() => {
    const checkAuth = () => {
      console.log('[PatientDashboard] Checking authentication...')
      const userData = authAPI.getCurrentUser()
      console.log('[PatientDashboard] User data from localStorage:', userData)
      
      if (!userData) {
        console.log('[PatientDashboard] ❌ No user data found - redirecting to login')
        setIsCheckingAuth(false)
        navigate('/auth?type=patient&view=login')
        return
      }
      
      if (userData.user_type !== 'patient') {
        console.log('[PatientDashboard] ❌ User is not a patient, type:', userData.user_type)
        alert(`This is the patient dashboard. You are logged in as ${userData.user_type}. Please logout and login as a patient.`)
        setIsCheckingAuth(false)
        navigate('/')
        return
      }
      
      console.log('[PatientDashboard] ✅ Patient authenticated:', userData.first_name, userData.last_name)
      console.log('[PatientDashboard] Patient ID:', userData.id)
      setUser(userData)
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [navigate])
 
  useEffect(() => {
    if (user && !isCheckingAuth) {
      console.log('[PatientDashboard] Loading dashboard data for patient:', user.id)
      loadDashboardData(user.id)
    }
  }, [user, isCheckingAuth])

 
  useEffect(() => {
    if (!user || isCheckingAuth) return

    const interval = setInterval(() => {
      console.log('[PatientDashboard] Auto-refreshing data...')
      loadDashboardData(user.id)
    }, 60000) 

    return () => clearInterval(interval)
  }, [user, isCheckingAuth])

  const loadMyDoctors = async (patientId) => {
    try {
        console.log('[PatientDashboard] Loading my doctors for patient:', patientId)
        const response = await doctorRatingsAPI.getPatientDoctors(patientId)
        console.log('[PatientDashboard] Raw doctors response:', response)
        
        if (response && response.success && Array.isArray(response.doctors)) {
            setMyDoctors(response.doctors)
            console.log('[PatientDashboard] ✅ Loaded', response.doctors.length, 'doctors')
        } else if (Array.isArray(response)) { 
            setMyDoctors(response)
            console.log('[PatientDashboard] ✅ Loaded', response.length, 'doctors (array format)')
        } else {
            console.log('[PatientDashboard] ⚠️ No doctors found in response')
            setMyDoctors([])
        }
    } catch (error) {
        console.error('[PatientDashboard] Error loading doctors:', error)
        setMyDoctors([])
    }
  }
    

  const loadDashboardData = async (patientId) => {
    try {
      setLoading(true)
      console.log('\n' + '='.repeat(60))
      console.log('LOADING PATIENT DASHBOARD DATA:', patientId)
      console.log('='.repeat(60))
 
      console.log('\n📹 Fetching video consultations...')
      let patientRoomsResponse = await videoConsultationAPI.getPatientRooms(patientId)
      let patientRooms = []
      
      if (Array.isArray(patientRoomsResponse)) {
        patientRooms = patientRoomsResponse
      } else if (patientRoomsResponse && Array.isArray(patientRoomsResponse.rooms)) {
        patientRooms = patientRoomsResponse.rooms
      }
      
      console.log('✅ Consultations count:', patientRooms.length)
 
      console.log('\n📅 Fetching appointments...')
      let patientAppointments = []
      
      try {
        let appointmentsResponse = await appointmentsAPI.getPatientAppointments(patientId)
        
        if (Array.isArray(appointmentsResponse)) {
          patientAppointments = appointmentsResponse
        } else if (appointmentsResponse && appointmentsResponse.results) {
          patientAppointments = appointmentsResponse.results
        }
        
        console.log('✅ Appointments count:', patientAppointments.length)
      } catch (error) {
        console.error('❌ Error fetching appointments:', error)
      }

      console.log('\n💊 Fetching prescriptions...')
      let patientPrescriptions = []
      
      try {
        let prescriptionsResponse = await prescriptionsAPI.getPatientPrescriptions(patientId)
        
        if (Array.isArray(prescriptionsResponse)) {
          patientPrescriptions = prescriptionsResponse
        } else if (prescriptionsResponse && prescriptionsResponse.results) {
          patientPrescriptions = prescriptionsResponse.results
        }
        
        console.log('✅ Prescriptions count:', patientPrescriptions.length)
      } catch (error) {
        console.error('❌ Error fetching prescriptions:', error)
      }
 
      console.log('\n❤️ Fetching health tracking data...')
      let dashboardData = null
      
      try {
        let healthResponse = await healthTrackingAPI.getDashboard(patientId)
        
        if (healthResponse && healthResponse.success && healthResponse.dashboard) {
          dashboardData = healthResponse.dashboard
          console.log('✅ Health data loaded')
        }
      } catch (error) {
        console.error('❌ Error fetching health data:', error)
      }
       
      await loadMyDoctors(patientId)
 
      const today = new Date().toDateString()
      
      const upcomingApts = patientAppointments.filter(apt => 
        new Date(apt.preferred_date) >= new Date() && apt.status !== 'cancelled'
      )
      
      const pendingConsults = patientRooms.filter(r => 
        r.status === 'scheduled' || r.status === 'waiting'
      )
      
      const completedConsults = patientRooms.filter(r => 
        r.status === 'completed'
      )

      const activePrescriptions = patientPrescriptions.filter(p => 
        p.status === 'active'
      )

      setStats({
        upcomingAppointments: upcomingApts.length,
        totalAppointments: patientAppointments.length,
        activePrescriptions: activePrescriptions.length,
        healthMetrics: dashboardData?.latest_metrics?.length || 0,
        pendingConsultations: pendingConsults.length,
        completedConsultations: completedConsults.length,
        activeGoals: dashboardData?.active_goals?.length || 0,
        medicationReminders: dashboardData?.medication_reminders?.length || 0,
      })

      setConsultations(patientRooms.sort((a, b) => 
        new Date(b.scheduled_time) - new Date(a.scheduled_time)
      ).slice(0, 5))
      
      setAppointments(patientAppointments.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5))
      
      setPrescriptions(patientPrescriptions.slice(0, 5))
      setHealthData(dashboardData)

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
    console.log('[PatientDashboard] Logging out...')
    authAPI.logout()
    navigate('/auth?type=patient&view=login')
  }

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    try {
      await appointmentsAPI.cancelAppointment(appointmentId)
      alert('Appointment cancelled successfully!')
      
      if (user) {
        await loadDashboardData(user.id)
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Failed to cancel appointment: ' + error.message)
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
      case 'pending': return 'Pending Confirmation'
      case 'waiting': return 'Doctor Will Join Soon'
      case 'ongoing': return 'In Progress'
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

  const handleOpenRatingModal = (doctor) => {
    setSelectedDoctor(doctor)
    setRatingData({
      rating: doctor.my_rating || 0,
      review: doctor.my_review || '',
      pros: '',
      cons: '',
      would_recommend: true,
    })
    setShowRatingModal(true)
  }

  const handleCloseRatingModal = () => {
    setShowRatingModal(false)
    setSelectedDoctor(null)
    setRatingData({
      rating: 0,
      review: '',
      pros: '',
      cons: '',
      would_recommend: true,
    })
  }

  const handleSubmitRating = async () => {
    if (!selectedDoctor || ratingData.rating === 0) {
      alert('Please select a rating')
      return
    }

    try {
      const payload = {
        doctor_id: selectedDoctor.id,
        patient_id: user.id,
        rating: ratingData.rating,
        review: ratingData.review,
        pros: ratingData.pros,
        cons: ratingData.cons,
        would_recommend: ratingData.would_recommend,
      }

      await doctorRatingsAPI.createRating(payload)
      alert('Rating submitted successfully!')
      handleCloseRatingModal()
       
      if (user) {
        await loadMyDoctors(user.id)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Failed to submit rating: ' + error.message)
    }
  }

  const renderStars = (rating, size = 16, interactive = false, onRate = null) => {
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      if (interactive) { 
        stars.push(
          <button
            key={i}
            type="button"
            onClick={() => onRate && onRate(i)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {i <= rating ? (
              <FaStar size={size} style={{ color: '#fbbf24' }} />
            ) : (
              <FaRegStar size={size} style={{ color: '#d1d5db' }} />
            )}
          </button>
        )
      } else { 
        const fullStars = Math.floor(rating)
        const hasHalfStar = rating % 1 >= 0.5
        
        if (i <= fullStars) {
          stars.push(<FaStar key={i} size={size} style={{ color: '#fbbf24' }} />)
        } else if (i === fullStars + 1 && hasHalfStar) {
          stars.push(<FaStarHalfAlt key={i} size={size} style={{ color: '#fbbf24' }} />)
        } else {
          stars.push(<FaRegStar key={i} size={size} style={{ color: '#d1d5db' }} />)
        }
      }
    }
    
    return <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>{stars}</div>
  }

  const quickActions = [
    {
      icon: <FaRobot size={24} />,
      title: "AI Health Assistant",
      description: "Get instant medical advice 24/7",
      path: "/chat",
      color: "#00b38e",
    },
    {
      icon: <FaCalendarCheck size={24} />,
      title: "Book Appointment",
      description: "Schedule a visit with a doctor",
      path: "/appointments",
      color: "#0070cd",
      badge: stats.upcomingAppointments || null,
    },
    {
      icon: <FaVideo size={24} />,
      title: "Video Consultation",
      description: "Connect with your doctor online",
      path: "/teleconsult",
      color: "#8b5cf6",
      urgent: stats.pendingConsultations > 0,
      badge: stats.pendingConsultations || null,
    },
    {
      icon: <FaChartLine size={24} />,
      title: "Health Tracking",
      description: "Monitor your vital signs & health",
      path: "/health-tracking",
      color: "#ff6b35",
    },
    {
      icon: <FaPrescriptionBottle size={24} />,
      title: "Prescriptions",
      description: "View your digital prescriptions",
      path: "/prescriptions",
      color: "#10b981",
    },
    {
      icon: <FaPills size={24} />,
      title: "Medicine Reminders",
      description: "Never miss your medication",
      path: "/medicines",
      color: "#f59e0b",
      badge: stats.medicationReminders || null,
    },
  ]

  if (isCheckingAuth) {
    return (
      <div className="patient-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="patient-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }
  

  return (
    <div className="patient-dashboard">
      <header className="patient-header">
        <div className="patient-info-strip">
          <div className="patient-wrapper">
            <div className="patient-contact-info">
              <span>
                <FaPhone size={14} /> Emergency: 108 / 102
              </span>
              <span>
                <FaClock size={14} /> 24/7 Support Available
              </span>
            </div>
            <div>
              <span>
                <FaMapMarkerAlt size={14} /> Rural HealthCare Network
              </span>
            </div>
          </div>
        </div>

        <div className="patient-navbar-wrap">
          <div className="patient-wrapper">
            <nav className="patient-navigation">
              <div className="patient-brand" onClick={() => navigate("/patient-dashboard")}>
                <div className="patient-brand-icon">
                  <FaHeartbeat size={24} />
                </div>
                <span className="patient-brand-name">My Health Portal</span>
              </div>

              <div className="patient-menu-items">
                <Link to="/" className="patient-nav-link">Home</Link>
                <Link to="/appointments" className="patient-nav-link">
                  Appointments
                  {stats.upcomingAppointments > 0 && (
                    <span className="patient-notification-badge">{stats.upcomingAppointments}</span>
                  )}
                </Link>
                <Link to="/health-tracking" className="patient-nav-link">
                  Health Tracking
                </Link>

                <div 
                  className="patient-profile-dropdown"
                  onMouseEnter={() => setShowProfileDropdown(true)}
                  onMouseLeave={() => setShowProfileDropdown(false)}
                >
                  <button className="patient-profile-btn">
                    <FaUserMd size={16} />
                    <span>{user.first_name} {user.last_name}</span>
                    <FaChevronDown size={12} />
                  </button>
                  {showProfileDropdown && (
                    <div className="patient-dropdown-menu">
                      <Link to="/patient-profile" className="patient-dropdown-item">
                        <FaUserMd /> My Profile
                      </Link>
                      <div className="patient-dropdown-divider"></div>
                      <div className="patient-dropdown-item" onClick={handleLogout}>
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
 
      <div className="patient-wrapper">
        <div className="patient-welcome-banner">
          <div className="welcome-content">
            <h1>Welcome back, {user.first_name}!</h1>
            <p>Your health is our priority. Stay connected with your healthcare journey.</p>
          </div>
          <div className="welcome-illustration">
            <FaHeartbeat size={80} />
          </div>
        </div>
 
        <div className="patient-stats-grid">
          <div className="patient-stat-card">
            <div className="stat-icon" style={{ background: '#e0e7ff' }}>
              <FaCalendarCheck style={{ color: '#4338ca' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.upcomingAppointments}</h3>
              <p>Upcoming Appointments</p>
            </div>
          </div>

          <div className="patient-stat-card urgent">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <FaVideo style={{ color: '#92400e' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.pendingConsultations}</h3>
              <p>Pending Consultations</p>
            </div>
            {stats.pendingConsultations > 0 && (
              <div className="stat-alert">
                <FaBell /> Join Now
              </div>
            )}
          </div>

          <div className="patient-stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}>
              <FaPrescriptionBottle style={{ color: '#047857' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.activePrescriptions}</h3>
              <p>Active Prescriptions</p>
            </div>
          </div>

          <div className="patient-stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2' }}>
              <FaChartLine style={{ color: '#dc2626' }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.healthMetrics}</h3>
              <p>Health Metrics Tracked</p>
            </div>
          </div>
        </div>

        <div className="patient-quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`action-card ${action.urgent ? 'urgent' : ''}`}
                onClick={() => navigate(action.path)}
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
 
        <div className="patient-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FaClipboardList /> Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <FaCalendarCheck /> My Appointments
            {stats.upcomingAppointments > 0 && (
              <span className="tab-badge">{stats.upcomingAppointments}</span>
            )}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            <FaVideo /> Video Consultations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            <FaPrescriptionBottle /> Prescriptions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            <FaChartLine /> Health Summary
          </button>
          <button 
            className={`tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
          >
            <FaUserMd /> My Doctors
          </button>
        </div>
 
        {activeTab === 'overview' && (
          <div className="patient-overview-section">
            {healthData?.alerts && healthData.alerts.length > 0 && (
              <div className="patient-alerts-section">
                <h2><FaBell /> Health Alerts</h2>
                <div className="alerts-grid">
                  {healthData.alerts.map((alert, index) => (
                    <div 
                      key={index} 
                      className="alert-card"
                      style={{ borderLeftColor: getStatusColor(alert.alert_level) }}
                    >
                      <FaBell style={{ color: getStatusColor(alert.alert_level) }} />
                      <div>
                        <strong>{alert.message}</strong>
                        <p>{alert.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            <div className="overview-grid">
              {/* Upcoming Appointments */}
              <div className="overview-card">
                <h3><FaCalendarCheck /> Upcoming Appointments</h3>
                {appointments.filter(apt => new Date(apt.preferred_date) >= new Date()).length > 0 ? (
                  <div className="overview-list">
                    {appointments
                      .filter(apt => new Date(apt.preferred_date) >= new Date())
                      .slice(0, 3)
                      .map(apt => (
                        <div key={apt.id} className="overview-item">
                          <div>
                            <strong>Dr. {apt.doctor_details?.user?.first_name || 'Doctor'}</strong>
                            <p>{formatDate(apt.preferred_date)} at {apt.preferred_time}</p>
                          </div>
                          <span 
                            className="status-badge-small"
                            style={{ 
                              background: `${getStatusColor(apt.status)}20`,
                              color: getStatusColor(apt.status)
                            }}
                          >
                            {getStatusLabel(apt.status)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-overview">
                    <p>No upcoming appointments</p>
                    <button onClick={() => navigate('/appointments')} className="btn-link">
                      Book Now
                    </button>
                  </div>
                )}
              </div>
 
              <div className="overview-card">
                <h3><FaPrescriptionBottle /> Active Prescriptions</h3>
                {prescriptions.filter(p => p.status === 'active').length > 0 ? (
                  <div className="overview-list">
                    {prescriptions
                      .filter(p => p.status === 'active')
                      .slice(0, 3)
                      .map(pres => (
                        <div key={pres.id} className="overview-item">
                          <div>
                            <strong>{pres.medications?.length || 0} Medications</strong>
                            <p>Issued: {formatDate(pres.date)}</p>
                          </div>
                          <button 
                            onClick={() => navigate('/prescriptions')} 
                            className="btn-view-small"
                          >
                            <FaEye />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-overview">
                    <p>No active prescriptions</p>
                  </div>
                )}
              </div>
 
              {healthData?.active_goals && healthData.active_goals.length > 0 && (
                <div className="overview-card">
                  <h3><FaBullseye /> Active Health Goals</h3>
                  <div className="overview-list">
                    {healthData.active_goals.slice(0, 3).map(goal => (
                      <div key={goal.id} className="overview-item">
                        <div>
                          <strong>{goal.title}</strong>
                          <div className="progress-mini">
                            <div 
                              className="progress-fill-mini"
                              style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="progress-text-mini">
                          {Math.round(goal.progress_percentage)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
 
        {activeTab === 'appointments' && (
          <div className="patient-section">
            <div className="section-header">
              <h2><FaCalendarCheck /> My Appointments</h2>
              <button 
                className="btn-primary"
                onClick={() => navigate('/appointments')}
              >
                <FaPlus /> Book New
              </button>
            </div>

            {appointments.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Date & Time</th>
                      <th>Symptoms</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt.id}>
                        <td>
                          <div className="doctor-cell">
                            <div className="doctor-avatar">
                              {apt.doctor_details?.user?.first_name?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <div className="doctor-name">
                                Dr. {apt.doctor_details?.user?.first_name || 'Doctor'} {apt.doctor_details?.user?.last_name || ''}
                              </div>
                              <div className="doctor-specialty">
                                {apt.doctor_details?.specialization_display || 'General Physician'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{formatDate(apt.preferred_date)}</div>
                            <div className="time-text">{apt.preferred_time}</div>
                          </div>
                        </td>
                        <td>
                          <div className="symptoms-text">
                            {apt.symptoms.length > 50 
                              ? `${apt.symptoms.substring(0, 50)}...` 
                              : apt.symptoms}
                          </div>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              background: `${getStatusColor(apt.status)}20`,
                              color: getStatusColor(apt.status)
                            }}
                          >
                            {getStatusLabel(apt.status)}
                          </span>
                        </td>
                        <td>
                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              className="btn-cancel-small"
                              onClick={() => handleCancelAppointment(apt.id)}
                            >
                              <FaTimesCircle /> Cancel
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
                <FaCalendarCheck size={48} />
                <h3>No Appointments Yet</h3>
                <p>Book your first appointment with a doctor</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/appointments')}
                >
                  Book Appointment
                </button>
              </div>
            )}
          </div>
        )}
 
        {activeTab === 'consultations' && (
          <div className="patient-section">
            <div className="section-header">
              <h2><FaVideo /> Video Consultations</h2>
              <button 
                className="btn-primary"
                onClick={() => navigate('/teleconsult')}
              >
                <FaPlus /> New Consultation
              </button>
            </div>

            {consultations.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Scheduled Time</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map(consult => (
                      <tr key={consult.id}>
                        <td>
                          <div className="doctor-cell">
                            <div className="doctor-avatar">
                              {consult.doctor_details?.name?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <div className="doctor-name">
                                {consult.doctor_details?.name || 'Doctor'}
                              </div>
                              <div className="doctor-specialty">
                                {consult.doctor_details?.specialization || 'General'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{formatDateTime(consult.scheduled_time)}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              background: `${getStatusColor(consult.status)}20`,
                              color: getStatusColor(consult.status)
                            }}
                          >
                            {getStatusLabel(consult.status)}
                          </span>
                        </td>
                        <td>
                          {consult.duration 
                            ? `${Math.floor(consult.duration / 60)} min` 
                            : '-'}
                        </td>
                        <td>
                          {(consult.status === 'scheduled' || consult.status === 'waiting') && (
                            <button
                              className="btn-join"
                              onClick={() => navigate('/teleconsult')}
                            >
                              <FaVideo /> Join
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
                <h3>No Consultations</h3>
                <p>Start a video consultation with a doctor</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/teleconsult')}
                >
                  Start Consultation
                </button>
              </div>
            )}
          </div>
        )}
 
        {activeTab === 'prescriptions' && (
          <div className="patient-section">
            <div className="section-header">
              <h2><FaPrescriptionBottle /> My Prescriptions</h2>
              <button 
                className="btn-refresh"
                onClick={() => loadDashboardData(user.id)}
              >
                Refresh
              </button>
            </div>

            {prescriptions.length > 0 ? (
              <div className="prescriptions-grid">
                {prescriptions.map(pres => (
                  <div key={pres.id} className="prescription-card">
                    <div className="prescription-header">
                      <h3>Dr. {pres.doctor_name}</h3>
                      <span 
                        className="status-badge-small"
                        style={{ 
                          background: `${getStatusColor(pres.status || 'active')}20`,
                          color: getStatusColor(pres.status || 'active')
                        }}
                      >
                        {getStatusLabel(pres.status || 'active')}
                      </span>
                    </div>
                    <div className="prescription-body">
                      <p><strong>Diagnosis:</strong> {pres.diagnosis}</p>
                      <p><strong>Date:</strong> {formatDate(pres.date)}</p>
                      <p><strong>Medications:</strong> {pres.medications?.length || 0}</p>
                    </div>
                    <button 
                      className="btn-view"
                      onClick={() => navigate('/prescriptions')}
                    >
                      <FaEye /> View Details
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FaPrescriptionBottle size={48} />
                <h3>No Prescriptions</h3>
                <p>Your prescriptions will appear here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div className="patient-section">
            <div className="section-header">
              <h2><FaChartLine /> Health Summary</h2>
              <button 
                className="btn-primary"
                onClick={() => navigate('/health-tracking')}
              >
                <FaPlus /> Track Health
              </button>
            </div>

            {healthData ? (
              <div className="health-summary-grid">
                <div className="health-card">
                  <h3><FaHeartbeat /> Latest Metrics</h3>
                  {healthData.latest_metrics && healthData.latest_metrics.length > 0 ? (
                    <div className="metrics-list">
                      {healthData.latest_metrics.slice(0, 4).map(metric => (
                        <div key={metric.id} className="metric-item">
                          <span className="metric-name">
                            {metric.metric_type_display}
                          </span>
                          <span className="metric-value">
                            {metric.value} {metric.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No metrics recorded yet</p>
                  )}
                </div>

                <div className="health-card">
                  <h3><FaBullseye /> Health Goals</h3>
                  {healthData.active_goals && healthData.active_goals.length > 0 ? (
                    <div className="goals-list">
                      {healthData.active_goals.slice(0, 3).map(goal => (
                        <div key={goal.id} className="goal-item">
                          <div className="goal-info">
                            <strong>{goal.title}</strong>
                            <span>{Math.round(goal.progress_percentage)}% Complete</span>
                          </div>
                          <div className="goal-progress">
                            <div 
                              className="goal-progress-fill"
                              style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No active goals</p>
                  )}
                </div>

                <div className="health-card">
                  <h3><FaRunning /> Recent Activities</h3>
                  {healthData.recent_activities && healthData.recent_activities.length > 0 ? (
                    <div className="activities-list">
                      {healthData.recent_activities.slice(0, 3).map(activity => (
                        <div key={activity.id} className="activity-item">
                          <div>
                            <strong>{activity.title}</strong>
                            <p>{activity.activity_date}</p>
                          </div>
                          {activity.duration_minutes && (
                            <span className="activity-duration">
                              {activity.duration_minutes} min
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No activities logged</p>
                  )}
                </div>

                <div className="health-card">
                  <h3><FaPills /> Medication Reminders</h3>
                  {healthData.medication_reminders && healthData.medication_reminders.length > 0 ? (
                    <div className="reminders-list">
                      {healthData.medication_reminders.slice(0, 3).map(reminder => (
                        <div key={reminder.id} className="reminder-item">
                          <div>
                            <strong>{reminder.medication_name}</strong>
                            <p>{reminder.dosage} - {reminder.frequency_display}</p>
                          </div>
                          <button className="btn-check-small">
                            <FaCheckCircle />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">No reminders set</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FaChartLine size={48} />
                <h3>No Health Data</h3>
                <p>Start tracking your health metrics</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/health-tracking')}
                >
                  Start Tracking
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="patient-section">
            <div className="section-header">
              <h2><FaUserMd /> My Doctors</h2>
            </div>

            {myDoctors.length > 0 ? (
              <div className="doctors-grid">
                {myDoctors.map(doctor => (
                  <div key={doctor.id} className="doctor-profile-card">
                    <div className="doctor-card-header">
                      <div className="doctor-profile-image">
                        {doctor.profile_picture_url ? (
                          <img src={doctor.profile_picture_url} alt={doctor.name} />
                        ) : (
                          <div className="doctor-avatar-placeholder">
                            {doctor.first_name?.charAt(0)}{doctor.last_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="doctor-card-info">
                        <h3>{doctor.name}</h3>
                        <div className="doctor-specialty">{doctor.specialization_display}</div>
                        <div className="doctor-qualification">{doctor.qualification}</div>
                      </div>
                    </div>

                    <div className="doctor-card-stats">
                      <div className="stat-item">
                        <div className="stat-label">Experience</div>
                        <div className="stat-value">{doctor.experience_years}y</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Visits</div>
                        <div className="stat-value">{doctor.total_consultations}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Fee</div>
                        <div className="stat-value">₹{doctor.consultation_fee}</div>
                      </div>
                    </div>

                    <div className="doctor-card-rating">
                      <div className="rating-display">
                        {renderStars(doctor.average_rating, 18)}
                        <span className="rating-value">
                          {doctor.average_rating.toFixed(1)} ({doctor.total_ratings} reviews)
                        </span>
                      </div>
                      {doctor.my_rating ? (
                        <div className="my-rating-badge">
                          <FaStar /> You rated: {doctor.my_rating}/5
                        </div>
                      ) : (
                        <button 
                          className="btn-rate"
                          onClick={() => handleOpenRatingModal(doctor)}
                        >
                          <FaStar /> Rate Doctor
                        </button>
                      )}
                    </div>

                    <div className="doctor-card-actions">
                      <button 
                        className="btn-book btn-center"
                        onClick={() => navigate('/appointments')}
                      >
                        <FaCalendarCheck /> Book
                      </button>
                    </div>

                    <div className="last-visit">
                      Last visit: {formatDate(doctor.last_visit)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FaUserMd size={48} />
                <h3>No Doctors Yet</h3>
                <p>Book an appointment to see your doctors here</p>
                <button 
                  className="btn-primary"
                  onClick={() => navigate('/appointments')}
                >
                  Book Appointment
                </button>
              </div>
            )}
          </div>
        )}

        <div className="patient-info-cards">
          <div className="info-card">
            <div className="info-icon">
              <FaAward />
            </div>
            <h3>Your Health Journey</h3>
            <p>Track your progress and achieve your health goals with personalized insights</p>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <FaChartLine />
            </div>
            <h3>Stay Connected</h3>
            <p>Access quality healthcare from anywhere with our telemedicine platform</p>
          </div>
        </div>
      </div>

      {showRatingModal && selectedDoctor && (
        <div className="modal-overlay" onClick={handleCloseRatingModal}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rate {selectedDoctor.name}</h2>
              <button className="modal-close" onClick={handleCloseRatingModal}>
                <FaTimesCircle size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="rating-section">
                <label>Your Rating</label>
                <div className="star-rating-input">
                  {renderStars(ratingData.rating, 32, true, (rating) => setRatingData({...ratingData, rating}))}
                </div>
                <div className="rating-text">
                  {ratingData.rating > 0 ? `${ratingData.rating} out of 5 stars` : 'Select a rating'}
                </div>
              </div>

              <div className="form-group">
                <label>Review (Optional)</label>
                <textarea
                  rows="4"
                  placeholder="Share your experience with this doctor..."
                  value={ratingData.review}
                  onChange={(e) => setRatingData({...ratingData, review: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>What did you like? (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="What were the positives?"
                  value={ratingData.pros}
                  onChange={(e) => setRatingData({...ratingData, pros: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Areas for improvement? (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="What could be better?"
                  value={ratingData.cons}
                  onChange={(e) => setRatingData({...ratingData, cons: e.target.value})}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={ratingData.would_recommend}
                    onChange={(e) => setRatingData({...ratingData, would_recommend: e.target.checked})}
                  />
                  <span>I would recommend this doctor</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseRatingModal}>
                Cancel
              </button>
              <button 
                className="btn-submit-rating" 
                onClick={handleSubmitRating}
                disabled={ratingData.rating === 0}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="patient-footer">
        <div className="patient-wrapper">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Rural HealthCare</h4>
              <p>Your health companion for better living</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/chat">AI Assistant</Link></li>
                <li><Link to="/appointments">Appointments</Link></li>
                <li><Link to="/health-tracking">Health Tracking</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#contact">Contact Us</a></li>
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

export default PatientDashboard