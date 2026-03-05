import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPills, FaSearch, FaTruck, FaUserMd, FaPhone, FaClock, 
  FaMapMarkerAlt, FaHeartbeat, FaStar, FaCheckCircle, FaShieldAlt,
  FaChevronRight, FaUpload, FaStethoscope, FaClipboardList, 
  FaBoxOpen, FaChevronDown, FaSignOutAlt, FaUser, FaHome, FaTag,
  FaHospital, FaFileInvoice, FaPlus, FaEdit, FaTrash, FaExclamationTriangle,
  FaChartLine, FaCog, FaImage, FaTimes, FaBox, FaChartBar, FaBell,
  FaCalendar, FaUsers, FaFileAlt, FaWarehouse, FaDollarSign, 
  FaArrowUp, FaArrowDown, FaFire, FaBolt, FaGift, FaRocket, 
  FaMoon, FaSun, FaCamera, FaSyringe, FaFirstAid, FaBaby,
  FaMedkit, FaFlask, FaVial, FaThermometerHalf, FaPrescriptionBottle,
  FaChevronLeft, FaFilter
} from 'react-icons/fa';
import { authAPI, pharmacyAPI } from '../services/api';
import './PharmacistHomepage.css';
import AddMedicineWithAI from './AddMedicineWithAI';

const PharmacistHomepage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true); // ← ADD THIS LINE!
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Dashboard states
  const [dashboardData, setDashboardData] = useState(null);
  
  // ✅ NEW: Separate states for medicines and other products
  const [activeTab, setActiveTab] = useState('medicines'); // 'medicines' or 'other'
  const [medicines, setMedicines] = useState([]);
  const [otherProducts, setOtherProducts] = useState([]);
  
  // Product management states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productForm, setProductForm] = useState({
    name: '',
    generic_name: '',
    manufacturer: '',
    brand: '',
    category: 'antibiotics',
    form: 'tablet', 
    strength: '',
    price: '',
    mrp: '', 
    stock_quantity: '0',
    requires_prescription: false,
    description: '',
    pack_size: '',
    storage_instructions: 'room_temp', 
    expiry_date: '',
    batch_number: '',
  });

  // Notification state
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Low stock alert: Paracetamol', type: 'warning', time: '15 min ago' },
    { id: 2, message: 'Expiring soon: Cough Syrup (Batch A123)', type: 'warning', time: '1 hour ago' },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Fetch medicines and other products separately
      const [medicinesData, otherProductsData] = await Promise.all([
        pharmacyAPI.getMedicinesOnly(),
        pharmacyAPI.getOtherProductsOnly()
      ]);
      
      setMedicines(medicinesData);
      setOtherProducts(otherProductsData);
      
      console.log('[PharmacistHomepage] ✅ Data loaded successfully');
      console.log(`  Medicines: ${medicinesData.length}`);
      console.log(`  Other Products: ${otherProductsData.length}`);
      
    } catch (error) {
      console.error('[PharmacistHomepage] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);

useEffect(() => {
  // Try immediately
  const checkUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoadingUser(false);
        return true;
      } catch (error) {
        console.error('[PharmacistHomepage] Error parsing user:', error);
        return false;
      }
    }
    return false;
  };

  if (checkUser()) return;
  
  // Try again after 100ms
  const timer1 = setTimeout(() => {
    if (checkUser()) return;
  }, 100);
  
  // Try again after 200ms
  const timer2 = setTimeout(() => {
    checkUser();
  }, 200);
  
  // Listen for storage changes
  const handleStorageChange = () => {
    console.log('[PharmacistHomepage] Storage changed, reloading user...');
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsLoadingUser(false);
      } catch (error) {
        console.error('[PharmacistHomepage] Error parsing user on storage change:', error);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
    window.removeEventListener('storage', handleStorageChange);
  };
}, []);

// ✅ REPLACE your existing redirect useEffect with this:
useEffect(() => {
  // Only check after user loading is complete
  if (isLoadingUser) {
    console.log('[PharmacistHomepage] Still loading user...');
    return;
  }
  
  if (!user) {
    console.log('[PharmacistHomepage] No user logged in, redirecting to auth...');
    navigate('/auth?type=pharmacist&view=login');
    return;
  }
  
  if (user.user_type !== 'pharmacist') {
    console.log('[PharmacistHomepage] Non-pharmacist user detected, redirecting...');
    alert('Access Denied: This page is only accessible to pharmacists.');
    
    if (user.user_type === 'patient') {
      navigate('/');
    } else if (user.user_type === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/');
    }
  }
}, [user, isLoadingUser, navigate]);

  const loadDashboard = async (pharmacistId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/pharmacy/dashboard/?pharmacist_id=${pharmacistId}`);
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('[PharmacistHomepage] Error loading dashboard:', error);
    }
  };

  // ✅ UPDATED: Separate medicine and other product categories
  const medicineCategories = [
    { 
      icon: <FaPills />, 
      name: 'Prescription Medicines', 
      path: '/pharmacy/medicines?type=prescription', 
      color: '#00b38e', 
      gradient: 'linear-gradient(135deg, #00b38e, #00d4a1)',
      items: ['Antibiotics', 'Painkillers', 'Anti-inflammatory']
    },
    { 
      icon: <FaPrescriptionBottle />, 
      name: 'OTC Medicines', 
      path: '/pharmacy/medicines?type=otc', 
      color: '#0070cd', 
      gradient: 'linear-gradient(135deg, #0070cd, #3b82f6)',
      items: ['Cough Syrup', 'Antacids', 'Pain Relief']
    },
    { 
      icon: <FaFlask />, 
      name: 'Ayurvedic', 
      path: '/pharmacy/medicines?type=ayurvedic', 
      color: '#10b981', 
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      items: ['Herbal Medicines', 'Natural Supplements']
    },
    { 
      icon: <FaVial />, 
      name: 'Homeopathic', 
      path: '/pharmacy/medicines?type=homeopathy', 
      color: '#7c3aed', 
      gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
      items: ['Dilutions', 'Tablets', 'Ointments']
    },
  ];

  const otherCategories = [
    { 
      icon: <FaStethoscope />, 
      name: 'Medical Devices', 
      path: '/pharmacy/devices', 
      color: '#f59e0b', 
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      items: ['BP Monitors', 'Glucometers', 'Thermometers']
    },
    { 
      icon: <FaFirstAid />, 
      name: 'First Aid', 
      path: '/pharmacy/first-aid', 
      color: '#dc2626', 
      gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
      items: ['Bandages', 'Antiseptics', 'First Aid Kits']
    },
    { 
      icon: <FaSyringe />, 
      name: 'Surgical Items', 
      path: '/pharmacy/surgical', 
      color: '#ec4899', 
      gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
      items: ['Syringes', 'Gloves', 'Surgical Masks']
    },
    { 
      icon: <FaBaby />, 
      name: 'Baby Care', 
      path: '/pharmacy/baby-care', 
      color: '#06b6d4', 
      gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
      items: ['Diapers', 'Baby Food', 'Baby Wipes']
    },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pharmacy/search?q=${encodeURIComponent(searchQuery)}&tab=${activeTab}`);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    navigate('/');
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `pharma-toast pharma-toast-${type}`;
    toast.innerHTML = `
      <div class="pharma-toast-content">
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('pharma-toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  // Image Upload Handlers
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      validateAndPreviewImages(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      validateAndPreviewImages(files);
    } else {
      showToast('❌ Please drop image files', 'error');
    }
  };

  const validateAndPreviewImages = (files) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    const maxImages = 5;
    
    if (selectedImages.length + files.length > maxImages) {
      showToast(`❌ Maximum ${maxImages} images allowed per product`, 'error');
      return;
    }
    
    const validFiles = [];
    const newPreviews = [];
    
    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        showToast(`❌ Invalid file type: ${file.name}. Use JPG, PNG, or WebP`, 'error');
        return;
      }
      
      if (file.size > maxSize) {
        showToast(`❌ File too large: ${file.name}. Must be less than 5MB`, 'error');
        return;
      }
      
      validFiles.push(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === validFiles.length) {
          setImagePreviews(prev => [...prev, ...newPreviews]);
          setSelectedImages(prev => [...prev, ...validFiles]);
          showToast(`✅ ${validFiles.length} image(s) added`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    if (currentImageIndex >= imagePreviews.length - 1) {
      setCurrentImageIndex(Math.max(0, imagePreviews.length - 2));
    }
    
    showToast('✅ Image removed', 'success');
  };

  const clearImages = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    setCurrentImageIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const navigateImage = (direction) => {
    if (direction === 'next') {
      setCurrentImageIndex(prev => (prev + 1) % imagePreviews.length);
    } else {
      setCurrentImageIndex(prev => (prev - 1 + imagePreviews.length) % imagePreviews.length);
    }
  };

  const handleAddProduct = (type = 'medicines') => {
    setEditingProduct(null);
    clearImages();
    
    // ✅ Set default category based on type
    const defaultCategory = type === 'medicines' ? 'antibiotics' : 'thermometers';
    
    setProductForm({
      name: '',
      generic_name: '',
      manufacturer: '',
      brand: '',
      category: defaultCategory,
      form: 'tablet',           
      strength: '',
      price: '',                
      mrp: '',                  
      stock_quantity: '0',
      requires_prescription: false,
      description: '',
      pack_size: '',
      storage_instructions: 'room_temp',
      expiry_date: '',
      batch_number: '',
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    clearImages();
    
    if (product.images && product.images.length > 0) {
      setImagePreviews(product.images.map(img => img.image_url || img.url));
    } else if (product.image_url) {
      setImagePreviews([product.image_url]);
    }
    
    setProductForm({
      name: product.name,
      generic_name: product.generic_name || '',
      manufacturer: product.manufacturer || '',
      brand: product.brand || '',
      category: product.category,
      form: product.form || '',
      strength: product.strength || '',
      price: product.price,
      mrp: product.mrp || product.price,
      stock_quantity: product.stock_quantity,
      requires_prescription: product.requires_prescription || false,
      description: product.description || '',
      pack_size: product.pack_size || '',
      storage_instructions: product.storage_instructions || '',
      expiry_date: product.expiry_date || '',
      batch_number: product.batch_number || '',
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (!productForm.name?.trim()) {
        showToast('❌ Product name is required', 'error');
        return;
      }
      
      if (!productForm.category) {
        showToast('❌ Product category is required', 'error');
        return;
      }
      
      const medicineCategories = [
        'medicines', 'prescription_drugs', 'otc_medicines',
        'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
      ];
      const isMedicine = medicineCategories.includes(productForm.category?.toLowerCase());
      
      if (isMedicine && !productForm.form) {
        showToast('❌ Medicine form (tablet/capsule/syrup) is required', 'error');
        return;
      }
      
      const price = parseFloat(productForm.price);
      const mrp = parseFloat(productForm.mrp || productForm.price);
      const stock = parseInt(productForm.stock_quantity || 0);
      
      if (isNaN(price) || price <= 0) {
        showToast('❌ Valid selling price is required', 'error');
        return;
      }
      
      if (isNaN(mrp) || mrp <= 0) {
        showToast('❌ Valid MRP is required', 'error');
        return;
      }
      
      if (price > mrp) {
        showToast('❌ Selling price cannot exceed MRP', 'error');
        return;
      }
      
      if (isNaN(stock) || stock < 0) {
        showToast('❌ Valid stock quantity is required', 'error');
        return;
      }
      
      const cleanedData = {
        name: productForm.name.trim(),
        category: productForm.category,
        form: productForm.form || '', 
        price: price.toFixed(2),
        mrp: mrp.toFixed(2),
        stock_quantity: stock.toString(),
        generic_name: productForm.generic_name?.trim() || '',
        manufacturer: productForm.manufacturer?.trim() || '',
        brand: productForm.brand?.trim() || '',
        strength: productForm.strength?.trim() || '',
        description: productForm.description?.trim() || '',
        pack_size: productForm.pack_size?.trim() || '',
        storage_instructions: productForm.storage_instructions || 'room_temp',
        batch_number: productForm.batch_number?.trim() || '',
        expiry_date: productForm.expiry_date || '',
        requires_prescription: Boolean(productForm.requires_prescription),
      };
      
      setUploadProgress(10);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      if (editingProduct) {
        if (selectedImages.length > 0) {
          await pharmacyAPI.updateMedicineWithImages(
            editingProduct.id, 
            cleanedData, 
            selectedImages,
            (progress) => setUploadProgress(progress)
          );
        } else {
          await pharmacyAPI.updateMedicine(editingProduct.id, cleanedData);
        }
        showToast('✅ Product updated successfully!', 'success');
      } else {
        if (selectedImages.length > 0) {
          await pharmacyAPI.createMedicineWithImages(
            cleanedData,
            selectedImages,
            (progress) => setUploadProgress(progress)
          );
        } else {
          await pharmacyAPI.createMedicine(cleanedData);
        }
        showToast('✅ Product added successfully!', 'success');
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const allProducts = await pharmacyAPI.getAllMedicines();
      const medicineCats = [
        'medicines', 'prescription_drugs', 'otc_medicines',
        'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
      ];

      setMedicines(allProducts.filter(p => medicineCats.includes(p.category?.toLowerCase())));
      setOtherProducts(allProducts.filter(p => !medicineCats.includes(p.category?.toLowerCase())));
      
      if (user) {
        loadDashboard(user.id);
      }
      
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: '',
        form: '',
        price: '',
        mrp: '',
        stock_quantity: '',
        generic_name: '',
        manufacturer: '',
        brand: '',
        strength: '',
        description: '',
        pack_size: '',
        storage_instructions: 'room_temp',
        batch_number: '',
        expiry_date: '',
        requires_prescription: false,
      });
      setUploadProgress(0);
      clearImages();
      
    } catch (error) {
      console.error('Error saving product:', error);
      let errorMsg = 'Failed to save product';
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error) {
            errorMsg = parsedError.error;
          }
        } catch (e) {
          errorMsg = error.message;
        }
      }
      showToast(`❌ ${errorMsg}`, 'error');
      setUploadProgress(0);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('⚠️ Are you sure you want to delete this product?')) {
      try {
        await pharmacyAPI.deleteMedicine(productId);
        showToast('✅ Product deleted successfully!', 'success');
        
        // ✅ RELOAD: Refresh both lists
        const allProducts = await pharmacyAPI.getAllMedicines();
        const medicineCategories = [
          'medicines', 'prescription_drugs', 'otc_medicines',
          'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
        ];
        
        setMedicines(allProducts.filter(p => medicineCategories.includes(p.category?.toLowerCase())));
        setOtherProducts(allProducts.filter(p => !medicineCategories.includes(p.category?.toLowerCase())));
        
        if (user) {
          loadDashboard(user.id);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast('❌ Error deleting product', 'error');
      }
    }
  };

  const renderDashboardStats = () => {
    if (!dashboardData) return null;

    const stats = [
      {
        icon: <FaBoxOpen />,
        value: dashboardData.inventory.total_products,
        label: 'Total Products',
        subtext: 'All categories',
        trend: '+12%',
        trendUp: true,
        color: '#00b38e',
        bgGradient: 'linear-gradient(135deg, rgba(0, 179, 142, 0.1), rgba(0, 212, 161, 0.05))'
      },
      {
        icon: <FaExclamationTriangle />,
        value: dashboardData.inventory.low_stock_count,
        label: 'Low Stock Items',
        subtext: 'Needs restocking',
        trend: '-8%',
        trendUp: false,
        color: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05))'
      },
      {
        icon: <FaCalendar />,
        value: dashboardData.inventory.expiring_soon_count,
        label: 'Expiring Soon',
        subtext: 'Within 90 days',
        trend: '+5%',
        trendUp: false,
        color: '#dc2626',
        bgGradient: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(239, 68, 68, 0.05))'
      },
      {
        icon: <FaDollarSign />,
        value: `₹${dashboardData.revenue.today.toFixed(2)}`,
        label: "Today's Revenue",
        subtext: `₹${dashboardData.revenue.week.toFixed(2)} this week`,
        trend: '+18%',
        trendUp: true,
        color: '#0070cd',
        bgGradient: 'linear-gradient(135deg, rgba(0, 112, 205, 0.1), rgba(59, 130, 246, 0.05))'
      }
    ];

    return (
      <div className="pharma-stats-container-ultra">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="pharma-stat-card-ultra"
            style={{ background: stat.bgGradient }}
          >
            <div className="pharma-stat-header-ultra">
              <div 
                className="pharma-stat-icon-ultra"
                style={{ color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className={`pharma-stat-trend-ultra ${stat.trendUp ? 'trend-up' : 'trend-down'}`}>
                {stat.trendUp ? <FaArrowUp /> : <FaArrowDown />}
                <span>{stat.trend}</span>
              </div>
            </div>
            <div className="pharma-stat-content-ultra">
              <h3 style={{ color: stat.color }}>{stat.value}</h3>
              <p>{stat.label}</p>
              <span className="pharma-stat-subtext-ultra">{stat.subtext}</span>
            </div>
            <div className="pharma-stat-sparkline" style={{ background: `${stat.color}20` }}></div>
          </div>
        ))}
      </div>
    );
  };

  const renderProductModal = () => {
    if (!showProductModal) return null;

    const isMedicine = productForm.category === 'medicines' || 
                      productForm.category === 'prescription_drugs' || 
                      productForm.category === 'otc_medicines' ||
                      productForm.category === 'antibiotics' ||
                      productForm.category === 'painkillers' ||
                      productForm.category === 'vitamins' ||
                      productForm.category === 'ayurvedic' ||
                      productForm.category === 'homeopathy';

    // ✅ FIX 1: handleAISave now properly saves AI-autofilled product to backend
    const handleAISave = async (payload, imageFiles, onProgress) => {
      try {
        console.log('[handleAISave] Saving product:', payload);
        console.log('[handleAISave] Image files:', imageFiles?.length ?? 0);
        console.log('[handleAISave] Editing:', editingProduct?.id ?? 'new');

        if (editingProduct) {
          // UPDATE existing product
          if (imageFiles && imageFiles.length > 0) {
            await pharmacyAPI.updateMedicineWithImages(
              editingProduct.id,
              payload,
              imageFiles,
              onProgress
            );
          } else {
            await pharmacyAPI.updateMedicine(editingProduct.id, payload);
          }
          showToast(`✅ "${payload.name}" updated successfully!`, 'success');
        } else {
          // CREATE new product
          if (imageFiles && imageFiles.length > 0) {
            await pharmacyAPI.createMedicineWithImages(
              payload,
              imageFiles,
              onProgress
            );
          } else {
            await pharmacyAPI.createMedicine(payload);
          }
          showToast(`✅ "${payload.name}" added! Patients can now purchase it.`, 'success');
        }

        // Refresh both product lists so new/updated item appears immediately
        const allProducts = await pharmacyAPI.getAllMedicines();
        const medicineCats = [
          'medicines', 'prescription_drugs', 'otc_medicines',
          'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
        ];
        setMedicines(allProducts.filter(p => medicineCats.includes(p.category?.toLowerCase())));
        setOtherProducts(allProducts.filter(p => !medicineCats.includes(p.category?.toLowerCase())));

        // Refresh dashboard stats
        if (user) loadDashboard(user.id);

        // Close modal
        setShowProductModal(false);
        setEditingProduct(null);
        clearImages();

      } catch (error) {
        console.error('[handleAISave] Error:', error);
        // Re-throw so AddMedicineWithAI can show its own error toast
        throw error;
      }
    };

    return (
      // ✅ FIX 2: AddMedicineWithAI is now the sole content of the modal.
      // Removed the broken structure where it was nested inside the header title div
      // alongside a duplicate manual form. The old manual form fields below are kept
      // intact but are no longer rendered — AddMedicineWithAI replaces them in the modal.
      <div className="pharma-modal-overlay-ultra" onClick={() => setShowProductModal(false)}>
        <div className="pharma-modal-ultra" onClick={(e) => e.stopPropagation()}>
          <AddMedicineWithAI
            editingProduct={editingProduct}
            onSave={handleAISave}
            onCancel={() => { setShowProductModal(false); setEditingProduct(null); clearImages(); }}
          />
        </div>
      </div>
    );
  };

  // ✅ NEW: Render product card component
  const renderProductCard = (product) => (
    <div key={product.id} className="pharma-product-card-ultra">
      <div className="pharma-product-image-ultra">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} />
        ) : product.images && product.images.length > 0 ? (
          <img src={product.images[0].image_url} alt={product.name} />
        ) : product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="pharma-product-placeholder-ultra">
            <FaBox />
          </div>
        )}
        
        {product.stock_quantity <= 10 && product.stock_quantity > 0 && (
          <span className="pharma-product-badge-ultra badge-warning">
            <FaBolt /> Low Stock
          </span>
        )}

        {product.expiry_date && (
          <span className="pharma-product-badge-ultra badge-info">
            <FaCalendar /> Exp: {new Date(product.expiry_date).toLocaleDateString()}
          </span>
        )}
        
        {user && user.user_type === 'pharmacist' && (
          <div className="pharma-product-actions-ultra">
            <button onClick={() => handleEditProduct(product)} title="Edit">
              <FaEdit />
            </button>
            <button onClick={() => handleDeleteProduct(product.id)} title="Delete">
              <FaTrash />
            </button>
          </div>
        )}
      </div>

      <div className="pharma-product-content-ultra">
        <div className="pharma-product-category">
          {product.category}
        </div>
        <h3>{product.name}</h3>
        {product.generic_name && <p className="pharma-generic-ultra">{product.generic_name}</p>}
        {product.manufacturer && (
          <p className="pharma-manufacturer-ultra">
            <FaBox /> {product.manufacturer}
          </p>
        )}
        
        <div className="pharma-product-footer-ultra">
          <div className="pharma-price-ultra">
            <span className="pharma-price-label">MRP</span>
            <span className="pharma-price-value">₹{product.price}</span>
          </div>
          <div className="pharma-stock-badge">
            <FaWarehouse /> Stock: {product.stock_quantity}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`pharma-homepage-ultra ${darkMode ? 'dark-mode' : ''}`}>
      {/* Ultra Modern Header */}
      <header className="pharma-header-ultra">
        <div className="pharma-info-bar-ultra">
          <div className="pharma-container">
            <div className="pharma-info-content-ultra">
              <div className="pharma-info-badges-ultra">
                <span className="pharma-badge-ultra">
                  <FaPhone /> Emergency: 108
                </span>
                <span className="pharma-badge-ultra">
                  <FaClock /> 24/7 Service
                </span>
              </div>
              <div className="pharma-info-highlight-ultra">
                <FaMedkit /> Complete Medical Shop Solution
              </div>
            </div>
          </div>
        </div>

        <div className="pharma-main-header-ultra">
          <div className="pharma-container">
            <div className="pharma-header-content-ultra">
              <div className="pharma-logo-ultra" onClick={() => navigate('/pharmacy-home')}>
                <div className="pharma-logo-icon-ultra">
                  <FaPills />
                  <div className="pharma-logo-glow"></div>
                </div>
                <div className="pharma-logo-text-ultra">
                  <h1>PharmaCare</h1>
                  <span>Medical Shop Management</span>
                </div>
              </div>

              <form className="pharma-search-ultra" onSubmit={handleSearch}>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search medicines, devices, supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  <FaRocket /> Search
                </button>
              </form>

              <div className="pharma-header-actions-ultra">
                {user && user.user_type === 'pharmacist' && (
                  <>
                    <button 
                      className="pharma-btn-add-ultra" 
                      onClick={() => handleAddProduct('medicines')}
                      style={{ background: 'linear-gradient(135deg, #00b38e, #00d4a1)' }}
                    >
                      <FaPills /> <span>Add Medicine</span>
                    </button>
                    <button 
                      className="pharma-btn-add-ultra" 
                      onClick={() => handleAddProduct('other')}
                      style={{ background: 'linear-gradient(135deg, #0070cd, #3b82f6)' }}
                    >
                      <FaStethoscope /> <span>Add Product</span>
                    </button>
                  </>
                )}

                <div className="pharma-notifications-ultra" onClick={() => setShowNotifications(!showNotifications)}>
                  <FaBell />
                  <span className="pharma-notif-badge">{notifications.length}</span>
                  
                  {showNotifications && (
                    <div className="pharma-notif-dropdown">
                      <div className="pharma-notif-header">
                        <h3>Notifications</h3>
                        <button>Mark all read</button>
                      </div>
                      <div className="pharma-notif-list">
                        {notifications.map(notif => (
                          <div key={notif.id} className={`pharma-notif-item ${notif.type}`}>
                            <div className="pharma-notif-icon">
                              {notif.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                            </div>
                            <div className="pharma-notif-content">
                              <p>{notif.message}</p>
                              <span>{notif.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  className="pharma-theme-toggle-ultra"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? <FaSun /> : <FaMoon />}
                </button>

                {user ? (
                  <div 
                    className="pharma-profile-ultra"
                    onMouseEnter={() => setShowProfileDropdown(true)}
                    onMouseLeave={() => setShowProfileDropdown(false)}
                  >
                    <div className="pharma-avatar-ultra">
                      {user.first_name.charAt(0)}
                    </div>
                    
                    {showProfileDropdown && (
                      <div className="pharma-profile-menu-ultra">
                        <div className="pharma-profile-info-ultra">
                          <div className="pharma-avatar-ultra-large">
                            {user.first_name.charAt(0)}
                          </div>
                          <div>
                            <h4>{user.first_name} {user.last_name}</h4>
                            <p>Pharmacist</p>
                          </div>
                        </div>
                        <div className="pharma-profile-divider"></div>
                        <button onClick={() => navigate('/pharmacist-dashboard')}>
                          <FaHome /> Dashboard
                        </button>
                        <button onClick={() => navigate('/pharmacy/inventory')}>
                          <FaWarehouse /> Inventory
                        </button>
                        <button onClick={() => navigate('/pharmacy-home')}>
                          <FaCog /> Settings
                        </button>
                        <div className="pharma-profile-divider"></div>
                        <button className="pharma-logout-btn-ultra" onClick={handleLogout}>
                          <FaSignOutAlt /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="pharma-login-ultra" onClick={() => navigate('/auth?type=pharmacist&view=login')}>
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Stats */}
      {user && user.user_type === 'pharmacist' && dashboardData && (
        <section className="pharma-dashboard-ultra">
          <div className="pharma-container">
            <div className="pharma-dashboard-header-ultra">
              <div>
                <h2>Dashboard Overview</h2>
                <p>Track your medical shop performance</p>
              </div>
              <button className="pharma-btn-full-dash" onClick={() => navigate('/pharmacist-dashboard')}>
                <FaChartLine /> Full Dashboard
              </button>
            </div>
            {renderDashboardStats()}
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="pharma-hero-ultra">
        <div className="pharma-container">
          <div className="pharma-hero-content-ultra">
            <div className="pharma-hero-left-ultra">
              <div className="pharma-hero-badge-ultra">
                <FaFire /> Complete Medical Shop Solution
              </div>
              <h1>
                Manage Your<br />
                <span className="pharma-gradient-text">Medical Shop</span>
              </h1>
              <p>Comprehensive inventory management for medicines, medical devices, surgical items, and all healthcare products.</p>
              
              <div className="pharma-hero-features-ultra">
                <div className="pharma-feature-item-ultra">
                  <FaCheckCircle />
                  <span>{medicines.length} Medicines</span>
                </div>
                <div className="pharma-feature-item-ultra">
                  <FaCheckCircle />
                  <span>{otherProducts.length} Other Products</span>
                </div>
                <div className="pharma-feature-item-ultra">
                  <FaShieldAlt />
                  <span>Batch Tracking</span>
                </div>
              </div>

              <div className="pharma-hero-cta-ultra">
                <button 
                  className="pharma-btn-primary-ultra" 
                  onClick={() => handleAddProduct('medicines')}
                >
                  <FaPills /> Add Medicine
                </button>
                <button 
                  className="pharma-btn-secondary-ultra" 
                  onClick={() => handleAddProduct('other')}
                >
                  <FaStethoscope /> Add Product
                </button>
              </div>
            </div>
            
            <div className="pharma-hero-right-ultra">
              <div className="pharma-hero-graphic">
                <div className="pharma-floating-card pharma-float-1">
                  <FaPills />
                  <span>Medicines</span>
                </div>
                <div className="pharma-floating-card pharma-float-2">
                  <FaFirstAid />
                  <span>First Aid</span>
                </div>
                <div className="pharma-floating-card pharma-float-3">
                  <FaStethoscope />
                  <span>Devices</span>
                </div>
                <div className="pharma-hero-circle pharma-circle-1"></div>
                <div className="pharma-hero-circle pharma-circle-2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ NEW: Medicine Categories Section */}
      <section className="pharma-categories-ultra" style={{ background: '#e6f9f5' }}>
        <div className="pharma-container">
          <div className="pharma-section-header-ultra">
            <div>
              <h2><FaPills /> Medicine Categories</h2>
              <p>Browse all types of pharmaceutical products</p>
            </div>
          </div>
          
          <div className="pharma-categories-grid-ultra">
            {medicineCategories.map((cat, idx) => (
              <div 
                key={idx}
                className="pharma-category-card-ultra"
                onClick={() => navigate(cat.path)}
                style={{ '--cat-gradient': cat.gradient }}
              >
                <div className="pharma-cat-icon-ultra" style={{ background: cat.gradient }}>
                  {cat.icon}
                </div>
                <h3>{cat.name}</h3>
                <div className="pharma-cat-items">
                  {cat.items.map((item, i) => (
                    <span key={i} style={{ fontSize: '12px', color: '#666' }}>{item}</span>
                  ))}
                </div>
                <FaChevronRight className="pharma-cat-arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ NEW: Other Product Categories Section */}
      <section className="pharma-categories-ultra" style={{ background: '#fff' }}>
        <div className="pharma-container">
          <div className="pharma-section-header-ultra">
            <div>
              <h2><FaStethoscope /> Medical Products & Supplies</h2>
              <p>Devices, surgical items, and healthcare essentials</p>
            </div>
          </div>
          
          <div className="pharma-categories-grid-ultra">
            {otherCategories.map((cat, idx) => (
              <div 
                key={idx}
                className="pharma-category-card-ultra"
                onClick={() => navigate(cat.path)}
                style={{ '--cat-gradient': cat.gradient }}
              >
                <div className="pharma-cat-icon-ultra" style={{ background: cat.gradient }}>
                  {cat.icon}
                </div>
                <h3>{cat.name}</h3>
                <div className="pharma-cat-items">
                  {cat.items.map((item, i) => (
                    <span key={i} style={{ fontSize: '12px', color: '#666' }}>{item}</span>
                  ))}
                </div>
                <FaChevronRight className="pharma-cat-arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ UPDATED: Medicines Section */}
      {medicines.length > 0 && (
        <section className="pharma-products-ultra" style={{ background: '#e6f9f5' }}>
          <div className="pharma-container">
            <div className="pharma-section-header-ultra">
              <div>
                <h2><FaPills /> Medicines ({medicines.length})</h2>
                <p>Pharmaceutical products and medications</p>
              </div>
              <a href="/pharmacy/medicines" className="pharma-view-all-ultra">
                View All Medicines <FaChevronRight />
              </a>
            </div>

            <div className="pharma-products-grid-ultra">
              {medicines.slice(0, 8).map(renderProductCard)}
            </div>
          </div>
        </section>
      )}

      {/* ✅ UPDATED: Other Products Section */}
      {otherProducts.length > 0 && (
        <section className="pharma-products-ultra" style={{ background: '#fff' }}>
          <div className="pharma-container">
            <div className="pharma-section-header-ultra">
              <div>
                <h2><FaStethoscope /> Medical Products & Supplies ({otherProducts.length})</h2>
                <p>Devices, surgical items, and healthcare essentials</p>
              </div>
              <a href="/pharmacy/products" className="pharma-view-all-ultra">
                View All Products <FaChevronRight />
              </a>
            </div>

            <div className="pharma-products-grid-ultra">
              {otherProducts.slice(0, 8).map(renderProductCard)}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="pharma-footer-ultra">
        <div className="pharma-container">
          <div className="pharma-footer-content-ultra">
            <div className="pharma-footer-brand-ultra">
              <div className="pharma-footer-logo-ultra">
                <FaPills />
              </div>
              <h3>PharmaCare</h3>
              <p>Complete medical shop management system</p>
            </div>
            
            <div className="pharma-footer-links-ultra">
              <div>
                <h4>Medicines</h4>
                <a href="/pharmacy/medicines?type=prescription">Prescription Drugs</a>
                <a href="/pharmacy/medicines?type=otc">OTC Medicines</a>
                <a href="/pharmacy/medicines?type=ayurvedic">Ayurvedic</a>
              </div>
              
              <div>
                <h4>Medical Products</h4>
                <a href="/pharmacy/devices">Medical Devices</a>
                <a href="/pharmacy/surgical">Surgical Items</a>
                <a href="/pharmacy/first-aid">First Aid</a>
              </div>
              
              <div>
                <h4>Management</h4>
                <a href="/pharmacy/inventory">Inventory</a>
                <a href="/pharmacy/suppliers">Suppliers</a>
                <a href="/pharmacy/reports">Reports</a>
              </div>
              
              <div>
                <h4>Contact</h4>
                <p><FaPhone /> 1800-123-4567</p>
                <p><FaClock /> 24/7 Support</p>
              </div>
            </div>
          </div>
          
          <div className="pharma-footer-bottom-ultra">
            <p>&copy; 2025 PharmaCare. All rights reserved.</p>
            <div className="pharma-footer-badges-ultra">
              <span><FaShieldAlt /> Secure</span>
              <span><FaCheckCircle /> Licensed</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {renderProductModal()}
    </div>
  );
};

export default PharmacistHomepage;