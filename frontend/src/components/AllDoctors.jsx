import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaStar,
  FaUserMd,
  FaGraduationCap,
  FaBriefcase,
  FaMoneyBillWave,
  FaSearch,
  FaFilter,
  FaArrowLeft,
} from 'react-icons/fa';
import { doctorsAPI } from '../services/api';
import './AllDoctors.css';

const AllDoctors = () => {
  const navigate = useNavigate();
  
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');
  const [sortBy, setSortBy] = useState('rating'); // rating, experience, fee
  
  // Specializations for filter
  const specializations = [
    { value: 'all', label: 'All Specializations' },
    { value: 'general', label: 'General Physician' },
    { value: 'cardiologist', label: 'Cardiologist' },
    { value: 'dermatologist', label: 'Dermatologist' },
    { value: 'pediatrician', label: 'Pediatrician' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'gynecologist', label: 'Gynecologist' },
    { value: 'psychiatrist', label: 'Psychiatrist' },
    { value: 'neurologist', label: 'Neurologist' },
  ];

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    filterAndSortDoctors();
  }, [doctors, searchTerm, selectedSpecialization, sortBy]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      console.log('[AllDoctors] Loading all doctors...');
      
      const response = await doctorsAPI.getAllDoctors();
      console.log('[AllDoctors] Response:', response);
      
      let doctorsList = [];
      if (Array.isArray(response)) {
        doctorsList = response;
      } else if (response && Array.isArray(response.results)) {
        doctorsList = response.results;
      }
      
      console.log('[AllDoctors] Loaded doctors:', doctorsList.length);
      setDoctors(doctorsList);
      setError(null);
    } catch (err) {
      console.error('[AllDoctors] Error loading doctors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDoctors = () => {
    let filtered = [...doctors];
    
    // Filter by search term (name)
    if (searchTerm) {
      filtered = filtered.filter(doctor => {
        const fullName = `${doctor.user?.first_name || ''} ${doctor.user?.last_name || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }
    
    // Filter by specialization
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(doctor => doctor.specialization === selectedSpecialization);
    }
    
    // Sort doctors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (parseFloat(b.average_rating || 0) - parseFloat(a.average_rating || 0));
        case 'experience':
          return (b.experience_years || 0) - (a.experience_years || 0);
        case 'fee':
          return (parseFloat(a.consultation_fee || 0) - parseFloat(b.consultation_fee || 0));
        default:
          return 0;
      }
    });
    
    setFilteredDoctors(filtered);
  };

  const renderStars = (rating) => {
    const numericRating = parseFloat(rating || 0);
    const stars = [];
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

  const handleDoctorClick = (doctor) => {
    console.log('[AllDoctors] Doctor clicked:', doctor);
    navigate(`/doctor-detail/${doctor.id}`);
  };

  if (loading) {
    return (
      <div className="all-doctors-loading">
        <div className="loading-spinner"></div>
        <p>Loading doctors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-doctors-error">
        <FaUserMd size={64} />
        <h2>Error Loading Doctors</h2>
        <p>{error}</p>
        <button className="retry-btn" onClick={loadDoctors}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="all-doctors-page">
      {/* Header */}
      <div className="doctors-header">
        <div className="apollo-wrapper">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FaArrowLeft /> Back to Home
          </button>
          <h1>Our Doctors</h1>
          <p>Find the right doctor for your healthcare needs</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="apollo-wrapper">
          <div className="filters-container">
            {/* Search Bar */}
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by doctor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Specialization Filter */}
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
              >
                {specializations.map(spec => (
                  <option key={spec.value} value={spec.value}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="filter-group">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="fee">Lowest Fee</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="results-info">
            <p>
              Showing <strong>{filteredDoctors.length}</strong> of <strong>{doctors.length}</strong> doctors
            </p>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="doctors-content">
        <div className="apollo-wrapper">
          {filteredDoctors.length === 0 ? (
            <div className="no-results">
              <FaUserMd size={64} />
              <h3>No doctors found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="doctors-grid">
              {filteredDoctors.map((doctor, index) => (
                <div
                  key={doctor.id}
                  className="doctor-card"
                  onClick={() => handleDoctorClick(doctor)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Doctor Image */}
                  <div className="doctor-image-container">
                    {doctor.user?.profile_picture_url ? (
                      <img
                        src={doctor.user.profile_picture_url}
                        alt={`Dr. ${doctor.user.first_name} ${doctor.user.last_name}`}
                        className="doctor-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="doctor-image-placeholder" 
                      style={{ display: doctor.user?.profile_picture_url ? 'none' : 'flex' }}
                    >
                      <FaUserMd />
                    </div>

                    {/* Availability Badge */}
                    {doctor.is_available && (
                      <div className="availability-badge">Available</div>
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="doctor-info">
                    <h3>Dr. {doctor.user?.first_name} {doctor.user?.last_name}</h3>
                    <p className="specialization">{doctor.specialization_display}</p>

                    {/* Rating */}
                    <div className="rating-display">
                      <div className="stars">
                        {renderStars(doctor.average_rating)}
                      </div>
                      <span className="rating-value">
                        {parseFloat(doctor.average_rating || 0).toFixed(1)}
                      </span>
                      <span className="rating-count">
                        ({doctor.total_consultations || 0} consultations)
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="doctor-stats">
                      <div className="stat">
                        <FaGraduationCap />
                        <span>{doctor.qualification}</span>
                      </div>
                      <div className="stat">
                        <FaBriefcase />
                        <span>{doctor.experience_years}+ years</span>
                      </div>
                      <div className="stat">
                        <FaMoneyBillWave />
                        <span>₹{doctor.consultation_fee}</span>
                      </div>
                    </div>

                    {/* View Profile Button */}
                    <button className="view-profile-btn">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
                          </ul>
                        </div>
                      </div>
                      <div className="apollo-copyright">
                        <p>&copy; 2025 Rural HealthCare. All rights reserved.</p>
                      </div>
                    </div>
                  </footer>
    </div>
    
  );
};

export default AllDoctors;