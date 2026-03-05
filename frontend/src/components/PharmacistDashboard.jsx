import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  FaPills,
  FaBoxOpen,
  FaShoppingCart,
  FaTruck,
  FaChartLine,
  FaSignOutAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaHeartbeat,
  FaBell,
  FaChevronDown,
  FaPrescriptionBottle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaClipboardList,
  FaSearch,
  FaPlus,
  FaEdit,
  FaEye,
  FaFilter,
  FaBarcode,
  FaClock,
  FaWarehouse,
} from "react-icons/fa"
import { authAPI, pharmacyAPI } from "../services/api"
import "./PharmacistDashboard.css"

const PharmacistDashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")

  // Dynamic stats from API
  const [stats, setStats] = useState({
    pendingOrders: 0,
    totalOrders: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    deliveriesInProgress: 0,
    totalMedicines: 0,
  })

  // Real data from API
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [analytics, setAnalytics] = useState(null)

  // ─── Auth Check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = () => {
      console.log("[PharmacistDashboard] Checking authentication...")
      const userData = authAPI.getCurrentUser()

      if (!userData) {
        console.log("[PharmacistDashboard] ❌ No user data - redirecting to login")
        setIsCheckingAuth(false)
        navigate("/auth?type=pharmacist&view=login")
        return
      }

      if (userData.user_type !== "pharmacist") {
        console.log("[PharmacistDashboard] ❌ Not a pharmacist:", userData.user_type)
        alert(
          `This is the pharmacist dashboard. You are logged in as ${userData.user_type}. Please logout and login as a pharmacist.`
        )
        setIsCheckingAuth(false)
        navigate("/")
        return
      }

      console.log("[PharmacistDashboard] ✅ Pharmacist authenticated:", userData.first_name, userData.last_name)
      setUser(userData)
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [navigate])

  // ─── Load Data when user is ready ──────────────────────────────────────────
  useEffect(() => {
    if (user && !isCheckingAuth) {
      loadDashboardData(user.id)
    }
  }, [user, isCheckingAuth])

  // ─── Auto-refresh every 30s ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isCheckingAuth) return
    const interval = setInterval(() => {
      console.log("[PharmacistDashboard] Auto-refreshing...")
      loadDashboardData(user.id)
    }, 30000)
    return () => clearInterval(interval)
  }, [user, isCheckingAuth])

  // ─── Main Data Loader ───────────────────────────────────────────────────────
  const loadDashboardData = async (pharmacistId) => {
    try {
      setLoading(true)
      console.log("\n" + "=".repeat(60))
      console.log("LOADING PHARMACIST DASHBOARD DATA:", pharmacistId)
      console.log("=".repeat(60))

      // ── 1. Dashboard overview (inventory + revenue + order stats) ──────────
      console.log("\n📊 Fetching pharmacy dashboard...")
      let dashboardData = null
      try {
        const res = await pharmacyAPI.getDashboard(pharmacistId)
        if (res && res.dashboard) {
          dashboardData = res.dashboard
          console.log("✅ Dashboard data:", dashboardData)
        }
      } catch (err) {
        console.error("❌ Dashboard fetch error:", err)
      }

      // ── 2. Medicines / Inventory ───────────────────────────────────────────
      console.log("\n💊 Fetching inventory...")
      let medicines = []
      try {
        const res = await pharmacyAPI.getAllMedicines()
        medicines = Array.isArray(res) ? res : res?.results || []
        console.log("✅ Medicines count:", medicines.length)
      } catch (err) {
        console.error("❌ Inventory fetch error:", err)
      }

      // ── 3. Orders ─────────────────────────────────────────────────────────
      console.log("\n🛒 Fetching orders...")
      let allOrders = []
      try {
        const res = await pharmacyAPI.getAllOrders()
        allOrders = Array.isArray(res) ? res : res?.results || []
        console.log("✅ Orders count:", allOrders.length)
      } catch (err) {
        console.error("❌ Orders fetch error:", err)
      }

      // ── 4. Prescriptions ──────────────────────────────────────────────────
      console.log("\n📋 Fetching prescriptions...")
      let allPrescriptions = []
      try {
        const res = await pharmacyAPI.getPharmacistPrescriptions({ limit: 20 })
        allPrescriptions = Array.isArray(res)
          ? res
          : res?.prescriptions || res?.results || []
        console.log("✅ Prescriptions count:", allPrescriptions.length)
      } catch (err) {
        console.error("❌ Prescriptions fetch error:", err)
      }

      // ── 5. Analytics ──────────────────────────────────────────────────────
      console.log("\n📈 Fetching analytics...")
      let analyticsData = null
      try {
        const res = await pharmacyAPI.getAnalytics(30)
        if (res && res.analytics) analyticsData = res.analytics
        console.log("✅ Analytics loaded")
      } catch (err) {
        console.error("❌ Analytics fetch error:", err)
      }

      // ── 6. Compute Stats ──────────────────────────────────────────────────
      const lowStock = medicines.filter(
        (m) => m.stock_quantity > 0 && m.stock_quantity <= (m.min_stock || 10)
      )
      const outOfStock = medicines.filter((m) => m.stock_quantity === 0)

      const pendingOrders = allOrders.filter((o) => o.order_status === "pending")
      const deliveryOrders = allOrders.filter((o) => o.order_status === "out_for_delivery")

      const today = new Date().toDateString()
      const todayOrders = allOrders.filter(
        (o) => new Date(o.created_at).toDateString() === today
      )
      const todayRevenue = todayOrders
        .filter((o) => o.payment_status === "completed")
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)

      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const monthlyRevenue = allOrders
        .filter(
          (o) =>
            o.payment_status === "completed" &&
            new Date(o.created_at) >= monthAgo
        )
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)

      // Prefer dashboard API values if available
      setStats({
        pendingOrders: dashboardData?.orders?.pending_orders ?? pendingOrders.length,
        totalOrders: dashboardData?.orders?.total_orders ?? allOrders.length,
        lowStockItems: dashboardData?.inventory?.low_stock_count ?? lowStock.length,
        outOfStockItems: dashboardData?.inventory?.out_of_stock_count ?? outOfStock.length,
        todayRevenue: dashboardData?.revenue?.today ?? todayRevenue,
        monthlyRevenue: dashboardData?.revenue?.month ?? monthlyRevenue,
        deliveriesInProgress: deliveryOrders.length,
        totalMedicines: dashboardData?.inventory?.total_medicines ?? medicines.length,
      })

      // Sort and slice for display
      setOrders(
        [...allOrders]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
      )
      setInventory(
        [...medicines].sort((a, b) => a.stock_quantity - b.stock_quantity)
      )
      setPrescriptions(
        [...allPrescriptions]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 20)
      )
      setAnalytics(analyticsData)

      console.log("\n" + "=".repeat(60))
      console.log("PHARMACIST DASHBOARD LOADED SUCCESSFULLY")
      console.log("=".repeat(60) + "\n")
    } catch (error) {
      console.error("❌ ERROR LOADING PHARMACIST DASHBOARD:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authAPI.logout()
    navigate("/auth?type=pharmacist&view=login")
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getStatusColor = (status) => {
    const map = {
      pending: "#92400e",
      pending_verification: "#92400e",
      confirmed: "#047857",
      verified: "#047857",
      processing: "#0070cd",
      out_for_delivery: "#8b5cf6",
      delivered: "#059669",
      completed: "#059669",
      cancelled: "#dc2626",
      low_stock: "#f59e0b",
      out_of_stock: "#dc2626",
      in_stock: "#059669",
    }
    return map[status] || "#6b7280"
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      pending_verification: "Pending Verification",
      verified: "Verified",
      low_stock: "Low Stock",
      out_of_stock: "Out of Stock",
      in_stock: "In Stock",
    }
    return labels[status] || status
  }

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`

  const formatDateTime = (dateString) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStockStatus = (item) => {
    if (item.stock_quantity === 0) return "out_of_stock"
    if (item.stock_quantity <= (item.min_stock || 10)) return "low_stock"
    return "in_stock"
  }

  // ─── Filtered views ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.delivery_phone?.includes(q) ||
      o.delivery_address?.toLowerCase().includes(q)
    )
  })

  const filteredInventory = inventory.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    )
  })

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      p.prescription_number?.toLowerCase().includes(q) ||
      p.patient_name?.toLowerCase().includes(q) ||
      p.patient_phone?.includes(q)
    )
  })

  // ─── Order action handler ─────────────────────────────────────────────────
  const handleOrderAction = async (orderId, newStatus) => {
    try {
      console.log(`[PharmacistDashboard] Updating order ${orderId} → ${newStatus}`)
      await pharmacyAPI.updateOrderStatus(orderId, newStatus)
      console.log("✅ Order updated")
      await loadDashboardData(user.id)
      alert(`Order ${newStatus} successfully!`)
    } catch (error) {
      console.error("❌ Order update error:", error)
      alert(`Failed to update order: ${error.message}`)
    }
  }

  // ─── Quick Actions ─────────────────────────────────────────────────────────
  const quickActions = [
    {
      icon: <FaShoppingCart size={24} />,
      title: "Process Orders",
      description: "View and process pending orders",
      onClick: () => setActiveTab("orders"),
      color: "#00b38e",
      urgent: stats.pendingOrders > 0,
      badge: stats.pendingOrders || null,
    },
    {
      icon: <FaBoxOpen size={24} />,
      title: "Inventory",
      description: "Manage stock and supplies",
      onClick: () => setActiveTab("inventory"),
      color: "#0070cd",
      urgent: stats.lowStockItems > 0 || stats.outOfStockItems > 0,
      badge: stats.lowStockItems + stats.outOfStockItems || null,
    },
    {
      icon: <FaPrescriptionBottle size={24} />,
      title: "Prescriptions",
      description: "Verify and fill prescriptions",
      onClick: () => setActiveTab("prescriptions"),
      color: "#8b5cf6",
    },
    {
      icon: <FaTruck size={24} />,
      title: "Deliveries",
      description: "Track ongoing deliveries",
      onClick: () => setActiveTab("orders"),
      color: "#ff6b35",
      badge: stats.deliveriesInProgress || null,
    },
    {
      icon: <FaChartLine size={24} />,
      title: "Analytics",
      description: "View revenue and reports",
      onClick: () => setActiveTab("analytics"),
      color: "#10b981",
    },
    {
      icon: <FaWarehouse size={24} />,
      title: "Add Medicine",
      description: "Add new product to inventory",
      onClick: () => navigate("/pharmacy-home"),
      color: "#f59e0b",
    },
  ]

  // ─── Loading / Auth Guard ──────────────────────────────────────────────────
  if (isCheckingAuth) {
    return (
      <div className="pharmacist-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="pharmacist-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pharmacist-dashboard">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="pharmacist-header">
        <div className="pharmacist-info-strip">
          <div className="pharmacist-wrapper">
            <div className="pharmacist-contact-info">
              <span>
                <FaPhone size={14} /> Emergency: 108 / 102
              </span>
              <span>
                <FaClock size={14} /> 24/7 Pharmacy Services
              </span>
            </div>
            <div>
              <span>
                <FaMapMarkerAlt size={14} /> Rural HealthCare Network
              </span>
            </div>
          </div>
        </div>

        <div className="pharmacist-navbar-wrap">
          <div className="pharmacist-wrapper">
            <nav className="pharmacist-navigation">
              <div
                className="pharmacist-brand"
                onClick={() => navigate("/pharmacist-dashboard")}
              >
                <div className="pharmacist-brand-icon">
                  <FaPills size={24} />
                </div>
                <span className="pharmacist-brand-name">Pharmacy Portal</span>
              </div>

              <div className="pharmacist-menu-items">
                <Link to="/pharmacy-home" className="pharmacist-nav-link">
                  Home
                </Link>
                <div
                  className="pharmacist-nav-link"
                  onClick={() => setActiveTab("orders")}
                  style={{ cursor: "pointer" }}
                >
                  Orders
                  {stats.pendingOrders > 0 && (
                    <span className="pharmacist-notification-badge">
                      {stats.pendingOrders}
                    </span>
                  )}
                </div>
                <div
                  className="pharmacist-nav-link"
                  onClick={() => setActiveTab("inventory")}
                  style={{ cursor: "pointer" }}
                >
                  Inventory
                  {stats.lowStockItems + stats.outOfStockItems > 0 && (
                    <span className="pharmacist-notification-badge">
                      {stats.lowStockItems + stats.outOfStockItems}
                    </span>
                  )}
                </div>

                <div
                  className="pharmacist-profile-dropdown"
                  onMouseEnter={() => setShowProfileDropdown(true)}
                  onMouseLeave={() => setShowProfileDropdown(false)}
                >
                  <button className="pharmacist-profile-btn">
                    <FaPills size={16} />
                    <span>
                      {user.first_name} {user.last_name}
                    </span>
                    <FaChevronDown size={12} />
                  </button>
                  
                  {showProfileDropdown && (
                    <div className="pharmacist-dropdown-menu">
                      <div
                        className="pharmacist-dropdown-item"
                        onClick={() => navigate('/pharmacist-profile')}
                      >
                        <FaPills /> My Profile
                      </div>
                      <div className="pharmacist-dropdown-divider"></div>
                      <div
                        className="pharmacist-dropdown-item"
                        onClick={handleLogout}
                      >
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

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="pharmacist-wrapper">
        {/* Welcome Banner */}
        <div className="pharmacist-welcome-banner">
          <div className="welcome-content">
            <h1>Welcome back, {user.first_name}!</h1>
            <p>
              {stats.pendingOrders > 0
                ? `You have ${stats.pendingOrders} pending order${stats.pendingOrders !== 1 ? "s" : ""} waiting for processing.`
                : "All orders are up to date. Manage pharmacy operations below."}
            </p>
          </div>
          <div className="welcome-illustration">
            <FaPills size={80} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pharmacist-stats-grid">
          <div
            className={`pharmacist-stat-card ${stats.pendingOrders > 0 ? "urgent" : ""}`}
          >
            <div className="stat-icon" style={{ background: "#fef3c7" }}>
              <FaShoppingCart
                style={{ color: "#92400e" }}
                size={24}
              />
            </div>
            <div className="stat-content">
              <h3>{stats.pendingOrders}</h3>
              <p>Pending Orders</p>
            </div>
            {stats.pendingOrders > 0 && (
              <div className="stat-alert">
                <FaBell /> Process Now
              </div>
            )}
          </div>

          <div
            className={`pharmacist-stat-card ${stats.outOfStockItems > 0 ? "urgent" : ""}`}
          >
            <div className="stat-icon" style={{ background: "#fee2e2" }}>
              <FaExclamationTriangle
                style={{ color: "#dc2626" }}
                size={24}
              />
            </div>
            <div className="stat-content">
              <h3>{stats.lowStockItems + stats.outOfStockItems}</h3>
              <p>Stock Alerts</p>
            </div>
            {(stats.lowStockItems + stats.outOfStockItems) > 0 && (
              <div className="stat-alert">
                <FaBell /> Restock Required
              </div>
            )}
          </div>

          <div className="pharmacist-stat-card">
            <div className="stat-icon" style={{ background: "#d1fae5" }}>
              <FaMoneyBillWave
                style={{ color: "#047857" }}
                size={24}
              />
            </div>
            <div className="stat-content">
              <h3>{formatCurrency(stats.todayRevenue)}</h3>
              <p>Today's Revenue</p>
            </div>
          </div>

          <div className="pharmacist-stat-card">
            <div className="stat-icon" style={{ background: "#e0e7ff" }}>
              <FaTruck style={{ color: "#4338ca" }} size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.deliveriesInProgress}</h3>
              <p>Active Deliveries</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pharmacist-quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`action-card ${action.urgent ? "urgent" : ""}`}
                onClick={action.onClick}
              >
                <div
                  className="action-icon"
                  style={{ background: `${action.color}15` }}
                >
                  <div style={{ color: action.color }}>{action.icon}</div>
                </div>
                <div className="action-content">
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
                {action.badge && (
                  <div className="action-badge">{action.badge}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="pharmacist-tabs">
          {[
            { id: "overview", label: "Overview", icon: <FaClipboardList /> },
            {
              id: "orders",
              label: `Orders`,
              icon: <FaShoppingCart />,
              badge: stats.pendingOrders,
            },
            {
              id: "inventory",
              label: `Inventory (${stats.totalMedicines})`,
              icon: <FaBoxOpen />,
              badge:
                stats.lowStockItems + stats.outOfStockItems || null,
            },
            {
              id: "prescriptions",
              label: "Prescriptions",
              icon: <FaPrescriptionBottle />,
            },
            { id: "analytics", label: "Analytics", icon: <FaChartLine /> },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id)
                setSearchQuery("")
              }}
            >
              {tab.icon} {tab.label}
              {tab.badge ? (
                <span className="tab-badge">{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="pharmacist-overview-section">
            <div className="overview-grid">
              {/* Revenue Card */}
              <div className="overview-card">
                <h3>
                  <FaMoneyBillWave /> Revenue Overview
                </h3>
                <div className="revenue-stats">
                  <div className="revenue-item">
                    <span className="revenue-label">Today</span>
                    <span className="revenue-value">
                      {formatCurrency(stats.todayRevenue)}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">This Month</span>
                    <span className="revenue-value">
                      {formatCurrency(stats.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Total Orders</span>
                    <span className="revenue-value">{stats.totalOrders}</span>
                  </div>
                </div>
              </div>

              {/* Stock Alerts */}
              <div className="overview-card">
                <h3>
                  <FaExclamationTriangle /> Stock Alerts
                </h3>
                {stats.lowStockItems === 0 && stats.outOfStockItems === 0 ? (
                  <div className="alert-item" style={{ borderLeftColor: "#059669", background: "#d1fae5" }}>
                    <FaCheckCircle style={{ color: "#059669" }} />
                    <div>
                      <strong>All Stock Levels Normal</strong>
                      <p>No restocking required at this time</p>
                    </div>
                  </div>
                ) : (
                  <div className="stock-alerts">
                    {stats.lowStockItems > 0 && (
                      <div className="alert-item warning">
                        <FaExclamationTriangle />
                        <div>
                          <strong>{stats.lowStockItems} Items Low Stock</strong>
                          <p>Reorder soon to avoid stockout</p>
                        </div>
                      </div>
                    )}
                    {stats.outOfStockItems > 0 && (
                      <div className="alert-item danger">
                        <FaTimesCircle />
                        <div>
                          <strong>
                            {stats.outOfStockItems} Items Out of Stock
                          </strong>
                          <p>Immediate action required</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="overview-card">
                <h3>
                  <FaShoppingCart /> Order Summary
                </h3>
                <div className="order-summary">
                  {[
                    {
                      label: "Pending",
                      count: stats.pendingOrders,
                      cls: "badge-warning",
                    },
                    {
                      label: "Processing",
                      count: orders.filter((o) => o.order_status === "processing").length,
                      cls: "badge-info",
                    },
                    {
                      label: "Out for Delivery",
                      count: stats.deliveriesInProgress,
                      cls: "badge-purple",
                    },
                    {
                      label: "Total",
                      count: stats.totalOrders,
                      cls: "badge-success",
                    },
                  ].map((item) => (
                    <div key={item.label} className="summary-item">
                      <span>{item.label}</span>
                      <span className={`badge ${item.cls}`}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders preview in overview */}
            {orders.length > 0 && (
              <div className="pharmacist-section" style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h2>
                    <FaShoppingCart /> Recent Orders
                  </h2>
                  <button
                    className="btn-filter"
                    onClick={() => setActiveTab("orders")}
                  >
                    View All
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Phone</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>{order.order_number || `#${order.id}`}</strong>
                          </td>
                          <td>{order.delivery_phone || "—"}</td>
                          <td>
                            <strong>
                              {formatCurrency(order.total_amount)}
                            </strong>
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                background: `${getStatusColor(order.order_status)}20`,
                                color: getStatusColor(order.order_status),
                              }}
                            >
                              {getStatusLabel(order.order_status)}
                            </span>
                          </td>
                          <td>{formatDateTime(order.created_at)}</td>
                          <td>
                            <div className="action-buttons-group">
                              {order.order_status === "pending" && (
                                <button
                                  className="action-btn confirm-btn"
                                  onClick={() =>
                                    handleOrderAction(order.id, "confirmed")
                                  }
                                >
                                  <FaCheckCircle /> Confirm
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Orders Tab ────────────────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="pharmacist-section">
            <div className="section-header">
              <h2>
                <FaShoppingCart /> Orders ({filteredOrders.length})
              </h2>
              <div className="header-actions">
                <div className="search-box">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search by order # or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn-filter"
                  onClick={() => loadDashboardData(user.id)}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Delivery Info</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>
                            {order.order_number || `#${order.id}`}
                          </strong>
                        </td>
                        <td>
                          <div className="patient-name">
                            {order.delivery_phone || "—"}
                          </div>
                          <div className="delivery-address">
                            {order.delivery_address
                              ? order.delivery_address.slice(0, 40) +
                                (order.delivery_address.length > 40 ? "…" : "")
                              : "—"}
                          </div>
                        </td>
                        <td>
                          {Array.isArray(order.order_items)
                            ? `${order.order_items.length} item(s)`
                            : "—"}
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(order.total_amount)}
                          </strong>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              background: `${getStatusColor(order.payment_status)}20`,
                              color: getStatusColor(order.payment_status),
                              fontSize: 11,
                            }}
                          >
                            {order.payment_status || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              background: `${getStatusColor(order.order_status)}20`,
                              color: getStatusColor(order.order_status),
                            }}
                          >
                            {getStatusLabel(order.order_status)}
                          </span>
                        </td>
                        <td>{formatDateTime(order.created_at)}</td>
                        <td>
                          <div className="action-buttons-group">
                            {order.order_status === "pending" && (
                              <>
                                <button
                                  className="action-btn confirm-btn"
                                  onClick={() =>
                                    handleOrderAction(order.id, "confirmed")
                                  }
                                >
                                  <FaCheckCircle /> Confirm
                                </button>
                                <button
                                  className="action-btn cancel-btn"
                                  onClick={() =>
                                    handleOrderAction(order.id, "cancelled")
                                  }
                                >
                                  <FaTimesCircle /> Cancel
                                </button>
                              </>
                            )}
                            {order.order_status === "confirmed" && (
                              <button
                                className="action-btn confirm-btn"
                                onClick={() =>
                                  handleOrderAction(order.id, "processing")
                                }
                              >
                                <FaShoppingCart /> Process
                              </button>
                            )}
                            {order.order_status === "processing" && (
                              <button
                                className="action-btn confirm-btn"
                                onClick={() =>
                                  handleOrderAction(order.id, "out_for_delivery")
                                }
                              >
                                <FaTruck /> Dispatch
                              </button>
                            )}
                            {order.order_status === "out_for_delivery" && (
                              <button
                                className="action-btn confirm-btn"
                                onClick={() =>
                                  handleOrderAction(order.id, "delivered")
                                }
                              >
                                <FaCheckCircle /> Delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaShoppingCart size={48} />
                <h3>No Orders Found</h3>
                <p>
                  {searchQuery
                    ? `No orders match "${searchQuery}"`
                    : "Orders will appear here once patients place them"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Inventory Tab ─────────────────────────────────────────────────── */}
        {activeTab === "inventory" && (
          <div className="pharmacist-section">
            <div className="section-header">
              <h2>
                <FaBoxOpen /> Inventory ({filteredInventory.length})
              </h2>
              <div className="header-actions">
                <div className="search-box">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/pharmacy-home")}
                >
                  <FaPlus /> Add Medicine
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading inventory...</p>
              </div>
            ) : filteredInventory.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Price / MRP</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const stockStatus = getStockStatus(item)
                      return (
                        <tr
                          key={item.id}
                          className={
                            stockStatus === "out_of_stock" ? "urgent-row" : ""
                          }
                        >
                          <td>
                            <div className="patient-name">{item.name}</div>
                            {item.generic_name && (
                              <div className="delivery-address">
                                {item.generic_name}
                              </div>
                            )}
                          </td>
                          <td style={{ textTransform: "capitalize" }}>
                            {(item.category || "").replace(/_/g, " ")}
                          </td>
                          <td>
                            <div className="stock-info">
                              <span
                                className={`stock-value ${item.stock_quantity <= (item.min_stock || 10) ? "low" : ""}`}
                              >
                                {item.stock_quantity} units
                              </span>
                              <span className="min-stock">
                                Min: {item.min_stock || 10}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>
                                {formatCurrency(item.price)}
                              </strong>
                              {item.mrp && item.mrp !== item.price && (
                                <div
                                  className="delivery-address"
                                  style={{
                                    textDecoration: "line-through",
                                    fontSize: 12,
                                  }}
                                >
                                  MRP {formatCurrency(item.mrp)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {item.expiry_date
                              ? new Date(item.expiry_date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                background: `${getStatusColor(stockStatus)}20`,
                                color: getStatusColor(stockStatus),
                              }}
                            >
                              {getStatusLabel(stockStatus)}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="action-btn view-btn"
                                onClick={() =>
                                  navigate(
                                    `/pharmacy/product/${item.id}`
                                  )
                                }
                              >
                                <FaEye /> View
                              </button>
                              {item.stock_quantity <=
                                (item.min_stock || 10) && (
                                <button
                                  className="action-btn confirm-btn"
                                  onClick={() =>
                                    navigate("/pharmacy-home")
                                  }
                                >
                                  <FaPlus /> Restock
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <FaBoxOpen size={48} />
                <h3>No Medicines Found</h3>
                <p>
                  {searchQuery
                    ? `No medicines match "${searchQuery}"`
                    : "Add medicines to your inventory to get started"}
                </p>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/pharmacy-home")}
                >
                  <FaPlus /> Add Medicine
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Prescriptions Tab ─────────────────────────────────────────────── */}
        {activeTab === "prescriptions" && (
          <div className="pharmacist-section">
            <div className="section-header">
              <h2>
                <FaPrescriptionBottle /> Prescriptions (
                {filteredPrescriptions.length})
              </h2>
              <div className="header-actions">
                <div className="search-box">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search by patient or Rx#..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn-filter"
                  onClick={() => loadDashboardData(user.id)}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading prescriptions...</p>
              </div>
            ) : filteredPrescriptions.length > 0 ? (
              <div className="prescriptions-grid">
                {filteredPrescriptions.map((prescription) => (
                  <div key={prescription.id} className="prescription-card">
                    <div className="prescription-header">
                      <h3>
                        {prescription.prescription_number ||
                          `RX-${prescription.id}`}
                      </h3>
                      <span
                        className="status-badge-small"
                        style={{
                          background: `${getStatusColor(prescription.status)}20`,
                          color: getStatusColor(prescription.status),
                        }}
                      >
                        {getStatusLabel(prescription.status)}
                      </span>
                    </div>
                    <div className="prescription-body">
                      <p>
                        <strong>Patient:</strong>{" "}
                        {prescription.patient_name || "—"}
                      </p>
                      <p>
                        <strong>Phone:</strong>{" "}
                        {prescription.patient_phone || "—"}
                      </p>
                      <p>
                        <strong>Doctor:</strong>{" "}
                        {prescription.doctor_name || "—"}
                      </p>
                      {prescription.diagnosis && (
                        <p>
                          <strong>Diagnosis:</strong>{" "}
                          {prescription.diagnosis}
                        </p>
                      )}
                      {Array.isArray(prescription.medications) &&
                        prescription.medications.length > 0 && (
                          <>
                            <p>
                              <strong>Medications:</strong>
                            </p>
                            <ul className="medication-list">
                              {prescription.medications
                                .slice(0, 4)
                                .map((med, idx) => (
                                  <li key={idx}>
                                    {typeof med === "object"
                                      ? `${med.name || ""} ${med.dosage || ""} – ${med.frequency || ""}`
                                      : med}
                                  </li>
                                ))}
                              {prescription.medications.length > 4 && (
                                <li>
                                  +{prescription.medications.length - 4} more
                                </li>
                              )}
                            </ul>
                          </>
                        )}
                      <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                        <strong>Date:</strong>{" "}
                        {formatDateTime(prescription.created_at)}
                      </p>
                    </div>
                    <div className="prescription-actions">
                      <button className="btn-view">
                        <FaEye /> View Details
                      </button>
                      {(prescription.status === "pending_verification" ||
                        prescription.status === "active") && (
                        <button className="btn-primary">
                          <FaCheckCircle /> Verify & Fill
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FaPrescriptionBottle size={48} />
                <h3>No Prescriptions Found</h3>
                <p>
                  {searchQuery
                    ? `No prescriptions match "${searchQuery}"`
                    : "Prescriptions from doctors will appear here"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div className="pharmacist-overview-section">
            <div className="overview-grid">
              <div className="overview-card">
                <h3>
                  <FaChartLine /> Revenue Summary
                </h3>
                <div className="revenue-stats">
                  <div className="revenue-item">
                    <span className="revenue-label">Today</span>
                    <span className="revenue-value">
                      {formatCurrency(stats.todayRevenue)}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">This Month (30d)</span>
                    <span className="revenue-value">
                      {formatCurrency(stats.monthlyRevenue)}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Avg. Order Value</span>
                    <span className="revenue-value">
                      {stats.totalOrders > 0
                        ? formatCurrency(
                            stats.monthlyRevenue / stats.totalOrders
                          )
                        : "₹0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <h3>
                  <FaBoxOpen /> Inventory Health
                </h3>
                <div className="revenue-stats">
                  <div className="revenue-item">
                    <span className="revenue-label">Total Products</span>
                    <span className="revenue-value">
                      {stats.totalMedicines}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Low Stock</span>
                    <span
                      className="revenue-value"
                      style={{
                        color:
                          stats.lowStockItems > 0 ? "#f59e0b" : "#059669",
                      }}
                    >
                      {stats.lowStockItems}
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Out of Stock</span>
                    <span
                      className="revenue-value"
                      style={{
                        color:
                          stats.outOfStockItems > 0 ? "#dc2626" : "#059669",
                      }}
                    >
                      {stats.outOfStockItems}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <h3>
                  <FaShoppingCart /> Order Pipeline
                </h3>
                <div className="order-summary">
                  {[
                    { label: "Pending", status: "pending" },
                    { label: "Processing", status: "processing" },
                    { label: "Out for Delivery", status: "out_for_delivery" },
                    { label: "Delivered", status: "delivered" },
                    { label: "Cancelled", status: "cancelled" },
                  ].map((item) => (
                    <div key={item.status} className="summary-item">
                      <span>{item.label}</span>
                      <span
                        className="badge"
                        style={{
                          background: `${getStatusColor(item.status)}20`,
                          color: getStatusColor(item.status),
                        }}
                      >
                        {
                          orders.filter(
                            (o) => o.order_status === item.status
                          ).length
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category breakdown from inventory */}
            {inventory.length > 0 && (
              <div className="pharmacist-section" style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h2>
                    <FaBoxOpen /> Inventory by Category
                  </h2>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Products</th>
                        <th>Total Stock</th>
                        <th>Out of Stock</th>
                        <th>Low Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        inventory.reduce((acc, m) => {
                          const cat = (m.category || "other").replace(/_/g, " ")
                          if (!acc[cat])
                            acc[cat] = {
                              total: 0,
                              stock: 0,
                              outOfStock: 0,
                              lowStock: 0,
                            }
                          acc[cat].total++
                          acc[cat].stock += m.stock_quantity || 0
                          if (m.stock_quantity === 0) acc[cat].outOfStock++
                          else if (m.stock_quantity <= (m.min_stock || 10))
                            acc[cat].lowStock++
                          return acc
                        }, {})
                      )
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([cat, data]) => (
                          <tr key={cat}>
                            <td style={{ textTransform: "capitalize" }}>
                              {cat}
                            </td>
                            <td>{data.total}</td>
                            <td>{data.stock.toLocaleString()} units</td>
                            <td>
                              <span
                                style={{
                                  color:
                                    data.outOfStock > 0
                                      ? "#dc2626"
                                      : "#059669",
                                  fontWeight: 600,
                                }}
                              >
                                {data.outOfStock}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  color:
                                    data.lowStock > 0 ? "#f59e0b" : "#059669",
                                  fontWeight: 600,
                                }}
                              >
                                {data.lowStock}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="pharmacist-footer">
          <div className="pharmacist-wrapper">
            <div className="footer-content">
              <div className="footer-section">
                <h4>Rural HealthCare Pharmacy</h4>
                <p>
                  Your trusted pharmacy partner for quality medicines and
                  healthcare supplies.
                </p>
              </div>
              <div className="footer-section">
                <h4>Quick Links</h4>
                <ul>
                  <li>
                    <Link to="/pharmacy-home">Home</Link>
                  </li>
                  <li>
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => setActiveTab("orders")}
                    >
                      Orders
                    </span>
                  </li>
                  <li>
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => setActiveTab("inventory")}
                    >
                      Inventory
                    </span>
                  </li>
                  <li>
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => setActiveTab("analytics")}
                    >
                      Analytics
                    </span>
                  </li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Support</h4>
                <ul>
                  <li>
                    <a href="#help">Help Center</a>
                  </li>
                  <li>
                    <a href="#contact">Contact Us</a>
                  </li>
                  <li>
                    <a href="#privacy">Privacy Policy</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <p>
                &copy; 2025 Rural HealthCare. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default PharmacistDashboard