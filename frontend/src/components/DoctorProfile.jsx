import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaUserMd,
  FaEdit,
  FaSave,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaBriefcase,
  FaGraduationCap,
  FaCertificate,
  FaClock,
  FaCalendarAlt,
  FaStar,
  FaAward,
  FaHeartbeat,
  FaChevronLeft,
  FaCamera,
  FaSearchPlus,
} from "react-icons/fa"
import { authAPI, doctorsAPI } from "../services/api"
import "./DoctorProfile.css"

const DoctorProfile = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profilePictureUrl, setProfilePictureUrl] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    specialization: 'general',
    qualification: '',
    experience_years: 0,
    license_number: '',
    consultation_fee: 500,
    bio: '',
    available_days: [],
    available_time_slots: [],
  })

  const specializations = [
    { value: 'general', label: 'General Physician' },
    { value: 'cardiologist', label: 'Cardiologist' },
    { value: 'dermatologist', label: 'Dermatologist' },
    { value: 'pediatrician', label: 'Pediatrician' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'gynecologist', label: 'Gynecologist' },
    { value: 'psychiatrist', label: 'Psychiatrist' },
    { value: 'neurologist', label: 'Neurologist' },
  ]

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const timeSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM',
  ]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
  try {
    setLoading(true)
    console.log('[DoctorProfile] 🔄 Loading profile...')
    
    const userData = authAPI.getCurrentUser()
    if (!userData) {
      console.log('[DoctorProfile] No user data - redirecting')
      navigate('/auth?type=doctor&view=login')
      return
    }

    if (userData.user_type !== 'doctor') {
      console.log('[DoctorProfile] Not a doctor - redirecting')
      navigate('/')
      return
    }

    console.log('[DoctorProfile] Current user from localStorage:', userData)
    setUser(userData)
    
    try {
      console.log('[DoctorProfile] 📡 Fetching profile from API for user:', userData.id)
      
      // ← CRITICAL FIX: Force fresh data with cache-busting
      const timestamp = new Date().getTime()
      const profile = await doctorsAPI.getDoctorById(userData.id)
      console.log('[DoctorProfile] ✅ Got fresh profile from API:', profile)
      
      setDoctorProfile(profile)
      
      // Update profile picture from profile data
      if (profile.user?.profile_picture_url) {
        console.log('[DoctorProfile] Setting profile picture from user:', profile.user.profile_picture_url)
        setProfilePictureUrl(profile.user.profile_picture_url)
      } else if (profile.profile_picture_url) {
        console.log('[DoctorProfile] Setting profile picture from profile:', profile.profile_picture_url)
        setProfilePictureUrl(profile.profile_picture_url)
      }

      // Initialize form with data from API response
      const newFormData = {
        first_name: profile.user?.first_name || '',
        last_name: profile.user?.last_name || '',
        email: profile.user?.email || '',
        phone_number: profile.user?.phone_number || '',
        specialization: profile.specialization || 'general',
        qualification: profile.qualification || '',
        experience_years: profile.experience_years || 0,
        license_number: profile.license_number || '',
        consultation_fee: profile.consultation_fee || 500,
        bio: profile.bio || '',
        available_days: Array.isArray(profile.available_days) ? profile.available_days : [],
        available_time_slots: Array.isArray(profile.available_time_slots) ? profile.available_time_slots : [],
      }
      
      console.log('[DoctorProfile] 📝 Setting formData:', newFormData)
      setFormData(newFormData)
      
    } catch (error) {
      console.log('[DoctorProfile] ⚠️ Error loading profile from API:', error)
      // Fallback to user data
      setFormData(prev => ({
        ...prev,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
      }))
    }

  } catch (error) {
    console.error('[DoctorProfile] ❌ Error:', error)
  } finally {
    setLoading(false)
  }
}

  const handleInputChange = (e) => {
    const { name, value } = e.target
    console.log(`[DoctorProfile] Input changed: ${name} = ${value}`)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }))
  }

  const handleTimeSlotToggle = (slot) => {
    setFormData(prev => ({
      ...prev,
      available_time_slots: prev.available_time_slots.includes(slot)
        ? prev.available_time_slots.filter(s => s !== slot)
        : [...prev.available_time_slots, slot]
    }))
  }

  const handleProfilePictureClick = () => {
    if (isEditing) {
      fileInputRef.current?.click()
    } else {
      if (profilePictureUrl) {
        setShowImageModal(true)
      }
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      console.log('[DoctorProfile] 📤 Uploading profile picture...')

      const response = await doctorsAPI.uploadProfilePicture(user.id, file)
      console.log('[DoctorProfile] ✅ Profile picture uploaded:', response)

      if (response.profile_picture_url) {
        setProfilePictureUrl(response.profile_picture_url)
      }

      if (response.user) {
        const updatedUser = {
          ...user,
          ...response.user
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }

      alert('Profile picture updated successfully!')
      await loadProfile()

    } catch (error) {
      console.error('[DoctorProfile] ❌ Error uploading:', error)
      alert('Failed to upload profile picture: ' + error.message)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('[DoctorProfile] 💾 Saving profile...')
      console.log('[DoctorProfile] Current formData:', formData)

      // Prepare complete profile data
      const profileData = {
        // User fields
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        
        // Profile fields
        specialization: formData.specialization,
        qualification: formData.qualification.trim(),
        experience_years: parseInt(formData.experience_years) || 0,
        license_number: formData.license_number.trim(),
        consultation_fee: parseFloat(formData.consultation_fee) || 500,
        bio: formData.bio.trim(),
        available_days: formData.available_days,
        available_time_slots: formData.available_time_slots,
      }

      console.log('[DoctorProfile] 📤 Sending update:', profileData)

      const response = await doctorsAPI.updateDoctorProfile(user.id, profileData)
      console.log('[DoctorProfile] ✅ Update response:', response)

      // ← CRITICAL FIX: Force reload from backend
      console.log('[DoctorProfile] 🔄 Fetching fresh data from backend...')
      const freshProfile = await doctorsAPI.getDoctorById(user.id)
      console.log('[DoctorProfile] ✅ Fresh profile loaded:', freshProfile)
      
      // Update all state with fresh data
      if (freshProfile.user) {
        const updatedUser = {
          ...user,
          first_name: freshProfile.user.first_name,
          last_name: freshProfile.user.last_name,
          email: freshProfile.user.email,
          phone_number: freshProfile.user.phone_number,
          profile_picture_url: freshProfile.user.profile_picture_url || freshProfile.profile_picture_url,
        }
        
        console.log('[DoctorProfile] 💾 Updating localStorage with fresh user:', updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        
        // Update profile picture URL
        if (freshProfile.user.profile_picture_url) {
          setProfilePictureUrl(freshProfile.user.profile_picture_url)
        } else if (freshProfile.profile_picture_url) {
          setProfilePictureUrl(freshProfile.profile_picture_url)
        }
      }
      
      // Update form with fresh data
      setFormData({
        first_name: freshProfile.user?.first_name || freshProfile.first_name || formData.first_name,
        last_name: freshProfile.user?.last_name || freshProfile.last_name || formData.last_name,
        email: freshProfile.user?.email || formData.email,
        phone_number: freshProfile.user?.phone_number || formData.phone_number,
        specialization: freshProfile.specialization || formData.specialization,
        qualification: freshProfile.qualification || formData.qualification,
        experience_years: freshProfile.experience_years || formData.experience_years,
        license_number: freshProfile.license_number || formData.license_number,
        consultation_fee: freshProfile.consultation_fee || formData.consultation_fee,
        bio: freshProfile.bio || formData.bio,
        available_days: freshProfile.available_days || formData.available_days,
        available_time_slots: freshProfile.available_time_slots || formData.available_time_slots,
      })
      
      // Update doctor profile state
      setDoctorProfile(freshProfile)
      
      console.log('[DoctorProfile] ✅ All state updated with fresh data')
      
      alert('Profile updated successfully!')
      setIsEditing(false)

    } catch (error) {
      console.error('[DoctorProfile] ❌ Error saving:', error)
      alert('Failed to update profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    console.log('[DoctorProfile] ❌ Canceling edit')
    setIsEditing(false)
    loadProfile() // Reload to reset form
  }

  const getSpecializationLabel = (value) => {
    const spec = specializations.find(s => s.value === value)
    return spec ? spec.label : value
  }

  if (loading) {
    return (
      <div className="doctor-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="doctor-profile">
      <header className="profile-header">
        <div className="profile-header-content">
          <button className="back-btn" onClick={() => navigate('/doctor-dashboard')}>
            <FaChevronLeft /> Back to Dashboard
          </button>
          <h1>My Profile</h1>
        </div>
      </header>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-photo-section">
            <div className="profile-photo-wrapper">
              <div 
                className={`profile-photo ${isEditing ? 'editable' : 'viewable'}`}
                onClick={handleProfilePictureClick}
                style={{ cursor: isEditing ? 'pointer' : (profilePictureUrl ? 'pointer' : 'default') }}
              >
                {profilePictureUrl ? (
                  <>
                    <img src={profilePictureUrl} alt="Profile" className="profile-photo-img" />
                    {!isEditing && (
                      <div className="view-overlay">
                        <FaSearchPlus size={24} />
                      </div>
                    )}
                  </>
                ) : (
                  <FaUserMd size={60} />
                )}
                {uploadingImage && (
                  <div className="upload-overlay">
                    <div className="upload-spinner"></div>
                  </div>
                )}
              </div>
              {isEditing && (
                <button 
                  className="change-photo-btn" 
                  onClick={handleProfilePictureClick}
                  disabled={uploadingImage}
                >
                  <FaCamera /> {uploadingImage ? 'Uploading...' : 'Change Photo'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-header-info">
              {!isEditing ? (
                <>
                  <h2>Dr. {formData.first_name} {formData.last_name}</h2>
                  <p className="specialization-text">
                    {getSpecializationLabel(formData.specialization)}
                  </p>
                  {doctorProfile?.rating && parseFloat(doctorProfile.rating) > 0 && (
                    <div className="rating-display " style={{ color: '#000000' }}>
                      <FaStar style={{ color: '#fbbf24' }} />
                      <span>{parseFloat(doctorProfile.rating).toFixed(1)} Rating</span>
                      <span className="separator">•</span>
                      <span>{doctorProfile.total_consultations || 0} Consultations</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="edit-name-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                <FaEdit /> Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="cancel-btn" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            )}
          </div>

          <div className="profile-section">
            <h3>Contact Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaPhone className="info-icon" />
                <div className="info-content">
                  <label>Phone Number</label>
                  <p>{formData.phone_number || 'Not provided'}</p>
                </div>
              </div>
              <div className="info-item">
                <FaEnvelope className="info-icon" />
                <div className="info-content">
                  <label>Email Address</label>
                  <p>{formData.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Professional Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaBriefcase className="info-icon" />
                <div className="info-content">
                  <label>Specialization</label>
                  {!isEditing ? (
                    <p>{getSpecializationLabel(formData.specialization)}</p>
                  ) : (
                    <select name="specialization" value={formData.specialization} onChange={handleInputChange}>
                      {specializations.map(spec => (
                        <option key={spec.value} value={spec.value}>{spec.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaGraduationCap className="info-icon" />
                <div className="info-content">
                  <label>Qualification</label>
                  {!isEditing ? (
                    <p>{formData.qualification || 'Not provided'}</p>
                  ) : (
                    <input 
                      type="text" 
                      name="qualification" 
                      value={formData.qualification} 
                      onChange={handleInputChange} 
                      placeholder="e.g., MBBS, MD" 
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaCertificate className="info-icon" />
                <div className="info-content">
                  <label>License Number</label>
                  {!isEditing ? (
                    <p>{formData.license_number || 'Not provided'}</p>
                  ) : (
                    <input 
                      type="text" 
                      name="license_number" 
                      value={formData.license_number} 
                      onChange={handleInputChange} 
                      placeholder="Medical License Number" 
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaClock className="info-icon" />
                <div className="info-content">
                  <label>Years of Experience</label>
                  {!isEditing ? (
                    <p>{formData.experience_years} years</p>
                  ) : (
                    <input 
                      type="number" 
                      name="experience_years" 
                      value={formData.experience_years} 
                      onChange={handleInputChange} 
                      min="0" 
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaAward className="info-icon" />
                <div className="info-content">
                  <label>Consultation Fee</label>
                  {!isEditing ? (
                    <p>₹{formData.consultation_fee}</p>
                  ) : (
                    <input 
                      type="number" 
                      name="consultation_fee" 
                      value={formData.consultation_fee} 
                      onChange={handleInputChange} 
                      min="0" 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>About Me</h3>
            <div className="bio-section">
              {!isEditing ? (
                <p className="bio-text">
                  {formData.bio || 'No bio provided yet. Click "Edit Profile" to add your bio.'}
                </p>
              ) : (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Write a brief bio about yourself, your experience, and your approach to patient care..."
                  rows="5"
                />
              )}
            </div>
          </div>

          <div className="profile-section">
            <h3>Availability Schedule</h3>
            
            <div className="availability-section">
              <label className="section-label">Available Days</label>
              <div className="days-grid">
                {weekDays.map(day => (
                  <button
                    key={day}
                    className={`day-btn ${formData.available_days.includes(day) ? 'selected' : ''}`}
                    onClick={() => isEditing && handleDayToggle(day)}
                    disabled={!isEditing}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="availability-section">
              <label className="section-label">Available Time Slots</label>
              <div className="slots-grid">
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    className={`slot-btn ${formData.available_time_slots.includes(slot) ? 'selected' : ''}`}
                    onClick={() => isEditing && handleTimeSlotToggle(slot)}
                    disabled={!isEditing}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {doctorProfile && (
            <div className="profile-section">
              <h3>Performance Statistics</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-icon"><FaHeartbeat /></div>
                  <div className="stat-info">
                    <h4>{doctorProfile.total_consultations || 0}</h4>
                    <p>Total Consultations</p>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon"><FaStar /></div>
                  <div className="stat-info">
                    <h4>{doctorProfile.rating ? parseFloat(doctorProfile.rating).toFixed(1) : '0.0'}</h4>
                    <p>Average Rating</p>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon"><FaCalendarAlt /></div>
                  <div className="stat-info">
                    <h4>{formData.experience_years}</h4>
                    <p>Years Experience</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal - WhatsApp Style */}
      {showImageModal && profilePictureUrl && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content">
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>
              <FaTimes size={24} />
            </button>
            <div className="image-modal-header">
              <h3>Dr. {formData.first_name} {formData.last_name}</h3>
            </div>
            <div className="image-modal-body">
              <img src={profilePictureUrl} alt="Profile" />
            </div>
          </div>
        </div>
      )}
      {/* FOOTER */}
      <footer className="apollo-bottom" id="contact">
        <div className="apollo-wrapper">
          <div className="apollo-footer-grid">
            <div className="apollo-footer-about">
              <h3>Rural HealthCare</h3>
              <p>
                Making quality healthcare accessible to everyone in rural India through technology and compassionate
                care.
              </p>
            </div>
            <div className="apollo-footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="#features">Services</a></li>
                <li><a href="/chat">AI Assistant</a></li>
              </ul>
            </div>
            <div className="apollo-footer-col">
              <h4>Services</h4>
              <ul>
                <li><a href="/chat">AI Assistant</a></li>
                <li><a href="/teleconsult">Video Consult</a></li>
                {/* {!isDoctorLoggedIn && <li><a href="/appointments">Appointments</a></li>} */}
              </ul>
            </div>
          </div>
          <div className="apollo-copyright">
            <p>&copy; 2025 Rural HealthCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default DoctorProfile