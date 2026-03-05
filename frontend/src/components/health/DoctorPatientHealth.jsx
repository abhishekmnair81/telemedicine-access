import React, { useState, useEffect } from 'react';
import {
  FaHeartbeat, FaHome, FaRobot, FaVideo, FaPrescriptionBottle,
  FaChartLine, FaUser, FaSearch, FaTint, FaWeight, FaThermometerHalf,
  FaFlask, FaWind, FaCalendarAlt, FaBell, FaFileDownload, FaPrint,
  FaArrowLeft, FaExclamationTriangle, FaClock, FaStickyNote, FaFileMedical,
  FaBullseye
} from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { healthTrackingAPI, appointmentsAPI, authAPI } from '../../services/api';
import './DoctorPatientHealth.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DoctorPatientHealth = () => {
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  
  // Patient health data
  const [dashboardData, setDashboardData] = useState(null);
  const [latestMetrics, setLatestMetrics] = useState({});
  const [activeGoals, setActiveGoals] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [medicationReminders, setMedicationReminders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  // Trends data
  const [selectedMetricType, setSelectedMetricType] = useState('heart_rate');
  const [trendPeriod, setTrendPeriod] = useState(30);
  const [trendsData, setTrendsData] = useState(null);
  
  // View mode
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

  // Metric configurations
  const metricTypes = [
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: <FaTint />, color: '#3498db' },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: <FaHeartbeat />, color: '#e74c3c' },
    { value: 'weight', label: 'Weight', unit: 'kg', icon: <FaWeight />, color: '#f39c12' },
    { value: 'temperature', label: 'Temperature', unit: '°F', icon: <FaThermometerHalf />, color: '#9b59b6' },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: <FaFlask />, color: '#e67e22' },
    { value: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', icon: <FaWind />, color: '#1abc9c' }
  ];

  useEffect(() => {
    loadDoctorAndPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientHealth();
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient && selectedMetricType) {
      loadTrends();
    }
  }, [selectedPatient, selectedMetricType, trendPeriod]);

  const loadDoctorAndPatients = async () => {
    try {
      const doctor = authAPI.getCurrentUser();
      console.log('[DoctorPatientHealth] Current doctor:', doctor);
      
      if (!doctor) {
        window.location.href = '/auth?type=doctor&view=login';
        return;
      }
      
      if (doctor.user_type !== 'doctor') {
        alert('This page is only accessible to doctors');
        window.location.href = '/';
        return;
      }
      
      setCurrentDoctor(doctor);
      
      // Load this doctor's patients from appointments
      await loadDoctorPatients(doctor.id);
      
    } catch (error) {
      console.error('[DoctorPatientHealth] Error loading doctor:', error);
      window.location.href = '/auth?type=doctor&view=login';
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorPatients = async (doctorId) => {
    try {
      console.log('[DoctorPatientHealth] Loading patients for doctor:', doctorId);
      
      // Get doctor's appointments to find their patients
      const appointments = await appointmentsAPI.getDoctorAppointments(doctorId);
      console.log('[DoctorPatientHealth] Doctor appointments:', appointments);
      
      // Extract unique patients from appointments
      const patientsMap = new Map();
      
      if (Array.isArray(appointments)) {
        appointments.forEach(appointment => {
          // Create unique patient key from phone number
          const patientKey = appointment.patient_phone;
          
          if (!patientsMap.has(patientKey)) {
            patientsMap.set(patientKey, {
              id: appointment.patient || `temp_${patientKey}`, // Use patient ID if available, otherwise temp ID
              name: appointment.patient_name,
              phone: appointment.patient_phone,
              age: calculateAge(appointment), // You can enhance this
              gender: 'Not specified', // You can add this to appointment model
              lastVisit: appointment.preferred_date,
              lastVisitId: appointment.id,
              conditions: parseConditions(appointment.symptoms), // Parse from symptoms
              alertLevel: 'normal', // Will be updated from health data
              totalAppointments: 1,
              appointments: [appointment]
            });
          } else {
            // Update existing patient
            const patient = patientsMap.get(patientKey);
            patient.totalAppointments += 1;
            patient.appointments.push(appointment);
            
            // Update last visit if this appointment is more recent
            if (new Date(appointment.preferred_date) > new Date(patient.lastVisit)) {
              patient.lastVisit = appointment.preferred_date;
              patient.lastVisitId = appointment.id;
            }
          }
        });
      }
      
      const patients = Array.from(patientsMap.values());
      console.log('[DoctorPatientHealth] Unique patients found:', patients.length);
      
      // Load health data for each patient to determine alert levels
      for (const patient of patients) {
        try {
          // Only load health data if we have a valid patient ID
          if (patient.id && !patient.id.toString().startsWith('temp_')) {
            const healthData = await healthTrackingAPI.getDashboard(patient.id);
            if (healthData.success && healthData.dashboard) {
              patient.alertLevel = determineAlertLevel(healthData.dashboard);
              patient.hasHealthData = true;
            }
          }
        } catch (error) {
          console.warn(`[DoctorPatientHealth] Could not load health data for ${patient.name}:`, error);
          patient.hasHealthData = false;
        }
      }
      
      setPatientsList(patients);
      console.log('[DoctorPatientHealth] Patients loaded:', patients);
      
    } catch (error) {
      console.error('[DoctorPatientHealth] Error loading patients:', error);
      setPatientsList([]);
    }
  };

  const calculateAge = (appointment) => {
    // Try to extract age from appointment data or patient data
    // This is a placeholder - you should enhance based on your data model
    return 'N/A';
  };

  const parseConditions = (symptoms) => {
    // Parse symptoms string into conditions array
    if (!symptoms) return [];
    
    // Simple parsing - you can enhance this
    const conditions = symptoms.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return conditions.length > 0 ? conditions.slice(0, 3) : ['General consultation'];
  };

  const determineAlertLevel = (dashboard) => {
    // Determine alert level based on health metrics
    if (!dashboard || !dashboard.alerts) return 'normal';
    
    const alerts = dashboard.alerts || [];
    const criticalAlerts = alerts.filter(a => a.alert_level === 'critical');
    const warningAlerts = alerts.filter(a => a.alert_level === 'warning');
    
    if (criticalAlerts.length > 0) return 'critical';
    if (warningAlerts.length > 0) return 'warning';
    return 'normal';
  };

  const loadPatientHealth = async () => {
    try {
      setLoading(true);
      console.log('[DoctorPatientHealth] Loading health data for patient:', selectedPatient);
      
      // Check if patient has a valid ID
      if (!selectedPatient.id || selectedPatient.id.toString().startsWith('temp_')) {
        console.warn('[DoctorPatientHealth] Patient does not have health tracking data yet');
        setDashboardData({
          latest_metrics: [],
          active_goals: [],
          recent_activities: [],
          medication_reminders: [],
          alerts: []
        });
        setLoading(false);
        return;
      }
      
      const data = await healthTrackingAPI.getDashboard(selectedPatient.id);
      console.log('[DoctorPatientHealth] Dashboard response:', data);
      
      if (data.success && data.dashboard) {
        setDashboardData(data.dashboard);
        
        // Process latest metrics
        const metricsMap = {};
        data.dashboard.latest_metrics?.forEach(metric => {
          metricsMap[metric.metric_type] = metric;
        });
        setLatestMetrics(metricsMap);
        
        setActiveGoals(data.dashboard.active_goals || []);
        setRecentActivities(data.dashboard.recent_activities || []);
        setMedicationReminders(data.dashboard.medication_reminders || []);
        setAlerts(data.dashboard.alerts || []);
        
        console.log('[DoctorPatientHealth] Health data loaded successfully');
      } else {
        console.warn('[DoctorPatientHealth] Dashboard response missing data');
        setDashboardData({
          latest_metrics: [],
          active_goals: [],
          recent_activities: [],
          medication_reminders: [],
          alerts: []
        });
      }
    } catch (error) {
      console.error('[DoctorPatientHealth] Error loading patient health:', error);
      setDashboardData({
        latest_metrics: [],
        active_goals: [],
        recent_activities: [],
        medication_reminders: [],
        alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      // Only load trends if patient has valid ID
      if (!selectedPatient.id || selectedPatient.id.toString().startsWith('temp_')) {
        return;
      }
      
      const data = await healthTrackingAPI.getMetricTrends(
        selectedPatient.id,
        selectedMetricType,
        trendPeriod
      );
      
      if (data.success) {
        setTrendsData(data);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
  };

  const backToList = () => {
    setSelectedPatient(null);
    setViewMode('list');
    setDashboardData(null);
    setLatestMetrics({});
    setAlerts([]);
    setTrendsData(null);
  };

  const getMetricConfig = (metricType) => {
    return metricTypes.find(m => m.value === metricType) || metricTypes[0];
  };

  const formatMetricValue = (metric) => {
    if (!metric) return 'N/A';
    
    if (metric.metric_type === 'blood_pressure' && metric.systolic && metric.diastolic) {
      return `${metric.systolic}/${metric.diastolic}`;
    }
    
    return metric.value;
  };

  const getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'critical': return '#e74c3c';
      case 'warning': return '#f39c12';
      default: return '#27ae60';
    }
  };

  const getAlertBadgeColor = (alertLevel) => {
    switch (alertLevel) {
      case 'critical': return '#e74c3c';
      case 'warning': return '#f39c12';
      default: return '#27ae60';
    }
  };

  const getTrendChartData = () => {
    if (!trendsData || !trendsData.data_points) {
      return { labels: [], datasets: [] };
    }

    const config = getMetricConfig(selectedMetricType);
    
    return {
      labels: trendsData.data_points.map(point => point.date),
      datasets: [
        {
          label: config.label,
          data: trendsData.data_points.map(point => parseFloat(point.value) || 0),
          borderColor: config.color,
          backgroundColor: `${config.color}33`,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: '#f0f0f0'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const filteredPatients = patientsList.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality - would generate PDF report');
  };

  if (loading && !currentDoctor) {
    return (
      <div className="doctor-patient-health">
        <div className="dph-loading-screen">
          <FaHeartbeat className="dph-loading-icon" />
          <p>Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-patient-health">
      {/* Sidebar */}
      <div className="dph-sidebar">
        <div className="dph-sidebar-header">
          <div className="dph-logo" onClick={() => window.location.href = '/doctor-dashboard'}>
            <div className="dph-logo-icon">
              <FaHeartbeat />
            </div>
            <span className="dph-logo-text">Rural HealthCare</span>
          </div>
        </div>

        <div className="dph-nav-section">
          <div className="dph-nav-item" onClick={() => window.location.href = '/doctor-dashboard'}>
            <FaHome />
            <span>Dashboard</span>
          </div>
          <div className="dph-nav-item dph-active">
            <FaChartLine />
            <span>Patient Health</span>
          </div>
          
          <div className="dph-nav-item" onClick={() => window.location.href = '/teleconsult'}>
            <FaVideo />
            <span>Video Consult</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dph-main">
        {viewMode === 'list' ? (
          <>
            <div className="dph-header">
              <div>
                <h1>My Patients</h1>
                <p>Monitor health metrics for your patients</p>
              </div>
              <div className="dph-doctor-info">
                <div className="dph-doctor-avatar">
                  <FaUser />
                </div>
                <div className="dph-doctor-details">
                  <strong>Dr. {currentDoctor?.first_name} {currentDoctor?.last_name}</strong>
                  <span>Physician</span>
                </div>
              </div>
            </div>
            
            <div className="dph-search-section">
              <div className="dph-search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search patients by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="dph-stats">
                <div className="dph-stat-card">
                  <span className="dph-stat-value">{patientsList.length}</span>
                  <span className="dph-stat-label">My Patients</span>
                </div>
                <div className="dph-stat-card critical">
                  <span className="dph-stat-value">
                    {patientsList.filter(p => p.alertLevel === 'critical').length}
                  </span>
                  <span className="dph-stat-label">Critical Alerts</span>
                </div>
                <div className="dph-stat-card warning">
                  <span className="dph-stat-value">
                    {patientsList.filter(p => p.alertLevel === 'warning').length}
                  </span>
                  <span className="dph-stat-label">Warnings</span>
                </div>
              </div>
            </div>

            {/* Patients Grid */}
            <div className="dph-patients-grid">
              {filteredPatients.length === 0 ? (
                <div className="dph-empty-state">
                  <FaUser />
                  <h3>No Patients Found</h3>
                  <p>{patientsList.length === 0 ? 'You have no patients yet. Patients will appear here after appointments.' : 'No patients match your search criteria'}</p>
                </div>
              ) : (
                filteredPatients.map((patient, index) => (
                  <div
                    key={patient.id || index}
                    className="dph-patient-card"
                    onClick={() => selectPatient(patient)}
                  >
                    <div className="dph-patient-header">
                      <div className="dph-patient-avatar">
                        <FaUser />
                      </div>
                      <div className="dph-patient-info">
                        <h3>{patient.name}</h3>
                        <span>{patient.phone}</span>
                      </div>
                      {patient.alertLevel !== 'normal' && (
                        <div 
                          className="dph-alert-badge"
                          style={{ background: getAlertBadgeColor(patient.alertLevel) }}
                        >
                          <FaBell />
                        </div>
                      )}
                    </div>
                    
                    <div className="dph-patient-details">
                      <div className="dph-detail-item">
                        <FaCalendarAlt />
                        <span>Last Visit: {patient.lastVisit}</span>
                      </div>
                      <div className="dph-detail-item">
                        <FaFileMedical />
                        <span>Appointments: {patient.totalAppointments}</span>
                      </div>
                      {patient.conditions.length > 0 && (
                        <div className="dph-detail-item">
                          <FaFileMedical />
                          <span>{patient.conditions.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <button className="dph-view-btn">
                      {patient.hasHealthData ? 'View Health Records' : 'View Patient'} <FaChartLine />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          // PATIENT DETAIL VIEW
          <>
            <div className="dph-detail-header">
              <button className="dph-back-btn" onClick={backToList}>
                <FaArrowLeft /> Back to Patients
              </button>
              
              <div className="dph-patient-title">
                <div className="dph-patient-avatar-large">
                  <FaUser />
                </div>
                <div>
                  <h1>{selectedPatient?.name}</h1>
                  <p>{selectedPatient?.phone} • {selectedPatient?.totalAppointments} appointment(s)</p>
                </div>
              </div>
              
              <div className="dph-actions">
                <button className="dph-action-btn" onClick={handlePrint}>
                  <FaPrint /> Print
                </button>
                <button className="dph-action-btn" onClick={handleExport}>
                  <FaFileDownload /> Export
                </button>
              </div>
            </div>

            {/* Conditions */}
            {selectedPatient?.conditions && selectedPatient.conditions.length > 0 && (
              <div className="dph-conditions-section">
                <h3>Noted Conditions</h3>
                <div className="dph-conditions-list">
                  {selectedPatient.conditions.map((condition, idx) => (
                    <span key={idx} className="dph-condition-badge">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if no health data */}
            {!selectedPatient?.hasHealthData ? (
              <div className="dph-section">
                <div className="dph-empty-state">
                  <FaChartLine />
                  <h3>No Health Tracking Data</h3>
                  <p>This patient hasn't started using the health tracking features yet.</p>
                  <p>Health metrics, goals, and activities will appear here once the patient begins tracking.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Alerts Section */}
                {alerts.length > 0 && (
                  <div className="dph-alerts-section">
                    <h3><FaBell /> Health Alerts</h3>
                    <div className="dph-alerts-grid">
                      {alerts.map((alert, index) => (
                        <div 
                          key={index}
                          className="dph-alert-card"
                          style={{ borderLeftColor: getAlertColor(alert.alert_level) }}
                        >
                          <div className="dph-alert-icon" style={{ color: getAlertColor(alert.alert_level) }}>
                            <FaExclamationTriangle />
                          </div>
                          <div className="dph-alert-content">
                            <strong>{alert.message}</strong>
                            <p>{alert.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest Metrics Grid */}
                <div className="dph-section">
                  <h2>Latest Vital Signs</h2>
                  <div className="dph-metrics-grid">
                    {metricTypes.map((metricType) => {
                      const metric = latestMetrics[metricType.value];
                      return (
                        <div 
                          key={metricType.value}
                          className="dph-metric-card"
                          style={{ 
                            '--accent-color': metricType.color,
                            '--bg-color': `${metricType.color}1A`
                          }}
                        >
                          <div className="dph-metric-icon">
                            {metricType.icon}
                          </div>
                          <div className="dph-metric-value">
                            {metric ? formatMetricValue(metric) : 'N/A'}
                          </div>
                          <div className="dph-metric-label">{metricType.label}</div>
                          {metric && (
                            <>
                              <span className={`dph-metric-change ${metric.is_abnormal ? 'negative' : 'positive'}`}>
                                {metric.is_abnormal ? `⚠ ${metric.alert_level_display}` : '✓ Normal'}
                              </span>
                              {metric.recorded_at && (
                                <span className="dph-metric-date">
                                  <FaClock /> {new Date(metric.recorded_at).toLocaleDateString()}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trends Chart */}
                <div className="dph-chart-container">
                  <div className="dph-chart-header">
                    <h2>Health Trends</h2>
                    <div className="dph-chart-controls">
                      <select 
                        value={selectedMetricType}
                        onChange={(e) => setSelectedMetricType(e.target.value)}
                        className="dph-metric-select"
                      >
                        {metricTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <div className="dph-time-filter">
                        <button 
                          className={`dph-time-btn ${trendPeriod === 7 ? 'dph-active' : ''}`}
                          onClick={() => setTrendPeriod(7)}
                        >
                          Week
                        </button>
                        <button 
                          className={`dph-time-btn ${trendPeriod === 30 ? 'dph-active' : ''}`}
                          onClick={() => setTrendPeriod(30)}
                        >
                          Month
                        </button>
                        <button 
                          className={`dph-time-btn ${trendPeriod === 90 ? 'dph-active' : ''}`}
                          onClick={() => setTrendPeriod(90)}
                        >
                          3 Months
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="dph-chart-wrapper">
                    <Line data={getTrendChartData()} options={chartOptions} />
                  </div>
                  {trendsData && (
                    <div className="dph-chart-stats">
                      <div className="dph-stat">
                        <span className="dph-stat-label">Average</span>
                        <span className="dph-stat-value">{trendsData.average}</span>
                      </div>
                      <div className="dph-stat">
                        <span className="dph-stat-label">Readings</span>
                        <span className="dph-stat-value">{trendsData.count}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Goals Section */}
                <div className="dph-section">
                  <h2>Health Goals Progress</h2>
                  <div className="dph-goals-grid">
                    {activeGoals.length === 0 ? (
                      <div className="dph-empty-state">
                        <FaBullseye />
                        <h3>No Active Goals</h3>
                        <p>Patient hasn't set any health goals yet</p>
                      </div>
                    ) : (
                      activeGoals.map((goal) => (
                        <div key={goal.id} className="dph-goal-card">
                          <div className="dph-goal-header">
                            <h3>{goal.title}</h3>
                            <span className="dph-goal-type">{goal.goal_type_display}</span>
                          </div>
                          <p className="dph-goal-desc">{goal.description}</p>
                          <div className="dph-goal-progress">
                            <div className="dph-progress-bar">
                              <div 
                                className="dph-progress-fill"
                                style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="dph-progress-text">
                              {goal.current_value} / {goal.target_value} {goal.unit}
                            </span>
                          </div>
                          <div className="dph-goal-footer">
                            <span className="dph-goal-progress-pct">
                              {Math.round(goal.progress_percentage)}% Complete
                            </span>
                            {goal.days_remaining !== null && (
                              <span className="dph-goal-days">
                                <FaClock /> {goal.days_remaining} days left
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Medication Adherence */}
                <div className="dph-section">
                  <h2>Medication Adherence</h2>
                  <div className="dph-medications-grid">
                    {medicationReminders.length === 0 ? (
                      <div className="dph-empty-state">
                        <FaPrescriptionBottle />
                        <h3>No Medications</h3>
                        <p>No active medication reminders</p>
                      </div>
                    ) : (
                      medicationReminders.map((reminder) => (
                        <div key={reminder.id} className="dph-medication-card">
                          <div className="dph-medication-header">
                            <h3>{reminder.medication_name}</h3>
                            <span className="dph-frequency-badge">
                              {reminder.frequency_display}
                            </span>
                          </div>
                          <p className="dph-medication-dosage">{reminder.dosage}</p>
                          <div className="dph-adherence-bar">
                            <div 
                              className="dph-adherence-fill"
                              style={{ width: `${reminder.adherence_rate}%` }}
                            />
                          </div>
                          <div className="dph-adherence-footer">
                            <span>Adherence Rate</span>
                            <strong>{reminder.adherence_rate}%</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            

            {/* Clinical Notes Section - Always show */}
            <div className="dph-section">
              <h2><FaStickyNote /> Clinical Notes</h2>
              <div className="dph-notes-section">
                <textarea 
                  className="dph-notes-textarea"
                  placeholder="Add clinical observations, recommendations, or notes about this patient..."
                  rows="6"
                />
                <button className="dph-save-notes-btn">
                  Save Notes
                </button>
              </div>
              
            </div>
          </>
          
        )}
        
      </div>
      
    </div>
    
  );
};

export default DoctorPatientHealth;