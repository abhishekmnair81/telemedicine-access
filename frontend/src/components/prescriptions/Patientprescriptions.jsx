import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientPrescriptionsAPI } from '../../services/api';
import { generatePrescriptionPDF } from '../video/generatePrescriptionPDF';
import './Patientprescriptions.css';

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  rx:       'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
  pill:     'M10.5 6h3m-3 12h3M12 6v12M4.5 9.5l1.5 1.5M18 9.5l-1.5 1.5M4.5 14.5l1.5-1.5M18 14.5l-1.5-1.5',
  doctor:   'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  close:    'M18 6 6 18M6 6l12 12',
  search:   'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  back:     'M19 12H5m0 0 7 7m-7-7 7-7',
  empty:    'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z',
  alert:    'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  check:    'M20 6 9 17l-5-5',
  print:    'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  lock:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  refresh:  'M23 4v6h-6M1 20v-6h6m14.5-7A9 9 0 0 0 5.1 8.1L1 14m22-4-4.1 5.9A9 9 0 0 1 .5 14',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  spinner:  'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
};

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS = {
  active:    { label: 'Active',    color: '#22c55e', bg: '#f0fdf4' },
  completed: { label: 'Completed', color: '#3b82f6', bg: '#eff6ff' },
  cancelled: { label: 'Cancelled', color: '#94a3b8', bg: '#f8fafc' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysUntil = (date) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  return diff;
};

// ─── PrescriptionDownloadButton (mirrors VideoConsultation pattern) ──────────
const PrescriptionDownloadButton = ({
  prescription,
  size = 'md',
  variant = 'primary',
  label,
  showIcon = true,
  style = {},
  className = '',
}) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async (e) => {
    e.stopPropagation(); // prevent card click / modal events bubbling
    if (status === 'loading') return;
    if (!prescription) {
      setErrorMsg('No prescription data available');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await generatePrescriptionPDF(prescription);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      console.error('[PrescriptionDownloadButton] PDF generation failed:', err);
      setErrorMsg('Could not generate PDF. Please try again.');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const sizeMap = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '9px 16px', fontSize: '13px' },
    lg: { padding: '12px 22px', fontSize: '14px' },
  };

  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  const bgColor =
    status === 'success' ? '#16a34a' :
    status === 'error'   ? '#dc2626' :
    variant === 'outline' ? 'transparent' : '#00B38E';

  const textColor =
    variant === 'outline' && status === 'idle' ? '#00B38E' : '#ffffff';

  const borderStyle =
    variant === 'outline'
      ? `2px solid ${status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#00B38E'}`
      : 'none';

  const getIconPath = () => {
    if (status === 'loading') return ICONS.spinner;
    if (status === 'success') return ICONS.check;
    if (status === 'error')   return ICONS.alert;
    return ICONS.download;
  };

  const getLabel = () => {
    if (status === 'loading') return 'Generating…';
    if (status === 'success') return 'Downloaded!';
    if (status === 'error')   return 'Retry';
    return label || 'Download PDF';
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <button
        onClick={handleDownload}
        disabled={status === 'loading'}
        className={className}
        title="Download prescription as PDF"
        style={{
          ...sizeMap[size],
          background: bgColor,
          color: textColor,
          border: borderStyle,
          borderRadius: '8px',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          opacity: status === 'loading' ? 0.75 : 1,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {showIcon && (
          <svg
            width={iconSize} height={iconSize}
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={status === 'loading' ? { animation: 'pp-spin 0.9s linear infinite' } : {}}
          >
            <path d={getIconPath()} />
          </svg>
        )}
        {getLabel()}
      </button>
      {status === 'error' && errorMsg && (
        <p style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errorMsg}</p>
      )}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, color }) => (
  <div className="pp-stat-card">
    <div className="pp-stat-icon" style={{ background: color + '20', color }}>
      <Icon d={ICONS[icon]} size={22} color={color} />
    </div>
    <div>
      <div className="pp-stat-value">{value}</div>
      <div className="pp-stat-label">{label}</div>
    </div>
  </div>
);

// ─── Prescription Card ──────────────────────────────────────────────────────
const PrescriptionCard = ({ rx, onClick }) => {
  const st = STATUS[rx.status] || STATUS.active;
  const days = daysUntil(rx.follow_up_date);
  const meds = rx.medications || [];

  return (
    <div className="pp-card" onClick={() => onClick(rx)}>
      <div className="pp-card-accent" style={{ background: st.color }} />
      <div className="pp-card-body">
        <div className="pp-card-top">
          <div>
            <p className="pp-card-diagnosis">{rx.diagnosis || 'General Consultation'}</p>
            <p className="pp-card-doctor">
              <Icon d={ICONS.doctor} size={14} color="#64748b" />
              {rx.doctor_name || 'Unknown Doctor'}
              {rx.doctor_specialization && <span> · {rx.doctor_specialization}</span>}
            </p>
          </div>
          <span className="pp-badge" style={{ color: st.color, background: st.bg }}>
            {st.label}
          </span>
        </div>

        <div className="pp-card-meta">
          <span><Icon d={ICONS.pill} size={13} color="#64748b" />{meds.length} medication{meds.length !== 1 ? 's' : ''}</span>
          <span><Icon d={ICONS.calendar} size={13} color="#64748b" />{fmt(rx.date)}</span>
          {rx.hospital_name && <span>🏥 {rx.hospital_name}</span>}
        </div>

        {days !== null && days >= 0 && rx.status === 'active' && (
          <div className={`pp-followup ${days <= 7 ? 'urgent' : ''}`}>
            <Icon d={ICONS.alert} size={13} />
            Follow-up: {fmt(rx.follow_up_date)}{days <= 7 ? ` (${days}d)` : ''}
          </div>
        )}

        {/* ── Download button on card ── */}
        <div className="pp-card-actions" onClick={(e) => e.stopPropagation()}>
          <PrescriptionDownloadButton
            prescription={rx}
            size="sm"
            variant="outline"
            label="PDF"
            style={{ marginTop: '10px' }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Prescription Modal ─────────────────────────────────────────────────────
const PrescriptionModal = ({ rx, onClose }) => {
  if (!rx) return null;
  const st = STATUS[rx.status] || STATUS.active;
  const meds = rx.medications || [];
  const vitals = rx.vital_signs || {};
  const days = daysUntil(rx.follow_up_date);

  const handlePrint = () => window.print();

  return (
    <div className="pp-modal-backdrop" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pp-modal-header">
          <div>
            <div className="pp-modal-title">
              <Icon d={ICONS.rx} size={20} color="#fff" /> Prescription
              <span className="pp-modal-private"><Icon d={ICONS.lock} size={13} />Private</span>
            </div>
            <div className="pp-modal-date">{fmt(rx.date)}</div>
          </div>
          <div className="pp-modal-header-actions">
            {/* Print */}
            <button className="pp-icon-btn" title="Print" onClick={handlePrint}>
              <Icon d={ICONS.print} size={18} />
            </button>

            {/* Download PDF – uses the same component as VideoConsultation */}
            <PrescriptionDownloadButton
              prescription={rx}
              size="sm"
              variant="primary"
              label="PDF"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: '8px',
              }}
            />

            <button className="pp-icon-btn pp-close-btn" onClick={onClose}>
              <Icon d={ICONS.close} size={18} />
            </button>
          </div>
        </div>

        <div className="pp-modal-body">
          {/* Hospital stamp */}
          {(rx.hospital_name || rx.doctor_name) && (
            <div className="pp-stamp">
              <div className="pp-stamp-name">{rx.hospital_name || 'Medical Clinic'}</div>
              {rx.doctor_name && <div>{rx.doctor_name}{rx.doctor_specialization ? ` — ${rx.doctor_specialization}` : ''}</div>}
              {rx.doctor_registration && <div className="pp-stamp-reg">Reg: {rx.doctor_registration}</div>}
            </div>
          )}

          {/* Info cards */}
          <div className="pp-info-grid">
            <div className="pp-info-card">
              <h4>Patient</h4>
              <p>{rx.patient_name || '—'}</p>
              {rx.patient_age && <p>Age: {rx.patient_age}</p>}
              {rx.patient_gender && <p>Gender: {rx.patient_gender}</p>}
              {rx.patient_phone && <p>📞 {rx.patient_phone}</p>}
            </div>
            <div className="pp-info-card">
              <h4>Status</h4>
              <span className="pp-badge lg" style={{ color: st.color, background: st.bg }}>{st.label}</span>
              <p style={{ marginTop: 8 }}>Prescribed: {fmt(rx.date)}</p>
            </div>
          </div>

          {/* Diagnosis */}
          {rx.diagnosis && (
            <div className="pp-section">
              <h4 className="pp-section-title">Diagnosis</h4>
              <div className="pp-diagnosis-box">{rx.diagnosis}</div>
            </div>
          )}

          {/* Medications */}
          {meds.length > 0 && (
            <div className="pp-section">
              <h4 className="pp-section-title">Medications ({meds.length})</h4>
              <div className="pp-meds-list">
                {meds.map((med, i) => (
                  <div key={i} className="pp-med-row">
                    <div className="pp-med-num">{i + 1}</div>
                    <div className="pp-med-info">
                      <div className="pp-med-name">
                        <Icon d={ICONS.pill} size={15} color="#00B38E" />
                        {med.name}
                        {med.dosage && <span className="pp-med-dosage"> · {med.dosage}</span>}
                      </div>
                      <div className="pp-med-details">
                        {med.frequency && <span>🕐 {med.frequency}</span>}
                        {med.duration && <span>📅 {med.duration}</span>}
                        {med.instructions && <span>💊 {med.instructions}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vitals */}
          {Object.keys(vitals).length > 0 && (
            <div className="pp-section">
              <h4 className="pp-section-title">Vital Signs</h4>
              <div className="pp-vitals-grid">
                {Object.entries(vitals).map(([k, v]) => (
                  <div key={k} className="pp-vital-item">
                    <div className="pp-vital-label">{k.replace(/_/g, ' ')}</div>
                    <div className="pp-vital-value">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab tests */}
          {rx.lab_tests && (
            <div className="pp-section">
              <h4 className="pp-section-title">Lab Tests</h4>
              <div className="pp-notes-box">{rx.lab_tests}</div>
            </div>
          )}

          {/* Notes */}
          {rx.notes && (
            <div className="pp-section">
              <h4 className="pp-section-title">Doctor's Notes</h4>
              <div className="pp-notes-box">{rx.notes}</div>
            </div>
          )}

          {/* Follow-up */}
          {rx.follow_up_date && (
            <div className={`pp-followup-banner ${days !== null && days <= 7 ? 'urgent' : ''}`}>
              <Icon d={ICONS.calendar} size={18} />
              <div>
                <div className="pp-fu-title">Follow-up Appointment</div>
                <div className="pp-fu-date">{fmt(rx.follow_up_date)}
                  {days !== null && days >= 0 && <span> · {days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''} away`}</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── Bottom download bar ── */}
          <div className="pp-modal-download-bar">
            <PrescriptionDownloadButton
              prescription={rx}
              size="lg"
              variant="primary"
              label="Download Prescription PDF"
              style={{ width: '100%', justifyContent: 'center', borderRadius: '10px' }}
            />
          </div>

          <div className="pp-security-note">
            <Icon d={ICONS.lock} size={13} color="#94a3b8" /> This prescription is private and visible only to you.
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function PatientPrescriptions() {
  const navigate = useNavigate();
  const { id: urlId } = useParams();

  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || user.user_type !== 'patient') {
      navigate('/auth?type=patient&view=login');
    }
  }, [navigate]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rxRes, statsRes] = await Promise.allSettled([
        patientPrescriptionsAPI.getMyPrescriptions(filter, search),
        patientPrescriptionsAPI.getPrescriptionStats(),
      ]);

      if (rxRes.status === 'fulfilled') {
        const data = rxRes.value;
        const list = Array.isArray(data) ? data
          : Array.isArray(data?.prescriptions) ? data.prescriptions
          : Array.isArray(data?.results) ? data.results
          : [];
        setPrescriptions(list);
      } else {
        setError(rxRes.reason?.message || 'Failed to load prescriptions.');
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Open by URL param ─────────────────────────────────────────────────────
  useEffect(() => {
    if (urlId && prescriptions.length > 0) {
      const found = prescriptions.find(p => String(p.id) === String(urlId));
      if (found) setSelected(found);
    }
  }, [urlId, prescriptions]);

  // ── Debounced search ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Close modal on Escape ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pp-page">
      {/* Back nav */}
      <div className="pp-topbar">
        <button className="pp-back-btn" onClick={() => navigate(-1)}>
          <Icon d={ICONS.back} size={18} /> Back
        </button>
        <button className="pp-refresh-btn" onClick={fetchData} title="Refresh">
          <Icon d={ICONS.refresh} size={16} />
        </button>
      </div>

      {/* Page header */}
      <div className="pp-header">
        <div className="pp-header-icon">
          <Icon d={ICONS.rx} size={28} color="#fff" />
        </div>
        <div>
          <h1 className="pp-title">My Prescriptions</h1>
          <p className="pp-subtitle">Your complete medical prescription history</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="pp-stats-row">
          <StatCard icon="rx"       value={stats.total}              label="Total"        color="#00B38E" />
          <StatCard icon="check"    value={stats.active}             label="Active"       color="#22c55e" />
          <StatCard icon="pill"     value={stats.completed}          label="Completed"    color="#3b82f6" />
          <StatCard icon="calendar" value={stats.recent_90_days ?? '—'} label="Last 90 days" color="#a855f7" />
        </div>
      )}

      {/* Search + Filter */}
      <div className="pp-controls">
        <div className="pp-search-wrap">
          <Icon d={ICONS.search} size={16} color="#94a3b8" />
          <input
            className="pp-search"
            placeholder="Search by diagnosis, doctor or medicine…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="pp-clear-btn" onClick={() => setSearchInput('')}>
              <Icon d={ICONS.close} size={14} />
            </button>
          )}
        </div>
        <select className="pp-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="pp-loading">
          <div className="pp-spinner" />
          <p>Loading your prescriptions…</p>
        </div>
      )}

      {!loading && error && (
        <div className="pp-error">
          <Icon d={ICONS.alert} size={24} color="#ef4444" />
          <p>{error}</p>
          <button className="pp-retry-btn" onClick={fetchData}>Retry</button>
        </div>
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <div className="pp-empty">
          <Icon d={ICONS.empty} size={48} color="#cbd5e1" />
          <h3>No prescriptions found</h3>
          <p>{search || filter ? 'Try clearing your search or filter.' : 'Your prescriptions will appear here after a doctor visit.'}</p>
        </div>
      )}

      {!loading && !error && prescriptions.length > 0 && (
        <div className="pp-grid">
          {prescriptions.map((rx) => (
            <PrescriptionCard key={rx.id} rx={rx} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <PrescriptionModal rx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}