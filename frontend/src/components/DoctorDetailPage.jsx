import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaStar,
  FaGraduationCap,
  FaBriefcase,
  FaMoneyBillWave,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaVideo,
  FaUserMd,
  FaArrowLeft,
  FaCheckCircle,
  FaAward,
  FaHeart,
  FaThumbsUp,
  FaThumbsDown,
} from 'react-icons/fa';
import { doctorsAPI, appointmentsAPI } from '../services/api';
import './DoctorDetailPage.css';

const DoctorDetailPage = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about'); // about, reviews, availability

  useEffect(() => {
    loadDoctorDetails();
  }, [doctorId]);

  const loadDoctorDetails = async () => {
    try {
      setLoading(true);
      console.log('[DoctorDetail] Loading details for doctor:', doctorId);

      // Load doctor profile
      const doctorResponse = await doctorsAPI.getDoctorById(doctorId);
      console.log('[DoctorDetail] Doctor response:', doctorResponse);
      setDoctor(doctorResponse);

      // Load ratings (use DoctorProfile ID from response)
      const profileId = doctorResponse.id;
      try {
        const ratingsResponse = await doctorsAPI.getDoctorRatings(profileId);
        console.log('[DoctorDetail] Ratings response:', ratingsResponse);
        
        if (ratingsResponse.success) {
          setRatings(ratingsResponse.ratings || []);
          setRatingSummary(ratingsResponse.summary || null);
        }
      } catch (err) {
        console.error('[DoctorDetail] Error loading ratings:', err);
      }

      setError(null);
    } catch (err) {
      console.error('[DoctorDetail] Error loading doctor:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const numericRating = parseFloat(rating || 0); // ✅ FIX: Convert to number
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="star-filled" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStar key={i} className="star-half" />);
      } else {
        stars.push(<FaStar key={i} className="star-empty" />);
      }
    }
    return stars;
  };

  const handleBookAppointment = () => {
    // Navigate to appointment booking with doctor pre-selected
    navigate('/appointments', { state: { selectedDoctor: doctor } });
  };

  const handleVideoConsult = () => {
    // Navigate to video consultation
    navigate('/teleconsult', { state: { selectedDoctor: doctor } });
  };

  if (loading) {
    return (
      <div className="doctor-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading doctor details...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="doctor-detail-error">
        <FaUserMd size={64} />
        <h2>Doctor Not Found</h2>
        <p>{error || 'Unable to load doctor details'}</p>
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="doctor-detail-page">
      <div className="detail-header">
        <div className="apollo-wrapper">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back
          </button>
        </div>
      </div>

      <section className="doctor-profile-section">
        <div className="apollo-wrapper">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-image-container">
                {doctor.user?.profile_picture_url ? (
                  <img 
                    src={doctor.user.profile_picture_url} 
                    alt={`Dr. ${doctor.user.first_name} ${doctor.user.last_name}`}
                    className="profile-image"
                  />
                ) : (
                  <div className="profile-placeholder">
                    <FaUserMd size={80} />
                  </div>
                )}
              </div>

              <div className="profile-info">
                <h1>Dr. {doctor.user?.first_name} {doctor.user?.last_name}</h1>
                <p className="specialization">{doctor.specialization_display}</p>
                
                <div className="rating-display">
                  <div className="stars-large">
                    {renderStars(doctor.average_rating || 0)}
                  </div>
                  <span className="rating-value">{parseFloat(doctor.average_rating || 0).toFixed(1)}</span>
                  <span className="rating-count">
                    ({ratingSummary?.total_ratings || 0} reviews)
                  </span>
                </div>

                <div className="profile-stats">
                  <div className="stat-item">
                    <FaGraduationCap />
                    <span>{doctor.qualification}</span>
                  </div>
                  <div className="stat-item">
                    <FaBriefcase />
                    <span>{doctor.experience_years}+ years experience</span>
                  </div>
                  <div className="stat-item">
                    <FaMoneyBillWave />
                    <span>₹{doctor.consultation_fee}</span>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="primary-action-btn" onClick={handleBookAppointment}>
                    <FaCalendarAlt /> Book Appointment
                  </button>
                  <button className="secondary-action-btn" onClick={handleVideoConsult}>
                    <FaVideo /> Video Consult
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="tabs-section">
        <div className="apollo-wrapper">
          <div className="tabs-navigation">
            <button 
              className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({ratingSummary?.total_ratings || 0})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
              onClick={() => setActiveTab('availability')}
            >
              Availability
            </button>
          </div>
        </div>
      </section>

      {/* Tab Content */}
      <section className="tab-content-section">
        <div className="apollo-wrapper">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="about-content">
              <div className="content-grid">
                <div className="main-content">
                  <div className="info-card">
                    <h3>About Dr. {doctor.user?.last_name}</h3>
                    <p>{doctor.bio || 'Experienced medical professional dedicated to providing quality healthcare.'}</p>
                  </div>

                  <div className="info-card">
                    <h3>Specialization</h3>
                    <p className="specialization-detail">{doctor.specialization_display}</p>
                  </div>

                  <div className="info-card">
                    <h3>Qualifications</h3>
                    <ul className="qualification-list">
                      {doctor.qualification?.split(',').map((qual, idx) => (
                        <li key={idx}>
                          <FaCheckCircle />
                          <span>{qual.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="info-card">
                    <h3>Experience</h3>
                    <p>{doctor.experience_years}+ years of professional medical experience</p>
                  </div>
                </div>

                <div className="sidebar-content">
                  <div className="info-card">
                    <h3>Consultation Fee</h3>
                    <div className="fee-display">
                      <FaMoneyBillWave />
                      <span className="fee-amount">₹{doctor.consultation_fee}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <h3>Total Consultations</h3>
                    <div className="consultation-count">
                      <FaAward />
                      <span>{doctor.total_consultations || 0}+</span>
                    </div>
                  </div>

                  {ratingSummary && (
                    <div className="info-card">
                      <h3>Recommendation Rate</h3>
                      <div className="recommendation-rate">
                        <FaHeart />
                        <span>{ratingSummary.recommend_percentage || 0}%</span>
                      </div>
                      <p className="rate-text">Patients recommend this doctor</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="reviews-content">
              {ratingSummary && (
                <div className="rating-overview">
                  <div className="overall-rating">
                    <div className="rating-number">{parseFloat(doctor.average_rating || 0).toFixed(1)}</div>
                    <div className="stars-display">
                      {renderStars(doctor.average_rating || 0)}
                    </div>
                    <p>{ratingSummary.total_ratings} reviews</p>
                  </div>

                  <div className="rating-distribution">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingSummary.rating_distribution?.[star] || 0;
                      const percentage = ratingSummary.total_ratings > 0 
                        ? (count / ratingSummary.total_ratings * 100).toFixed(0)
                        : 0;
                      
                      return (
                        <div key={star} className="distribution-row">
                          <span className="star-label">{star} <FaStar /></span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="count-label">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="reviews-list">
                <h3>Patient Reviews</h3>
                {ratings.length === 0 ? (
                  <div className="no-reviews">
                    <FaStar size={48} />
                    <p>No reviews yet</p>
                  </div>
                ) : (
                  ratings.map(rating => (
                    <div key={rating.id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            {rating.patient_name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <h4>{rating.patient_name || 'Anonymous'}</h4>
                            <p className="review-date">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="review-rating">
                          {renderStars(rating.rating)}
                        </div>
                      </div>

                      {rating.review && (
                        <p className="review-text">{rating.review}</p>
                      )}

                      {rating.pros && (
                        <div className="review-section pros">
                          <FaThumbsUp />
                          <div>
                            <strong>What I liked:</strong>
                            <p>{rating.pros}</p>
                          </div>
                        </div>
                      )}

                      {rating.cons && (
                        <div className="review-section cons">
                          <FaThumbsDown />
                          <div>
                            <strong>Areas for improvement:</strong>
                            <p>{rating.cons}</p>
                          </div>
                        </div>
                      )}

                      {rating.would_recommend && (
                        <div className="recommendation-badge">
                          <FaCheckCircle /> Recommends this doctor
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="availability-content">
              <div className="info-card">
                <h3>Available Days</h3>
                <div className="days-list">
                  {doctor.available_days && doctor.available_days.length > 0 ? (
                    doctor.available_days.map((day, idx) => (
                      <div key={idx} className="day-badge">{day}</div>
                    ))
                  ) : (
                    <p>Contact for availability</p>
                  )}
                </div>
              </div>

              <div className="info-card">
                <h3>Time Slots</h3>
                <div className="time-slots-list">
                  {doctor.available_time_slots && doctor.available_time_slots.length > 0 ? (
                    doctor.available_time_slots.map((slot, idx) => (
                      <div key={idx} className="time-slot-badge">
                        <FaClock /> {slot}
                      </div>
                    ))
                  ) : (
                    <p>Contact for time slots</p>
                  )}
                </div>
              </div>

              <div className="info-card">
                <h3>Book Your Appointment</h3>
                <p>Choose your preferred date and time to consult with Dr. {doctor.user?.last_name}</p>
                <button className="book-now-btn" onClick={handleBookAppointment}>
                  <FaCalendarAlt /> Book Now
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DoctorDetailPage;