import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pharmacyAPI, cartAPI } from '../services/api';
import './PharmacyBrowse.css';
import NearestMedicalStores from './Nearestmedicalstores';

const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Cart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  Scan: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Pill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  ),
  ShoppingBag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Stethoscope: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-3"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  // ✅ Nearby stores map icon
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
};

// ============================================================
// CATEGORY CONFIG
// ============================================================
const CATEGORY_MAP = {
  medicines:         ['medicines', 'prescription_drugs', 'antibiotics', 'painkillers', 'homeopathy'],
  otc_medicines:     ['otc_medicines', 'otc'],
  vitamins:          ['vitamins', 'supplements'],
  first_aid_kits:    ['first_aid_kits', 'first_aid', 'bandages', 'antiseptics', 'syringes', 'gloves', 'cotton'],
  bp_monitors:       ['bp_monitors', 'thermometers', 'glucometers', 'pulse_oximeters', 'nebulizers', 'medical_devices', 'devices'],
  baby_care:         ['baby_care', 'diapers', 'baby_food', 'baby_wipes'],
  diabetic_supplies: ['diabetic_supplies', 'insulin', 'diabetic'],
  ayurvedic:         ['ayurvedic', 'herbal'],
};

const CATEGORIES = [
  { id: 'all',               label: 'All Products',  icon: '🏪' },
  { id: 'medicines',         label: 'Medicines',     icon: '💊' },
  { id: 'otc_medicines',     label: 'OTC Medicines', icon: '🩺' },
  { id: 'vitamins',          label: 'Vitamins',      icon: '🫐' },
  { id: 'first_aid_kits',    label: 'First Aid',     icon: '🩹' },
  { id: 'bp_monitors',       label: 'Devices',       icon: '🔬' },
  { id: 'baby_care',         label: 'Baby Care',     icon: '👶' },
  { id: 'diabetic_supplies', label: 'Diabetic',      icon: '🩸' },
  { id: 'ayurvedic',         label: 'Ayurvedic',     icon: '🌿' },
];

const productMatchesCategory = (product, tabId) => {
  if (tabId === 'all') return true;
  const productCat = (product.category || '').toLowerCase().trim();
  const allowed = CATEGORY_MAP[tabId];
  if (allowed) return allowed.includes(productCat);
  return productCat === tabId;
};

const SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Name A–Z' },
  { value: 'name_desc',  label: 'Name Z–A' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'discount',   label: 'Best Discount' },
];

const MAX_UPLOAD_MB    = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const SCANNER_STEPS = {
  UPLOAD:    'upload',
  ANALYZING: 'analyzing',
  RESULTS:   'results',
  ADDING:    'adding',
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PharmacyBrowse() {
  const navigate = useNavigate();

  // ── Products ─────────────────────────────────────────────────
  const [products,         setProducts]         = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // ── Filters ──────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [sortBy,         setSortBy]         = useState('name_asc');
  const [priceRange,     setPriceRange]     = useState({ min: 0, max: 10000 });
  const [showFilters,    setShowFilters]    = useState(false);

  // ── Cart ─────────────────────────────────────────────────────
  const [cartItems,   setCartItems]   = useState({});
  const [cartLoading, setCartLoading] = useState({});
  const [cartCount,   setCartCount]   = useState(0);

  // ── Scanner ──────────────────────────────────────────────────
  const [showScanner,  setShowScanner]  = useState(false);
  const [scannerStep,  setScannerStep]  = useState(SCANNER_STEPS.UPLOAD);
  const [dragActive,   setDragActive]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [scanError,    setScanError]    = useState(null);
  const [scanProgress, setScanProgress] = useState('');

  const [extractedMedicines,   setExtractedMedicines]   = useState([]);
  const [matchedProducts,      setMatchedProducts]      = useState([]);
  const [unavailableMedicines, setUnavailableMedicines] = useState([]);
  const [prescriptionInfo,     setPrescriptionInfo]     = useState(null);
  const [selectedForCart,      setSelectedForCart]      = useState({});
  const [addAllResult,         setAddAllResult]         = useState(null);

  // ── Nearby Stores ─────────────────────────────────────────────
  const [showNearby, setShowNearby] = useState(false);

  const fileInputRef = useRef(null);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pharmacyAPI.getAllMedicines();
      const list = Array.isArray(data) ? data : (data.results || []);
      const uniqueCats = [...new Set(list.map(p => p.category))].sort();
      console.log('[PharmacyBrowse] Backend categories found:', uniqueCats);
      setProducts(list);
      setFilteredProducts(list);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('[PharmacyBrowse] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const count = await cartAPI.getCartCount();
      setCartCount(count);
    } catch { /* silent */ }
  };

  // ── Filter & Sort ────────────────────────────────────────────
  useEffect(() => {
    let result = [...products];
    result = result.filter(p => productMatchesCategory(p, activeCategory));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.name         || '').toLowerCase().includes(q) ||
        (p.generic_name || '').toLowerCase().includes(q) ||
        (p.manufacturer || '').toLowerCase().includes(q) ||
        (p.brand_name   || '').toLowerCase().includes(q)
      );
    }

    result = result.filter(p =>
      parseFloat(p.price || 0) >= priceRange.min &&
      parseFloat(p.price || 0) <= priceRange.max
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':   return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':  return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':  return parseFloat(a.price || 0) - parseFloat(b.price || 0);
        case 'price_desc': return parseFloat(b.price || 0) - parseFloat(a.price || 0);
        case 'discount':   return parseFloat(b.discount_percentage || 0) - parseFloat(a.discount_percentage || 0);
        default: return 0;
      }
    });

    setFilteredProducts(result);
  }, [products, activeCategory, searchQuery, sortBy, priceRange]);

  // ── Cart Handlers ────────────────────────────────────────────
  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    const id = product.id;
    setCartLoading(prev => ({ ...prev, [id]: true }));
    try {
      await cartAPI.addToCart(id, 1);
      setCartItems(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      setCartCount(prev => prev + 1);
    } catch (err) {
      console.error('[Cart] Add error:', err);
    } finally {
      setCartLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleProductClick = (product) => {
    navigate(`/pharmacy/product/${product.id}`);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const getProductImage = (product) => {
    if (product.images?.length > 0) {
      const primary = product.images.find(img => img.is_primary) || product.images[0];
      return primary.image_url || primary.image;
    }
    if (product.image) return product.image;
    return null;
  };

  const formatPrice = (price) => parseFloat(price || 0).toFixed(2);
  const getDiscount = (p)     => parseFloat(p.discount_percentage || 0).toFixed(0);

  // ── Scanner Handlers ─────────────────────────────────────────
  const openScanner = () => {
    setShowScanner(true);
    setScannerStep(SCANNER_STEPS.UPLOAD);
    setUploadedFile(null);
    setScanError(null);
    setScanProgress('');
    setExtractedMedicines([]);
    setMatchedProducts([]);
    setUnavailableMedicines([]);
    setPrescriptionInfo(null);
    setSelectedForCart({});
    setAddAllResult(null);
  };

  const closeScanner = () => setShowScanner(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) { setScanError('Please upload a PDF or image file (JPG, PNG).'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setScanError(`File size must be under ${MAX_UPLOAD_MB}MB.`); return; }
    setScanError(null);
    setUploadedFile(file);
  };

  const analyzePrescription = async () => {
    if (!uploadedFile) return;
    setScannerStep(SCANNER_STEPS.ANALYZING);
    setScanProgress('Reading prescription...');
    setScanError(null);
    try {
      setScanProgress('AI is extracting medicines from prescription...');
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const data = await pharmacyAPI.scanPrescription(formData);
      if (!data.success) throw new Error(data.error || 'Failed to analyze prescription');
      setScanProgress('Matching medicines in our pharmacy...');
      setPrescriptionInfo({ doctorInfo: data.doctorInfo || {}, patientInfo: data.patientInfo || {}, diagnosis: data.diagnosis || '' });
      setExtractedMedicines(data.medicines || []);
      setMatchedProducts(data.matched_products || []);
      setUnavailableMedicines(data.unmatched_medicines || []);
      const defaultSelected = {};
      (data.matched_products || []).forEach(item => { defaultSelected[item.medicine.name] = true; });
      setSelectedForCart(defaultSelected);
      setScannerStep(SCANNER_STEPS.RESULTS);
    } catch (err) {
      console.error('[Scanner] Analysis error:', err);
      setScanError(err.message || 'Failed to analyze prescription. Please try again.');
      setScannerStep(SCANNER_STEPS.UPLOAD);
    }
  };

  const handleAddSelectedToCart = async () => {
    setScannerStep(SCANNER_STEPS.ADDING);
    setScanProgress('Adding medicines to cart...');
    const toAdd = matchedProducts.filter(({ medicine }) => selectedForCart[medicine.name]);
    let addedCount = 0, failedCount = 0;
    for (const { medicine, product } of toAdd) {
      try { await cartAPI.addToCart(product.id, 1); addedCount++; setCartCount(prev => prev + 1); }
      catch { failedCount++; }
    }
    setAddAllResult({ addedCount, failedCount, total: toAdd.length });
    setScannerStep(SCANNER_STEPS.RESULTS);
  };

  const toggleMedicineSelection = (name) => {
    setSelectedForCart(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const selectedCount = Object.values(selectedForCart).filter(Boolean).length;

  // ============================================================
  // PRODUCT CARD
  // ============================================================
  const renderProductCard = (product) => {
    const imgSrc     = getProductImage(product);
    const discount   = getDiscount(product);
    const inCart     = cartItems[product.id] > 0;
    const isLoading  = cartLoading[product.id];
    const outOfStock = (product.stock_quantity || 0) === 0;

    return (
      <div
        key={product.id}
        className="pb-product-card pb-product-card--clickable"
        onClick={() => handleProductClick(product)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleProductClick(product)}
        title={`View details for ${product.name}`}
      >
        {discount > 0 && <div className="pb-discount-badge">{discount}% OFF</div>}
        {product.requires_prescription && <div className="pb-rx-badge">Rx</div>}

        <div className="pb-card-view-hint">
          <Icons.Eye /><span>View Details</span>
        </div>

        <div className="pb-product-image">
          {imgSrc ? (
            <img
              src={imgSrc} alt={product.name}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className="pb-product-image-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>
            <Icons.Pill />
          </div>
        </div>

        <div className="pb-product-info">
          <div className="pb-product-category-tag">{(product.category || '').replace(/_/g, ' ')}</div>
          <h3 className="pb-product-name" title={product.name}>{product.name}</h3>
          {product.generic_name  && <p className="pb-product-generic">{product.generic_name}</p>}
          {product.manufacturer  && <p className="pb-product-manufacturer">by {product.manufacturer}</p>}
          {product.strength      && <span className="pb-product-strength">{product.strength}</span>}
          <div className="pb-product-pricing">
            <span className="pb-price">₹{formatPrice(product.price)}</span>
            {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
              <span className="pb-mrp">₹{formatPrice(product.mrp)}</span>
            )}
          </div>
          <div className="pb-product-stock">
            {outOfStock
              ? <span className="pb-out-of-stock">Out of Stock</span>
              : <span className="pb-in-stock">✓ In Stock ({product.stock_quantity})</span>
            }
          </div>
        </div>

        <button
          className={`pb-add-btn ${inCart ? 'pb-add-btn--added' : ''} ${outOfStock ? 'pb-add-btn--disabled' : ''}`}
          onClick={(e) => { if (!outOfStock) handleAddToCart(e, product); else e.stopPropagation(); }}
          disabled={outOfStock || isLoading}
        >
          {isLoading
            ? <span className="pb-spinner" />
            : inCart
              ? <><Icons.Check /><span>Added</span></>
              : <><Icons.Cart /><span>{outOfStock ? 'Unavailable' : 'Add to Cart'}</span></>
          }
        </button>
      </div>
    );
  };

  // ============================================================
  // SCANNER MODAL
  // ============================================================
  const renderScannerModal = () => {
    if (!showScanner) return null;
    return (
      <div className="pb-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeScanner()}>
        <div className="pb-modal">
          <div className="pb-modal-header">
            <div className="pb-modal-title-wrap">
              <div className="pb-modal-icon-wrap"><Icons.Sparkles /></div>
              <div>
                <h2>AI Prescription Scanner</h2>
                <p>Upload your prescription — AI extracts &amp; matches medicines automatically</p>
              </div>
            </div>
            <button className="pb-modal-close" onClick={closeScanner}><Icons.Close /></button>
          </div>

          <div className="pb-steps">
            {[
              { key: SCANNER_STEPS.UPLOAD,    label: 'Upload',  num: 1 },
              { key: SCANNER_STEPS.ANALYZING, label: 'Analyze', num: 2 },
              { key: SCANNER_STEPS.RESULTS,   label: 'Results', num: 3 },
            ].map((step, idx) => {
              const stepOrder  = [SCANNER_STEPS.UPLOAD, SCANNER_STEPS.ANALYZING, SCANNER_STEPS.RESULTS, SCANNER_STEPS.ADDING];
              const currentIdx = stepOrder.indexOf(scannerStep);
              const stepIdx    = stepOrder.indexOf(step.key);
              const isDone     = currentIdx > stepIdx;
              const isActive   = currentIdx === stepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className={`pb-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                    <div className="pb-step-num">{isDone ? <Icons.Check /> : step.num}</div>
                    <span>{step.label}</span>
                  </div>
                  {idx < 2 && <div className={`pb-step-line ${isDone ? 'done' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="pb-modal-body">
            {/* UPLOAD */}
            {scannerStep === SCANNER_STEPS.UPLOAD && (
              <div className="pb-upload-section">
                <div
                  className={`pb-dropzone ${dragActive ? 'pb-dropzone--active' : ''} ${uploadedFile ? 'pb-dropzone--has-file' : ''}`}
                  onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files[0])} />
                  {uploadedFile ? (
                    <div className="pb-file-preview">
                      <div className="pb-file-icon"><Icons.FileText /></div>
                      <div className="pb-file-details">
                        <strong>{uploadedFile.name}</strong>
                        <span>{(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type.split('/')[1].toUpperCase()}</span>
                      </div>
                      <button className="pb-file-remove" onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}>
                        <Icons.Close />
                      </button>
                    </div>
                  ) : (
                    <div className="pb-dropzone-content">
                      <div className="pb-dropzone-icon"><Icons.Upload /></div>
                      <h3>Drop your prescription here</h3>
                      <p>or click to browse files</p>
                      <div className="pb-accepted-formats">
                        <span>PDF</span><span>JPG</span><span>PNG</span><span>Max {MAX_UPLOAD_MB}MB</span>
                      </div>
                    </div>
                  )}
                </div>
                {scanError && <div className="pb-scan-error"><Icons.AlertCircle /><span>{scanError}</span></div>}
                <div className="pb-upload-info">
                  <Icons.Info />
                  <p>Your prescription is processed securely. AI extracts medicine names, dosages, and frequency for pharmacy matching.</p>
                </div>
                <div className="pb-modal-actions">
                  <button className="pb-btn-secondary" onClick={closeScanner}>Cancel</button>
                  <button className="pb-btn-primary" onClick={analyzePrescription} disabled={!uploadedFile}>
                    <Icons.Sparkles /><span>Analyze Prescription</span>
                  </button>
                </div>
              </div>
            )}

            {/* ANALYZING / ADDING */}
            {(scannerStep === SCANNER_STEPS.ANALYZING || scannerStep === SCANNER_STEPS.ADDING) && (
              <div className="pb-analyzing-section">
                <div className="pb-analyzing-animation">
                  <div className="pb-pulse-ring" />
                  <div className="pb-pulse-ring pb-pulse-ring--2" />
                  <div className="pb-pulse-ring pb-pulse-ring--3" />
                  <div className="pb-analyzing-icon"><Icons.Stethoscope /></div>
                </div>
                <h3>{scannerStep === SCANNER_STEPS.ADDING ? 'Adding to Cart' : 'AI is Reading Your Prescription'}</h3>
                <p className="pb-scan-progress">{scanProgress}</p>
                <div className="pb-analyzing-steps">
                  <div className="pb-anim-step pb-anim-step--active"><div className="pb-anim-dot" /><span>Extracting medicine names &amp; dosages</span></div>
                  <div className="pb-anim-step"><div className="pb-anim-dot" /><span>Matching with pharmacy catalog</span></div>
                  <div className="pb-anim-step"><div className="pb-anim-dot" /><span>Checking stock availability</span></div>
                </div>
              </div>
            )}

            {/* RESULTS */}
            {scannerStep === SCANNER_STEPS.RESULTS && (
              <div className="pb-results-section">
                {addAllResult && (
                  <div className={`pb-add-result ${addAllResult.failedCount > 0 ? 'pb-add-result--partial' : 'pb-add-result--success'}`}>
                    <Icons.Check />
                    <div>
                      <strong>{addAllResult.addedCount} medicine{addAllResult.addedCount !== 1 ? 's' : ''} added to cart!</strong>
                      {addAllResult.failedCount > 0 && <span> ({addAllResult.failedCount} failed)</span>}
                    </div>
                  </div>
                )}

                {prescriptionInfo && (prescriptionInfo.doctorInfo?.name || prescriptionInfo.patientInfo?.name || prescriptionInfo.diagnosis) && (
                  <div className="pb-prescription-info">
                    <h4><Icons.FileText /> Prescription Details</h4>
                    <div className="pb-prescription-grid">
                      {prescriptionInfo.doctorInfo?.name  && <div><label>Doctor</label><span>Dr. {prescriptionInfo.doctorInfo.name}</span></div>}
                      {prescriptionInfo.doctorInfo?.clinic && <div><label>Clinic</label><span>{prescriptionInfo.doctorInfo.clinic}</span></div>}
                      {prescriptionInfo.patientInfo?.name  && <div><label>Patient</label><span>{prescriptionInfo.patientInfo.name}</span></div>}
                      {prescriptionInfo.patientInfo?.age   && <div><label>Age</label><span>{prescriptionInfo.patientInfo.age}</span></div>}
                      {prescriptionInfo.diagnosis          && <div className="pb-diagnosis"><label>Diagnosis</label><span>{prescriptionInfo.diagnosis}</span></div>}
                    </div>
                  </div>
                )}

                {matchedProducts.length > 0 && (
                  <div className="pb-matched-section">
                    <div className="pb-section-header">
                      <h4><span className="pb-badge pb-badge--success">{matchedProducts.length}</span> Medicines Available in Our Pharmacy</h4>
                      <button className="pb-select-all-btn" onClick={() => {
                        const allSelected = matchedProducts.every(({ medicine }) => selectedForCart[medicine.name]);
                        const next = {};
                        matchedProducts.forEach(({ medicine }) => { next[medicine.name] = !allSelected; });
                        setSelectedForCart(next);
                      }}>
                        {matchedProducts.every(({ medicine }) => selectedForCart[medicine.name]) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="pb-matched-list">
                      {matchedProducts.map(({ medicine, product }) => (
                        <div key={medicine.name}
                          className={`pb-matched-item ${selectedForCart[medicine.name] ? 'pb-matched-item--selected' : ''}`}
                          onClick={() => !addAllResult && toggleMedicineSelection(medicine.name)}>
                          <div className="pb-matched-checkbox">{selectedForCart[medicine.name] ? <Icons.Check /> : null}</div>
                          <div className="pb-matched-image">
                            {getProductImage(product) ? <img src={getProductImage(product)} alt={product.name} /> : <Icons.Pill />}
                          </div>
                          <div className="pb-matched-details">
                            <div className="pb-matched-prescription">
                              <strong>{medicine.name}</strong>
                              {medicine.dosage && <span className="pb-dosage-tag">{medicine.dosage}</span>}
                            </div>
                            <div className="pb-matched-frequency">
                              {medicine.frequency    && <span>📅 {medicine.frequency}</span>}
                              {medicine.duration     && <span>⏱ {medicine.duration}</span>}
                              {medicine.instructions && <span>📋 {medicine.instructions}</span>}
                            </div>
                            <div className="pb-matched-product">
                              <span className="pb-matched-product-name">{product.name}</span>
                              {product.strength && <span className="pb-matched-strength">{product.strength}</span>}
                            </div>
                          </div>
                          <div className="pb-matched-price">
                            <span className="pb-price">₹{formatPrice(product.price)}</span>
                            {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && <span className="pb-mrp">₹{formatPrice(product.mrp)}</span>}
                            {parseFloat(product.discount_percentage || 0) > 0 && <span className="pb-discount-pill">{getDiscount(product)}% off</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unavailableMedicines.length > 0 && (
                  <div className="pb-unavailable-section">
                    <h4><span className="pb-badge pb-badge--warn">{unavailableMedicines.length}</span> Not Available — Check with Pharmacist</h4>
                    <div className="pb-unavailable-list">
                      {unavailableMedicines.map((medicine, idx) => (
                        <div key={idx} className="pb-unavailable-item">
                          <Icons.AlertCircle />
                          <div>
                            <strong>{medicine.name}</strong>
                            {medicine.dosage    && <span> · {medicine.dosage}</span>}
                            {medicine.frequency && <span> · {medicine.frequency}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="pb-unavailable-note">Please consult your pharmacist or doctor for these medicines.</p>
                  </div>
                )}

                {matchedProducts.length === 0 && unavailableMedicines.length === 0 && (
                  <div className="pb-no-results">
                    <Icons.AlertCircle />
                    <h3>No Medicines Detected</h3>
                    <p>We couldn't extract medicine information from this prescription. Please try a clearer image.</p>
                  </div>
                )}

                <div className="pb-modal-actions">
                  <button className="pb-btn-secondary" onClick={() => { setScannerStep(SCANNER_STEPS.UPLOAD); setUploadedFile(null); setAddAllResult(null); }}>Scan Another</button>
                  <button className="pb-btn-secondary" onClick={closeScanner}>Close</button>
                  {matchedProducts.length > 0 && !addAllResult && (
                    <button className="pb-btn-primary" onClick={handleAddSelectedToCart} disabled={selectedCount === 0}>
                      <Icons.Cart />
                      <span>Add {selectedCount > 0 ? `${selectedCount} ` : ''}Medicine{selectedCount !== 1 ? 's' : ''} to Cart</span>
                    </button>
                  )}
                  {addAllResult && (
                    <button className="pb-btn-primary" onClick={closeScanner}>
                      <Icons.ShoppingBag /><span>View Cart ({cartCount})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>{/* END .pb-modal */}
      </div>  /* END .pb-modal-overlay */
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="pb-root">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="pb-header">
        <div className="pb-header-left">
          <h1><Icons.ShoppingBag />Pharmacy Store</h1>
          <p>Genuine medicines, delivered to your door</p>
        </div>

        {/* ✅ All 3 header buttons in the correct place */}
        <div className="pb-header-right">
          <button className="pb-nearby-btn" onClick={() => setShowNearby(true)}>
            <Icons.MapPin />
            <span>Nearby Stores</span>
            <span className="pb-nearby-pulse" />
          </button>

          <button className="pb-scanner-btn" onClick={openScanner}>
            <Icons.Scan /><span>Scan Prescription</span>
            <span className="pb-scanner-badge">AI</span>
          </button>

          <button className="pb-cart-btn" onClick={() => navigate('/cart')}>
            <Icons.Cart />
            {cartCount > 0 && <span className="pb-cart-count">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* ── Search / Sort / Filter ───────────────────────────── */}
      <div className="pb-controls">
        <div className="pb-search-wrap">
          <Icons.Search />
          <input type="text" placeholder="Search medicines, brands, generics..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pb-search-input" />
          {searchQuery && <button className="pb-search-clear" onClick={() => setSearchQuery('')}><Icons.Close /></button>}
        </div>
        <div className="pb-sort-wrap">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pb-sort-select">
            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <Icons.ChevronDown />
        </div>
        <button className="pb-filter-btn" onClick={() => setShowFilters(!showFilters)}>
          <Icons.Filter /><span>Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="pb-filter-panel">
          <div className="pb-filter-group">
            <label>Price Range: ₹{priceRange.min} – ₹{priceRange.max}</label>
            <div className="pb-range-inputs">
              <input type="number" min="0" max={priceRange.max} value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))} placeholder="Min" />
              <span>to</span>
              <input type="number" min={priceRange.min} value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))} placeholder="Max" />
            </div>
          </div>
          <button className="pb-filter-reset" onClick={() => setPriceRange({ min: 0, max: 10000 })}>Reset Filters</button>
        </div>
      )}

      {/* ── Category Tabs ────────────────────────────────────── */}
      <div className="pb-categories">
        {CATEGORIES.map(cat => (
          <button key={cat.id}
            className={`pb-category-tab ${activeCategory === cat.id ? 'pb-category-tab--active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}>
            <span className="pb-cat-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── Results Summary ──────────────────────────────────── */}
      <div className="pb-results-summary">
        <span>
          {loading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
          {activeCategory !== 'all' && ` in ${CATEGORIES.find(c => c.id === activeCategory)?.label}`}
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        {(activeCategory !== 'all' || searchQuery) && (
          <button className="pb-clear-filters" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>Clear filters</button>
        )}
      </div>

      {/* ── Product Grid ─────────────────────────────────────── */}
      <div className="pb-content">
        {loading && <div className="pb-loading"><div className="pb-loading-spinner" /><p>Loading pharmacy products...</p></div>}
        {error && !loading && (
          <div className="pb-error">
            <Icons.AlertCircle /><h3>Failed to load products</h3><p>{error}</p>
            <button className="pb-btn-primary" onClick={loadProducts}>Try Again</button>
          </div>
        )}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="pb-empty">
            <Icons.ShoppingBag /><h3>No products found</h3><p>Try adjusting your search or filters</p>
            <button className="pb-btn-secondary" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>Show All Products</button>
          </div>
        )}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="pb-products-grid">
            {filteredProducts.map(renderProductCard)}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      {renderScannerModal()}

      {/* ✅ Nearest Medical Stores panel — renders over the page */}
      {showNearby && (
        <NearestMedicalStores onClose={() => setShowNearby(false)} />
      )}

    </div>
  );
}