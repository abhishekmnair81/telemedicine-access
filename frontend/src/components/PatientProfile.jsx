import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaUser,
  FaEdit,
  FaSave,
  FaTimes,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaVenusMars,
  FaTint,
  FaWeight,
  FaRuler,
  FaHeartbeat,
  FaChevronLeft,
  FaCamera,
  FaAllergies,
  FaPills,
  FaNotesMedical,
  FaUserInjured,
  FaSearchPlus,
} from "react-icons/fa"
import "./PatientProfile.css"
import { authAPI, patientsAPI } from "../services/api"

const PatientProfile = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [patientProfile, setPatientProfile] = useState(null)
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
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    height: '',
    weight: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    medical_history: '',
  })

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  const genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      console.log('[PatientProfile] Loading profile...')
      
      const userData = authAPI.getCurrentUser()
      if (!userData) {
        console.log('[PatientProfile] No user data - redirecting')
        navigate('/auth?type=patient&view=login')
        return
      }

      if (userData.user_type !== 'patient') {
        console.log('[PatientProfile] Not a patient - redirecting')
        navigate('/')
        return
      }

      setUser(userData)

      try {
        console.log('[PatientProfile] Fetching profile for user:', userData.id)
        const profile = await patientsAPI.getPatientDetails(userData.id)
        console.log('[PatientProfile] ✅ Got profile:', profile)
        
        setPatientProfile(profile)
        
        // Set profile picture URL
        if (profile.profile_picture_url) {
          setProfilePictureUrl(profile.profile_picture_url)
        }
        
        // FIXED: Properly handle empty/null values
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          phone_number: profile.phone_number || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || 'male',
          blood_group: profile.blood_group || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
          emergency_contact_name: profile.emergency_contact_name || '',
          emergency_contact_number: profile.emergency_contact_number || '',
          height: profile.height || '',
          weight: profile.weight || '',
          allergies: profile.allergies || '',
          chronic_conditions: profile.chronic_conditions || '',
          current_medications: profile.current_medications || '',
          medical_history: profile.medical_history || '',
        })
      } catch (error) {
        console.log('[PatientProfile] Error loading profile, using basic user data:', error)
        setFormData(prev => ({
          ...prev,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone_number: userData.phone_number || '',
        }))
      }

    } catch (error) {
      console.error('[PatientProfile] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfilePictureClick = () => {
    // If editing, allow to change picture
    if (isEditing) {
      fileInputRef.current?.click()
    } else {
      // If not editing and has picture, show in modal
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
      console.log('[PatientProfile] Uploading profile picture...')

      // Upload to server
      const response = await patientsAPI.uploadProfilePicture(user.id, file)
      console.log('[PatientProfile] ✅ Profile picture uploaded:', response)

      // Update profile picture URL
      if (response.profile_picture_url) {
        setProfilePictureUrl(response.profile_picture_url)
      }

      // Update local user data
      if (response.user) {
        const updatedUser = {
          ...user,
          ...response.user
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }

      alert('Profile picture updated successfully!')
      
      // Reload profile to get updated data
      await loadProfile()

    } catch (error) {
      console.error('[PatientProfile] Error uploading:', error)
      alert('Failed to upload profile picture: ' + error.message)
    } finally {
      setUploadingImage(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('[PatientProfile] Saving profile:', formData)

      // FIXED: Send ALL fields to backend
      const profileData = {
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        email: formData.email || '',
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || 'male',
        blood_group: formData.blood_group || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_number: formData.emergency_contact_number || '',
        height: formData.height || null,
        weight: formData.weight || null,
        allergies: formData.allergies || '',
        chronic_conditions: formData.chronic_conditions || '',
        current_medications: formData.current_medications || '',
        medical_history: formData.medical_history || '',
      }

      console.log('[PatientProfile] Sending profile update:', profileData)

      const response = await patientsAPI.updatePatientProfile(user.id, profileData)
      
      console.log('[PatientProfile] ✅ Profile updated successfully:', response)

      // FIXED: Update local storage with fresh data
      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || '',
        gender: formData.gender || '',
        blood_group: formData.blood_group || '',
        city: formData.city || '',
        state: formData.state || '',
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      alert('Profile updated successfully!')
      setIsEditing(false)
      
      // CRITICAL FIX: Reload profile from server to ensure we have the latest data
      await loadProfile()

    } catch (error) {
      console.error('[PatientProfile] Error saving:', error)
      alert('Failed to update profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // FIXED: Reload profile to reset form data
    loadProfile()
  }

  const calculateAge = (dob) => {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null
    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    return bmi.toFixed(1)
  }

  const getBMICategory = (bmi) => {
    if (!bmi) return ''
    const bmiNum = parseFloat(bmi)
    if (bmiNum < 18.5) return 'Underweight'
    if (bmiNum < 25) return 'Normal'
    if (bmiNum < 30) return 'Overweight'
    return 'Obese'
  }

  // Helper function to display values properly
  const displayValue = (value) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return 'Not provided'
    }
    return value
  }

  if (loading) {
    return (
      <div className="patient-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="patient-profile">
      <header className="profile-header">
        <div className="profile-header-content">
          <button className="back-btn" onClick={() => navigate('/patient-dashboard')}>
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
                  <FaUser size={60} />
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
                  <h2>{formData.first_name} {formData.last_name}</h2>
                  <p className="user-type-text">Patient</p>
                  
                  <div className="basic-info-grid">
                    {formData.date_of_birth && (
                      <div className="info-badge">
                        <FaCalendarAlt className="badge-icon" />
                        <span>{calculateAge(formData.date_of_birth)} years</span>
                      </div>
                    )}
                    
                    {formData.gender && (
                      <div className="info-badge">
                        <FaVenusMars className="badge-icon" />
                        <span>{formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)}</span>
                      </div>
                    )}
                    
                    {formData.blood_group && (
                      <div className="info-badge">
                        <FaTint className="badge-icon" />
                        <span>{formData.blood_group}</span>
                      </div>
                    )}
                    
                    {formData.height && (
                      <div className="info-badge">
                        <FaRuler className="badge-icon" />
                        <span>{formData.height} cm</span>
                      </div>
                    )}
                    
                    {formData.weight && (
                      <div className="info-badge">
                        <FaWeight className="badge-icon" />
                        <span>{formData.weight} kg</span>
                      </div>
                    )}
                    
                    {formData.height && formData.weight && (
                      <div className="info-badge">
                        <FaHeartbeat className="badge-icon" />
                        <span>BMI: {calculateBMI(formData.weight, formData.height)} ({getBMICategory(calculateBMI(formData.weight, formData.height))})</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="edit-name-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
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
                    <p>{displayValue(formData.phone_number)}</p>
                </div>
            </div>
              <div className="info-item">
                <FaEnvelope className="info-icon" />
                <div className="info-content">
                  <label>Email Address</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.email)}</p>
                  ) : (
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      placeholder="Enter email address"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaCalendarAlt className="info-icon" />
                <div className="info-content">
                  <label>Date of Birth</label>
                  {!isEditing ? (
                    <p>
                      {formData.date_of_birth 
                        ? `${new Date(formData.date_of_birth).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })} (${calculateAge(formData.date_of_birth)} years)`
                        : 'Not provided'}
                    </p>
                  ) : (
                    <input 
                      type="date" 
                      name="date_of_birth" 
                      value={formData.date_of_birth} 
                      onChange={handleInputChange} 
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaVenusMars className="info-icon" />
                <div className="info-content">
                  <label>Gender</label>
                  {!isEditing ? (
                    <p>{formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : 'Not provided'}</p>
                  ) : (
                    <select name="gender" value={formData.gender} onChange={handleInputChange}>
                      {genders.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaTint className="info-icon" />
                <div className="info-content">
                  <label>Blood Group</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.blood_group)}</p>
                  ) : (
                    <select name="blood_group" value={formData.blood_group} onChange={handleInputChange}>
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaMapMarkerAlt className="info-icon" />
                <div className="info-content">
                  <label>Location</label>
                  {!isEditing ? (
                    <p>
                      {formData.city || formData.state 
                        ? `${formData.city}${formData.city && formData.state ? ', ' : ''}${formData.state}` 
                        : 'Not provided'}
                    </p>
                  ) : (
                    <div className="location-inputs">
                      <input 
                        type="text" 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        placeholder="City"
                      />
                      <input 
                        type="text" 
                        name="state" 
                        value={formData.state} 
                        onChange={handleInputChange} 
                        placeholder="State"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Address Information</h3>
            <div className="info-grid">
              <div className="info-item full-width">
                <FaMapMarkerAlt className="info-icon" />
                <div className="info-content">
                  <label>Complete Address</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.address)}</p>
                  ) : (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your complete address"
                      rows="3"
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaMapMarkerAlt className="info-icon" />
                <div className="info-content">
                  <label>Pincode</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.pincode)}</p>
                  ) : (
                    <input 
                      type="text" 
                      name="pincode" 
                      value={formData.pincode} 
                      onChange={handleInputChange} 
                      placeholder="Pincode"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Emergency Contact</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaUser className="info-icon" />
                <div className="info-content">
                  <label>Emergency Contact Name</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.emergency_contact_name)}</p>
                  ) : (
                    <input 
                      type="text" 
                      name="emergency_contact_name" 
                      value={formData.emergency_contact_name} 
                      onChange={handleInputChange} 
                      placeholder="Contact person name"
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaPhone className="info-icon" />
                <div className="info-content">
                  <label>Emergency Contact Number</label>
                  {!isEditing ? (
                    <p>{displayValue(formData.emergency_contact_number)}</p>
                  ) : (
                    <input 
                      type="tel" 
                      name="emergency_contact_number" 
                      value={formData.emergency_contact_number} 
                      onChange={handleInputChange} 
                      placeholder="Contact number"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Physical Measurements</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaRuler className="info-icon" />
                <div className="info-content">
                  <label>Height (cm)</label>
                  {!isEditing ? (
                    <p>{formData.height ? `${formData.height} cm` : 'Not provided'}</p>
                  ) : (
                    <input 
                      type="number" 
                      name="height" 
                      value={formData.height} 
                      onChange={handleInputChange} 
                      placeholder="Height in cm"
                      min="0"
                      step="0.1"
                    />
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaWeight className="info-icon" />
                <div className="info-content">
                  <label>Weight (kg)</label>
                  {!isEditing ? (
                    <p>{formData.weight ? `${formData.weight} kg` : 'Not provided'}</p>
                  ) : (
                    <input 
                      type="number" 
                      name="weight" 
                      value={formData.weight} 
                      onChange={handleInputChange} 
                      placeholder="Weight in kg"
                      min="0"
                      step="0.1"
                    />
                  )}
                </div>
              </div>

              {formData.height && formData.weight && (
                <div className="info-item">
                  <FaHeartbeat className="info-icon" />
                  <div className="info-content">
                    <label>BMI</label>
                    <p className="bmi-value">
                      {calculateBMI(formData.weight, formData.height)}
                      <span className="bmi-category">
                        {' (' + getBMICategory(calculateBMI(formData.weight, formData.height)) + ')'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h3>Medical Information</h3>
            
            <div className="medical-info-item">
              <div className="medical-header">
                <FaAllergies className="medical-icon" />
                <label>Allergies</label>
              </div>
              {!isEditing ? (
                <p className="medical-text">
                  {displayValue(formData.allergies) === 'Not provided' ? 'No known allergies' : formData.allergies}
                </p>
              ) : (
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="List any allergies (food, medicine, environmental, etc.)"
                  rows="3"
                />
              )}
            </div>

            <div className="medical-info-item">
              <div className="medical-header">
                <FaUserInjured className="medical-icon" />
                <label>Chronic Conditions</label>
              </div>
              {!isEditing ? (
                <p className="medical-text">
                  {displayValue(formData.chronic_conditions) === 'Not provided' ? 'No chronic conditions' : formData.chronic_conditions}
                </p>
              ) : (
                <textarea
                  name="chronic_conditions"
                  value={formData.chronic_conditions}
                  onChange={handleInputChange}
                  placeholder="List any chronic conditions (diabetes, hypertension, asthma, etc.)"
                  rows="3"
                />
              )}
            </div>

            <div className="medical-info-item">
              <div className="medical-header">
                <FaPills className="medical-icon" />
                <label>Current Medications</label>
              </div>
              {!isEditing ? (
                <p className="medical-text">
                  {displayValue(formData.current_medications) === 'Not provided' ? 'Not taking any medications' : formData.current_medications}
                </p>
              ) : (
                <textarea
                  name="current_medications"
                  value={formData.current_medications}
                  onChange={handleInputChange}
                  placeholder="List current medications with dosage"
                  rows="3"
                />
              )}
            </div>

            <div className="medical-info-item">
              <div className="medical-header">
                <FaNotesMedical className="medical-icon" />
                <label>Medical History</label>
              </div>
              {!isEditing ? (
                <p className="medical-text">
                  {displayValue(formData.medical_history) === 'Not provided' ? 'No medical history recorded' : formData.medical_history}
                </p>
              ) : (
                <textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleInputChange}
                  placeholder="Include past surgeries, hospitalizations, major illnesses, etc."
                  rows="4"
                />
              )}
            </div>
          </div>

          {patientProfile && patientProfile.statistics && (
            <div className="profile-section">
              <h3>Health Summary</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-icon"><FaHeartbeat /></div>
                  <div className="stat-info">
                    <h4>{patientProfile.statistics.total_appointments || 0}</h4>
                    <p>Total Appointments</p>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon"><FaPills /></div>
                  <div className="stat-info">
                    <h4>{patientProfile.statistics.active_prescriptions || 0}</h4>
                    <p>Active Prescriptions</p>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon"><FaNotesMedical /></div>
                  <div className="stat-info">
                    <h4>{patientProfile.statistics.total_consultations || 0}</h4>
                    <p>Consultations</p>
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
              <h3>{formData.first_name} {formData.last_name}</h3>
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

export default PatientProfile