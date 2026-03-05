// Prescriptions.jsx - Corrected for Doctor Use
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaHeartbeat, FaHome, FaRobot, FaVideo, FaPrescriptionBottle,
  FaChartLine, FaPills, FaPlus, FaTimes, FaDownload, FaEye,
  FaUserMd, FaCalendarAlt, FaFileMedical, FaPrint, FaQrcode,
  FaArrowLeft
} from 'react-icons/fa';
import { prescriptionsAPI, appointmentsAPI, authAPI } from '../../services/api';
import './Prescriptions.css';

const Prescriptions = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Patient selection
  const [myPatients, setMyPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_age: '',
    patient_gender: '',
    patient_phone: '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    notes: '',
    follow_up_date: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const user = authAPI.getCurrentUser();
    
    if (!user) {
      alert('Please login to access prescriptions');
      navigate('/auth?type=doctor&view=login');
      return;
    }

    // Only doctors can create prescriptions
    if (user.user_type !== 'doctor') {
      alert('Only doctors can create prescriptions');
      navigate('/');
      return;
    }

    console.log('[Prescriptions] Logged in doctor:', user);
    setCurrentUser(user);
    
    // Load doctor's prescriptions and patients
    await loadPrescriptions(user.id);
    await loadMyPatients(user.id);
  };

  const loadPrescriptions = async (doctorId) => {
    try {
      setLoading(true);
      console.log('[Prescriptions] Loading prescriptions for doctor:', doctorId);
      
      const response = await prescriptionsAPI.getDoctorPrescriptions(doctorId);
      const prescriptionsList = Array.isArray(response) ? response : (response.results || []);
      
      console.log('[Prescriptions] Loaded prescriptions:', prescriptionsList);
      setPrescriptions(prescriptionsList);
    } catch (error) {
      console.error('[Prescriptions] Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPatients = async (doctorId) => {
    try {
      console.log('[Prescriptions] Loading patients for doctor:', doctorId);
      
      // Get all appointments for this doctor
      const response = await appointmentsAPI.getDoctorAppointments(doctorId);
      const appointments = Array.isArray(response) ? response : (response.results || []);
      
      console.log('[Prescriptions] Doctor appointments:', appointments);
      
      // Extract unique patients from appointments
      const uniquePatients = [];
      const patientPhones = new Set();
      
      appointments.forEach(apt => {
        if (apt.patient_phone && !patientPhones.has(apt.patient_phone)) {
          patientPhones.add(apt.patient_phone);
          uniquePatients.push({
            name: apt.patient_name,
            phone: apt.patient_phone,
            lastAppointment: apt.preferred_date,
            symptoms: apt.symptoms
          });
        }
      });
      
      console.log('[Prescriptions] Unique patients:', uniquePatients);
      setMyPatients(uniquePatients);
      
    } catch (error) {
      console.error('[Prescriptions] Error loading patients:', error);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPrescription(null);
    setSelectedPatient(null);
    setFormData({
      patient_name: '',
      patient_age: '',
      patient_gender: '',
      patient_phone: '',
      diagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      notes: '',
      follow_up_date: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const selectPatient = (patient) => {
    console.log('[Prescriptions] Selected patient:', patient);
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patient_name: patient.name,
      patient_phone: patient.phone
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const removeMedication = (index) => {
    if (formData.medications.length === 1) {
      alert('At least one medication is required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index, field, value) => {
    setFormData(prev => {
      const newMedications = [...prev.medications];
      newMedications[index][field] = value;
      return { ...prev, medications: newMedications };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.patient_name || !formData.patient_phone) {
      alert('Please select a patient');
      return;
    }

    if (!formData.diagnosis) {
      alert('Please enter diagnosis');
      return;
    }

    // Validate medications
    const invalidMeds = formData.medications.filter(
      med => !med.name || !med.dosage || !med.frequency || !med.duration
    );

    if (invalidMeds.length > 0) {
      alert('Please fill all required medication fields (name, dosage, frequency, duration)');
      return;
    }

    try {
      setSaving(true);
      console.log('[Prescriptions] Creating prescription...');

      // Get doctor profile for specialization
      const doctorProfile = currentUser.doctor_profile || {};
      
      const prescriptionData = {
        // Patient info
        patient_name: formData.patient_name,
        patient_age: formData.patient_age || '',
        patient_gender: formData.patient_gender || '',
        patient_phone: formData.patient_phone,
        
        // Doctor info
        doctor_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username,
        doctor_specialization: doctorProfile.specialization || 'General Physician',
        doctor_registration: doctorProfile.license_number || '',
        hospital_name: '',
        
        // Prescription details
        diagnosis: formData.diagnosis,
        medications: formData.medications,
        notes: formData.notes,
        follow_up_date: formData.follow_up_date || null,
        date: formData.date,
      };

      console.log('[Prescriptions] Prescription data:', prescriptionData);
      
      const response = await prescriptionsAPI.createPrescription(prescriptionData);
      
      console.log('[Prescriptions] ✅ Created successfully:', response);
      
      alert('Digital prescription created successfully!');
      closeModal();
      await loadPrescriptions(currentUser.id);
      
    } catch (error) {
      console.error('[Prescriptions] ❌ Error creating prescription:', error);
      alert('Error creating prescription: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const viewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
  };

  const deletePrescription = async (id) => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        await prescriptionsAPI.deletePrescription(id);
        alert('Prescription deleted successfully!');
        await loadPrescriptions(currentUser.id);
      } catch (error) {
        alert('Error deleting prescription: ' + error.message);
      }
    }
  };

  const printPrescription = () => {
    window.print();
  };

  const downloadPrescription = () => {
    alert('PDF download feature coming soon!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!currentUser) {
    return (
      <div className="apollo-main apollo-prescriptions">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Loading...</h2>
            <p>Please wait while we verify your credentials</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apollo-main apollo-prescriptions">
      <div className="apollo-sidebar">
        <div className="apollo-sidebar-header">
          <div className="apollo-brand" onClick={() => navigate('/doctor-dashboard')}>
            <div className="apollo-brand-icon">
              <FaHeartbeat />
            </div>
            <span className="apollo-brand-name">Rural HealthCare</span>
          </div>
        </div>

        <div className="apollo-nav-section">
          <div className="apollo-nav-item" onClick={() => navigate('/doctor-dashboard')}>
            <FaHome />
            <span>Dashboard</span>
          </div>
          <div className="apollo-nav-item" onClick={() => navigate('/doctor-video')}>
            <FaVideo />
            <span>Video Consultations</span>
          </div>
          <div className="apollo-nav-item active">
            <FaPrescriptionBottle />
            <span>E-Prescriptions</span>
          </div>
        </div>
      </div>

      <div className="apollo-content">
        <div className="apollo-page-header">
          <div className="apollo-header-content">
            <h1>Digital Prescriptions</h1>
            <p>Create and manage prescriptions for your patients</p>
          </div>
          <button className="apollo-primary-btn" onClick={openModal}>
            <FaPlus /> New Prescription
          </button>
        </div>

        <div className="apollo-prescriptions-container">
          {loading ? (
            <div className="apollo-loading-state">
              <p>Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="apollo-empty-state">
              <div className="apollo-empty-icon">
                <FaFileMedical />
              </div>
              <h3>No Digital Prescriptions</h3>
              <p>Create your first electronic prescription for a patient</p>
              <button className="apollo-primary-btn" onClick={openModal}>
                <FaPlus /> Create Prescription
              </button>
            </div>
          ) : (
            <div className="apollo-prescriptions-grid">
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="apollo-prescription-card">
                  <div className="apollo-card-header">
                    <div className="apollo-prescription-number">
                      Rx #{prescription.id.toString().substring(0, 8)}
                    </div>
                    <div className="apollo-card-actions">
                      <button 
                        className="apollo-btn-icon" 
                        onClick={() => viewPrescription(prescription)} 
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="apollo-btn-icon apollo-delete" 
                        onClick={() => deletePrescription(prescription.id)} 
                        title="Delete"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  <div className="apollo-card-body">
                    <div className="apollo-patient-info">
                      <h3>{prescription.patient_name}</h3>
                      <p className="apollo-patient-meta">
                        {prescription.patient_age && `${prescription.patient_age} years`}
                        {prescription.patient_gender && ` • ${prescription.patient_gender}`}
                      </p>
                      <p className="apollo-patient-meta">
                        📱 {prescription.patient_phone}
                      </p>
                    </div>

                    <div className="apollo-prescription-date">
                      <FaCalendarAlt className="apollo-date-icon" />
                      <span>{formatDate(prescription.date || prescription.created_at)}</span>
                    </div>

                    <div className="apollo-diagnosis-section">
                      <strong>Diagnosis:</strong>
                      <p>{prescription.diagnosis}</p>
                    </div>

                    <div className="apollo-medications-preview">
                      <strong>Medications ({prescription.medications?.length || 0}):</strong>
                      {prescription.medications && prescription.medications.length > 0 ? (
                        <ul>
                          {prescription.medications.slice(0, 2).map((med, idx) => (
                            <li key={idx}>
                              <span className="apollo-med-name">{med.name}</span>
                              <span className="apollo-med-dosage">{med.dosage}</span>
                            </li>
                          ))}
                          {prescription.medications.length > 2 && (
                            <li className="apollo-more-meds">+ {prescription.medications.length - 2} more medications</li>
                          )}
                        </ul>
                      ) : (
                        <p className="apollo-no-data">No medications prescribed</p>
                      )}
                    </div>
                  </div>

                  <div className="apollo-card-footer">
                    <button className="apollo-btn-view-full" onClick={() => viewPrescription(prescription)}>
                      View Full Prescription
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Prescription Modal */}
      {showModal && (
        <div className="apollo-modal-overlay apollo-active" onClick={closeModal}>
          <div className="apollo-modal-content apollo-large" onClick={e => e.stopPropagation()}>
            <div className="apollo-modal-header">
              <h2><FaFileMedical /> Create Digital Prescription</h2>
              <button className="apollo-close-btn" onClick={closeModal} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="apollo-prescription-form">
              {/* Patient Selection */}
              <div className="apollo-form-section">
                <h3 className="apollo-section-title">Select Patient</h3>
                
                {myPatients.length === 0 ? (
                  <div style={{ 
                    padding: '20px', 
                    background: '#fef3c7', 
                    borderRadius: '8px',
                    color: '#92400e',
                    marginBottom: '20px'
                  }}>
                    <p style={{ margin: 0 }}>
                      ⚠️ No patients found. Patients who have booked appointments with you will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="apollo-patients-grid">
                    {myPatients.map((patient, idx) => (
                      <div 
                        key={idx}
                        className={`apollo-patient-selector ${selectedPatient?.phone === patient.phone ? 'selected' : ''}`}
                        onClick={() => selectPatient(patient)}
                      >
                        <div className="apollo-patient-selector-header">
                          <FaUserMd />
                          <strong>{patient.name}</strong>
                        </div>
                        <div className="apollo-patient-selector-info">
                          <p>📱 {patient.phone}</p>
                          <p style={{ fontSize: '12px', color: 'var(--apollo-text-secondary)' }}>
                            Last appointment: {formatDate(patient.lastAppointment)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Patient Information */}
              {selectedPatient && (
                <>
                  <div className="apollo-form-section">
                    <h3 className="apollo-section-title">Patient Information</h3>
                    <div className="apollo-form-row">
                      <div className="apollo-form-group">
                        <label htmlFor="patient_name">Patient Name *</label>
                        <input
                          id="patient_name"
                          type="text"
                          value={formData.patient_name}
                          onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                          required
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div className="apollo-form-group">
                        <label htmlFor="patient_age">Age</label>
                        <input
                          id="patient_age"
                          type="text"
                          value={formData.patient_age}
                          onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                          placeholder="Age"
                        />
                      </div>
                      <div className="apollo-form-group">
                        <label htmlFor="patient_gender">Gender</label>
                        <select
                          id="patient_gender"
                          value={formData.patient_gender}
                          onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Details */}
                  <div className="apollo-form-section">
                    <h3 className="apollo-section-title">Clinical Details</h3>
                    <div className="apollo-form-row">
                      <div className="apollo-form-group apollo-full-width">
                        <label htmlFor="diagnosis">Diagnosis *</label>
                        <input
                          id="diagnosis"
                          type="text"
                          value={formData.diagnosis}
                          onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                          required
                          placeholder="Enter diagnosis"
                        />
                      </div>
                    </div>
                    <div className="apollo-form-row">
                      <div className="apollo-form-group">
                        <label htmlFor="date">Date *</label>
                        <input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="apollo-form-group">
                        <label htmlFor="follow_up_date">Follow-up Date</label>
                        <input
                          id="follow_up_date"
                          type="date"
                          value={formData.follow_up_date}
                          onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                          min={formData.date}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medications */}
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
                      {formData.medications.map((med, index) => (
                        <div key={index} className="apollo-medication-entry">
                          <div className="apollo-medication-header">
                            <span className="apollo-med-number">Medicine #{index + 1}</span>
                            {formData.medications.length > 1 && (
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

                  {/* Additional Information */}
                  <div className="apollo-form-section">
                    <h3 className="apollo-section-title">Additional Information</h3>
                    <div className="apollo-form-group">
                      <label>Additional Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any additional instructions or notes for the patient"
                        rows="3"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="apollo-form-actions">
                    <button type="button" className="apollo-outline-btn" onClick={closeModal} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" className="apollo-primary-btn" disabled={saving}>
                      {saving ? (
                        <>Creating...</>
                      ) : (
                        <><FaFileMedical /> Create Prescription</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {selectedPrescription && (
        <div className="apollo-modal-overlay apollo-active apollo-prescription-viewer" onClick={() => setSelectedPrescription(null)}>
          <div className="apollo-modal-content apollo-prescription-view" onClick={(e) => e.stopPropagation()}>
            <div className="apollo-prescription-document">
              <div className="apollo-document-header">
                <div className="apollo-header-left">
                  <h1 className="apollo-clinic-name">
                    {selectedPrescription.hospital_name || 'Digital Prescription'}
                  </h1>
                  <p className="apollo-header-subtitle">Electronic Medical Prescription</p>
                </div>
                <div className="apollo-header-right">
                  <div className="apollo-prescription-id">
                    Rx #{selectedPrescription.id.toString().substring(0, 8)}
                  </div>
                  <div className="apollo-qr-placeholder">
                    <FaQrcode size={60} />
                  </div>
                </div>
              </div>

              <div className="apollo-document-body">
                <div className="apollo-info-grid">
                  <div className="apollo-info-block">
                    <h4>Patient Details</h4>
                    <p><strong>Name:</strong> {selectedPrescription.patient_name}</p>
                    {selectedPrescription.patient_age && (
                      <p><strong>Age/Gender:</strong> {selectedPrescription.patient_age} years / {selectedPrescription.patient_gender}</p>
                    )}
                    <p><strong>Phone:</strong> {selectedPrescription.patient_phone}</p>
                    <p><strong>Date:</strong> {formatDate(selectedPrescription.date || selectedPrescription.created_at)}</p>
                  </div>

                  <div className="apollo-info-block">
                    <h4>Doctor Details</h4>
                    <p><strong>Name:</strong> Dr. {selectedPrescription.doctor_name}</p>
                    {selectedPrescription.doctor_specialization && (
                      <p><strong>Specialization:</strong> {selectedPrescription.doctor_specialization}</p>
                    )}
                    {selectedPrescription.doctor_registration && (
                      <p><strong>Reg. No:</strong> {selectedPrescription.doctor_registration}</p>
                    )}
                  </div>
                </div>

                <div className="apollo-diagnosis-block">
                  <h4>Diagnosis</h4>
                  <p>{selectedPrescription.diagnosis}</p>
                </div>

                <div className="apollo-medications-block">
                  <h4>℞ Prescription</h4>
                  {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                    <table className="apollo-medications-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Medicine Name</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.medications.map((med, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="apollo-med-name-cell">{med.name}</td>
                            <td>{med.dosage}</td>
                            <td>{med.frequency}</td>
                            <td>{med.duration}</td>
                            <td>{med.instructions || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No medications prescribed</p>
                  )}
                </div>

                {selectedPrescription.notes && (
                  <div className="apollo-notes-block">
                    <h4>Additional Notes</h4>
                    <p>{selectedPrescription.notes}</p>
                  </div>
                )}

                {selectedPrescription.follow_up_date && (
                  <div className="apollo-followup-block">
                    <strong>Follow-up Date:</strong> {formatDate(selectedPrescription.follow_up_date)}
                  </div>
                )}
              </div>

              <div className="apollo-document-footer">
                <div className="apollo-signature-section">
                  <div className="apollo-signature-line">
                    <p>Digital Signature</p>
                    <p className="apollo-doctor-sign">Dr. {selectedPrescription.doctor_name}</p>
                  </div>
                </div>
                <div className="apollo-footer-note">
                  <p>This is a digitally generated prescription and does not require a physical signature.</p>
                </div>
              </div>
            </div>

            <div className="apollo-viewer-actions">
              <button className="apollo-btn-action" onClick={printPrescription}>
                <FaPrint /> Print
              </button>
              <button className="apollo-btn-action" onClick={downloadPrescription}>
                <FaDownload /> Download PDF
              </button>
              <button className="apollo-btn-action apollo-close" onClick={() => setSelectedPrescription(null)}>
                <FaTimes /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;