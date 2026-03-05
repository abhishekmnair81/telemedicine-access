'use client';
import { useNavigate, Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import {
  FaRobot,
  FaVideo,
  FaPrescriptionBottle,
  FaCalendarCheck,
  FaChartLine,
  FaPills,
  FaUserMd,
  FaUsers,
  FaClock,
  FaAward,
  FaPhone,
  FaMapMarkerAlt,
  FaHeartbeat,
  FaAmbulance,
  FaCalendarAlt,
  FaCheckCircle,
  FaLaptopMedical,
  FaShieldAlt,
  FaChevronDown,
  FaStar,
  FaArrowRight,
  FaSearch,
  FaShoppingCart,
  FaTags,
  FaPercentage,
  FaBox,
  FaStethoscope,
  FaFirstAid,
  FaThermometerHalf,
  FaBolt,
  FaFire,
  FaGift,
  FaFileMedical,  
} from "react-icons/fa"

import { doctorsAPI, pharmacyAPI } from "../services/api"
import "./Dashboard.css"

const useCountAnimation = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      const numericEnd = parseFloat(end.toString().replace(/[^0-9.]/g, ''));
      const currentCount = Math.floor(progress * numericEnd);
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(numericEnd);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, end, duration]);

  return [count, ref];
};

const Dashboard = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState({ aiChatbot: true, stats: true })
  const [user, setUser] = useState(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  
  const [topDoctors, setTopDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [doctorsError, setDoctorsError] = useState(null)
  
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
        } else {
          setUser(null)
        }
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()

    const handleStorageChange = (e) => {
      if (e.key === 'user') loadUser()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    const fetchTopDoctors = async () => {
      try {
        setLoadingDoctors(true)
        const response = await doctorsAPI.getAllDoctors()
        
        let doctors = []
        if (Array.isArray(response)) {
          doctors = response
        } else if (response && Array.isArray(response.results)) {
          doctors = response.results
        }
        
        const sortedDoctors = doctors
          .sort((a, b) => {
            const ratingA = parseFloat(a.average_rating || 0)
            const ratingB = parseFloat(b.average_rating || 0)
            return ratingB - ratingA
          })
          .slice(0, 6)
        
        setTopDoctors(sortedDoctors)
        setDoctorsError(null)
      } catch (error) {
        setDoctorsError(error.message)
      } finally {
        setLoadingDoctors(false)
      }
    }

    fetchTopDoctors()
  }, [])

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoadingProducts(true)
        const response = await pharmacyAPI.getAllMedicines()
        
        let products = []
        if (Array.isArray(response)) {
          products = response
        } else if (response && Array.isArray(response.results)) {
          products = response.results
        }
        
        const availableProducts = products
          .filter(p => p.stock_quantity > 0)
          .slice(0, 8)
        
        setFeaturedProducts(availableProducts)
        setProductsError(null)
      } catch (error) {
        setProductsError(error.message)
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchFeaturedProducts()
  }, [])

  // Search Products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        setShowSearchDropdown(false)
        return
      }

      try {
        setSearchLoading(true)
        const response = await pharmacyAPI.searchMedicines(searchQuery)
        
        let results = []
        if (Array.isArray(response)) {
          results = response
        } else if (response && Array.isArray(response.results)) {
          results = response.results
        }
        
        setSearchResults(results.slice(0, 5))
        setShowSearchDropdown(true)
      } catch (error) {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const doctorLoginStatus     = user?.user_type === 'doctor'     ? 'true' : 'false'
  const patientLoginStatus    = user?.user_type === 'patient'    ? 'true' : 'false'
  const pharmacistLoginStatus = user?.user_type === 'pharmacist' ? 'true' : 'false'
  
  const isAnyUserLoggedIn  = doctorLoginStatus === 'true' || patientLoginStatus === 'true' || pharmacistLoginStatus === 'true'
  const isDoctorLoggedIn   = doctorLoginStatus === 'true'
  const isPatientLoggedIn  = patientLoginStatus === 'true'
  
  const [showDoctorDropdown,     setShowDoctorDropdown]     = useState(false)
  const [showPatientDropdown,    setShowPatientDropdown]    = useState(false)
  const [showPharmacistDropdown, setShowPharmacistDropdown] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    navigate('/')
  }
  
  const sectionRefs = {
    aiChatbot: useRef(null),
    stats:     useRef(null),
  }

  useEffect(() => {
    const observers = {}

    Object.keys(sectionRefs).forEach((key) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible((prev) => ({ ...prev, [key]: true }))
            }
          })
        },
        { threshold: 0.1 }
      )

      if (sectionRefs[key].current) {
        observer.observe(sectionRefs[key].current)
        observers[key] = observer
      }
    })

    return () => {
      Object.keys(observers).forEach((key) => {
        if (observers[key]) observers[key].disconnect()
      })
    }
  }, [])


  const allFeatures = [
    {
      icon: <FaRobot size={32} />,
      title: "AI Medical Assistant",
      description: "Get instant medical advice from our intelligent AI chatbot available 24/7",
      path: "/chat",
      hideForDoctor: false,
      hideForPatient: false,
    },
    {
      icon: <FaVideo size={32} />,
      title: "Video Consultation",
      description: "Connect face-to-face with certified doctors through secure video calls",
      path: "/teleconsult",
      hideForDoctor: false,
      hideForPatient: false,
    },

    {
      icon: <FaPrescriptionBottle size={32} />,
      title: "Digital Prescriptions",
      description: "Write and manage patient prescriptions digitally with full records",
      path: "/prescriptions",
      doctorOnly: true,       //  visible ONLY for doctors
      hideForDoctor: false,
      hideForPatient: true,   //  hidden from patients
    },

    {
      icon: <FaFileMedical size={32} />,
      title: "My Prescriptions",
      description: "View all your prescriptions securely — only visible to you",
      path: "/patient/prescriptions",
      patientOnly: true,      //  visible ONLY for patients
      hideForDoctor: true,    //  hidden from doctors
      hideForPatient: false,
    },

    {
      icon: <FaCalendarCheck size={32} />,
      title: "Appointment Booking",
      description: "Schedule appointments with doctors at your preferred time",
      path: "/appointments",
      hideForDoctor: true,
      hideForPatient: false,
    },
    {
      icon: <FaChartLine size={32} />,
      title: "Health Tracking",
      description: "Monitor your vital signs and track health metrics over time",
      path: "/health-tracking",
      hideForDoctor: true,
      hideForPatient: false,
    },
    {
      icon: <FaChartLine size={32} />,
      title: "Patient Health Tracking",
      description: "Monitor patient's vital signs and track health metrics over time",
      path: "/doctor-patient-health",
      hideForDoctor: false,
      hideForPatient: true,
    },
    {
      icon: <FaPills size={32} />,
      title: "Medicine Reminders",
      description: "Never miss your medication with smart reminders",
      path: "/medicines",
      hideForDoctor: true,
      hideForPatient: false,
    },
  ]

  
  const features = (() => {
    if (isDoctorLoggedIn) {
      return allFeatures.filter(f => !f.hideForDoctor && !f.patientOnly)
    }
    if (isPatientLoggedIn) {
      return allFeatures.filter(f => !f.hideForPatient && !f.doctorOnly)
    }
    return allFeatures.filter(f => !f.doctorOnly && !f.patientOnly && !f.hideForDoctor && !f.hideForPatient)
  })()

  const stats = [
    { icon: <FaUserMd size={24} />, number: "50+",   label: "Expert Doctors"    },
    { icon: <FaUsers  size={24} />, number: "5000+", label: "Happy Patients"    },
    { icon: <FaClock  size={24} />, number: "24/7",  label: "Available Support" },
    { icon: <FaAward  size={24} />, number: "100%",  label: "Satisfaction Rate" },
  ]

  const chatbotFeatures = [
    {
      icon: <FaCheckCircle size={24} />,
      title: "Instant Medical Support",
      description: "Get immediate responses to your health queries anytime, anywhere"
    },
    {
      icon: <FaLaptopMedical size={24} />,
      title: "AI-Powered Diagnosis",
      description: "Receive preliminary diagnoses based on advanced AI algorithms"
    },
    {
      icon: <FaShieldAlt size={24} />,
      title: "Secure & Private",
      description: "Your health data is encrypted and completely confidential"
    }
  ]

  const productCategories = [
    { icon: <FaPills />,           name: "Medicines",       color: "#22c55e", id: "medicines"       },
    { icon: <FaStethoscope />,     name: "Medical Devices", color: "#3b82f6", id: "medical-devices" },
    { icon: <FaFirstAid />,        name: "First Aid",       color: "#ef4444", id: "first-aid"       },
    { icon: <FaThermometerHalf />, name: "Health Care",     color: "#f59e0b", id: "health-care"     },
  ]

  const renderStars = (rating) => {
    const numericRating = parseFloat(rating || 0)
    const stars = []
    const fullStars = Math.floor(numericRating)
    const hasHalfStar = numericRating % 1 >= 0.5
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="star-filled" />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStar key={i} className="star-half" />)
      } else {
        stars.push(<FaStar key={i} className="star-empty" />)
      }
    }
    return stars
  }

  const handleDoctorClick = (doctor) => {
    navigate(`/doctor-detail/${doctor.id}`)
  }

  const handleProductClick = (product) => {
    navigate(`/pharmacy/product/${product.id}`)
  }

  const calculateDiscount = (mrp, price) => {
    if (!mrp || !price) return 0
    const discount = ((parseFloat(mrp) - parseFloat(price)) / parseFloat(mrp)) * 100
    return Math.round(discount)
  }

  if (isLoadingUser) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="apollo-main">

      <header className="apollo-topbar">
        <div className="apollo-info-strip">
          <div className="apollo-wrapper">
            <div className="apollo-contact-info">
              <span><FaPhone size={14} /> Emergency: 108 / 102</span>
              <span><FaClock size={14} /> 24/7 Available</span>
            </div>
            <div>
              <span><FaMapMarkerAlt size={14} /> Serving Rural India</span>
            </div>
          </div>
        </div>
        
        <div className="apollo-navbar-wrap">
          <div className="apollo-wrapper">
            <nav className="apollo-navigation">

              <div className="apollo-brand" onClick={() => navigate("/")}>
                <div className="apollo-brand-icon">
                  <FaHeartbeat size={24} />
                </div>
                <span className="apollo-brand-name">Rural HealthCare</span>
              </div>
              
              <div className="apollo-search-container">
                <div className="apollo-search-box">
                  <FaSearch className="apollo-search-icon" />
                  <input
                    type="text"
                    placeholder="Search for medicines, devices, healthcare products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  />
                  {searchQuery && (
                    <button 
                      className="apollo-search-clear"
                      onClick={() => {
                        setSearchQuery('')
                        setShowSearchDropdown(false)
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {showSearchDropdown && (
                  <div className="apollo-search-dropdown">
                    {searchLoading ? (
                      <div className="apollo-search-loading">
                        <div className="spinner-small"></div>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((product) => (
                          <div
                            key={product.id}
                            className="apollo-search-item"
                            onClick={() => {
                              handleProductClick(product)
                              setShowSearchDropdown(false)
                            }}
                          >
                            <div className="apollo-search-item-img">
                              {product.primary_image || (product.images && product.images[0]) ? (
                                <img src={product.primary_image || product.images[0].image_url} alt={product.name} />
                              ) : (
                                <FaBox />
                              )}
                            </div>
                            <div className="apollo-search-item-info">
                              <div className="apollo-search-item-name">{product.name}</div>
                              <div className="apollo-search-item-price">
                                ₹{product.price}
                                {product.mrp && product.mrp > product.price && (
                                  <>
                                    <span className="apollo-search-item-mrp">₹{product.mrp}</span>
                                    <span className="apollo-search-item-discount">
                                      {calculateDiscount(product.mrp, product.price)}% OFF
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="apollo-search-all" onClick={() => navigate(`/pharmacy/search?q=${searchQuery}`)}>
                          View all results for "{searchQuery}" <FaArrowRight size={12} />
                        </div>
                      </>
                    ) : searchQuery.length >= 2 ? (
                      <div className="apollo-search-empty">
                        <FaBox size={32} />
                        <p>No products found</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              <div className="apollo-menu-items">
                <a href="#features">Services</a>
                <a href="#top-doctors">Doctors</a>
                <a href="#pharmacy-products">Pharmacy</a>
                <a href="#ai-chatbot">AI Chatbot</a>

                {(!isAnyUserLoggedIn || doctorLoginStatus === 'true') && (
                  <div 
                    className="header-nav__item header-nav__item--dropdown"
                    onMouseEnter={() => setShowDoctorDropdown(true)}
                    onMouseLeave={() => setShowDoctorDropdown(false)}
                  >
                    <span 
                      className="header-nav__link header-nav__link--dropdown-toggle" 
                      role="button"
                      aria-expanded={showDoctorDropdown}
                      style={{ cursor: 'pointer' }}
                    >
                      Doctor <FaChevronDown size={10} />
                    </span>
                    <ul className={`header-dropdown__menu ${showDoctorDropdown ? 'show' : ''}`}>
                      {doctorLoginStatus !== 'true' ? (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=doctor&view=login">
                              Login
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=doctor&view=register">
                              Register
                            </Link>
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/doctor-dashboard">
                              Dashboard
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/prescriptions">
                              <FaPrescriptionBottle style={{ marginRight: 6 }} />
                              Prescriptions
                            </Link>
                          </li>
                          <li>
                            <div 
                              className="header-dropdown__item header-dropdown__item--danger" 
                              onClick={handleLogout}
                              style={{ cursor: 'pointer' }}
                            >
                              Logout
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {(!isAnyUserLoggedIn || patientLoginStatus === 'true') && (
                  <div 
                    className="header-nav__item header-nav__item--dropdown"
                    onMouseEnter={() => setShowPatientDropdown(true)}
                    onMouseLeave={() => setShowPatientDropdown(false)}
                  >
                    <span 
                      className="header-nav__link header-nav__link--dropdown-toggle" 
                      role="button"
                      aria-expanded={showPatientDropdown}
                      style={{ cursor: 'pointer' }}
                    >
                      Patient <FaChevronDown size={10} />
                    </span>
                    <ul className={`header-dropdown__menu ${showPatientDropdown ? 'show' : ''}`}>
                      {patientLoginStatus !== 'true' ? (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=patient&view=login">
                              Login
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=patient&view=register">
                              Register
                            </Link>
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/patient-dashboard">
                              Dashboard
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/patient/prescriptions">
                              <FaFileMedical style={{ marginRight: 6 }} />
                              My Prescriptions
                            </Link>
                          </li>
                          <li>
                            <div 
                              className="header-dropdown__item header-dropdown__item--danger" 
                              onClick={handleLogout}
                              style={{ cursor: 'pointer' }}
                            >
                              Logout
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {(!isAnyUserLoggedIn || pharmacistLoginStatus === 'true') && (
                  <div 
                    className="header-nav__item header-nav__item--dropdown"
                    onMouseEnter={() => setShowPharmacistDropdown(true)}
                    onMouseLeave={() => setShowPharmacistDropdown(false)}
                  >
                    <span 
                      className="header-nav__link header-nav__link--dropdown-toggle" 
                      role="button"
                      aria-expanded={showPharmacistDropdown}
                      style={{ cursor: 'pointer' }}
                    >
                      Pharmacist <FaChevronDown size={10} />
                    </span>
                    <ul className={`header-dropdown__menu ${showPharmacistDropdown ? 'show' : ''}`}>
                      {pharmacistLoginStatus !== 'true' ? (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=pharmacist&view=login">
                              Login
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/auth?type=pharmacist&view=register">
                              Register
                            </Link>
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <Link className="header-dropdown__item" to="/pharmacist-dashboard">
                              Dashboard
                            </Link>
                          </li>
                          <li>
                            <Link className="header-dropdown__item" to="/pharmacy-home">
                              Manage Pharmacy
                            </Link>
                          </li>
                          <li>
                            <div 
                              className="header-dropdown__item header-dropdown__item--danger" 
                              onClick={handleLogout}
                              style={{ cursor: 'pointer' }}
                            >
                              Logout
                            </div>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                <a href="/orders" title="My Orders" style={{ display: 'flex', alignItems: 'center' }}>
                  <FaBox size={20} />
                </a>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <section className="apollo-banner">
        <div className="apollo-wrapper">
          <div className="apollo-banner-grid">
            <div className="apollo-banner-content">
              <h1>
                Healthcare at Your <span>Doorstep</span>
              </h1>
              <p>
                Experience quality medical care with our AI-powered platform. Connect with doctors, get prescriptions,
                and manage your health - all from the comfort of your home.
              </p>
              <div className="apollo-action-btns">
                <button className="apollo-primary-btn" onClick={() => navigate("/chat")}>
                  <FaRobot size={16} /> Talk to AI Doctor
                </button>
                {!isDoctorLoggedIn && (
                  <button className="apollo-outline-btn" onClick={() => navigate("/appointments")}>
                    <FaCalendarAlt size={16} /> Book Appointment
                  </button>
                )}
              </div>
            </div>
            <div className="apollo-stats-badge">
              <h3>5000+</h3>
              <img 
                src="/all.PNG"
                alt="MedAI Chatbot Interface"
                className="apollo-bot-screenshots"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <p>Consultations Completed</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pharmacy-products-section" id="pharmacy-products">
        <div className="apollo-wrapper">
          <div className="apollo-section-title" style={{ textAlign: 'center', margin: '0 auto 60px' }}>
            <h2>Shop by Category</h2>
            <p>Quality healthcare products at your fingertips</p>
          </div>

          <div className="pharmacy-categories-grid">
            {productCategories.map((cat, idx) => (
              <div 
                key={idx}
                className="pharmacy-category-card"
                onClick={() => navigate(`/pharmacy/browse?category=${cat.id}`)}
              >
                <div className="pharmacy-cat-icon" style={{ color: cat.color }}>
                  {cat.icon}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>

          <div className="pharmacy-featured-header">
            <h3><FaFire /> Featured Products</h3>
            <button 
              className="apollo-outline-btn"
              onClick={() => navigate('/pharmacy/browse')}
            >
              View All Products <FaArrowRight size={12} />
            </button>
          </div>

          {loadingProducts ? (
            <div className="pharmacy-loading">
              <div className="loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : productsError ? (
            <div className="pharmacy-error">
              <p>Error loading products: {productsError}</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="pharmacy-empty">
              <FaBox size={48} />
              <p>No products available</p>
            </div>
          ) : (
            <div className="pharmacy-products-grid">
              {featuredProducts.slice(0, 4).map((product) => {
                const discount = calculateDiscount(product.mrp, product.price)
                return (
                  <div 
                    key={product.id}
                    className="pharmacy-product-card"
                    onClick={() => handleProductClick(product)}
                  >
                    {discount > 0 && (
                      <div className="pharmacy-product-badge">
                        <FaPercentage /> {discount}% OFF
                      </div>
                    )}
                    
                    <div className="pharmacy-product-image">
                      {product.primary_image || (product.images && product.images.length > 0) ? (
                        <img 
                          src={product.primary_image || product.images[0].image_url} 
                          alt={product.name}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextElementSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className="pharmacy-product-placeholder"
                        style={{ display: product.primary_image || (product.images && product.images.length > 0) ? 'none' : 'flex' }}
                      >
                        <FaBox />
                      </div>
                    </div>

                    <div className="pharmacy-product-content">
                      <h4 className="pharmacy-product-name">{product.name}</h4>
                      {product.generic_name && (
                        <p className="pharmacy-product-generic">{product.generic_name}</p>
                      )}
                      {product.manufacturer && (
                        <p className="pharmacy-product-manufacturer">
                          <FaBox size={10} /> {product.manufacturer}
                        </p>
                      )}

                      <div className="pharmacy-product-footer">
                        <div className="pharmacy-product-pricing">
                          <div className="pharmacy-product-price">₹{product.price}</div>
                          {product.mrp && product.mrp > product.price && (
                            <div className="pharmacy-product-mrp">
                              MRP <span>₹{product.mrp}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          className="pharmacy-add-to-cart"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              let sessionId = localStorage.getItem('pharmacy_session_id')
                              if (!sessionId) {
                                sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                                localStorage.setItem('pharmacy_session_id', sessionId)
                              }
                              
                              const response = await fetch('http://localhost:8000/api/cart/add_item/', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(user ? { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } : {})
                                },
                                body: JSON.stringify({ medicine_id: product.id, quantity: 1, session_id: sessionId })
                              })
                              
                              if (!response.ok) throw new Error('Failed to add to cart')
                              
                              const localCart = JSON.parse(localStorage.getItem('pharmacy_cart') || '[]')
                              const existingIndex = localCart.findIndex(item => item.id === product.id)
                              if (existingIndex !== -1) {
                                localCart[existingIndex].quantity += 1
                              } else {
                                localCart.push({ ...product, quantity: 1 })
                              }
                              localStorage.setItem('pharmacy_cart', JSON.stringify(localCart))
                              alert(`✅ ${product.name} added to cart!`)
                              window.dispatchEvent(new Event('cartUpdated'))
                            } catch (error) {
                              alert('❌ Failed to add to cart. Please try again.')
                            }
                          }}
                        >
                          <FaShoppingCart /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="pharmacy-offer-banner">
            <div className="pharmacy-offer-content">
              <div className="pharmacy-offer-icon">
                <FaGift size={32} />
              </div>
              <div>
                <h4>Special Offer!</h4>
                <p>Get up to 25% OFF on your first medicine order</p>
              </div>
            </div>
            <button className="apollo-primary-btn" onClick={() => navigate('/pharmacy/browse')}>
              <FaTags /> Shop Now
            </button>
          </div>
        </div>
      </section>

      <section className="top-doctors-section" id="top-doctors">
        <div className="apollo-wrapper">
          <div className="apollo-section-title" style={{ textAlign: 'center', margin: '0 auto 60px' }}>
            <h2>Our Top Rated Doctors</h2>
            <p>Meet our highly experienced medical professionals</p>
          </div>

          {loadingDoctors ? (
            <div className="doctors-loading">
              <div className="loading-spinner"></div>
              <p>Loading doctors...</p>
            </div>
          ) : doctorsError ? (
            <div className="doctors-error">
              <p>Error loading doctors: {doctorsError}</p>
            </div>
          ) : topDoctors.length === 0 ? (
            <div className="doctors-empty">
              <FaUserMd size={48} />
              <p>No doctors available</p>
            </div>
          ) : (
            <div className="doctors-grid">
              {topDoctors.map((doctor, index) => (
                <div 
                  key={doctor.id} 
                  className="doctor-item"
                  onClick={() => handleDoctorClick(doctor)}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="doctor-avatar-wrapper">
                    {doctor.user?.profile_picture_url ? (
                      <img 
                        src={doctor.user.profile_picture_url} 
                        alt={`Dr. ${doctor.user.first_name} ${doctor.user.last_name}`}
                        className="doctor-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className="doctor-avatar-placeholder"
                      style={{ display: doctor.user?.profile_picture_url ? 'none' : 'flex' }}
                    >
                      <FaUserMd />
                    </div>
                    <div className="doctor-status-indicator"></div>
                  </div>
                  
                  <h3 className="doctor-name">
                    Dr. {doctor.user?.first_name} {doctor.user?.last_name}
                  </h3>
                  
                  <div className="doctor-rating">
                    <div className="stars">{renderStars(doctor.average_rating)}</div>
                    <span className="rating-value">
                      {parseFloat(doctor.average_rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {topDoctors.length > 0 && (
            <div className="view-all-doctors">
              <button className="apollo-primary-btn" onClick={() => navigate("/doctors")}>
                View All Doctors <FaArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="apollo-ai-section" id="ai-chatbot" ref={sectionRefs.aiChatbot}>
        <div className="apollo-wrapper">
          <div className="apollo-ai-grid apollo-animate">
            <div className="apollo-img-box">
              <img 
                src="/med-bot.png"
                alt="MedAI Chatbot Interface"
                className="apollo-bot-screenshot"
                onError={(e) => {
                  e.target.style.border = '2px dashed #ccc';
                }}
              />
              <div className="apollo-live-indicator">
                <span style={{ fontSize: '10px' }}>●</span> Live
              </div>
            </div>
            <div className="apollo-ai-details">
              <h2>MedAI Chatbot</h2>
              <h3>Your 24/7 Digital Healthcare Assistant</h3>
              <p className="apollo-description">
                This AI medical chatbot is a cutting-edge digital assistant designed to provide users with professional 
                healthcare support and guidance. Featuring a futuristic interface adorned with medical symbols and AI 
                technology themes, it offers a user-friendly platform for patients to ask health-related questions, 
                receive preliminary diagnoses.
              </p>
              <div className="apollo-benefits-list">
                {chatbotFeatures.map((feature, idx) => (
                  <div key={idx} className="apollo-benefit-row">
                    <div className="apollo-benefit-icon">{feature.icon}</div>
                    <div className="apollo-benefit-info">
                      <h4>{feature.title}</h4>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="apollo-metrics" ref={sectionRefs.stats}>
        <div className="apollo-wrapper">
          <div className="apollo-metrics-row apollo-animate">
            {stats.map((stat, index) => {
              const StatBox = () => {
                const numericValue = parseFloat(stat.number.replace(/[^0-9.]/g, ''));
                const suffix = stat.number.includes('+') ? '+' : stat.number.includes('%') ? '%' : '';
                const [count, ref] = useCountAnimation(numericValue, 2000);
                
                return (
                  <div ref={ref} className="apollo-metric-box" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="apollo-metric-icon">{stat.icon}</div>
                    <div className="apollo-metric-value">
                      {stat.number === '24/7' ? '24/7' : `${count}${suffix}`}
                    </div>
                    <div className="apollo-metric-title">{stat.label}</div>
                  </div>
                );
              };
              return <StatBox key={index} />;
            })}
          </div>
        </div>
      </section>

      <section className="apollo-services" id="features">
        <div className="apollo-wrapper">
          <div className="apollo-section-title" style={{ textAlign: 'center', margin: '0 auto 60px' }}>
            <h2>Our Healthcare Services</h2>
            <p>
              Comprehensive medical solutions designed for rural communities with advanced technology and expert care
            </p>
          </div>
          <div className="apollo-services-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className="apollo-service-tile"
                onClick={() => navigate(feature.path)}
              >
                <div className="apollo-service-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
          
          <div className="apollo-emergency-box">
            <div className="apollo-emergency-info">
              <div className="apollo-emergency-ico">
                <FaAmbulance size={32} />
              </div>
              <div className="apollo-emergency-txt">
                <h3>Medical Emergency?</h3>
                <p>Call these numbers immediately for urgent medical assistance</p>
              </div>
            </div>
            <div className="apollo-emergency-contacts">
              <div className="apollo-emergency-num">
                <strong>108</strong>
                <span>Ambulance</span>
              </div>
              <div className="apollo-emergency-num">
                <strong>102</strong>
                <span>Medical Help</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="apollo-bottom" id="contact">
        <div className="apollo-wrapper">
          <div className="apollo-footer-grid">
            <div className="apollo-footer-about">
              <h3>Rural HealthCare</h3>
              <p>
                Making quality healthcare accessible to everyone in rural India through technology and compassionate care.
              </p>
            </div>
            <div className="apollo-footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="#features">Services</a></li>
                <li><a href="/chat">AI Assistant</a></li>
                <li>
                  <a href={user?.user_type === 'pharmacist' ? '/pharmacy-home' : '/pharmacy/browse'}>
                    Pharmacy
                  </a>
                </li>
                {isPatientLoggedIn && (
                  <li><a href="/patient/prescriptions">My Prescriptions</a></li>
                )}
                {isDoctorLoggedIn && (
                  <li><a href="/prescriptions">Prescriptions</a></li>
                )}
              </ul>
            </div>
            <div className="apollo-footer-col">
              <h4>Services</h4>
              <ul>
                <li><a href="/chat">AI Assistant</a></li>
                <li><a href="/teleconsult">Video Consult</a></li>
                {!isDoctorLoggedIn && <li><a href="/appointments">Appointments</a></li>}
                <li><a href="/pharmacy/browse">Pharmacy</a></li>
              </ul>
            </div>
          </div>
          <div className="apollo-copyright">
            <p>&copy; 2025 Rural HealthCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Dashboard