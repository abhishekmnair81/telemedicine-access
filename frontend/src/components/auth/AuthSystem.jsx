import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { FaUser, FaUserMd, FaPills, FaPhone, FaLock, FaEnvelope, FaIdCard, FaArrowLeft, FaHeartbeat, FaKey } from "react-icons/fa"
import "./AuthSystem.css"

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

const AuthSystem = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentView, setCurrentView] = useState("select")
  const [userType, setUserType] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [tempPhone, setTempPhone] = useState("")
  const [tempEmail, setTempEmail] = useState("")
  
  const [loginForm, setLoginForm] = useState({ phone: "" })
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "", 
    phone: "", 
    email: "", 
    password: "", 
    confirmPassword: "", 
    licenseNumber: "",
    specialization: "",
    qualification: "",
    pharmacyName: "",
    pharmacyAddress: ""
  })

  // Handle URL parameters for direct navigation from dropdowns
  useEffect(() => {
    const type = searchParams.get('type')
    const view = searchParams.get('view')
    
    if (type && ['patient', 'doctor', 'pharmacist'].includes(type)) {
      setUserType(type)
      if (view === 'login' || view === 'register') {
        setCurrentView(view)
      } else {
        setCurrentView('login')
      }
    }
  }, [searchParams])

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value })
    setError("")
  }

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value })
    setError("")
  }

  const handleOtpChange = (e) => {
    setOtpValue(e.target.value)
    setError("")
  }

  // ============================================================================
  // OTP LOGIN FLOW - FIXED FOR PHARMACIST
  // ============================================================================

  const handleRequestLoginOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const phoneNumber = loginForm.phone.trim()

    if (!phoneNumber || phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      })

      const data = await response.json()
      console.log('[AuthSystem] Send OTP response:', data)

      if (response.ok && data.success) {
        setOtpSent(true)
        setTempPhone(phoneNumber)
        setError("")
        
        // If in DEBUG mode, OTP will be in response
        if (data.otp) {
          console.log("🔐 OTP (DEBUG):", data.otp)
        }
      } else {
        if (data.requires_registration) {
          setError("No account found. Please register first.")
          setTimeout(() => {
            setCurrentView("register")
            setRegisterForm({ ...registerForm, phone: phoneNumber })
          }, 2000)
        } else {
          setError(data.error || "Failed to send OTP. Please try again.")
        }
      }
    } catch (err) {
      console.error('Request OTP error:', err)
      setError("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyLoginOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!otpValue || otpValue.length !== 6) {
      setError("Please enter the 6-digit OTP")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: tempPhone,
          otp: otpValue,
        }),
      })

      const data = await response.json()
      console.log('[AuthSystem] Login OTP verification response:', data)

      if (response.ok && data.success) {
        // ✅ CRITICAL FIX: Store complete user data with proper user_type
        const userData = {
          id: data.user.id,
          phone_number: data.user.phone_number || tempPhone,
          email: data.user.email,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          user_type: data.user.user_type, // This MUST come from backend
          profile_picture_url: data.user.profile_picture_url || null,
          // Include any additional fields from the response
          ...data.user
        }
        
        console.log('[AuthSystem] Storing user data:', userData)
        console.log('[AuthSystem] User type:', userData.user_type)
        
        // Clear any old data first
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // Store new data
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('accessToken', data.tokens?.access)
        localStorage.setItem('refreshToken', data.tokens?.refresh)
        
        console.log('[AuthSystem] User stored in localStorage:', JSON.parse(localStorage.getItem('user')))
        
        // Trigger storage event for other tabs/components
        window.dispatchEvent(new Event('storage'))
        
        // Small delay to ensure localStorage is fully updated
        setTimeout(() => {
          // Navigate based on user type from backend
          const loginUserType = data.user.user_type
          console.log('[AuthSystem] Navigating based on user type:', loginUserType)
          
          if (loginUserType === 'patient') {
            navigate('/')
          } else if (loginUserType === 'doctor') {
            navigate('/doctor-dashboard')
          } else if (loginUserType === 'pharmacist') {
            console.log('[AuthSystem] Redirecting pharmacist to /pharmacy-home')
            navigate('/pharmacy-home')
          } else {
            console.warn('[AuthSystem] Unknown user type, redirecting to home')
            navigate('/')
          }
        }, 100)
      } else {
        setError(data.error || "Invalid OTP. Please try again.")
      }
    } catch (err) {
      console.error('[AuthSystem] Verify OTP error:', err)
      setError("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // OTP REGISTRATION FLOW
  // ============================================================================

  const handleRequestRegisterOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const phoneNumber = registerForm.phone.trim()
    const email = registerForm.email.trim()

    // Validation
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number")
      setLoading(false)
      return
    }

    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (!registerForm.firstName) {
      setError("Please enter your first name")
      setLoading(false)
      return
    }

    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords don't match!")
      setLoading(false)
      return
    }

    // Additional validation for doctors/pharmacists
    if (userType === 'doctor' && !registerForm.licenseNumber) {
      setError("Medical license number is required")
      setLoading(false)
      return
    }

    if (userType === 'pharmacist' && !registerForm.licenseNumber) {
      setError("Pharmacy license is required")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp-register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          email: email,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setOtpSent(true)
        setTempPhone(phoneNumber)
        setTempEmail(email)
        setError("")
        
        // If in DEBUG mode, OTP will be in response
        if (data.otp) {
          console.log("🔐 OTP (DEBUG):", data.otp)
        }
      } else {
        setError(data.error || "Failed to send OTP. Please try again.")
      }
    } catch (err) {
      console.error('Request registration OTP error:', err)
      setError("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyRegisterOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!otpValue || otpValue.length !== 6) {
      setError("Please enter the 6-digit OTP")
      setLoading(false)
      return
    }

    try {
      const registrationData = {
        phone_number: tempPhone,
        otp: otpValue,
        user_type: userType,
        first_name: registerForm.firstName,
        last_name: registerForm.lastName,
        email: tempEmail,
        password: registerForm.password
      }

      // Add role-specific fields
      if (userType === 'doctor') {
        registrationData.license_number = registerForm.licenseNumber
        registrationData.specialization = registerForm.specialization || 'general'
        registrationData.qualification = registerForm.qualification || 'MBBS'
      } else if (userType === 'pharmacist') {
        registrationData.pharmacy_license = registerForm.licenseNumber
        registrationData.pharmacy_name = registerForm.pharmacyName || 'Pharmacy'
        registrationData.pharmacy_address = registerForm.pharmacyAddress || ''
      }

      console.log('[AuthSystem] Registration data:', registrationData)

      const response = await fetch(`${API_BASE_URL}/auth/verify-otp-register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      })

      const data = await response.json()
      console.log('[AuthSystem] Registration response:', data)

      if (response.ok && data.success) {
        // Store user data with user_type
        const userData = {
          id: data.user.id,
          phone_number: data.user.phone_number || tempPhone,
          email: data.user.email || tempEmail,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          user_type: userType, // Use the selected userType
          profile_picture_url: data.user.profile_picture_url || null,
          ...data.user
        }
        
        console.log('[AuthSystem] Storing registered user:', userData)
        
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('accessToken', data.tokens?.access)
        localStorage.setItem('refreshToken', data.tokens?.refresh)

        // Trigger storage event
        window.dispatchEvent(new Event('storage'))

        // Navigate based on user type
        if (userType === 'patient') navigate('/')
        else if (userType === 'doctor') navigate('/doctor-dashboard')
        else if (userType === 'pharmacist') navigate('/pharmacy-home')
      } else {
        setError(data.error || 'Invalid OTP or registration failed. Please try again.')
      }
    } catch (err) {
      console.error('Verify registration OTP error:', err)
      setError('Server error. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const selectUserType = (type) => { 
    setUserType(type)
    setCurrentView("login")
    setError("")
    setOtpSent(false)
    setOtpValue("")
  }

  const resetView = () => {
    setCurrentView("select")
    setUserType("")
    setError("")
    setOtpSent(false)
    setOtpValue("")
    setTempPhone("")
    setTempEmail("")
    setLoginForm({ phone: "" })
    setRegisterForm({ 
      firstName: "",
      lastName: "",
      phone: "", 
      email: "", 
      password: "", 
      confirmPassword: "", 
      licenseNumber: "",
      specialization: "",
      qualification: "",
      pharmacyName: "",
      pharmacyAddress: ""
    })
  }

  const getUserIcon = () => {
    if (userType === "doctor") return <FaUserMd size={50} />
    if (userType === "pharmacist") return <FaPills size={50} />
    return <FaUser size={50} />
  }

  const getUserTitle = () => {
    if (userType === "doctor") return "Doctor"
    if (userType === "pharmacist") return "Pharmacist"
    return "Patient"
  }

  const getLeftSideImage = () => {
    if (userType === "doctor") {
      return "/ai-doc.png"
    } else if (userType === "pharmacist") {
      return "/farm.png"
    } else {
      return "/pat-doc.png"
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="apollo-auth-container">
      {currentView === "select" && (
        <div className="apollo-selection-wrapper">
          <div className="apollo-selection-card">
            <div className="apollo-brand-header">
              <div className="apollo-brand-logo">
                <FaHeartbeat size={48} />
              </div>
              <h1 className="apollo-brand-title">Rural HealthCare</h1>
              <p className="apollo-brand-subtitle">Your health, our priority</p>
            </div>

            <h2 className="apollo-selection-title">Select Account Type</h2>
            <p className="apollo-selection-subtitle">Choose your role to get started</p>

            <div className="apollo-user-type-grid">
              <div className="apollo-user-type-card apollo-patient-card" onClick={() => selectUserType("patient")}>
                <div className="apollo-card-icon">
                  <FaUser size={36} />
                </div>
                <div className="apollo-card-content">
                  <h3 className="apollo-card-title">Patient</h3>
                  <p className="apollo-card-desc">Book appointments & manage health records</p>
                </div>
              </div>

              <div className="apollo-user-type-card apollo-doctor-card" onClick={() => selectUserType("doctor")}>
                <div className="apollo-card-icon">
                  <FaUserMd size={36} />
                </div>
                <div className="apollo-card-content">
                  <h3 className="apollo-card-title">Doctor</h3>
                  <p className="apollo-card-desc">Manage patients & appointments</p>
                </div>
              </div>

              <div className="apollo-user-type-card apollo-pharmacist-card" onClick={() => selectUserType("pharmacist")}>
                <div className="apollo-card-icon">
                  <FaPills size={36} />
                </div>
                <div className="apollo-card-content">
                  <h3 className="apollo-card-title">Pharmacist</h3>
                  <p className="apollo-card-desc">Handle prescriptions & inventory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(currentView === "login" || currentView === "register") && (
        <div className="apollo-split-screen-container">
          <div className="apollo-left-panel">
            <div className="apollo-image-overlay">
              <div className="apollo-overlay-content">
                <h2>Welcome to Rural HealthCare</h2>
                <p>Providing quality healthcare services to rural communities</p>
              </div>
            </div>
            <img 
              src={getLeftSideImage()} 
              alt={`${getUserTitle()} illustration`}
              className="apollo-side-image"
            />
          </div>

          <div className="apollo-right-panel">
            <div className="apollo-form-container">
              <button className="apollo-back-btn" onClick={resetView}>
                <FaArrowLeft /> Back
              </button>

              <div className="apollo-form-header">
                <div className="apollo-form-icon">
                  {getUserIcon()}
                </div>
                <h2 className="apollo-form-title">
                  {currentView === "login" ? `${getUserTitle()} Login` : `${getUserTitle()} Registration`}
                </h2>
                <p className="apollo-form-subtitle">
                  {currentView === "login" 
                    ? (otpSent ? "Enter the OTP sent to your email" : "Sign in with your phone number") 
                    : (otpSent ? "Enter the OTP sent to your email" : "Create your new account")
                  }
                </p>
              </div>

              {error && (
                <div className="apollo-error-message">
                  {error}
                </div>
              )}

              {/* LOGIN FORM */}
              {currentView === "login" && !otpSent && (
                <form className="apollo-auth-form" onSubmit={handleRequestLoginOTP}>
                  <div className="apollo-form-group">
                    <label className="apollo-form-label">Phone Number</label>
                    <div className="apollo-input-wrapper">
                      <FaPhone className="apollo-input-icon" />
                      <input
                        type="tel"
                        name="phone"
                        value={loginForm.phone}
                        onChange={handleLoginChange}
                        placeholder="Enter 10-digit phone number"
                        pattern="[0-9]{10}"
                        maxLength="10"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button className="apollo-submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>

                  <div className="apollo-form-footer">
                    <p className="apollo-footer-text">
                      New user? <span className="apollo-link-text" onClick={() => setCurrentView("register")}>Register here</span>
                    </p>
                  </div>
                </form>
              )}

              {/* OTP VERIFICATION FOR LOGIN */}
              {currentView === "login" && otpSent && (
                <form className="apollo-auth-form" onSubmit={handleVerifyLoginOTP}>
                  <div className="apollo-otp-info">
                    <p>OTP sent to your registered email</p>
                    <p className="apollo-phone-display">Phone: {tempPhone}</p>
                  </div>

                  <div className="apollo-form-group">
                    <label className="apollo-form-label">Enter OTP</label>
                    <div className="apollo-input-wrapper">
                      <FaKey className="apollo-input-icon" />
                      <input
                        type="text"
                        value={otpValue}
                        onChange={handleOtpChange}
                        placeholder="Enter 6-digit OTP"
                        pattern="[0-9]{6}"
                        maxLength="6"
                        className="apollo-form-input apollo-otp-input"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button className="apollo-submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>

                  <div className="apollo-form-footer">
                    <p className="apollo-footer-text">
                      Didn't receive OTP? <span className="apollo-link-text" onClick={() => {
                        setOtpSent(false)
                        setOtpValue("")
                      }}>Resend</span>
                    </p>
                  </div>
                </form>
              )}

              {/* REGISTRATION FORM */}
              {currentView === "register" && !otpSent && (
                <form className="apollo-auth-form apollo-register-form" onSubmit={handleRequestRegisterOTP}>
                  {/* Name Fields */}
                  <div className="apollo-form-row">
                    <div className="apollo-form-group">
                      <label className="apollo-form-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={registerForm.firstName}
                        onChange={handleRegisterChange}
                        placeholder="First name"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="apollo-form-group">
                      <label className="apollo-form-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={registerForm.lastName}
                        onChange={handleRegisterChange}
                        placeholder="Last name"
                        className="apollo-form-input"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="apollo-form-group">
                    <label className="apollo-form-label">
                      Phone Number <span className="apollo-required-badge">Required</span>
                    </label>
                    <div className="apollo-input-wrapper">
                      <FaPhone className="apollo-input-icon" />
                      <input
                        type="tel"
                        name="phone"
                        value={registerForm.phone}
                        onChange={handleRegisterChange}
                        placeholder="10-digit mobile number"
                        pattern="[0-9]{10}"
                        maxLength="10"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                      />
                    </div>
                    <p className="apollo-input-hint">This will be your username</p>
                  </div>

                  {/* Email */}
                  <div className="apollo-form-group">
                    <label className="apollo-form-label">
                      Email Address <span className="apollo-required-badge">Required</span>
                    </label>
                    <div className="apollo-input-wrapper">
                      <FaEnvelope className="apollo-input-icon" />
                      <input
                        type="email"
                        name="email"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        placeholder="Enter your email"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                      />
                    </div>
                    <p className="apollo-input-hint">OTP will be sent to this email</p>
                  </div>

                  {/* DOCTOR-SPECIFIC FIELDS */}
                  {userType === "doctor" && (
                    <>
                      <div className="apollo-form-group">
                        <label className="apollo-form-label">
                          Medical License <span className="apollo-required-badge">Required</span>
                        </label>
                        <div className="apollo-input-wrapper">
                          <FaIdCard className="apollo-input-icon" />
                          <input
                            type="text"
                            name="licenseNumber"
                            value={registerForm.licenseNumber}
                            onChange={handleRegisterChange}
                            placeholder="Enter license number"
                            className="apollo-form-input"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="apollo-form-group">
                        <label className="apollo-form-label">Specialization</label>
                        <select
                          name="specialization"
                          value={registerForm.specialization}
                          onChange={handleRegisterChange}
                          className="apollo-form-input"
                          disabled={loading}
                        >
                          <option value="">Select specialization</option>
                          <option value="general">General Physician</option>
                          <option value="cardiologist">Cardiologist</option>
                          <option value="dermatologist">Dermatologist</option>
                          <option value="pediatrician">Pediatrician</option>
                          <option value="orthopedic">Orthopedic</option>
                        </select>
                      </div>

                      <div className="apollo-form-group">
                        <label className="apollo-form-label">Qualification</label>
                        <input
                          type="text"
                          name="qualification"
                          value={registerForm.qualification}
                          onChange={handleRegisterChange}
                          placeholder="e.g., MBBS, MD"
                          className="apollo-form-input"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* PHARMACIST-SPECIFIC FIELDS */}
                  {userType === "pharmacist" && (
                    <>
                      <div className="apollo-form-group">
                        <label className="apollo-form-label">
                          Pharmacy License <span className="apollo-required-badge">Required</span>
                        </label>
                        <div className="apollo-input-wrapper">
                          <FaIdCard className="apollo-input-icon" />
                          <input
                            type="text"
                            name="licenseNumber"
                            value={registerForm.licenseNumber}
                            onChange={handleRegisterChange}
                            placeholder="Enter pharmacy license"
                            className="apollo-form-input"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="apollo-form-group">
                        <label className="apollo-form-label">Pharmacy Name</label>
                        <input
                          type="text"
                          name="pharmacyName"
                          value={registerForm.pharmacyName}
                          onChange={handleRegisterChange}
                          placeholder="Enter pharmacy name"
                          className="apollo-form-input"
                          disabled={loading}
                        />
                      </div>

                      <div className="apollo-form-group">
                        <label className="apollo-form-label">Pharmacy Address</label>
                        <textarea
                          name="pharmacyAddress"
                          value={registerForm.pharmacyAddress}
                          onChange={handleRegisterChange}
                          placeholder="Enter pharmacy address"
                          className="apollo-form-input"
                          rows="2"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  {/* PASSWORD FIELDS */}
                  <div className="apollo-form-group">
                    <label className="apollo-form-label">Create Password</label>
                    <div className="apollo-input-wrapper">
                      <FaLock className="apollo-input-icon" />
                      <input
                        type="password"
                        name="password"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        placeholder="Minimum 6 characters"
                        minLength="6"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="apollo-form-group">
                    <label className="apollo-form-label">Confirm Password</label>
                    <div className="apollo-input-wrapper">
                      <FaLock className="apollo-input-icon" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={registerForm.confirmPassword}
                        onChange={handleRegisterChange}
                        placeholder="Re-enter password"
                        minLength="6"
                        className="apollo-form-input"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button className="apollo-submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>

                  <div className="apollo-form-footer">
                    <p className="apollo-footer-text">
                      Already have an account? <span className="apollo-link-text" onClick={() => setCurrentView("login")}>Login here</span>
                    </p>
                  </div>
                </form>
              )}

              {/* OTP VERIFICATION FOR REGISTRATION */}
              {currentView === "register" && otpSent && (
                <form className="apollo-auth-form" onSubmit={handleVerifyRegisterOTP}>
                  <div className="apollo-otp-info">
                    <p>OTP sent to {tempEmail}</p>
                    <p className="apollo-phone-display">Phone: {tempPhone}</p>
                  </div>

                  <div className="apollo-form-group">
                    <label className="apollo-form-label">Enter OTP</label>
                    <div className="apollo-input-wrapper">
                      <FaKey className="apollo-input-icon" />
                      <input
                        type="text"
                        value={otpValue}
                        onChange={handleOtpChange}
                        placeholder="Enter 6-digit OTP"
                        pattern="[0-9]{6}"
                        maxLength="6"
                        className="apollo-form-input apollo-otp-input"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button className="apollo-submit-btn" type="submit" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Verify & Create Account'}
                  </button>

                  <div className="apollo-form-footer">
                    <p className="apollo-footer-text">
                      Didn't receive OTP? <span className="apollo-link-text" onClick={() => {
                        setOtpSent(false)
                        setOtpValue("")
                      }}>Resend</span>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuthSystem