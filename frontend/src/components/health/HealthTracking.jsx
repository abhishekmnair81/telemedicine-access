import React, { useState, useEffect } from 'react';
import {
  FaHeartbeat, FaHome, FaRobot, FaVideo, FaPrescriptionBottle,
  FaChartLine, FaPills, FaTint, FaWeight, FaThermometerHalf,
  FaPlus, FaTimes, FaCalendarCheck, FaBullseye, FaRunning,
  FaBell, FaFileAlt, FaClock, FaFlask, FaWind
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
import { healthTrackingAPI, authAPI } from '../../services/api';
import './HealthTracking.css';

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

const HealthTracking = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('metric');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Dashboard data
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
  
  // Form data
  const [metricFormData, setMetricFormData] = useState({
    metric_type: '',
    value: '',
    unit: '',
    notes: '',
    recorded_at: ''
  });
  
  const [goalFormData, setGoalFormData] = useState({
    goal_type: '',
    title: '',
    description: '',
    target_value: '',
    current_value: '0',
    unit: '',
    target_date: '',
    reminder_enabled: true
  });
  
  const [activityFormData, setActivityFormData] = useState({
    activity_type: '',
    title: '',
    description: '',
    duration_minutes: '',
    calories_burned: '',
    intensity: '',
    activity_date: '',
    activity_time: ''
  });
  
  const [reminderFormData, setReminderFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'daily',
    time_slots: ['08:00'],
    start_date: '',
    end_date: '',
    notes: ''
  });

  // Metric type configurations
  const metricTypes = [
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: <FaTint />, color: '#3498db' },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: <FaHeartbeat />, color: '#e74c3c' },
    { value: 'weight', label: 'Weight', unit: 'kg', icon: <FaWeight />, color: '#f39c12' },
    { value: 'temperature', label: 'Temperature', unit: '°F', icon: <FaThermometerHalf />, color: '#9b59b6' },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', icon: <FaFlask />, color: '#e67e22' },
    { value: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', icon: <FaWind />, color: '#1abc9c' }
  ];

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadDashboard();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && selectedMetricType) {
      loadTrends();
    }
  }, [currentUser, selectedMetricType, trendPeriod]);

  const loadUserAndData = async () => {
    try {
      const user = authAPI.getCurrentUser();
      console.log('[HealthTracking] Current user from auth:', user);
      
      if (!user) {
        console.error('[HealthTracking] No user found, redirecting to login');
        window.location.href = '/auth?type=patient&view=login';
        return;
      }
      
      if (!user.id) {
        console.error('[HealthTracking] User missing ID:', user);
        alert('Invalid user session. Please log in again.');
        window.location.href = '/auth?type=patient&view=login';
        return;
      }
      
      console.log('[HealthTracking] User validated:', {
        id: user.id,
        username: user.username,
        user_type: user.user_type
      });
      
      setCurrentUser(user);
    } catch (error) {
      console.error('[HealthTracking] Error loading user:', error);
      window.location.href = '/auth?type=patient&view=login';
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      console.log('[HealthTracking] Loading dashboard for patient:', currentUser.id);
      
      const data = await healthTrackingAPI.getDashboard(currentUser.id);
      console.log('[HealthTracking] Dashboard response:', data);
      
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
        
        console.log('[HealthTracking] Dashboard loaded successfully');
      } else {
        console.warn('[HealthTracking] Dashboard response missing data:', data);
        // Set empty dashboard to avoid UI issues
        setDashboardData({
          latest_metrics: [],
          active_goals: [],
          recent_activities: [],
          medication_reminders: [],
          alerts: []
        });
      }
    } catch (error) {
      console.error('[HealthTracking] Error loading dashboard:', error);
      // Set empty dashboard instead of blocking UI
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
      const data = await healthTrackingAPI.getMetricTrends(
        currentUser.id,
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

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    
    // Set current date/time
    const now = new Date();
    const dateTimeLocal = now.toISOString().slice(0, 16);
    const dateOnly = now.toISOString().slice(0, 10);
    const timeOnly = now.toTimeString().slice(0, 5);
    
    if (type === 'metric') {
      setMetricFormData(prev => ({ ...prev, recorded_at: dateTimeLocal }));
    } else if (type === 'activity') {
      setActivityFormData(prev => ({ 
        ...prev, 
        activity_date: dateOnly,
        activity_time: timeOnly
      }));
    } else if (type === 'goal') {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      setGoalFormData(prev => ({ 
        ...prev, 
        target_date: futureDate.toISOString().slice(0, 10)
      }));
    } else if (type === 'reminder') {
      setReminderFormData(prev => ({ 
        ...prev, 
        start_date: dateOnly
      }));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setMetricFormData({
      metric_type: '',
      value: '',
      unit: '',
      notes: '',
      recorded_at: ''
    });
    setGoalFormData({
      goal_type: '',
      title: '',
      description: '',
      target_value: '',
      current_value: '0',
      unit: '',
      target_date: '',
      reminder_enabled: true
    });
    setActivityFormData({
      activity_type: '',
      title: '',
      description: '',
      duration_minutes: '',
      calories_burned: '',
      intensity: '',
      activity_date: '',
      activity_time: ''
    });
    setReminderFormData({
      medication_name: '',
      dosage: '',
      frequency: 'daily',
      time_slots: ['08:00'],
      start_date: '',
      end_date: '',
      notes: ''
    });
  };

  const handleAddMetric = async (e) => {
    e.preventDefault();
    
    try {
      console.log('='.repeat(60));
      console.log('[HealthTracking] ADDING METRIC');
      console.log('='.repeat(60));
      console.log('[HealthTracking] Current user:', currentUser);
      console.log('[HealthTracking] User ID:', currentUser?.id);
      console.log('[HealthTracking] Metric form data:', metricFormData);
      
      // Validate user
      if (!currentUser || !currentUser.id) {
        console.error('[HealthTracking] ❌ No current user or user ID');
        alert('Please log in to add health metrics');
        window.location.href = '/auth?type=patient&view=login';
        return;
      }
      
      // Prepare metric data with MULTIPLE formats for patient ID
      const metricData = {
        patient_id: currentUser.id,
        patient: currentUser.id,
        metric_type: metricFormData.metric_type,
        value: metricFormData.value,
        unit: metricFormData.unit,
        notes: metricFormData.notes || '',
        recorded_at: metricFormData.recorded_at || new Date().toISOString()
      };
      
      console.log('[HealthTracking] Sending metric data:', metricData);
      console.log('[HealthTracking] Patient ID format:', typeof metricData.patient_id);
      
      const response = await healthTrackingAPI.createMetric(metricData);
      
      console.log('[HealthTracking] ✅ Metric created successfully:', response);
      alert('Health metric added successfully!');
      
      closeModal();
      loadDashboard();
      loadTrends();
      
    } catch (error) {
      console.error('[HealthTracking] ❌ Error adding metric:', error);
      console.error('[HealthTracking] Error details:', {
        message: error.message,
        type: error.constructor.name
      });
      
      if (error.message.includes('Patient not found')) {
        alert(
          'Your account was not found in the system.\n\n' +
          'This might happen if:\n' +
          '- You are not logged in\n' +
          '- Your session has expired\n' +
          '- Your account was not created properly\n\n' +
          'Please try logging in again.'
        );
        window.location.href = '/auth?type=patient&view=login';
      } else if (error.message.includes('required')) {
        alert('Please fill in all required fields:\n- Metric Type\n- Value\n- Date & Time');
      } else {
        alert('Error adding metric: ' + error.message);
      }
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await healthTrackingAPI.createGoal({
        patient: currentUser.id,
        ...goalFormData
      });
      alert('Health goal created successfully!');
      closeModal();
      loadDashboard();
    } catch (error) {
      alert('Error creating goal: ' + error.message);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await healthTrackingAPI.createActivity({
        patient: currentUser.id,
        ...activityFormData
      });
      alert('Activity logged successfully!');
      closeModal();
      loadDashboard();
    } catch (error) {
      alert('Error logging activity: ' + error.message);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      await healthTrackingAPI.createReminder({
        patient: currentUser.id,
        ...reminderFormData
      });
      alert('Medication reminder created successfully!');
      closeModal();
      loadDashboard();
    } catch (error) {
      alert('Error creating reminder: ' + error.message);
    }
  };

  const handleLogMedication = async (reminderId) => {
    try {
      await healthTrackingAPI.logMedicationIntake(reminderId, {
        scheduled_time: new Date().toISOString(),
        notes: 'Taken via dashboard'
      });
      alert('Medication intake logged!');
      loadDashboard();
    } catch (error) {
      alert('Error logging medication: ' + error.message);
    }
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

  const getTrendChartData = () => {
    if (!trendsData || !trendsData.data_points) {
      return {
        labels: [],
        datasets: []
      };
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

  if (loading) {
    return (
      <div className="apollo-health-tracking">
        <div className="apollo-ht-loading-screen">
          <FaHeartbeat className="apollo-ht-loading-icon" />
          <p>Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apollo-health-tracking">
      <div className="apollo-ht-sidebar">
        <div className="apollo-ht-sidebar-header">
          <div className="apollo-ht-logo" onClick={() => window.location.href = '/'}>
            <div className="apollo-ht-logo-icon">
              <FaHeartbeat />
            </div>
            <span className="apollo-ht-logo-text">Rural HealthCare</span>
          </div>
        </div>

        <div className="apollo-ht-nav-section">
          <div className="apollo-ht-nav-item" onClick={() => window.location.href = '/'}>
            <FaHome />
            <span>Dashboard</span>
          </div>
          <div className="apollo-ht-nav-item" onClick={() => window.location.href = '/chat'}>
            <FaRobot />
            <span>AI Assistant</span>
          </div>
          <div className="apollo-ht-nav-item" onClick={() => window.location.href = '/teleconsult'}>
            <FaVideo />
            <span>Video Consult</span>
          </div>
          <div className="apollo-ht-nav-item" onClick={() => window.location.href = '/prescriptions'}>
            <FaPrescriptionBottle />
            <span>Prescriptions</span>
          </div>
          <div className="apollo-ht-nav-item apollo-ht-active">
            <FaChartLine />
            <span>Health Tracking</span>
          </div>
          <div className="apollo-ht-nav-item" onClick={() => window.location.href = '/appointments'}>
            <FaCalendarCheck />
            <span>Appointments</span>
          </div>
        </div>
      </div>

      <div className="apollo-ht-main">
        <div className="apollo-ht-header">
          <div>
            <h1>Health Tracking</h1>
            <p>Monitor your vital signs, goals, and activities</p>
          </div>
          <div className="apollo-ht-header-actions">
            <button 
              className="apollo-ht-header-btn"
              onClick={() => openModal('metric')}
            >
              <FaPlus /> Add Metric
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="apollo-ht-alerts-section">
            <h3><FaBell /> Health Alerts</h3>
            <div className="apollo-ht-alerts-grid">
              {alerts.map((alert, index) => (
                <div 
                  key={index}
                  className="apollo-ht-alert-card"
                  style={{ borderLeftColor: getAlertColor(alert.alert_level) }}
                >
                  <div className="apollo-ht-alert-icon" style={{ color: getAlertColor(alert.alert_level) }}>
                    <FaBell />
                  </div>
                  <div className="apollo-ht-alert-content">
                    <strong>{alert.message}</strong>
                    <p>{alert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Metrics Grid */}
        <div className="apollo-ht-metrics-grid">
          {metricTypes.map((metricType) => {
            const metric = latestMetrics[metricType.value];
            return (
              <div 
                key={metricType.value}
                className="apollo-ht-metric-card"
                style={{ 
                  '--accent-color': metricType.color,
                  '--bg-color': `${metricType.color}1A`
                }}
              >
                <div className="apollo-ht-metric-icon">
                  {metricType.icon}
                </div>
                <div className="apollo-ht-metric-value">
                  {metric ? formatMetricValue(metric) : 'N/A'}
                </div>
                <div className="apollo-ht-metric-label">{metricType.label}</div>
                {metric && (
                  <span className={`apollo-ht-metric-change ${metric.is_abnormal ? 'negative' : 'positive'}`}>
                    {metric.is_abnormal ? `⚠ ${metric.alert_level_display}` : '✓ Normal'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Trends Chart */}
        <div className="apollo-ht-chart-container">
          <div className="apollo-ht-chart-header">
            <h2>Health Trends</h2>
            <div className="apollo-ht-chart-controls">
              <select 
                value={selectedMetricType}
                onChange={(e) => setSelectedMetricType(e.target.value)}
                className="apollo-ht-metric-select"
              >
                {metricTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="apollo-ht-time-filter">
                <button 
                  className={`apollo-ht-time-btn ${trendPeriod === 7 ? 'apollo-ht-active' : ''}`}
                  onClick={() => setTrendPeriod(7)}
                >
                  Week
                </button>
                <button 
                  className={`apollo-ht-time-btn ${trendPeriod === 30 ? 'apollo-ht-active' : ''}`}
                  onClick={() => setTrendPeriod(30)}
                >
                  Month
                </button>
                <button 
                  className={`apollo-ht-time-btn ${trendPeriod === 90 ? 'apollo-ht-active' : ''}`}
                  onClick={() => setTrendPeriod(90)}
                >
                  3 Months
                </button>
              </div>
            </div>
          </div>
          <div className="apollo-ht-chart-wrapper">
            <Line data={getTrendChartData()} options={chartOptions} />
          </div>
          {trendsData && (
            <div className="apollo-ht-chart-stats">
              <div className="apollo-ht-stat">
                <span className="apollo-ht-stat-label">Average</span>
                <span className="apollo-ht-stat-value">{trendsData.average}</span>
              </div>
              <div className="apollo-ht-stat">
                <span className="apollo-ht-stat-label">Readings</span>
                <span className="apollo-ht-stat-value">{trendsData.count}</span>
              </div>
            </div>
          )}
        </div>

        {/* Goals Section */}
        <div className="apollo-ht-section">
          <div className="apollo-ht-section-header">
            <h2><FaBullseye /> Active Health Goals</h2>
            <button 
              className="apollo-ht-section-btn"
              onClick={() => openModal('goal')}
            >
              <FaPlus /> Add Goal
            </button>
          </div>
          <div className="apollo-ht-goals-grid">
            {activeGoals.length === 0 ? (
              <div className="apollo-ht-empty-state">
                <FaBullseye />
                <h3>No Active Goals</h3>
                <p>Set health goals to track your progress</p>
              </div>
            ) : (
              activeGoals.map((goal) => (
                <div key={goal.id} className="apollo-ht-goal-card">
                  <div className="apollo-ht-goal-header">
                    <h3>{goal.title}</h3>
                    <span className="apollo-ht-goal-type">{goal.goal_type_display}</span>
                  </div>
                  <p className="apollo-ht-goal-desc">{goal.description}</p>
                  <div className="apollo-ht-goal-progress">
                    <div className="apollo-ht-progress-bar">
                      <div 
                        className="apollo-ht-progress-fill"
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>
                    <span className="apollo-ht-progress-text">
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                  </div>
                  <div className="apollo-ht-goal-footer">
                    <span className="apollo-ht-goal-progress-pct">
                      {Math.round(goal.progress_percentage)}% Complete
                    </span>
                    {goal.days_remaining !== null && (
                      <span className="apollo-ht-goal-days">
                        <FaClock /> {goal.days_remaining} days left
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="apollo-ht-section">
          <div className="apollo-ht-section-header">
            <h2><FaRunning /> Recent Activities</h2>
            <button 
              className="apollo-ht-section-btn"
              onClick={() => openModal('activity')}
            >
              <FaPlus /> Log Activity
            </button>
          </div>
          <div className="apollo-ht-activities-list">
            {recentActivities.length === 0 ? (
              <div className="apollo-ht-empty-state">
                <FaRunning />
                <h3>No Activities Logged</h3>
                <p>Start tracking your daily activities</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="apollo-ht-activity-item">
                  <div className="apollo-ht-activity-icon">
                    <FaRunning />
                  </div>
                  <div className="apollo-ht-activity-content">
                    <h4>{activity.title}</h4>
                    <p>{activity.description}</p>
                    <div className="apollo-ht-activity-meta">
                      <span>{activity.activity_date}</span>
                      {activity.duration_minutes && (
                        <span>• {activity.duration_minutes} min</span>
                      )}
                      {activity.calories_burned && (
                        <span>• {activity.calories_burned} cal</span>
                      )}
                    </div>
                  </div>
                  {activity.intensity && (
                    <span className={`apollo-ht-intensity apollo-ht-intensity-${activity.intensity}`}>
                      {activity.intensity}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medication Reminders */}
        <div className="apollo-ht-section">
          <div className="apollo-ht-section-header">
            <h2><FaPills /> Medication Reminders</h2>
            <button 
              className="apollo-ht-section-btn"
              onClick={() => openModal('reminder')}
            >
              <FaPlus /> Add Reminder
            </button>
          </div>
          <div className="apollo-ht-reminders-grid">
            {medicationReminders.length === 0 ? (
              <div className="apollo-ht-empty-state">
                <FaPills />
                <h3>No Medication Reminders</h3>
                <p>Add reminders to stay on track with your medications</p>
              </div>
            ) : (
              medicationReminders.map((reminder) => (
                <div key={reminder.id} className="apollo-ht-reminder-card">
                  <div className="apollo-ht-reminder-header">
                    <h3>{reminder.medication_name}</h3>
                    <span className="apollo-ht-reminder-frequency">
                      {reminder.frequency_display}
                    </span>
                  </div>
                  <p className="apollo-ht-reminder-dosage">{reminder.dosage}</p>
                  <div className="apollo-ht-reminder-times">
                    {reminder.time_slots.map((time, idx) => (
                      <span key={idx} className="apollo-ht-reminder-time">
                        <FaClock /> {time}
                      </span>
                    ))}
                  </div>
                  <div className="apollo-ht-reminder-footer">
                    <span className="apollo-ht-adherence">
                      Adherence: {reminder.adherence_rate}%
                    </span>
                    <button 
                      className="apollo-ht-log-btn"
                      onClick={() => handleLogMedication(reminder.id)}
                    >
                      ✓ Mark Taken
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button className="apollo-ht-add-btn" onClick={() => openModal('metric')}>
        <FaPlus />
      </button>

      {/* Modal */}
      {showModal && (
        <div className="apollo-ht-modal active">
          <div className="apollo-ht-modal-content">
            <div className="apollo-ht-modal-header">
              <h2>
                {modalType === 'metric' && 'Add Health Metric'}
                {modalType === 'goal' && 'Create Health Goal'}
                {modalType === 'activity' && 'Log Activity'}
                {modalType === 'reminder' && 'Add Medication Reminder'}
              </h2>
              <button className="apollo-ht-close-btn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            {/* Metric Form */}
            {modalType === 'metric' && (
              <form onSubmit={handleAddMetric}>
                <div className="apollo-ht-form-group">
                  <label>Metric Type</label>
                  <select 
                    value={metricFormData.metric_type}
                    onChange={(e) => {
                      const selectedType = metricTypes.find(t => t.value === e.target.value);
                      setMetricFormData({
                        ...metricFormData, 
                        metric_type: e.target.value,
                        unit: selectedType?.unit || ''
                      });
                    }}
                    required
                  >
                    <option value="">Select metric</option>
                    {metricTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Value</label>
                  <input 
                    type="text" 
                    value={metricFormData.value}
                    onChange={(e) => setMetricFormData({...metricFormData, value: e.target.value})}
                    placeholder="e.g., 72 or 120/80" 
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={metricFormData.recorded_at}
                    onChange={(e) => setMetricFormData({...metricFormData, recorded_at: e.target.value})}
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Notes (Optional)</label>
                  <input 
                    type="text" 
                    value={metricFormData.notes}
                    onChange={(e) => setMetricFormData({...metricFormData, notes: e.target.value})}
                    placeholder="Any additional notes" 
                  />
                </div>
                <button type="submit" className="apollo-ht-btn-submit">
                  Save Metric
                </button>
              </form>
            )}

            {/* Goal Form */}
            {modalType === 'goal' && (
              <form onSubmit={handleAddGoal}>
                <div className="apollo-ht-form-group">
                  <label>Goal Type</label>
                  <select 
                    value={goalFormData.goal_type}
                    onChange={(e) => setGoalFormData({...goalFormData, goal_type: e.target.value})}
                    required
                  >
                    <option value="">Select goal type</option>
                    <option value="weight_loss">Weight Loss</option>
                    <option value="weight_gain">Weight Gain</option>
                    <option value="exercise">Exercise</option>
                    <option value="steps">Daily Steps</option>
                    <option value="water_intake">Water Intake</option>
                    <option value="sleep">Sleep Hours</option>
                    <option value="blood_pressure">Blood Pressure Control</option>
                    <option value="blood_sugar">Blood Sugar Control</option>
                  </select>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={goalFormData.title}
                    onChange={(e) => setGoalFormData({...goalFormData, title: e.target.value})}
                    placeholder="e.g., Lose 5kg in 2 months" 
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Description</label>
                  <textarea 
                    value={goalFormData.description}
                    onChange={(e) => setGoalFormData({...goalFormData, description: e.target.value})}
                    placeholder="Describe your goal..."
                    rows="3"
                    required
                  />
                </div>
                <div className="apollo-ht-form-row">
                  <div className="apollo-ht-form-group">
                    <label>Target Value</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={goalFormData.target_value}
                      onChange={(e) => setGoalFormData({...goalFormData, target_value: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="apollo-ht-form-group">
                    <label>Unit</label>
                    <input 
                      type="text" 
                      value={goalFormData.unit}
                      onChange={(e) => setGoalFormData({...goalFormData, unit: e.target.value})}
                      placeholder="kg, steps, hours"
                      required 
                    />
                  </div>
                </div>
                <div className="apollo-ht-form-row">
                  <div className="apollo-ht-form-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      value={goalFormData.start_date}
                      onChange={(e) => setGoalFormData({...goalFormData, start_date: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="apollo-ht-form-group">
                    <label>Target Date</label>
                    <input 
                      type="date" 
                      value={goalFormData.target_date}
                      onChange={(e) => setGoalFormData({...goalFormData, target_date: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <button type="submit" className="apollo-ht-btn-submit">
                  Create Goal
                </button>
              </form>
            )}

            {/* Activity Form */}
            {modalType === 'activity' && (
              <form onSubmit={handleAddActivity}>
                <div className="apollo-ht-form-group">
                  <label>Activity Type</label>
                  <select 
                    value={activityFormData.activity_type}
                    onChange={(e) => setActivityFormData({...activityFormData, activity_type: e.target.value})}
                    required
                  >
                    <option value="">Select activity</option>
                    <option value="exercise">Exercise</option>
                    <option value="meal">Meal</option>
                    <option value="medication">Medication</option>
                    <option value="water">Water Intake</option>
                    <option value="sleep">Sleep</option>
                    <option value="meditation">Meditation</option>
                    <option value="checkup">Health Checkup</option>
                  </select>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={activityFormData.title}
                    onChange={(e) => setActivityFormData({...activityFormData, title: e.target.value})}
                    placeholder="e.g., Morning Run" 
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    value={activityFormData.description}
                    onChange={(e) => setActivityFormData({...activityFormData, description: e.target.value})}
                    placeholder="Activity details" 
                  />
                </div>
                <div className="apollo-ht-form-row">
                  <div className="apollo-ht-form-group">
                    <label>Duration (min)</label>
                    <input 
                      type="number" 
                      value={activityFormData.duration_minutes}
                      onChange={(e) => setActivityFormData({...activityFormData, duration_minutes: e.target.value})}
                    />
                  </div>
                  <div className="apollo-ht-form-group">
                    <label>Calories</label>
                    <input 
                      type="number" 
                      value={activityFormData.calories_burned}
                      onChange={(e) => setActivityFormData({...activityFormData, calories_burned: e.target.value})}
                    />
                  </div>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Intensity</label>
                  <select 
                    value={activityFormData.intensity}
                    onChange={(e) => setActivityFormData({...activityFormData, intensity: e.target.value})}
                  >
                    <option value="">Select intensity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="apollo-ht-form-row">
                  <div className="apollo-ht-form-group">
                    <label>Date</label>
                    <input 
                      type="date" 
                      value={activityFormData.activity_date}
                      onChange={(e) => setActivityFormData({...activityFormData, activity_date: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="apollo-ht-form-group">
                    <label>Time</label>
                    <input 
                      type="time" 
                      value={activityFormData.activity_time}
                      onChange={(e) => setActivityFormData({...activityFormData, activity_time: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className="apollo-ht-btn-submit">
                  Log Activity
                </button>
              </form>
            )}

            {/* Reminder Form */}
            {modalType === 'reminder' && (
              <form onSubmit={handleAddReminder}>
                <div className="apollo-ht-form-group">
                  <label>Medication Name</label>
                  <input 
                    type="text" 
                    value={reminderFormData.medication_name}
                    onChange={(e) => setReminderFormData({...reminderFormData, medication_name: e.target.value})}
                    placeholder="e.g., Aspirin 100mg" 
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Dosage</label>
                  <input 
                    type="text" 
                    value={reminderFormData.dosage}
                    onChange={(e) => setReminderFormData({...reminderFormData, dosage: e.target.value})}
                    placeholder="e.g., 1 tablet" 
                    required 
                  />
                </div>
                <div className="apollo-ht-form-group">
                  <label>Frequency</label>
                  <select 
                    value={reminderFormData.frequency}
                    onChange={(e) => setReminderFormData({...reminderFormData, frequency: e.target.value})}
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="three_times_daily">Three Times Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Reminder Time</label>
                  <input 
                    type="time" 
                    value={reminderFormData.time_slots[0]}
                    onChange={(e) => setReminderFormData({
                      ...reminderFormData, 
                      time_slots: [e.target.value]
                    })}
                    required 
                  />
                </div>
                <div className="apollo-ht-form-row">
                  <div className="apollo-ht-form-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      value={reminderFormData.start_date}
                      onChange={(e) => setReminderFormData({...reminderFormData, start_date: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="apollo-ht-form-group">
                    <label>End Date (Optional)</label>
                    <input 
                      type="date" 
                      value={reminderFormData.end_date}
                      onChange={(e) => setReminderFormData({...reminderFormData, end_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="apollo-ht-form-group">
                  <label>Notes (Optional)</label>
                  <input 
                    type="text" 
                    value={reminderFormData.notes}
                    onChange={(e) => setReminderFormData({...reminderFormData, notes: e.target.value})}
                    placeholder="Additional instructions" 
                  />
                </div>
                <button type="submit" className="apollo-ht-btn-submit">
                  Create Reminder
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthTracking;