'use client';

import React, { useState, useEffect } from 'react';
import { FaHeartbeat, FaArrowLeft, FaUserMd, FaStar, FaStarHalfAlt, FaCalendar } from 'react-icons/fa';
import api from '../../services/api';
import './BookAppointment.css';

const BookAppointment = () => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); 
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    preferred_date: '',
    symptoms: ''
  });

  const timeSlots = [
    { time: '09:00', display: '09:00 AM' },
    { time: '10:00', display: '10:00 AM' },
    { time: '11:00', display: '11:00 AM' },
    { time: '14:00', display: '02:00 PM' },
    { time: '15:00', display: '03:00 PM' },
    { time: '16:00', display: '04:00 PM' }
  ];

  // FIXED: Load user and only fetch appointments if logged in
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, preferred_date: today }));
    
    // Load doctors (public - no auth needed)
    loadDoctors();
    
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('[BookAppointment] Loaded user:', user);
        setCurrentUser(user);
        
        // Auto-fill form with user data if patient
        if (user.user_type === 'patient') {
          setFormData(prev => ({
            ...prev,
            patient_name: `${user.first_name} ${user.last_name}`.trim() || '',
            patient_phone: user.phone_number || user.username || ''
          }));
        }
        
        // Only load appointments if user is logged in
        if (user && user.id) {
          loadAppointments(user);
        }
      } catch (error) {
        console.error('[BookAppointment] Error parsing user:', error);
        setCurrentUser(null);
      }
    } else {
      console.log('[BookAppointment] No user logged in');
      setCurrentUser(null);
    }
  }, []);

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      console.log('[BookAppointment] Loading doctors from API');
      
      const data = await api.doctorsAPI.getAllDoctors();
      console.log('[BookAppointment] Fetched doctors:', data);
      
      if (Array.isArray(data)) {
        setDoctors(data);
      } else if (data && data.results) {
        setDoctors(data.results);
      } else {
        console.warn('[BookAppointment] Unexpected doctors response format:', data);
        setDoctors([]);
      }
    } catch (error) {
      console.error('[BookAppointment] Error loading doctors:', error);
      setDoctors([
        {
          id: 1,
          user: { id: 1, first_name: 'Rajesh', last_name: 'Sharma' },
          specialization: 'General Physician',
          experience_years: 15,
          average_rating: 4.8,
          consultation_fee: 500,
        },
        {
          id: 2,
          user: { id: 2, first_name: 'Priya', last_name: 'Verma' },
          specialization: 'Pediatrician',
          experience_years: 10,
          average_rating: 5.0,
          consultation_fee: 600,
        },
        {
          id: 3,
          user: { id: 3, first_name: 'Amit', last_name: 'Kumar' },
          specialization: 'Cardiologist',
          experience_years: 20,
          average_rating: 4.9,
          consultation_fee: 800,
        }
      ]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // FIXED: Load appointments based on user type
  const loadAppointments = async (user) => {
    try {
      console.log('[BookAppointment] Loading appointments for user:', user);
      
      let data;
      if (user.user_type === 'patient') {
        // Load patient's own appointments
        data = await api.appointmentsAPI.getPatientAppointments(user.id);
        console.log('[BookAppointment] Fetched patient appointments:', data);
      } else if (user.user_type === 'doctor') {
        // Load doctor's appointments
        data = await api.appointmentsAPI.getDoctorAppointments(user.id);
        console.log('[BookAppointment] Fetched doctor appointments:', data);
      } else {
        // For other user types, don't load appointments
        console.log('[BookAppointment] User type not patient/doctor, skipping appointments');
        setAppointments([]);
        return;
      }
      
      if (Array.isArray(data)) {
        setAppointments(data);
      } else if (data && data.results) {
        setAppointments(data.results);
      } else {
        console.warn('[BookAppointment] Unexpected appointments response format:', data);
        setAppointments([]);
      }
    } catch (error) {
      console.error('[BookAppointment] Error loading appointments:', error.message);
      setAppointments([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      alert('Please select a doctor');
      return;
    }

    if (!selectedTimeSlot) {
      alert('Please select a time slot');
      return;
    }

    const appointmentData = {
      ...formData,
      doctor: selectedDoctor,
      preferred_time: selectedTimeSlot,
      status: 'pending'
    };

    try {
      await api.appointmentsAPI.createAppointment(appointmentData);
      alert('Appointment booked successfully! We will confirm your appointment soon.');
      setFormData({
        patient_name: currentUser?.user_type === 'patient' 
          ? `${currentUser.first_name} ${currentUser.last_name}`.trim() 
          : '',
        patient_phone: currentUser?.phone_number || currentUser?.username || '',
        preferred_date: new Date().toISOString().split('T')[0],
        symptoms: ''
      });
      setSelectedDoctor(null);
      setSelectedTimeSlot(null);
      
      // Reload appointments if user is logged in
      if (currentUser) {
        loadAppointments(currentUser);
      }
    } catch (error) {
      alert('Error booking appointment: ' + error.message);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    // Convert rating to number and ensure it's valid
    const numRating = Number(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} />);
    }

    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" />);
    }

    return stars;
  };

  return (
    <div className="apollo-appointment-page">
      <header className="apollo-appointment-header">
        <div className="apollo-wrapper">
          <div className="apollo-appointment-nav">
            <div className="apollo-brand" onClick={() => window.location.href = '/'}>
              <div className="apollo-brand-icon">
                <FaHeartbeat />
              </div>
              <span className="apollo-brand-name">Rural HealthCare</span>
            </div>
            <button className="apollo-back-btn" onClick={() => window.location.href = '/'}>
              <FaArrowLeft /> Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="apollo-appointment-main">
        <div className="apollo-wrapper">
          <div className="apollo-appointment-title">
            <h1>Book an Appointment</h1>
            <p>Schedule a consultation with our expert doctors</p>
          </div>

          <div className="apollo-appointment-grid">
            <div className="apollo-booking-card">
              <h3>Appointment Details</h3>
              <form onSubmit={handleSubmit} className="apollo-booking-form">
                <div className="apollo-form-field">
                  <label>Patient Name *</label>
                  <input 
                    type="text" 
                    value={formData.patient_name}
                    onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                    required 
                    placeholder="Enter your full name"
                    className="apollo-input"
                  />
                </div>

                <div className="apollo-form-field">
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    value={formData.patient_phone}
                    onChange={(e) => setFormData({...formData, patient_phone: e.target.value})}
                    required 
                    placeholder="Enter your phone number"
                    className="apollo-input"
                  />
                </div>

                <div className="apollo-form-field">
                  <label>Select Doctor *</label>
                  <div className="apollo-doctors-list">
                    {loadingDoctors ? (
                      <p style={{ textAlign: 'center', color: '#666' }}>Loading doctors...</p>
                    ) : doctors.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#666' }}>No doctors available</p>
                    ) : (
                      doctors.map((doctor) => {
                        const doctorName = doctor.user ? 
                          `Dr. ${doctor.user.first_name} ${doctor.user.last_name}` : 
                          doctor.name || 'Unknown Doctor';
                        const specialty = doctor.specialization || doctor.specialty || 'Specialist';
                        const experience = doctor.experience_years || 0;
                        // FIX: Convert rating to number with fallback to 0
                        const rating = Number(doctor.average_rating || doctor.rating || 0);
                        
                        return (
                          <div 
                            key={doctor.id}
                            className={`apollo-doctor-card ${selectedDoctor === doctor.id ? 'apollo-doctor-selected' : ''}`}
                            onClick={() => setSelectedDoctor(doctor.id)}
                          >
                            <div className="apollo-doctor-avatar">
                              <FaUserMd />
                            </div>
                            <div className="apollo-doctor-details">
                              <h4>{doctorName}</h4>
                              <p>{specialty} - {experience} years exp.</p>
                              <div className="apollo-doctor-rating">
                                {renderStars(rating)}
                                <span>{rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="apollo-form-field">
                  <label>Select Date *</label>
                  <input 
                    type="date" 
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({...formData, preferred_date: e.target.value})}
                    required 
                    min={new Date().toISOString().split('T')[0]}
                    className="apollo-input"
                  />
                </div>

                <div className="apollo-form-field">
                  <label>Select Time Slot *</label>
                  <div className="apollo-time-slots">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.time}
                        className={`apollo-time-slot ${selectedTimeSlot === slot.time ? 'apollo-slot-selected' : ''}`}
                        onClick={() => setSelectedTimeSlot(slot.time)}
                      >
                        {slot.display}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="apollo-form-field">
                  <label>Symptoms / Reason for Visit *</label>
                  <textarea 
                    value={formData.symptoms}
                    onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                    required 
                    placeholder="Describe your symptoms or reason for consultation"
                    className="apollo-textarea"
                  />
                </div>

                <button type="submit" className="apollo-submit-btn">
                  <FaCalendar /> Book Appointment
                </button>
              </form>
            </div>

            <div className="apollo-appointments-card">
              <h3>Your Appointments</h3>
              <div className="apollo-appointments-container">
                {!currentUser ? (
                  <div className="apollo-empty-state">
                    <p>Please log in to view your appointments</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="apollo-empty-state">
                    <p>No appointments yet. Book your first consultation!</p>
                  </div>
                ) : (
                  appointments.map((apt) => {
                    // FIX: Safely access nested doctor data
                    const doctorFirstName = apt.doctor?.user?.first_name || apt.doctor_details?.user?.first_name || 'Unknown';
                    const doctorLastName = apt.doctor?.user?.last_name || apt.doctor_details?.user?.last_name || 'Doctor';
                    
                    return (
                      <div key={apt.id} className="apollo-appointment-box">
                        <div className="apollo-appointment-header">
                          <div className="apollo-appointment-date">
                            <FaCalendar /> {apt.preferred_date} at {apt.preferred_time}
                          </div>
                          <span className={`apollo-status-badge apollo-status-${apt.status}`}>
                            {apt.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="apollo-appointment-info">
                          <p><strong>Patient:</strong> {apt.patient_name}</p>
                          <p><strong>Doctor:</strong> Dr. {doctorFirstName} {doctorLastName}</p>
                          <p><strong>Phone:</strong> {apt.patient_phone}</p>
                          <p><strong>Symptoms:</strong> {apt.symptoms}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookAppointment;