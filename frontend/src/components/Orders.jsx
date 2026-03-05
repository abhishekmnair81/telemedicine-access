import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBox,
  FaCheckCircle,
  FaTruck,
  FaClock,
  FaTimes,
  FaEye,
  FaArrowLeft,
  FaSpinner,
  FaMapMarkerAlt,
  FaPhone,
  FaReceipt,
  FaShoppingBag,
  FaHeartbeat,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaCircle,
  FaBoxOpen,
  FaFilter,
  FaTag,
  FaInfoCircle,
} from 'react-icons/fa'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

/* ── tiny helper: track steps ── */
const TRACK_STEPS = [
  { key: 'pending',          label: 'Order Placed',     icon: <FaReceipt /> },
  { key: 'confirmed',        label: 'Confirmed',         icon: <FaCheckCircle /> },
  { key: 'processing',       label: 'Processing',        icon: <FaBox /> },
  { key: 'out_for_delivery', label: 'Out for Delivery',  icon: <FaTruck /> },
  { key: 'delivered',        label: 'Delivered',         icon: <FaBoxOpen /> },
]

const STATUS_ORDER = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
}

const STATUS_COLOR = {
  pending:          '#f59e0b',
  confirmed:        '#3b82f6',
  processing:       '#8b5cf6',
  out_for_delivery: '#06b6d4',
  delivered:        '#22c55e',
  cancelled:        '#ef4444',
}

const STATUS_ICON = {
  pending:          <FaClock />,
  confirmed:        <FaCheckCircle />,
  processing:       <FaBox />,
  out_for_delivery: <FaTruck />,
  delivered:        <FaCheckCircle />,
  cancelled:        <FaTimes />,
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const fmtStatus = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const fmtAmt   = (n) => `₹${parseFloat(n || 0).toFixed(2)}`

/* ═══════════════════════════════════════════════════════════════
   TRACK ORDER MODAL
═══════════════════════════════════════════════════════════════ */
function TrackOrderModal({ order, onClose }) {
  const currentStep = STATUS_ORDER[order.order_status] ?? 0
  const isCancelled = order.order_status === 'cancelled'

  return (
    <div className="orders-modal-overlay" onClick={onClose}>
      <div className="orders-modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="orders-modal-header">
          <div>
            <h2 className="orders-modal-title">
              <FaTruck style={{ color: 'var(--apollo-green-primary)', marginRight: 10 }} />
              Track Order
            </h2>
            <p className="orders-modal-sub">Order #{order.order_number}</p>
          </div>
          <button className="orders-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="orders-modal-body">
          {isCancelled ? (
            <div className="orders-cancelled-banner">
              <FaTimes size={28} />
              <div>
                <strong>Order Cancelled</strong>
                <p>This order has been cancelled. Refund (if applicable) will be processed within 5–7 business days.</p>
              </div>
            </div>
          ) : (
            <div className="orders-stepper">
              {TRACK_STEPS.map((step, idx) => {
                const done    = idx <= currentStep
                const current = idx === currentStep
                const last    = idx === TRACK_STEPS.length - 1
                return (
                  <div key={step.key} className="orders-step-row">
                    <div className="orders-step-left">
                      <div
                        className={`orders-step-circle ${done ? 'done' : ''} ${current ? 'current' : ''}`}
                        style={done ? { background: 'var(--apollo-green-primary)' } : {}}
                      >
                        {step.icon}
                      </div>
                      {!last && (
                        <div
                          className="orders-step-line"
                          style={{ background: done && idx < currentStep ? 'var(--apollo-green-primary)' : '#e5e7eb' }}
                        />
                      )}
                    </div>
                    <div className="orders-step-info">
                      <span className={`orders-step-label ${done ? 'done' : ''}`}>{step.label}</span>
                      {current && (
                        <span className="orders-step-badge">Current Status</span>
                      )}
                      {step.key === 'pending' && (
                        <span className="orders-step-date">{formatDate(order.created_at)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Delivery Info */}
          <div className="orders-info-card">
            <h4 className="orders-info-title"><FaMapMarkerAlt /> Delivery Address</h4>
            <p className="orders-info-text">{order.delivery_address}</p>
            <p className="orders-info-text">
              <FaPhone style={{ marginRight: 6, color: 'var(--apollo-green-primary)' }} />
              {order.delivery_phone}
            </p>
          </div>

          {/* Status chip */}
          <div className="orders-status-row">
            <span className="orders-status-chip"
              style={{
                background: `${STATUS_COLOR[order.order_status]}18`,
                color: STATUS_COLOR[order.order_status],
                border: `2px solid ${STATUS_COLOR[order.order_status]}40`,
              }}>
              {STATUS_ICON[order.order_status]}
              {fmtStatus(order.order_status)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--apollo-text-secondary)' }}>
              Placed on {formatDate(order.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ORDER DETAIL MODAL
═══════════════════════════════════════════════════════════════ */
function OrderDetailModal({ order, onClose, onTrack }) {
  return (
    <div className="orders-modal-overlay" onClick={onClose}>
      <div className="orders-modal-box orders-modal-large" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="orders-modal-header">
          <div>
            <h2 className="orders-modal-title">
              <FaReceipt style={{ color: 'var(--apollo-green-primary)', marginRight: 10 }} />
              Order Details
            </h2>
            <p className="orders-modal-sub">#{order.order_number}</p>
          </div>
          <button className="orders-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="orders-modal-body">

          {/* Status Banner */}
          <div className="orders-detail-banner"
            style={{ background: `${STATUS_COLOR[order.order_status]}12`, borderLeft: `4px solid ${STATUS_COLOR[order.order_status]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, color: STATUS_COLOR[order.order_status] }}>
                {STATUS_ICON[order.order_status]}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: STATUS_COLOR[order.order_status] }}>
                  {fmtStatus(order.order_status)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--apollo-text-secondary)', marginTop: 2 }}>
                  Payment: <strong>{fmtStatus(order.payment_status)}</strong> · {fmtStatus(order.payment_method || 'cash_on_delivery')}
                </div>
              </div>
            </div>
            <button
              className="apollo-outline-btn"
              style={{ fontSize: 13, padding: '8px 16px' }}
              onClick={() => { onClose(); onTrack(order) }}
            >
              <FaTruck size={13} /> Track Order
            </button>
          </div>

          {/* Two-column grid */}
          <div className="orders-detail-grid">
            {/* Left: Items */}
            <div>
              <h4 className="orders-section-heading">Items Ordered</h4>
              <div className="orders-items-list">
                {order.order_items && order.order_items.length > 0 ? (
                  order.order_items.map((item, i) => (
                    <div key={i} className="orders-item-row">
                      <div className="orders-item-icon"><FaBox /></div>
                      <div className="orders-item-info">
                        <span className="orders-item-name">{item.medicine_name || item.name}</span>
                        <span className="orders-item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="orders-item-price">
                        {fmtAmt((parseFloat(item.price || 0) * item.quantity).toFixed(2))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--apollo-text-secondary)', fontSize: 14 }}>No items found</p>
                )}
              </div>
            </div>

            {/* Right: Summary + Delivery */}
            <div>
              <h4 className="orders-section-heading">Payment Summary</h4>
              <div className="orders-summary-card">
                {[
                  ['Subtotal', fmtAmt(order.subtotal)],
                  ['Delivery Charge', fmtAmt(order.delivery_charge)],
                  ...(parseFloat(order.discount) > 0
                    ? [['Discount', `-${fmtAmt(order.discount)}`, true]]
                    : []),
                ].map(([label, val, green]) => (
                  <div key={label} className="orders-summary-row">
                    <span>{label}</span>
                    <span style={green ? { color: '#22c55e', fontWeight: 600 } : {}}>{val}</span>
                  </div>
                ))}
                <div className="orders-summary-row orders-summary-total">
                  <span>Total</span>
                  <span>{fmtAmt(order.total_amount)}</span>
                </div>
              </div>

              <h4 className="orders-section-heading" style={{ marginTop: 20 }}>Delivery Info</h4>
              <div className="orders-summary-card">
                <div className="orders-delivery-row">
                  <FaMapMarkerAlt style={{ color: 'var(--apollo-green-primary)', marginTop: 2 }} />
                  <span>{order.delivery_address}</span>
                </div>
                <div className="orders-delivery-row">
                  <FaPhone style={{ color: 'var(--apollo-green-primary)' }} />
                  <span>{order.delivery_phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ORDERS PAGE
═══════════════════════════════════════════════════════════════ */
export default function Orders() {
  const navigate = useNavigate()
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [user,     setUser]     = useState(null)

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')

  const [trackOrder,  setTrackOrder]  = useState(null)
  const [detailOrder, setDetailOrder] = useState(null)

  /* ── load user ── */
  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    else    setLoading(false)
  }, [])

  /* ── fetch orders ── */
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('accessToken')
    setLoading(true)

    fetch(`${API_BASE_URL}/orders/my-orders/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders || data || [])
        setError(null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  /* ── filter + search ── */
  const visible = orders.filter(o => {
    const matchFilter = filter === 'all' || o.order_status === filter
    const matchSearch =
      !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      (o.order_items || []).some(i =>
        (i.medicine_name || i.name || '').toLowerCase().includes(search.toLowerCase())
      )
    return matchFilter && matchSearch
  })

  /* ── empty / loading / error states ── */
  if (!user) return (
    <GuestPage navigate={navigate} />
  )

  if (loading) return (
    <div className="orders-page">
      <div className="orders-loading-center">
        <div className="loading-spinner" />
        <p style={{ color: 'var(--apollo-text-secondary)', marginTop: 14 }}>Loading your orders…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="orders-page">
      <div className="orders-loading-center">
        <FaTimes size={48} style={{ color: '#ef4444', marginBottom: 14 }} />
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button className="apollo-primary-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  )

  return (
    <>
      <style>{CSS}</style>

      <div className="orders-page">
        {/* ── Top Bar (mirrors Dashboard apollo-topbar) ── */}
        <header className="apollo-topbar">
          <div className="apollo-info-strip">
            <div className="apollo-wrapper">
              <div className="apollo-contact-info">
                <span>My Orders</span>
              </div>
            </div>
          </div>
          <div className="apollo-navbar-wrap">
            <div className="apollo-wrapper">
              <nav className="apollo-navigation">
                <div className="apollo-brand" onClick={() => navigate('/')}>
                  <div className="apollo-brand-icon"><FaHeartbeat size={22} /></div>
                  <span className="apollo-brand-name">Rural HealthCare</span>
                </div>
                <button className="apollo-outline-btn" onClick={() => navigate(-1)}>
                  <FaArrowLeft size={13} /> Back
                </button>
              </nav>
            </div>
          </div>
        </header>

        <div className="apollo-wrapper" style={{ padding: '40px clamp(1rem,5vw,2rem)' }}>

          {/* ── Page Heading ── */}
          <div className="orders-page-head">
            <div>
              <h1 className="orders-page-title">
                <FaShoppingBag style={{ color: 'var(--apollo-green-primary)', marginRight: 12 }} />
                My Orders
              </h1>
              <p style={{ color: 'var(--apollo-text-secondary)', fontSize: 14, marginTop: 4 }}>
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              className="apollo-primary-btn"
              onClick={() => navigate('/pharmacy/browse')}
            >
              <FaBox size={14} /> Shop More
            </button>
          </div>

          {/* ── Search + Filter Bar ── */}
          <div className="orders-toolbar">
            <div className="orders-search-box">
              <FaSearch className="orders-search-icon" />
              <input
                placeholder="Search by order number or medicine…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="orders-search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </div>

            <div className="orders-filter-tabs">
              {['all','pending','confirmed','processing','out_for_delivery','delivered','cancelled'].map(s => (
                <button
                  key={s}
                  className={`orders-filter-tab ${filter === s ? 'active' : ''}`}
                  onClick={() => setFilter(s)}
                  style={filter === s && s !== 'all'
                    ? { background: `${STATUS_COLOR[s]}18`, color: STATUS_COLOR[s], borderColor: STATUS_COLOR[s] }
                    : {}}
                >
                  {s === 'all' ? 'All' : fmtStatus(s)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Orders List ── */}
          {visible.length === 0 ? (
            <EmptyState filter={filter} search={search} navigate={navigate} />
          ) : (
            <div className="orders-list">
              {visible.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={() => setDetailOrder(order)}
                  onTrack={() => setTrackOrder(order)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Modals ── */}
        {trackOrder  && <TrackOrderModal  order={trackOrder}  onClose={() => setTrackOrder(null)} />}
        {detailOrder && (
          <OrderDetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onTrack={(o) => { setDetailOrder(null); setTrackOrder(o) }}
          />
        )}
      </div>
    </>
  )
}

/* ── Single Order Card ── */
function OrderCard({ order, onView, onTrack }) {
  const [expanded, setExpanded] = useState(false)
  const color = STATUS_COLOR[order.order_status] || '#6b7280'
  const currentStep = STATUS_ORDER[order.order_status] ?? 0
  const isCancelled = order.order_status === 'cancelled'
  const progress = isCancelled ? 0 : Math.round((currentStep / (TRACK_STEPS.length - 1)) * 100)

  return (
    <div className="orders-card">
      {/* Card Header */}
      <div className="orders-card-top">
        <div className="orders-card-meta">
          <span className="orders-card-number">#{order.order_number}</span>
          <span className="orders-card-date">{formatDate(order.created_at)}</span>
        </div>
        <span
          className="orders-status-chip"
          style={{ background: `${color}18`, color, border: `2px solid ${color}40` }}
        >
          {STATUS_ICON[order.order_status]}
          {fmtStatus(order.order_status)}
        </span>
      </div>

      {/* Progress Bar */}
      {!isCancelled && (
        <div className="orders-progress-bar">
          <div className="orders-progress-track">
            <div className="orders-progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>
          <div className="orders-progress-labels">
            {TRACK_STEPS.map((step, idx) => (
              <span
                key={step.key}
                style={{ color: idx <= currentStep ? color : '#9ca3af', fontWeight: idx === currentStep ? 700 : 400 }}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items preview */}
      <div className="orders-card-items">
        {(order.order_items || []).slice(0, expanded ? undefined : 2).map((item, i) => (
          <div key={i} className="orders-card-item-row">
            <div className="orders-card-item-icon"><FaBox /></div>
            <span className="orders-card-item-name">{item.medicine_name || item.name}</span>
            <span className="orders-card-item-qty">×{item.quantity}</span>
            <span className="orders-card-item-price">
              {fmtAmt((parseFloat(item.price || 0) * item.quantity).toFixed(2))}
            </span>
          </div>
        ))}
        {(order.order_items || []).length > 2 && (
          <button className="orders-show-more" onClick={() => setExpanded(v => !v)}>
            {expanded
              ? <><FaChevronUp size={11} /> Show less</>
              : <><FaChevronDown size={11} /> +{order.order_items.length - 2} more items</>}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="orders-card-footer">
        <div className="orders-card-amount">
          <span className="orders-card-label">Total</span>
          <span className="orders-card-total">{fmtAmt(order.total_amount)}</span>
          <span
            className="orders-payment-badge"
            style={{
              background: order.payment_status === 'completed' ? '#22c55e18' : '#f59e0b18',
              color:      order.payment_status === 'completed' ? '#22c55e'   : '#f59e0b',
            }}
          >
            <FaTag size={10} /> {fmtStatus(order.payment_status)}
          </span>
        </div>
        <div className="orders-card-actions">
          <button className="apollo-outline-btn orders-btn-sm" onClick={onView}>
            <FaEye size={13} /> Details
          </button>
          {!isCancelled && (
            <button className="apollo-primary-btn orders-btn-sm" onClick={onTrack}>
              <FaTruck size={13} /> Track
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Guest Page ── */
function GuestPage({ navigate }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="orders-page">
        <div className="orders-loading-center">
          <div style={{ fontSize: 64, color: '#e5e7eb', marginBottom: 16 }}><FaShoppingBag /></div>
          <h3 style={{ fontSize: 22, color: 'var(--apollo-text-primary)', marginBottom: 8 }}>Please Login</h3>
          <p style={{ color: 'var(--apollo-text-secondary)', marginBottom: 24 }}>Login to view your orders</p>
          <button className="apollo-primary-btn" onClick={() => navigate('/auth?type=patient&view=login')}>
            Login Now
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Empty State ── */
function EmptyState({ filter, search, navigate }) {
  return (
    <div className="orders-loading-center">
      <div style={{ fontSize: 64, color: '#e5e7eb', marginBottom: 16 }}><FaBoxOpen /></div>
      <h3 style={{ fontSize: 20, color: 'var(--apollo-text-primary)', marginBottom: 8 }}>
        {search ? `No orders for "${search}"` : filter !== 'all' ? `No ${fmtStatus(filter)} orders` : 'No Orders Yet'}
      </h3>
      <p style={{ color: 'var(--apollo-text-secondary)', marginBottom: 24 }}>
        {search || filter !== 'all' ? 'Try adjusting your search or filter.' : "You haven't placed any orders yet."}
      </p>
      <button className="apollo-primary-btn" onClick={() => navigate('/pharmacy/browse')}>
        <FaBox /> Start Shopping
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CSS — matches Dashboard.css design system exactly
═══════════════════════════════════════════════════════════════ */
const CSS = `
/* ── Page wrapper ── */
.orders-page {
  min-height: 100vh;
  background: var(--apollo-gray-50, #f9fafb);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* ── Page heading ── */
.orders-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.orders-page-title {
  font-size: clamp(22px, 5vw, 32px);
  font-weight: 700;
  color: var(--apollo-text-primary, #1f2937);
  display: flex;
  align-items: center;
  letter-spacing: -0.5px;
}

/* ── Loading center ── */
.orders-loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 8px;
}

/* ── Toolbar ── */
.orders-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 28px;
  align-items: center;
}

.orders-search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 14px;
  flex: 1;
  min-width: 220px;
  transition: all .25s;
}
.orders-search-box:focus-within {
  border-color: var(--apollo-green-primary, #16a34a);
  box-shadow: 0 0 0 4px rgba(34,197,94,.1);
}
.orders-search-icon { color: #9ca3af; font-size: 15px; margin-right: 10px; flex-shrink: 0; }
.orders-search-box input {
  flex: 1; border: none; outline: none;
  padding: 11px 0; font-size: 14px; background: transparent;
  color: var(--apollo-text-primary, #1f2937);
}
.orders-search-box input::placeholder { color: #9ca3af; }
.orders-search-clear {
  background: #f3f4f6; border: none; border-radius: 50%;
  width: 22px; height: 22px; display: flex; align-items: center;
  justify-content: center; cursor: pointer; font-size: 18px;
  color: #6b7280; flex-shrink: 0; transition: background .2s;
}
.orders-search-clear:hover { background: #e5e7eb; }

.orders-filter-tabs {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.orders-filter-tab {
  padding: 7px 14px;
  border-radius: 20px;
  border: 2px solid #e5e7eb;
  background: #fff;
  font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .2s;
  color: var(--apollo-text-secondary, #6b7280);
}
.orders-filter-tab:hover { border-color: var(--apollo-green-primary, #16a34a); color: var(--apollo-green-primary, #16a34a); }
.orders-filter-tab.active { background: var(--apollo-green-primary, #16a34a); color: #fff; border-color: var(--apollo-green-primary, #16a34a); }

/* ── Orders list ── */
.orders-list { display: flex; flex-direction: column; gap: 20px; }

/* ── Order Card ── */
.orders-card {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all .3s ease;
  position: relative;
}
.orders-card:hover {
  border-color: var(--apollo-green-primary, #16a34a);
  box-shadow: 0 8px 24px rgba(34,197,94,.1);
  transform: translateY(-2px);
}

.orders-card-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 12px;
  flex-wrap: wrap; gap: 10px;
}
.orders-card-meta { display: flex; flex-direction: column; gap: 3px; }
.orders-card-number { font-size: 15px; font-weight: 700; color: var(--apollo-text-primary, #1f2937); }
.orders-card-date   { font-size: 12px; color: var(--apollo-text-secondary, #6b7280); }

/* Status chip */
.orders-status-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  border: 2px solid transparent;
}

/* ── Progress bar ── */
.orders-progress-bar { padding: 0 20px 14px; }
.orders-progress-track {
  height: 6px; background: #f3f4f6; border-radius: 4px; overflow: hidden; margin-bottom: 8px;
}
.orders-progress-fill {
  height: 100%; border-radius: 4px; transition: width .6s cubic-bezier(.4,0,.2,1);
}
.orders-progress-labels {
  display: flex; justify-content: space-between; font-size: 10px; font-weight: 600;
}

/* ── Items inside card ── */
.orders-card-items { padding: 0 20px 12px; border-top: 1px solid #f3f4f6; }
.orders-card-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px dashed #f3f4f6;
}
.orders-card-item-row:last-of-type { border-bottom: none; }
.orders-card-item-icon {
  width: 32px; height: 32px; background: var(--apollo-green-light, #dcfce7);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: var(--apollo-green-primary, #16a34a); font-size: 13px; flex-shrink: 0;
}
.orders-card-item-name { flex: 1; font-size: 13px; color: var(--apollo-text-primary, #1f2937); font-weight: 500; }
.orders-card-item-qty  { font-size: 12px; color: var(--apollo-text-secondary, #6b7280); font-weight: 600; }
.orders-card-item-price { font-size: 13px; font-weight: 700; color: var(--apollo-text-primary, #1f2937); min-width: 60px; text-align: right; }

.orders-show-more {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--apollo-green-primary, #16a34a);
  font-size: 12px; font-weight: 600; cursor: pointer; padding: 6px 0;
  transition: opacity .2s;
}
.orders-show-more:hover { opacity: .7; }

/* ── Card footer ── */
.orders-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  background: var(--apollo-gray-50, #f9fafb);
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap; gap: 12px;
}
.orders-card-amount { display: flex; align-items: center; gap: 10px; }
.orders-card-label  { font-size: 12px; color: var(--apollo-text-secondary, #6b7280); }
.orders-card-total  { font-size: 20px; font-weight: 800; color: var(--apollo-text-primary, #1f2937); }

.orders-payment-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
}

.orders-card-actions { display: flex; gap: 10px; }
.orders-btn-sm { padding: 8px 16px !important; font-size: 13px !important; }

/* ══════════════════════════════════════
   MODALS
══════════════════════════════════════ */
.orders-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
  z-index: 1500;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: overlayIn .2s ease;
}
@keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }

.orders-modal-box {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 520px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,.2);
  animation: modalIn .25s cubic-bezier(.34,1.56,.64,1);
}
.orders-modal-large { max-width: 780px; }

@keyframes modalIn {
  from { opacity: 0; transform: scale(.92) translateY(20px) }
  to   { opacity: 1; transform: scale(1)  translateY(0) }
}

.orders-modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 0;
  position: sticky; top: 0; background: #fff; z-index: 10;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 16px;
}
.orders-modal-title {
  font-size: 20px; font-weight: 700; color: var(--apollo-text-primary, #1f2937);
  display: flex; align-items: center;
}
.orders-modal-sub   { font-size: 13px; color: var(--apollo-text-secondary, #6b7280); margin-top: 3px; }
.orders-modal-close {
  background: #f3f4f6; border: none; border-radius: 50%;
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6b7280; font-size: 14px;
  transition: all .2s; flex-shrink: 0;
}
.orders-modal-close:hover { background: #fee2e2; color: #dc2626; }

.orders-modal-body { padding: 20px 24px 28px; }

/* ── Cancelled Banner ── */
.orders-cancelled-banner {
  display: flex; gap: 16px; align-items: flex-start;
  background: #fee2e2; border-radius: 10px; padding: 18px;
  color: #991b1b; margin-bottom: 20px;
}
.orders-cancelled-banner strong { display: block; font-size: 16px; margin-bottom: 4px; }
.orders-cancelled-banner p { font-size: 13px; margin: 0; }

/* ── Stepper ── */
.orders-stepper { margin-bottom: 24px; }
.orders-step-row  { display: flex; gap: 16px; }
.orders-step-left { display: flex; flex-direction: column; align-items: center; }

.orders-step-circle {
  width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid #e5e7eb; background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: #9ca3af;
  flex-shrink: 0; transition: all .3s; z-index: 1;
}
.orders-step-circle.done    { border-color: var(--apollo-green-primary, #16a34a); color: #fff; }
.orders-step-circle.current { box-shadow: 0 0 0 4px rgba(34,197,94,.2); }

.orders-step-line {
  width: 2px; flex: 1; min-height: 28px;
  margin: 4px 0; transition: background .4s;
}

.orders-step-info {
  flex: 1; padding-bottom: 20px;
  display: flex; flex-direction: column; gap: 4px; padding-top: 8px;
}
.orders-step-label      { font-size: 14px; font-weight: 600; color: #9ca3af; }
.orders-step-label.done { color: var(--apollo-text-primary, #1f2937); }
.orders-step-badge {
  display: inline-block;
  background: var(--apollo-green-light, #dcfce7);
  color: var(--apollo-green-primary, #16a34a);
  font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px;
}
.orders-step-date { font-size: 11px; color: var(--apollo-text-secondary, #6b7280); }

/* ── Info cards in modal ── */
.orders-info-card {
  background: var(--apollo-gray-50, #f9fafb);
  border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 16px; margin-bottom: 16px;
}
.orders-info-title {
  font-size: 13px; font-weight: 700; color: var(--apollo-text-secondary, #6b7280);
  text-transform: uppercase; letter-spacing: .5px;
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.orders-info-text { font-size: 14px; color: var(--apollo-text-primary, #1f2937); margin-bottom: 6px; }

.orders-status-row {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 10px; margin-top: 4px;
}

/* ── Detail Banner ── */
.orders-detail-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-radius: 10px; margin-bottom: 20px;
  flex-wrap: wrap; gap: 12px;
}

/* ── Detail grid ── */
.orders-detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
}
@media (max-width: 600px) { .orders-detail-grid { grid-template-columns: 1fr; } }

.orders-section-heading {
  font-size: 13px; font-weight: 700; color: var(--apollo-text-secondary, #6b7280);
  text-transform: uppercase; letter-spacing: .5px;
  margin: 0 0 12px;
}

.orders-items-list { display: flex; flex-direction: column; gap: 0; }
.orders-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px dashed #e5e7eb;
}
.orders-item-row:last-child { border-bottom: none; }
.orders-item-icon {
  width: 32px; height: 32px; background: var(--apollo-green-light, #dcfce7);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: var(--apollo-green-primary, #16a34a); font-size: 13px; flex-shrink: 0;
}
.orders-item-name  { flex: 1; font-size: 13px; font-weight: 500; color: var(--apollo-text-primary, #1f2937); }
.orders-item-qty   { font-size: 12px; color: var(--apollo-text-secondary, #6b7280); }
.orders-item-price { font-size: 13px; font-weight: 700; min-width: 70px; text-align: right; color: var(--apollo-text-primary, #1f2937); }

.orders-summary-card {
  background: var(--apollo-gray-50, #f9fafb);
  border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;
}
.orders-summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 14px; color: var(--apollo-text-secondary, #6b7280);
  border-bottom: 1px solid #e5e7eb;
}
.orders-summary-row:last-child { border-bottom: none; }
.orders-summary-total {
  font-size: 16px; font-weight: 700; color: var(--apollo-text-primary, #1f2937);
  padding-top: 12px; margin-top: 4px;
}

.orders-delivery-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 0; font-size: 14px; color: var(--apollo-text-primary, #1f2937);
  border-bottom: 1px solid #e5e7eb;
}
.orders-delivery-row:last-child { border-bottom: none; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .orders-toolbar { flex-direction: column; }
  .orders-search-box { min-width: 100%; }
  .orders-card-footer { flex-direction: column; align-items: flex-start; }
  .orders-card-actions { width: 100%; }
  .orders-card-actions .apollo-outline-btn,
  .orders-card-actions .apollo-primary-btn { flex: 1; justify-content: center; }
  .orders-progress-labels { display: none; }
  .orders-page-head { flex-direction: column; align-items: flex-start; }
}
`