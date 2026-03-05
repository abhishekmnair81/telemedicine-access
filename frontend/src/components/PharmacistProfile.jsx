import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  FaPills,
  FaUser,
  FaCamera,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaTruck,
  FaArrowLeft,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaSignOutAlt,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa"
import { authAPI, pharmacistsAPI } from "../services/api"
import "./PharmacistDashboard.css"

const PharmacistProfile = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const [pharmacistProfile, setPharmacistProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileEditData, setProfileEditData] = useState({})
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // ─── Auth Check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const userData = authAPI.getCurrentUser()
    if (!userData) {
      navigate("/auth?type=pharmacist&view=login")
      return
    }
    if (userData.user_type !== "pharmacist") {
      navigate("/")
      return
    }
    setUser(userData)
    setIsCheckingAuth(false)
  }, [navigate])

  useEffect(() => {
    if (user) loadPharmacistProfile()
  }, [user])

  // ─── Load profile ──────────────────────────────────────────────────────────
  const loadPharmacistProfile = async () => {
    setProfileLoading(true)
    setProfileError("")
    try {
      const data = await pharmacistsAPI.getProfile(user.id)
      setPharmacistProfile(data)
    } catch (e) {
      setProfileError(e.message || "Failed to load profile")
    } finally {
      setProfileLoading(false)
    }
  }

  const p = pharmacistProfile || {}

  const startProfileEditing = () => {
    setProfileEditData({
      first_name:        p.first_name        || "",
      last_name:         p.last_name         || "",
      email:             p.email             || user?.email || "",
      phone_number:      p.phone_number      || "",
      gender:            p.gender            || "",
      date_of_birth:     p.date_of_birth     || "",
      city:              p.city              || "",
      state:             p.state             || "",
      pincode:           p.pincode           || "",
      address:           p.address           || "",
      pharmacy_name:      p.pharmacy_name      || "",
      pharmacy_license:   p.pharmacy_license   || "",
      pharmacy_address:   p.pharmacy_address   || "",
      pharmacy_phone:     p.pharmacy_phone     || "",
      pharmacy_email:     p.pharmacy_email     || "",
      delivery_available: p.delivery_available ?? true,
      delivery_radius_km: p.delivery_radius_km || "",
    })
    setProfileEditing(true)
    setProfileError("")
    setProfileSuccess("")
  }

  const cancelProfileEditing = () => {
    setProfileEditing(false)
    setProfileEditData({})
    setProfileError("")
  }

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target
    setProfileEditData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    setProfileError("")
    setProfileSuccess("")
    try {
      const payload = { ...profileEditData }
      if (payload.delivery_radius_km === "" || payload.delivery_radius_km === null) {
        delete payload.delivery_radius_km
      } else {
        payload.delivery_radius_km = parseInt(payload.delivery_radius_km, 10) || 0
      }

      await pharmacistsAPI.updateProfile(user.id, payload)
      await loadPharmacistProfile()
      setProfileEditing(false)
      setProfileSuccess("Profile updated successfully!")
      setTimeout(() => setProfileSuccess(""), 4000)
    } catch (e) {
      setProfileError(e.message || "Failed to save profile")
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setProfileError("Image must be smaller than 5 MB"); return }
    if (!file.type.startsWith("image/")) { setProfileError("Please select a valid image file"); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setProfileError("")
  }

  const uploadPhoto = async () => {
    if (!photoFile) return
    setUploadingPhoto(true)
    setProfileError("")
    try {
      await pharmacistsAPI.uploadProfilePicture(user.id, photoFile)
      await loadPharmacistProfile()
      setShowPhotoModal(false)
      setPhotoFile(null)
      setPhotoPreview(null)
      setProfileSuccess("Profile picture updated!")
      setTimeout(() => setProfileSuccess(""), 4000)
    } catch (e) {
      setProfileError(e.message || "Failed to upload photo")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const closePhotoModal = () => {
    setShowPhotoModal(false)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  // Handle photo click — open viewer in view mode, upload modal in edit mode
  const handlePhotoClick = () => {
    if (profileEditing) {
      setShowPhotoModal(true)
    } else if (profilePicUrl) {
      setShowImageViewer(true)
    }
  }

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0
    return "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r))
  }

  const handleLogout = () => {
    authAPI.logout()
    navigate("/auth?type=pharmacist&view=login")
  }

  const displayEmail  = p.email || user?.email || ""
  const profilePicUrl = p.profile_picture_url || p.profile_picture || null

  if (isCheckingAuth || !user) {
    return (
      <div className="pharmacist-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="pharmacist-dashboard">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="pharmacist-header">
        <div className="pharmacist-info-strip">
          <div className="pharmacist-wrapper">
            <div className="pharmacist-contact-info">
              <span><FaPhone size={14} /> Emergency: 108 / 102</span>
              <span><FaClock size={14} /> 24/7 Pharmacy Services</span>
            </div>
            <div>
              <span><FaMapMarkerAlt size={14} /> Rural HealthCare Network</span>
            </div>
          </div>
        </div>

        <div className="pharmacist-navbar-wrap">
          <div className="pharmacist-wrapper">
            <nav className="pharmacist-navigation">
              <div className="pharmacist-brand" onClick={() => navigate("/pharmacist-dashboard")} style={{ cursor: "pointer" }}>
                <div className="pharmacist-brand-icon"><FaPills size={24} /></div>
                <span className="pharmacist-brand-name">Pharmacy Portal</span>
              </div>

              <div className="pharmacist-menu-items">
                <Link to="/pharmacy-home" className="pharmacist-nav-link">Home</Link>
                <div className="pharmacist-nav-link" onClick={() => navigate("/pharmacist-dashboard")} style={{ cursor: "pointer" }}>
                  Dashboard
                </div>

                <div
                  className="pharmacist-profile-dropdown"
                  onMouseEnter={() => setShowProfileDropdown(true)}
                  onMouseLeave={() => setShowProfileDropdown(false)}
                >
                  <button className="pharmacist-profile-btn">
                    <FaPills size={16} />
                    <span>{user.first_name} {user.last_name}</span>
                    <FaChevronDown size={12} />
                  </button>
                  {showProfileDropdown && (
                    <div className="pharmacist-dropdown-menu">
                      <div className="pharmacist-dropdown-item" style={{ color: "#00b38e", fontWeight: 600 }}>
                        <FaUser /> My Profile
                      </div>
                      <div className="pharmacist-dropdown-divider"></div>
                      <div className="pharmacist-dropdown-item" onClick={handleLogout}>
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

      {/* ── Page Content ──────────────────────────────────────────────────────── */}
      <div className="pharmacist-wrapper" style={{ paddingTop: 32, paddingBottom: 48 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate("/pharmacist-dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px solid #c8eae3", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#00b38e", fontWeight: 600, fontSize: 14 }}
          >
            <FaArrowLeft size={13} /> Back to Dashboard
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#004d40", margin: 0 }}>
            <FaUser style={{ marginRight: 8, color: "#00b38e" }} />
            My Profile
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 20 }}>
          {!profileEditing ? (
            <button className="btn-primary" onClick={startProfileEditing} disabled={profileLoading}>
              <FaEdit /> Edit Profile
            </button>
          ) : (
            <>
              <button className="btn-filter" onClick={cancelProfileEditing} disabled={profileSaving}>Cancel</button>
              <button className="btn-primary" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}
        </div>

        {/* Alerts */}
        {profileSuccess && (
          <div style={{ padding: "12px 16px", background: "#d1fae5", color: "#047857", borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, border: "1px solid #6ee7b7" }}>
            <FaCheckCircle /> {profileSuccess}
          </div>
        )}
        {profileError && (
          <div style={{ padding: "12px 16px", background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, border: "1px solid #fca5a5" }}>
            <FaTimesCircle /> {profileError}
          </div>
        )}

        {profileLoading ? (
          <div className="empty-state"><div className="loading-spinner"></div><p>Loading profile…</p></div>
        ) : (
          <div className="pharmacist-section">

            {/* ── Photo Hero ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "36px 0 30px", background: "linear-gradient(135deg, #e8f8f4 0%, #f0fffe 100%)", borderRadius: 12, marginBottom: 32 }}>
              <div
                style={{
                  position: "relative",
                  cursor: profileEditing ? "pointer" : (profilePicUrl ? "zoom-in" : "default"),
                }}
                onClick={handlePhotoClick}
                title={profileEditing ? "Change profile photo" : (profilePicUrl ? "Click to view photo" : "")}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    style={{
                      width: 130, height: 130, borderRadius: "50%",
                      objectFit: "cover", border: "4px solid #00b38e",
                      boxShadow: "0 6px 20px rgba(0,179,142,0.25)",
                      transition: "opacity 0.2s",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 130, height: 130, borderRadius: "50%",
                    background: "linear-gradient(135deg,#e6f7f4,#c5f0e8)",
                    border: "4px solid #00b38e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 54, boxShadow: "0 6px 20px rgba(0,179,142,0.25)",
                  }}>🧑‍⚕️</div>
                )}

                {/* Show camera overlay only in edit mode */}
                {profileEditing && (
                  <div style={{
                    position: "absolute", bottom: 4, right: 4,
                    background: "#00b38e", color: "#fff", borderRadius: "50%",
                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}>
                    <FaCamera size={14} />
                  </div>
                )}

                {/* Show view icon hint in view mode (only if image exists) */}
                {!profileEditing && profilePicUrl && (
                  <div style={{
                    position: "absolute", bottom: 4, right: 4,
                    background: "rgba(0,77,64,0.75)", color: "#fff", borderRadius: "50%",
                    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    fontSize: 12,
                  }}>
                    👁
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#004d40", margin: "0 0 4px" }}>
                  {[p.first_name, p.last_name].filter(Boolean).join(" ") || `${user.first_name} ${user.last_name}`}
                </h2>
                <p style={{ color: "#5a7a74", fontSize: 15, margin: "0 0 2px" }}>
                  🏥 {p.pharmacy_name || "Pharmacy Name Not Set"}
                </p>
                <p style={{ color: "#5a7a74", fontSize: 13, margin: 0 }}>{displayEmail}</p>
                {p.rating && parseFloat(p.rating) > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
                    <span style={{ color: "#f59e0b", fontSize: 20, letterSpacing: 2 }}>{renderStars(p.rating)}</span>
                    <span style={{ fontWeight: 600, color: "#1a2e2b" }}>{parseFloat(p.rating).toFixed(1)} / 5.0</span>
                  </div>
                )}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: p.delivery_available ? "#e6f7f4" : "#fef2f2", color: p.delivery_available ? "#009578" : "#dc2626" }}>
                  <FaTruck size={13} />
                  {p.delivery_available
                    ? `Delivery up to ${p.delivery_radius_km || "?"} km`
                    : "No Delivery"}
                </div>
              </div>
            </div>

            {/* ── Personal Information ── */}
            <h4 style={{ fontSize: 16, fontWeight: 700, color: "#1a2e2b", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <FaUser size={15} style={{ color: "#00b38e" }} /> Personal Information
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "First Name",    field: "first_name" },
                { label: "Last Name",     field: "last_name" },
                { label: "Email",         field: "email",         type: "email",  rootValue: displayEmail },
                { label: "Phone Number",  field: "phone_number",  type: "tel" },
                { label: "Gender",        field: "gender",        type: "select",
                  options: [{ v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" }] },
                { label: "Date of Birth", field: "date_of_birth", type: "date" },
                { label: "City",          field: "city" },
                { label: "State",         field: "state" },
                { label: "Pincode",       field: "pincode" },
              ].map(({ label, field, type = "text", options, rootValue }) => {
                const displayVal = rootValue !== undefined ? rootValue : p[field]
                return (
                  <div key={field}>
                    <label style={labelStyle}>{label}</label>
                    {profileEditing ? (
                      type === "select" ? (
                        <select name={field} value={profileEditData[field] || ""} onChange={handleProfileChange} style={inputStyle}>
                          <option value="">Select…</option>
                          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      ) : (
                        <input type={type} name={field} value={profileEditData[field] || ""} onChange={handleProfileChange} style={inputStyle} />
                      )
                    ) : (
                      <div style={viewStyle(displayVal)}>
                        {displayVal || "—"}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Street Address</label>
              {profileEditing ? (
                <textarea name="address" value={profileEditData.address || ""} onChange={handleProfileChange} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              ) : (
                <div style={viewStyle(p.address)}>{p.address || "—"}</div>
              )}
            </div>

            <div style={{ height: 1, background: "#c8eae3", margin: "8px 0 28px" }} />

            {/* ── Pharmacy Information ── */}
            <h4 style={{ fontSize: 16, fontWeight: 700, color: "#1a2e2b", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <FaPills size={15} style={{ color: "#00b38e" }} /> Pharmacy Information
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Pharmacy Name",    field: "pharmacy_name" },
                { label: "License Number",   field: "pharmacy_license" },
                { label: "Pharmacy Phone",   field: "pharmacy_phone",  type: "tel" },
                { label: "Pharmacy Email",   field: "pharmacy_email",  type: "email" },
              ].map(({ label, field, type = "text" }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  {profileEditing ? (
                    <input type={type} name={field} value={profileEditData[field] || ""} onChange={handleProfileChange} style={inputStyle} />
                  ) : (
                    <div style={viewStyle(p[field])}>
                      {p[field] || "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Pharmacy Address</label>
              {profileEditing ? (
                <textarea name="pharmacy_address" value={profileEditData.pharmacy_address || ""} onChange={handleProfileChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              ) : (
                <div style={viewStyle(p.pharmacy_address)}>
                  {p.pharmacy_address || "—"}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: "#c8eae3", margin: "8px 0 28px" }} />

            {/* ── Delivery Settings ── */}
            <h4 style={{ fontSize: 16, fontWeight: 700, color: "#1a2e2b", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <FaTruck size={15} style={{ color: "#00b38e" }} /> Delivery Settings
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={labelStyle}>Delivery Available</label>
                {profileEditing ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#e6f7f4", borderRadius: 8, border: "1.5px solid #c8eae3", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="delivery_available"
                      checked={!!profileEditData.delivery_available}
                      onChange={handleProfileChange}
                      style={{ width: 18, height: 18, accentColor: "#00b38e" }}
                    />
                    <span style={{ fontSize: 14 }}>
                      {profileEditData.delivery_available ? "Available" : "Not Available"}
                    </span>
                  </label>
                ) : (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: p.delivery_available ? "#e6f7f4" : "#fef2f2", color: p.delivery_available ? "#009578" : "#dc2626" }}>
                    {p.delivery_available ? "✓ Available" : "✗ Not Available"}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Delivery Radius (km)</label>
                {profileEditing ? (
                  <input
                    type="number"
                    name="delivery_radius_km"
                    value={profileEditData.delivery_radius_km || ""}
                    onChange={handleProfileChange}
                    min={0}
                    placeholder="e.g. 10"
                    style={inputStyle}
                  />
                ) : (
                  <div style={viewStyle(p.delivery_radius_km)}>
                    {p.delivery_radius_km ? `${p.delivery_radius_km} km` : "—"}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Image Viewer Modal (View Mode only) ──────────────────────────────── */}
      {showImageViewer && profilePicUrl && (
        <div
          onClick={() => setShowImageViewer(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.82)",
            zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              maxWidth: 340,
              width: "90%",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowImageViewer(false)}
              style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(0,0,0,0.12)", border: "none",
                borderRadius: "50%", width: 30, height: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#333", fontSize: 14,
              }}
            >
              <FaTimes />
            </button>

            {/* Full image — contained, not zoomed */}
            <img
              src={profilePicUrl}
              alt="Profile"
              style={{
                width: 260,
                height: 260,
                borderRadius: 12,
                objectFit: "contain",   /* show full image, no crop */
                background: "#f0faf7",
                border: "3px solid #00b38e",
                boxShadow: "0 4px 20px rgba(0,179,142,0.2)",
              }}
            />

            {/* Name below the image */}
            <p style={{ margin: 0, fontWeight: 700, color: "#004d40", fontSize: 15 }}>
              {[p.first_name, p.last_name].filter(Boolean).join(" ") || `${user.first_name} ${user.last_name}`}
            </p>
            <p style={{ margin: 0, color: "#5a7a74", fontSize: 13 }}>
              {p.pharmacy_name || ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Photo Upload Modal (Edit Mode only) ───────────────────────────────── */}
      {showPhotoModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && closePhotoModal()}
        >
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#004d40", margin: "0 0 6px" }}>Update Profile Picture</h3>
            <p style={{ fontSize: 13, color: "#5a7a74", margin: "0 0 18px" }}>JPG, PNG, or GIF · Max 5 MB</p>
            <div
              style={{ width: "100%", height: 180, border: "2px dashed #c8eae3", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", color: "#5a7a74", gap: 8, marginBottom: 20 }}
              onClick={() => document.getElementById("profile-photo-input").click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <FaCamera size={32} />
                  <span style={{ fontSize: 14 }}>Click to choose image</span>
                </>
              )}
              <input id="profile-photo-input" type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn-filter" onClick={closePhotoModal} disabled={uploadingPhoto}>Cancel</button>
              <button className="btn-primary" onClick={uploadPhoto} disabled={!photoFile || uploadingPhoto}>
                {uploadingPhoto ? "Uploading…" : "Upload Photo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="pharmacist-footer">
        <div className="pharmacist-wrapper">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Rural HealthCare Pharmacy</h4>
              <p>Your trusted pharmacy partner for quality medicines and healthcare supplies.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/pharmacy-home">Home</Link></li>
                <li><span style={{ cursor: "pointer" }} onClick={() => navigate("/pharmacist-dashboard")}>Dashboard</span></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#contact">Contact Us</a></li>
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

// ── Shared style helpers ────────────────────────────────────────────────────
const labelStyle = {
  fontSize: 12, fontWeight: 700, color: "#5a7a74",
  textTransform: "uppercase", letterSpacing: "0.5px",
  display: "block", marginBottom: 6,
}
const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid #c8eae3", borderRadius: 8,
  fontSize: 14, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box",
}
const viewStyle = (hasValue) => ({
  padding: "9px 0", borderBottom: "1px dashed #c8eae3",
  fontSize: 15, color: hasValue ? "#1a2e2b" : "#aab8b4",
  fontStyle: hasValue ? "normal" : "italic", minHeight: 36,
})

export default PharmacistProfile