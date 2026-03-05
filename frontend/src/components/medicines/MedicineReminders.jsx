// src/components/medicines/MedicineReminders.jsx
// Complete PWA-enabled Medicine Reminder system with offline support

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { healthTrackingAPI, authAPI } from '../../services/api';
import {
  saveRemindersOffline,
  getOfflineReminders,
  saveReminderOffline,
  deleteReminderOffline,
  logMedicationOffline,
  queueOfflineAction,
  getPendingLogs,
  openMediDB,
} from '../../services/indexedDB';
import {
  registerServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  startReminderScheduler,
  stopReminderScheduler,
  setupOnlineOfflineHandlers,
  syncPendingData,
  triggerBackgroundSync,
  syncAuthTokenToSW,
  isOnline,
  isPWAInstalled,
  setSoundEnabled,
} from '../../services/pwaService';
import {
  FaHeartbeat, FaHome, FaRobot, FaVideo, FaPrescriptionBottle,
  FaChartLine, FaPills, FaCalendarCheck, FaPlus, FaTimes,
  FaCheck, FaTrash, FaCapsules, FaClock, FaUtensils, FaCalendar,
  FaCheckCircle, FaSun, FaCloudSun, FaMoon, FaStar, FaCoffee,
  FaDrumstickBite, FaPercent, FaWifi, FaSync, FaBell,
  FaBellSlash, FaVolumeMute, FaVolumeUp, FaRobot as FaAI,
  FaExclamationTriangle, FaInfoCircle, FaDownload, FaCloud,
  FaCheckDouble, FaHourglass
} from 'react-icons/fa';

// ============================================================
// AI ADHERENCE PREDICTION (using GROQ via backend)
// ============================================================
async function fetchAdherencePrediction(patientId, reminders) {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/medication-reminders/adherence-prediction/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ patient_id: patientId, reminders }),
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const MedicineReminders = () => {
  // ---- State ----
  const [showModal, setShowModal] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [soundOn, setSoundOn] = useState(true);
  const [swRegistered, setSwRegistered] = useState(false);
  const [adherencePrediction, setAdherencePrediction] = useState(null);
  const [showAdherence, setShowAdherence] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [takenToday, setTakenToday] = useState({});
  const [installPrompt, setInstallPrompt] = useState(null);
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    meal_timing: '',
    duration: '',
    notes: '',
  });

  const medicinesRef = useRef(medicines);
  useEffect(() => { medicinesRef.current = medicines; }, [medicines]);

  const user = authAPI.getCurrentUser();

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    initPWA();
    loadMedicines();
    loadTodayLogs();
    checkPendingCount();

    // PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for SW messages
    const handleMedicationTaken = (e) => {
      const { reminderId } = e.detail;
      setTakenToday((prev) => ({ ...prev, [reminderId]: true }));
    };
    window.addEventListener('medicationTakenFromNotification', handleMedicationTaken);

    const handleSynced = () => {
      checkPendingCount();
      setLastSynced(new Date());
    };
    window.addEventListener('medicationSynced', handleSynced);

    // Online/Offline handlers
    const cleanup = setupOnlineOfflineHandlers(
      async () => {
        setIsOffline(false);
        setSyncing(true);
        setSyncStatus('Syncing data...');
        const result = await syncPendingData();
        setSyncing(false);
        setSyncStatus(
          result.synced > 0 ? `✅ Synced ${result.synced} records` : '✅ Up to date'
        );
        setLastSynced(new Date());
        await checkPendingCount();
        // Refresh from server
        await loadMedicines(true);
      },
      () => {
        setIsOffline(true);
        setSyncStatus('📵 Offline mode');
      }
    );

    return () => {
      stopReminderScheduler();
      cleanup();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('medicationTakenFromNotification', handleMedicationTaken);
      window.removeEventListener('medicationSynced', handleSynced);
    };
  }, []);

  // Start scheduler once medicines load
  useEffect(() => {
    if (medicines.length > 0) {
      const stop = startReminderScheduler(() => medicinesRef.current);
      return stop;
    }
  }, [medicines]);

  async function initPWA() {
    // Register service worker
    const reg = await registerServiceWorker();
    if (reg) {
      setSwRegistered(true);
      await syncAuthTokenToSW();
    }

    // Request notification permission
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  }

  // ============================================================
  // LOAD MEDICINES (online first, offline fallback)
  // ============================================================
  const loadMedicines = async (forceOnline = false) => {
    try {
      setLoading(true);

      if (navigator.onLine || forceOnline) {
        // Fetch from server
        const response = await healthTrackingAPI.getReminders(user?.id, true);
        const data = Array.isArray(response) ? response : [];
        setMedicines(data);
        // Cache offline
        await saveRemindersOffline(data);
        setLastSynced(new Date());
        setSyncStatus('✅ Data synced');
      } else {
        // Use offline cache
        const cached = await getOfflineReminders();
        setMedicines(cached);
        setSyncStatus('📵 Showing cached data');
      }
    } catch (error) {
      console.error('[MedicineReminders] Error loading:', error);
      // Fallback to offline
      try {
        const cached = await getOfflineReminders();
        setMedicines(cached);
        setSyncStatus('Using offline data');
      } catch {
        setMedicines([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTodayLogs = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Check IndexedDB for today's taken logs
      const db = await openMediDB();
      const tx = db.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');
      const dateIndex = store.index('date');
      const logs = await new Promise((resolve, reject) => {
        const req = dateIndex.getAll(today);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const takenMap = {};
      logs.forEach((log) => {
        if (log.status === 'taken') takenMap[log.reminderId] = true;
      });
      setTakenToday(takenMap);
    } catch (err) {
      console.warn('[MedicineReminders] loadTodayLogs error:', err);
    }
  };

  const checkPendingCount = async () => {
    try {
      const logs = await getPendingLogs();
      setPendingCount(logs.length);
    } catch {
      setPendingCount(0);
    }
  };

  // ============================================================
  // LOAD AI ADHERENCE
  // ============================================================
  const loadAdherencePrediction = async () => {
    if (!user || medicines.length === 0) return;
    setShowAdherence(true);
    const prediction = await fetchAdherencePrediction(user.id, medicines);
    if (prediction) setAdherencePrediction(prediction);
  };

  // ============================================================
  // ADD MEDICINE (online + offline)
  // ============================================================
  const addMedicine = async (e) => {
    e.preventDefault();

    if (selectedTimes.length === 0) {
      alert('⚠️ Please select at least one reminder time');
      return;
    }
    if (!user) {
      alert('❌ Please log in to add medicine reminders');
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(formData.duration));

    const reminderData = {
      patient: user.id,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      time_slots: selectedTimes,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      notes: formData.notes,
      meal_timing: formData.meal_timing,
      is_active: true,
      reminder_enabled: true,
    };

    try {
      if (navigator.onLine) {
        // Online: save to server
        const created = await healthTrackingAPI.createReminder(reminderData);
        setMedicines((prev) => [...prev, created]);
        // Cache offline too
        await saveReminderOffline(created);
        setSyncStatus('✅ Reminder saved');
      } else {
        // Offline: save locally with temp ID
        const tempId = `temp_${Date.now()}`;
        const tempReminder = { ...reminderData, id: tempId, _is_offline: true };
        setMedicines((prev) => [...prev, tempReminder]);
        await saveReminderOffline(tempReminder);
        // Queue for sync
        await queueOfflineAction('CREATE_REMINDER', reminderData);
        setPendingCount((c) => c + 1);
        setSyncStatus('📵 Saved offline – will sync when connected');
        alert(`📵 Saved offline! "${formData.medication_name}" will sync when you're back online.`);
      }

      closeModal();
    } catch (error) {
      console.error('[MedicineReminders] Error creating:', error);
      // Try offline fallback
      const tempId = `temp_${Date.now()}`;
      const tempReminder = { ...reminderData, id: tempId, _is_offline: true };
      setMedicines((prev) => [...prev, tempReminder]);
      await saveReminderOffline(tempReminder);
      await queueOfflineAction('CREATE_REMINDER', reminderData);
      setPendingCount((c) => c + 1);
      closeModal();
      setSyncStatus('Saved offline – will sync when connected');
    }
  };

  const markTaken = async (medicine) => {
  if (!medicine?.id) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const scheduledTime = `${todayStr}T${currentTime}:00`;

  // Optimistic UI — mark taken immediately so button responds instantly
  setTakenToday((prev) => ({ ...prev, [medicine.id]: true }));

  if (navigator.onLine) {
    // ── ONLINE: log to server, cache locally ────────────────────────────
    try {
      await healthTrackingAPI.logMedicationIntake(medicine.id, {
        status: 'taken',
        taken_at: now.toISOString(),
        scheduled_time: scheduledTime,
      });
      setSyncStatus('✅ Logged to server');

      // Cache locally so offline view stays accurate
      await logMedicationOffline({
        reminderId: medicine.id,
        status: 'taken',
        scheduledTime,
        takenAt: now.toISOString(),
        synced: true,
      });
    } catch (err) {
      console.error('[markTaken] Server log failed, queuing offline:', err);
      // Server failed — save offline and queue for retry
      await logMedicationOffline({
        reminderId: medicine.id,
        status: 'taken',
        scheduledTime,
        takenAt: now.toISOString(),
        synced: false,
      });
      await queueOfflineAction('LOG_INTAKE', {
        reminderId: medicine.id,
        status: 'taken',
        taken_at: now.toISOString(),
        scheduled_time: scheduledTime,
      });
      setPendingCount((c) => c + 1);
      setSyncStatus('⚠️ Server error — saved offline, will retry');
    }
  } else {
    // ── OFFLINE: save locally + queue for sync ───────────────────────────
    try {
      await logMedicationOffline({
        reminderId: medicine.id,
        status: 'taken',
        scheduledTime,
        takenAt: now.toISOString(),
        synced: false,
      });
      await queueOfflineAction('LOG_INTAKE', {
        reminderId: medicine.id,
        status: 'taken',
        taken_at: now.toISOString(),
        scheduled_time: scheduledTime,
      });
      setPendingCount((c) => c + 1);
      setSyncStatus('📵 Logged offline — will sync when connected');
    } catch (offlineErr) {
      console.error('[markTaken] Offline save failed:', offlineErr);
      // Revert optimistic UI if we couldn't even save locally
      setTakenToday((prev) => ({ ...prev, [medicine.id]: false }));
      setSyncStatus('❌ Could not save — please try again');
    }
  }
};

  // ============================================================
  // DELETE MEDICINE
  // ============================================================
  const deleteMedicine = async (medicineId) => {
    const medicine = medicines.find((m) => m.id === medicineId);
    if (!window.confirm(`Delete "${medicine?.medication_name}"?`)) return;

    // Optimistic UI
    setMedicines((prev) => prev.filter((m) => m.id !== medicineId));
    await deleteReminderOffline(medicineId);

    try {
      if (navigator.onLine && !String(medicineId).startsWith('temp_')) {
        await healthTrackingAPI.deleteReminder(medicineId);
        setSyncStatus('🗑️ Deleted');
      } else if (!navigator.onLine) {
        await queueOfflineAction('DELETE_REMINDER', { id: medicineId });
        setPendingCount((c) => c + 1);
        setSyncStatus('📵 Queued for deletion');
      }
    } catch (err) {
      console.error('[deleteMedicine] Error:', err);
    }
  };

  // ============================================================
  // MANUAL SYNC
  // ============================================================
  const handleManualSync = async () => {
    if (!navigator.onLine) {
      setSyncStatus('📵 No internet connection');
      return;
    }
    setSyncing(true);
    setSyncStatus('Syncing...');
    const result = await syncPendingData();
    await loadMedicines(true);
    await checkPendingCount();
    setSyncing(false);
    setLastSynced(new Date());
    setSyncStatus(
      result.synced > 0 ? `✅ Synced ${result.synced} records` : '✅ All up to date'
    );
  };

  // ============================================================
  // NOTIFICATION PERMISSION
  // ============================================================
  const requestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setSyncStatus('✅ Notifications enabled!');
    }
  };

  // ============================================================
  // PWA INSTALL
  // ============================================================
  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setSyncStatus('✅ App installed!');
    }
  };

  // ============================================================
  // MODAL HELPERS
  // ============================================================
  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setFormData({
      medication_name: '',
      dosage: '',
      frequency: '',
      meal_timing: '',
      duration: '',
      notes: '',
    });
    setSelectedTimes([]);
  };

  const toggleTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  const takenCount = Object.values(takenToday).filter(Boolean).length;
  const totalDoses = medicines.reduce((s, m) => s + (m.time_slots?.length || 0), 0);
  const adherenceRate =
    totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 100;

  const timeSlots = [
    { time: '06:00', icon: '🌅', label: 'Early Morning', display: '6:00 AM' },
    { time: '08:00', icon: '☀️', label: 'Morning', display: '8:00 AM' },
    { time: '09:00', icon: '☕', label: 'Breakfast', display: '9:00 AM' },
    { time: '12:00', icon: '🌤', label: 'Noon', display: '12:00 PM' },
    { time: '13:00', icon: '🍽', label: 'Lunch', display: '1:00 PM' },
    { time: '15:00', icon: '☁️', label: 'Afternoon', display: '3:00 PM' },
    { time: '18:00', icon: '🌙', label: 'Evening', display: '6:00 PM' },
    { time: '20:00', icon: '🌃', label: 'Dinner', display: '8:00 PM' },
    { time: '22:00', icon: '⭐', label: 'Night', display: '10:00 PM' },
  ];

  const colors = [
    '#00b38e', '#e74c3c', '#3498db', '#9b59b6',
    '#f39c12', '#1abc9c', '#e67e22', '#2ecc71',
  ];

  const getTimeLabel = (time) => {
    const h = parseInt(time?.split(':')[0] ?? '0');
    if (h < 6) return 'Early';
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    if (h < 21) return 'Evening';
    return 'Night';
  };

  const formatMealTiming = (t) => ({
    before: '🍽 Before meals',
    after: '🍽 After meals',
    with: '🍽 With meals',
    anytime: '⏱ Anytime',
  })[t] || t;

  const formatLastSync = (d) => {
    if (!d) return 'Never';
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return d.toLocaleTimeString();
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="mr-container">
      {/* ---- SIDEBAR ---- */}
      <aside className="mr-sidebar">
        <div className="mr-brand" onClick={() => (window.location.href = '/')}>
          <span className="mr-brand-icon">⚕️</span>
          <span className="mr-brand-name">Rural HealthCare</span>
        </div>

        <nav className="mr-nav">
          {[
            { href: '/', icon: '🏠', label: 'Dashboard' },
            { href: '/chat', icon: '🤖', label: 'AI Assistant' },
            { href: '/teleconsult', icon: '📹', label: 'Video Consult' },
            { href: '/prescriptions', icon: '💊', label: 'Prescriptions' },
            { href: '/health-tracking', icon: '📊', label: 'Health Tracking' },
            { href: '/appointments', icon: '📅', label: 'Book Appointment' },
          ].map(({ href, icon, label }) => (
            <div
              key={href}
              className="mr-nav-item"
              onClick={() => (window.location.href = href)}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
          <div className="mr-nav-item mr-nav-active">
            <span>💊</span>
            <span>Medicine Reminders</span>
          </div>
        </nav>

        {/* PWA Status Panel */}
        <div className="mr-pwa-panel">
          <div className={`mr-status-dot ${isOffline ? 'offline' : 'online'}`}>
            {isOffline ? '📵 Offline' : '🌐 Online'}
          </div>

          {pendingCount > 0 && (
            <div className="mr-pending-badge">
              {pendingCount} pending sync{pendingCount > 1 ? 's' : ''}
            </div>
          )}

          {lastSynced && (
            <div className="mr-last-sync">
              Last sync: {formatLastSync(lastSynced)}
            </div>
          )}

          {!swRegistered && (
            <div className="mr-sw-badge">⚠️ SW not registered</div>
          )}
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="mr-main">

        {/* Header */}
        <div className="mr-header">
          <div>
            <h1 className="mr-title">💊 Medicine Reminders</h1>
            <p className="mr-subtitle">
              {isOffline
                ? '📵 Working offline – changes will sync when connected'
                : 'Smart reminders • Works offline • AI adherence tracking'}
            </p>
          </div>
          <div className="mr-header-actions">
            {/* Notification permission */}
            {notifPermission !== 'granted' && (
              <button className="mr-btn mr-btn-notif" onClick={requestPermission} title="Enable notifications">
                🔔 Enable Alerts
              </button>
            )}

            {/* Sound toggle */}
            <button
              className="mr-btn mr-btn-icon"
              onClick={() => {
                setSoundOn((s) => {
                  setSoundEnabled(!s);
                  return !s;
                });
              }}
              title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>

            {/* Manual sync */}
            <button
              className={`mr-btn mr-btn-sync ${syncing ? 'spinning' : ''}`}
              onClick={handleManualSync}
              disabled={syncing || isOffline}
              title="Sync data"
            >
              🔄 {syncing ? 'Syncing...' : 'Sync'}
            </button>

            {/* Install PWA */}
            {installPrompt && (
              <button className="mr-btn mr-btn-install" onClick={handleInstallPWA}>
                📲 Install App
              </button>
            )}

            {/* AI Adherence */}
            <button className="mr-btn mr-btn-ai" onClick={loadAdherencePrediction}>
              🤖 AI Insights
            </button>

            <button className="mr-btn mr-btn-primary" onClick={openModal}>
              ➕ Add Medicine
            </button>
          </div>
        </div>

        {/* Sync status bar */}
        {syncStatus && (
          <div className={`mr-sync-bar ${syncStatus.includes('📵') ? 'offline' : 'online'}`}>
            {syncStatus}
          </div>
        )}

        {/* Notification permission warning */}
        {notifPermission === 'denied' && (
          <div className="mr-alert mr-alert-warn">
            ⚠️ Notifications are blocked. Please enable them in your browser settings to receive medicine reminders.
          </div>
        )}

        {/* Stats */}
        <div className="mr-stats">
          <div className="mr-stat-card">
            <div className="mr-stat-icon green">💊</div>
            <div className="mr-stat-val">{medicines.length}</div>
            <div className="mr-stat-lbl">Active Medicines</div>
          </div>
          <div className="mr-stat-card">
            <div className="mr-stat-icon emerald">✅</div>
            <div className="mr-stat-val">{takenCount}</div>
            <div className="mr-stat-lbl">Taken Today</div>
          </div>
          <div className="mr-stat-card">
            <div className="mr-stat-icon blue">⏰</div>
            <div className="mr-stat-val">{totalDoses}</div>
            <div className="mr-stat-lbl">Daily Doses</div>
          </div>
          <div className="mr-stat-card">
            <div className="mr-stat-icon amber">📊</div>
            <div className="mr-stat-val">{adherenceRate}%</div>
            <div className="mr-stat-lbl">Adherence</div>
          </div>
          {pendingCount > 0 && (
            <div className="mr-stat-card">
              <div className="mr-stat-icon orange">⏳</div>
              <div className="mr-stat-val">{pendingCount}</div>
              <div className="mr-stat-lbl">Pending Sync</div>
            </div>
          )}
        </div>

        {/* AI Adherence Panel */}
        {showAdherence && (
          <div className="mr-adherence-panel">
            <div className="mr-adherence-header">
              <span>🤖 AI Adherence Prediction</span>
              <button onClick={() => setShowAdherence(false)}>✕</button>
            </div>
            {adherencePrediction ? (
              <div className="mr-adherence-content">
                <div className="mr-adherence-score">
                  <span className="mr-score-val">
                    {adherencePrediction.predicted_adherence_rate?.toFixed(0) ?? '—'}%
                  </span>
                  <span className="mr-score-lbl">Predicted 30-day adherence</span>
                </div>
                <div className="mr-adherence-risk">
                  Risk Level:{' '}
                  <span className={`mr-risk-badge ${adherencePrediction.risk_level}`}>
                    {adherencePrediction.risk_level?.toUpperCase() ?? 'UNKNOWN'}
                  </span>
                </div>
                {adherencePrediction.recommendations?.length > 0 && (
                  <div className="mr-recommendations">
                    <strong>💡 Recommendations:</strong>
                    <ul>
                      {adherencePrediction.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {adherencePrediction.insights && (
                  <div className="mr-insights">{adherencePrediction.insights}</div>
                )}
              </div>
            ) : (
              <div className="mr-loading">🤖 Analyzing your medication patterns...</div>
            )}
          </div>
        )}

        {/* Medicine List */}
        <div className="mr-list-section">
          <div className="mr-list-header">
            <h2>My Medicines</h2>
            <span className="mr-count">{medicines.length} active</span>
          </div>

          {loading ? (
            <div className="mr-loading-state">
              <div className="mr-spinner" />
              <p>Loading reminders...</p>
            </div>
          ) : medicines.length === 0 ? (
            <div className="mr-empty">
              <div className="mr-empty-icon">💊</div>
              <h3>No Medicines Yet</h3>
              <p>Add your first medicine reminder and never miss a dose</p>
              <button className="mr-btn mr-btn-primary" onClick={openModal}>
                ➕ Add Medicine
              </button>
            </div>
          ) : (
            <div className="mr-cards">
              {medicines.map((medicine, idx) => {
                const isTaken = takenToday[medicine.id];
                const isTemp = String(medicine.id).startsWith('temp_');

                return (
                  <div
                    key={medicine.id}
                    className={`mr-card ${isTaken ? 'taken' : ''} ${isTemp ? 'offline-card' : ''}`}
                    style={{ '--card-color': colors[idx % colors.length] }}
                  >
                    {/* Offline badge */}
                    {isTemp && (
                      <div className="mr-offline-badge">📵 Pending sync</div>
                    )}

                    <div className="mr-card-header">
                      <div className="mr-med-name">{medicine.medication_name}</div>
                      <div className="mr-card-badges">
                        {isTaken && <span className="mr-badge-taken">✅ Taken</span>}
                        {medicine.requires_prescription && (
                          <span className="mr-badge-rx">Rx</span>
                        )}
                      </div>
                    </div>

                    <div className="mr-card-details">
                      <span>💊 {medicine.dosage}</span>
                      <span>🔁 {medicine.frequency}</span>
                      {medicine.meal_timing && (
                        <span>{formatMealTiming(medicine.meal_timing)}</span>
                      )}
                      {medicine.start_date && (
                        <span>
                          📅 {new Date(medicine.start_date).toLocaleDateString()} –{' '}
                          {medicine.end_date
                            ? new Date(medicine.end_date).toLocaleDateString()
                            : 'Ongoing'}
                        </span>
                      )}
                    </div>

                    <div className="mr-times">
                      {(medicine.time_slots || []).map((t) => (
                        <span key={t} className="mr-time-chip">
                          ⏰ {t} ({getTimeLabel(t)})
                        </span>
                      ))}
                    </div>

                    {medicine.notes && (
                      <div className="mr-notes">📝 {medicine.notes}</div>
                    )}

                    <div className="mr-card-actions">
                      <button
                        className={`mr-btn-take ${isTaken ? 'taken' : ''}`}
                        onClick={() => !isTaken && markTaken(medicine)}
                        disabled={isTaken}
                      >
                        {isTaken ? '✅ Taken' : '✔ Mark as Taken'}
                      </button>
                      <button
                        className="mr-btn-delete"
                        onClick={() => deleteMedicine(medicine.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ---- ADD MEDICINE MODAL ---- */}
      {showModal && (
        <div className="mr-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="mr-modal">
            <div className="mr-modal-header">
              <h2>➕ Add Medicine Reminder</h2>
              <button className="mr-modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={addMedicine} className="mr-form">
              <div className="mr-form-group">
                <label>Medicine Name *</label>
                <input
                  type="text"
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  placeholder="e.g., Paracetamol 500mg"
                  required
                />
              </div>

              <div className="mr-form-row">
                <div className="mr-form-group">
                  <label>Dosage *</label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 1 tablet"
                    required
                  />
                </div>
                <div className="mr-form-group">
                  <label>Frequency *</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="daily">Once daily</option>
                    <option value="twice_daily">Twice daily</option>
                    <option value="three_times_daily">Three times daily</option>
                    <option value="four_times_daily">Four times daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As needed</option>
                  </select>
                </div>
              </div>

              <div className="mr-form-group">
                <label>Reminder Times * ({selectedTimes.length} selected)</label>
                <div className="mr-time-grid">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className={`mr-time-slot ${selectedTimes.includes(slot.time) ? 'selected' : ''}`}
                      onClick={() => toggleTime(slot.time)}
                    >
                      <span className="mr-slot-icon">{slot.icon}</span>
                      <span className="mr-slot-time">{slot.display}</span>
                      <span className="mr-slot-lbl">{slot.label}</span>
                      {selectedTimes.includes(slot.time) && <span className="mr-slot-check">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mr-form-row">
                <div className="mr-form-group">
                  <label>Meal Timing</label>
                  <select
                    value={formData.meal_timing}
                    onChange={(e) => setFormData({ ...formData, meal_timing: e.target.value })}
                  >
                    <option value="">Select timing</option>
                    <option value="before">Before meals</option>
                    <option value="after">After meals</option>
                    <option value="with">With meals</option>
                    <option value="anytime">Anytime</option>
                  </select>
                </div>
                <div className="mr-form-group">
                  <label>Duration (days) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 30"
                    min="1"
                    max="365"
                    required
                  />
                </div>
              </div>

              <div className="mr-form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions, e.g., take with water..."
                  rows={3}
                />
              </div>

              {!navigator.onLine && (
                <div className="mr-offline-notice">
                  📵 You're offline. This reminder will be saved locally and synced when you reconnect.
                </div>
              )}

              <button type="submit" className="mr-btn-submit">
                ➕ Add Medicine & Set Reminder
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* ===================================================
           MEDICINE REMINDERS - CLEAN PROFESSIONAL DESIGN
        =================================================== */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green: #00b38e;
          --green-d: #008f72;
          --green-l: #e6f9f5;
          --blue: #3498db;
          --red: #e74c3c;
          --amber: #f59e0b;
          --orange: #f97316;
          --purple: #8b5cf6;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-400: #9ca3af;
          --gray-600: #4b5563;
          --gray-800: #1f2937;
          --text: #111827;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
          --shadow-md: 0 4px 16px rgba(0,0,0,.10);
          --shadow-lg: 0 12px 32px rgba(0,0,0,.14);
          --radius: 12px;
          --radius-sm: 8px;
          --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .mr-container {
          display: flex;
          min-height: 100vh;
          background: var(--gray-50);
          font-family: var(--font);
          color: var(--text);
        }

        /* SIDEBAR */
        .mr-sidebar {
          width: 260px;
          background: #fff;
          border-right: 1px solid var(--gray-200);
          position: fixed;
          top: 0; left: 0; bottom: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          z-index: 50;
        }
        .mr-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 24px 20px 20px;
          border-bottom: 1px solid var(--gray-200);
          cursor: pointer;
          font-weight: 700;
          font-size: 16px;
        }
        .mr-brand-icon { font-size: 24px; }
        .mr-nav { padding: 12px 0; flex: 1; }
        .mr-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 20px;
          margin: 2px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-600);
          transition: all .2s;
        }
        .mr-nav-item:hover { background: var(--gray-100); color: var(--green); }
        .mr-nav-item.mr-nav-active {
          background: var(--green-l);
          color: var(--green);
          font-weight: 600;
          border-left: 3px solid var(--green);
        }

        /* PWA Status Panel */
        .mr-pwa-panel {
          padding: 16px;
          border-top: 1px solid var(--gray-200);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mr-status-dot {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .mr-status-dot.online { background: #d1fae5; color: #065f46; }
        .mr-status-dot.offline { background: #fee2e2; color: #991b1b; }
        .mr-pending-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .mr-last-sync { font-size: 11px; color: var(--gray-400); }
        .mr-sw-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
        }

        /* MAIN */
        .mr-main {
          margin-left: 260px;
          flex: 1;
          padding: 36px;
          max-width: 1200px;
        }

        /* HEADER */
        .mr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .mr-title { font-size: 28px; font-weight: 800; color: var(--text); }
        .mr-subtitle { font-size: 14px; color: var(--gray-600); margin-top: 4px; }
        .mr-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        /* BUTTONS */
        .mr-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
        }
        .mr-btn-primary {
          background: var(--green);
          color: #fff;
          box-shadow: var(--shadow-sm);
        }
        .mr-btn-primary:hover { background: var(--green-d); transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .mr-btn-notif { background: #fef3c7; color: #92400e; }
        .mr-btn-notif:hover { background: #fde68a; }
        .mr-btn-icon { background: var(--gray-100); color: var(--gray-600); min-width: 40px; justify-content: center; }
        .mr-btn-icon:hover { background: var(--gray-200); }
        .mr-btn-sync { background: #dbeafe; color: #1e40af; }
        .mr-btn-sync:hover:not(:disabled) { background: #bfdbfe; }
        .mr-btn-sync:disabled { opacity: .5; cursor: not-allowed; }
        .mr-btn-sync.spinning { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mr-btn-install { background: #f3e8ff; color: #6d28d9; }
        .mr-btn-install:hover { background: #e9d5ff; }
        .mr-btn-ai { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
        .mr-btn-ai:hover { opacity: .9; transform: translateY(-1px); }

        /* SYNC BAR */
        .mr-sync-bar {
          padding: 10px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .mr-sync-bar.online { background: #d1fae5; color: #065f46; }
        .mr-sync-bar.offline { background: #fef3c7; color: #92400e; }
        .mr-sync-bar:not(.online):not(.offline) { background: var(--gray-100); color: var(--gray-600); }

        /* ALERT */
        .mr-alert { padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 13px; }
        .mr-alert-warn { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }

        /* STATS */
        .mr-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .mr-stat-card {
          background: #fff;
          border-radius: var(--radius);
          padding: 22px 20px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          transition: all .2s;
        }
        .mr-stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .mr-stat-icon {
          width: 44px; height: 44px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 12px;
        }
        .mr-stat-icon.green { background: var(--green-l); }
        .mr-stat-icon.emerald { background: #d1fae5; }
        .mr-stat-icon.blue { background: #dbeafe; }
        .mr-stat-icon.amber { background: #fef3c7; }
        .mr-stat-icon.orange { background: #ffedd5; }
        .mr-stat-val { font-size: 32px; font-weight: 800; color: var(--text); }
        .mr-stat-lbl { font-size: 13px; color: var(--gray-600); margin-top: 4px; }

        /* AI ADHERENCE PANEL */
        .mr-adherence-panel {
          background: linear-gradient(135deg, #667eea10, #764ba215);
          border: 1px solid #764ba240;
          border-radius: var(--radius);
          padding: 24px;
          margin-bottom: 24px;
        }
        .mr-adherence-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 16px;
          color: #4c1d95;
        }
        .mr-adherence-header button {
          background: none; border: none; cursor: pointer;
          font-size: 18px; color: var(--gray-400);
        }
        .mr-adherence-score {
          display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px;
        }
        .mr-score-val { font-size: 48px; font-weight: 900; color: var(--green); }
        .mr-score-lbl { font-size: 14px; color: var(--gray-600); }
        .mr-adherence-risk { font-size: 14px; margin-bottom: 12px; }
        .mr-risk-badge {
          display: inline-block; padding: 3px 10px;
          border-radius: 20px; font-weight: 700; font-size: 12px;
        }
        .mr-risk-badge.low { background: #d1fae5; color: #065f46; }
        .mr-risk-badge.medium { background: #fef3c7; color: #92400e; }
        .mr-risk-badge.high { background: #fee2e2; color: #991b1b; }
        .mr-recommendations ul { padding-left: 16px; margin-top: 8px; }
        .mr-recommendations li { font-size: 13px; margin-bottom: 6px; color: var(--gray-600); }
        .mr-insights { font-size: 13px; color: var(--gray-600); margin-top: 12px; font-style: italic; }
        .mr-loading { color: var(--gray-400); font-size: 14px; }

        /* LIST */
        .mr-list-section {
          background: #fff;
          border-radius: var(--radius);
          padding: 28px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
        }
        .mr-list-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
        }
        .mr-list-header h2 { font-size: 20px; font-weight: 700; }
        .mr-count {
          background: var(--green-l); color: var(--green);
          padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }

        /* LOADING */
        .mr-loading-state {
          display: flex; flex-direction: column;
          align-items: center; padding: 60px; gap: 16px; color: var(--gray-400);
        }
        .mr-spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--gray-200);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        /* EMPTY */
        .mr-empty {
          text-align: center; padding: 60px 40px;
        }
        .mr-empty-icon { font-size: 64px; margin-bottom: 16px; }
        .mr-empty h3 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .mr-empty p { color: var(--gray-600); margin-bottom: 24px; }

        /* CARDS */
        .mr-cards { display: flex; flex-direction: column; gap: 16px; }
        .mr-card {
          border: 1.5px solid var(--gray-200);
          border-left: 5px solid var(--card-color, var(--green));
          border-radius: var(--radius);
          padding: 20px 22px;
          transition: all .2s;
          position: relative;
        }
        .mr-card:hover { transform: translateX(3px); box-shadow: var(--shadow-md); border-color: var(--card-color, var(--green)); }
        .mr-card.taken { opacity: .75; background: var(--gray-50); }
        .mr-card.offline-card { border-style: dashed; }
        .mr-offline-badge {
          position: absolute; top: 10px; right: 12px;
          background: #fef3c7; color: #92400e;
          padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
        }
        .mr-card-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .mr-med-name { font-size: 18px; font-weight: 700; }
        .mr-card-badges { display: flex; gap: 8px; }
        .mr-badge-taken {
          background: #d1fae5; color: #065f46;
          padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .mr-badge-rx {
          background: #dbeafe; color: #1e40af;
          padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
        }
        .mr-card-details {
          display: flex; flex-wrap: wrap; gap: 12px;
          font-size: 13px; color: var(--gray-600); margin-bottom: 12px;
        }
        .mr-times { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .mr-time-chip {
          background: var(--green-l); color: var(--green);
          padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
          border: 1px solid var(--green);
        }
        .mr-notes {
          font-size: 13px; color: var(--gray-600);
          background: var(--gray-50); padding: 8px 12px;
          border-radius: var(--radius-sm); margin-bottom: 12px;
          border-left: 3px solid var(--card-color, var(--green));
        }
        .mr-card-actions { display: flex; gap: 10px; margin-top: 12px; }
        .mr-btn-take {
          flex: 1; padding: 10px 16px;
          background: var(--green); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all .2s;
        }
        .mr-btn-take:hover:not(:disabled) {
          background: var(--green-d); transform: translateY(-1px);
        }
        .mr-btn-take.taken {
          background: #d1fae5; color: #065f46; cursor: default;
        }
        .mr-btn-take:disabled { opacity: .7; cursor: default; }
        .mr-btn-delete {
          width: 44px; height: 44px;
          background: #fee2e2; color: var(--red);
          border: none; border-radius: var(--radius-sm);
          font-size: 18px; cursor: pointer; transition: all .2s;
          display: flex; align-items: center; justify-content: center;
        }
        .mr-btn-delete:hover { background: var(--red); color: #fff; transform: translateY(-1px); }

        /* MODAL */
        .mr-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .mr-modal {
          background: #fff;
          border-radius: 16px;
          width: 92%;
          max-width: 640px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
          animation: slideUp .25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .mr-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 28px 32px 20px;
          border-bottom: 1px solid var(--gray-200);
        }
        .mr-modal-header h2 { font-size: 22px; font-weight: 800; }
        .mr-modal-close {
          background: var(--gray-100); border: none;
          width: 36px; height: 36px; border-radius: var(--radius-sm);
          font-size: 18px; cursor: pointer; color: var(--gray-600);
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
        }
        .mr-modal-close:hover { background: #fee2e2; color: var(--red); transform: rotate(90deg); }

        .mr-form { padding: 28px 32px; }
        .mr-form-group { margin-bottom: 20px; }
        .mr-form-group label {
          display: block; font-size: 13px; font-weight: 600;
          color: var(--text); margin-bottom: 8px;
        }
        .mr-form-group input,
        .mr-form-group select,
        .mr-form-group textarea {
          width: 100%; padding: 12px 14px;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-sm);
          font-size: 14px; font-family: var(--font);
          color: var(--text); background: var(--gray-50);
          transition: all .2s;
        }
        .mr-form-group input:focus,
        .mr-form-group select:focus,
        .mr-form-group textarea:focus {
          outline: none;
          border-color: var(--green);
          background: #fff;
          box-shadow: 0 0 0 3px var(--green-l);
        }
        .mr-form-group textarea { resize: vertical; line-height: 1.5; }
        .mr-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* TIME GRID */
        .mr-time-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px; margin-top: 10px;
        }
        .mr-time-slot {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 14px 10px; gap: 4px;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-sm);
          cursor: pointer; transition: all .2s;
          background: #fff;
        }
        .mr-time-slot:hover { border-color: var(--green); background: var(--green-l); }
        .mr-time-slot.selected { border-color: var(--green); background: var(--green-l); }
        .mr-slot-icon { font-size: 22px; }
        .mr-slot-time { font-size: 13px; font-weight: 700; }
        .mr-slot-lbl { font-size: 11px; color: var(--gray-600); }
        .mr-slot-check {
          position: absolute; top: 6px; right: 8px;
          color: var(--green); font-size: 14px; font-weight: 700;
        }

        .mr-offline-notice {
          background: #fef3c7; color: #92400e;
          padding: 10px 14px; border-radius: var(--radius-sm);
          font-size: 13px; margin-bottom: 16px;
          border-left: 3px solid #f59e0b;
        }

        .mr-btn-submit {
          width: 100%; padding: 14px;
          background: var(--green); color: #fff;
          border: none; border-radius: var(--radius-sm);
          font-size: 15px; font-weight: 700; cursor: pointer;
          transition: all .2s; margin-top: 24px;
          box-shadow: var(--shadow-sm);
        }
        .mr-btn-submit:hover { background: var(--green-d); transform: translateY(-1px); box-shadow: var(--shadow-md); }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .mr-sidebar { width: 220px; }
          .mr-main { margin-left: 220px; padding: 24px; }
        }
        @media (max-width: 768px) {
          .mr-sidebar { display: none; }
          .mr-main { margin-left: 0; padding: 20px; }
          .mr-header { flex-direction: column; }
          .mr-form-row { grid-template-columns: 1fr; }
          .mr-stats { grid-template-columns: repeat(2, 1fr); }
          .mr-modal { width: 96%; }
          .mr-modal-header, .mr-form { padding: 20px; }
        }
        @media (max-width: 480px) {
          .mr-stats { grid-template-columns: 1fr; }
          .mr-time-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default MedicineReminders;