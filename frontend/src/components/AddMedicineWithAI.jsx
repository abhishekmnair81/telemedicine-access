import { useState, useRef, useCallback } from 'react';
import {
  FaRobot, FaEdit, FaUpload, FaImage, FaTimes, FaChevronLeft,
  FaChevronRight, FaTrash, FaPlus, FaSpinner, FaCheckCircle,
  FaExclamationTriangle, FaMagic, FaPills, FaBox, FaTag,
  FaDollarSign, FaWarehouse, FaCalendar, FaClipboardList,
  FaStethoscope, FaThermometerHalf, FaCamera, FaFileAlt,
  FaChartBar, FaSave, FaBolt
} from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ─── AI Analysis Hook ─────────────────────────────────────────────────────────
const useMedicineImageAI = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeImage = useCallback(async (imageFile, onFieldsExtracted) => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const token =
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken');

      const response = await fetch(`${API_BASE}/medicines/analyze-image/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to analyze image');

      if (result.success && result.data) {
        setAnalysisResult(result);
        if (onFieldsExtracted) onFieldsExtracted(result.data);
      } else {
        setError(result.error || 'Could not extract data from image');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return { isAnalyzing, analysisResult, error, analyzeImage, reset };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MEDICINE_CATEGORIES = [
  'medicines', 'prescription_drugs', 'otc_medicines',
  'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy',
];

const ALL_CATEGORIES = [
  { group: '💊 Medicines', options: [
    { value: 'medicines', label: 'General Medicines' },
    { value: 'prescription_drugs', label: 'Prescription Drugs' },
    { value: 'otc_medicines', label: 'OTC Medicines' },
    { value: 'antibiotics', label: 'Antibiotics' },
    { value: 'painkillers', label: 'Painkillers' },
    { value: 'vitamins', label: 'Vitamins & Supplements' },
    { value: 'ayurvedic', label: 'Ayurvedic' },
    { value: 'homeopathy', label: 'Homeopathic' },
  ]},
  { group: '🩺 Medical Devices', options: [
    { value: 'thermometers', label: 'Thermometers' },
    { value: 'bp_monitors', label: 'BP Monitors' },
    { value: 'glucometers', label: 'Glucometers' },
    { value: 'pulse_oximeters', label: 'Pulse Oximeters' },
    { value: 'nebulizers', label: 'Nebulizers' },
  ]},
  { group: '🩹 First Aid & Surgical', options: [
    { value: 'bandages', label: 'Bandages & Dressings' },
    { value: 'antiseptics', label: 'Antiseptics' },
    { value: 'first_aid_kits', label: 'First Aid Kits' },
    { value: 'syringes', label: 'Syringes & Needles' },
    { value: 'gloves', label: 'Medical Gloves' },
  ]},
  { group: '👶 Baby Care', options: [
    { value: 'diapers', label: 'Diapers' },
    { value: 'baby_food', label: 'Baby Food & Formula' },
    { value: 'baby_wipes', label: 'Baby Wipes' },
  ]},
  { group: '🧴 Personal Care', options: [
    { value: 'sanitizers', label: 'Sanitizers & Disinfectants' },
    { value: 'masks', label: 'Face Masks' },
    { value: 'cotton', label: 'Cotton & Cotton Buds' },
  ]},
  { group: '📦 Other', options: [
    { value: 'diabetic_supplies', label: 'Diabetic Care' },
    { value: 'other', label: 'Other' },
  ]},
];

const EMPTY_FORM = {
  name: '', generic_name: '', manufacturer: '', brand: '',
  category: '', form: '', strength: '', price: '', mrp: '',
  stock_quantity: '0', requires_prescription: false,
  description: '', pack_size: '', storage_instructions: 'room_temp',
  expiry_date: '', batch_number: '',
  composition: '', side_effects: '', contraindications: '',
};

const MAX_IMAGES = 10;

// ─── Main Component ───────────────────────────────────────────────────────────
const AddMedicineWithAI = ({ onSave, onCancel, editingProduct = null }) => {
  const fileInputRef = useRef(null);
  const aiFileInputRef = useRef(null);

  const [mode, setMode] = useState('ai');

  const [form, setForm] = useState(() =>
    editingProduct
      ? {
          name: editingProduct.name || '',
          generic_name: editingProduct.generic_name || '',
          manufacturer: editingProduct.manufacturer || '',
          brand: editingProduct.brand || '',
          category: editingProduct.category || '',
          form: editingProduct.form || '',
          strength: editingProduct.strength || '',
          price: editingProduct.price || '',
          mrp: editingProduct.mrp || editingProduct.price || '',
          stock_quantity: editingProduct.stock_quantity || '0',
          requires_prescription: editingProduct.requires_prescription || false,
          description: editingProduct.description || '',
          pack_size: editingProduct.pack_size || '',
          storage_instructions: editingProduct.storage_instructions || 'room_temp',
          expiry_date: editingProduct.expiry_date || '',
          batch_number: editingProduct.batch_number || '',
          composition: editingProduct.composition || '',
          side_effects: editingProduct.side_effects || '',
          contraindications: editingProduct.contraindications || '',
        }
      : { ...EMPTY_FORM }
  );

  const [aiFilledFields, setAiFilledFields] = useState(new Set());
  const [images, setImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const { isAnalyzing, analysisResult, error: aiError, analyzeImage, reset: resetAI } = useMedicineImageAI();

  const isMedicine = MEDICINE_CATEGORIES.includes(form.category?.toLowerCase());

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ── AI Analysis ──────────────────────────────────────────────────────────────
  const handleAIImageSelect = async (file) => {
    if (!file) return;

    if (images.length < MAX_IMAGES) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { file, preview: reader.result, isExisting: false }]);
      };
      reader.readAsDataURL(file);
    }

    await analyzeImage(file, (data) => {
      const mapping = {
        name: data.name,
        generic_name: data.generic_name,
        manufacturer: data.manufacturer,
        brand: data.brand,
        category: data.category,
        form: data.form,
        strength: data.strength,
        price: data.price?.toString(),
        mrp: data.mrp?.toString(),
        description: data.description,
        pack_size: data.pack_size,
        composition: data.composition,
        side_effects: data.side_effects,
        contraindications: data.contraindications,
        requires_prescription: data.requires_prescription,
      };

      const filled = new Set();
      const updates = {};
      Object.entries(mapping).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          updates[key] = val;
          filled.add(key);
        }
      });

      setForm(prev => ({ ...prev, ...updates }));
      setAiFilledFields(filled);
      showToast(`✨ AI filled ${filled.size} fields automatically!`, 'success');
    });
  };

  // ── Product Images Management ─────────────────────────────────────────────────
  const addImages = (files) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      showToast(`Maximum ${MAX_IMAGES} images allowed`, 'error');
      return;
    }

    const toAdd = Array.from(files).slice(0, remaining);
    const newImages = [];
    let processed = 0;

    toAdd.forEach(file => {
      if (!validTypes.includes(file.type)) {
        showToast(`Invalid file type: ${file.name}`, 'error');
        processed++;
        if (processed === toAdd.length && newImages.length > 0) {
          setImages(prev => [...prev, ...newImages]);
        }
        return;
      }
      if (file.size > maxSize) {
        showToast(`File too large: ${file.name} (max 10MB)`, 'error');
        processed++;
        if (processed === toAdd.length && newImages.length > 0) {
          setImages(prev => [...prev, ...newImages]);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({ file, preview: reader.result, isExisting: false });
        processed++;
        if (processed === toAdd.length) {
          setImages(prev => [...prev, ...newImages]);
          if (newImages.length > 0) showToast(`Added ${newImages.length} image(s)`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setCurrentIdx(prev => Math.min(prev, Math.max(0, images.length - 2)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) addImages(files);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim()) return showToast('Product name is required', 'error');
    if (!form.category) return showToast('Category is required', 'error');
    if (isMedicine && !form.form) return showToast('Medicine form is required', 'error');

    const price = parseFloat(form.price);
    const mrp = parseFloat(form.mrp || form.price);
    const stock = parseInt(form.stock_quantity || 0);

    if (isNaN(price) || price <= 0) return showToast('Valid selling price is required', 'error');
    if (isNaN(mrp) || mrp <= 0) return showToast('Valid MRP is required', 'error');
    if (price > mrp) return showToast('Selling price cannot exceed MRP', 'error');
    if (isNaN(stock) || stock < 0) return showToast('Valid stock quantity is required', 'error');

    setIsSaving(true);
    setUploadProgress(10);

    try {
      const payload = {
        ...form,
        price: price.toFixed(2),
        mrp: mrp.toFixed(2),
        stock_quantity: stock.toString(),
        requires_prescription: Boolean(form.requires_prescription),
      };

      const newFiles = images.filter(img => !img.isExisting).map(img => img.file);

      const interval = setInterval(() => {
        setUploadProgress(p => p < 85 ? p + 10 : p);
      }, 150);

      // ✅ FIXED: Pass progress callback to onSave
      if (onSave) {
        await onSave(payload, newFiles, (p) => setUploadProgress(p));
      }

      clearInterval(interval);
      setUploadProgress(100);
      showToast(editingProduct ? 'Product updated successfully!' : 'Product added successfully!', 'success');

      // Reset form after successful save
      setTimeout(() => {
        setIsSaving(false);
        setUploadProgress(0);
        if (!editingProduct) {
          setForm({ ...EMPTY_FORM });
          setImages([]);
          setAiFilledFields(new Set());
          resetAI();
        }
      }, 800);
    } catch (err) {
      setIsSaving(false);
      setUploadProgress(0);
      showToast(err.message || 'Failed to save product', 'error');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === 'success' ? styles.toastSuccess : toast.type === 'error' ? styles.toastError : styles.toastInfo) }}>
          {toast.type === 'success' ? <FaCheckCircle /> : toast.type === 'error' ? <FaExclamationTriangle /> : <FaBolt />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <FaPills size={22} />
          </div>
          <div>
            <h2 style={styles.headerTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <p style={styles.headerSub}>Complete all required fields to list your product</p>
          </div>
        </div>

        <div style={styles.modeToggle}>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'ai' ? styles.modeBtnActive : {}) }}
            onClick={() => setMode('ai')}
          >
            <FaRobot /> AI Mode
          </button>
          <button
            style={{ ...styles.modeBtn, ...(mode === 'manual' ? styles.modeBtnActive : {}) }}
            onClick={() => setMode('manual')}
          >
            <FaEdit /> Manual
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {/* ── AI Mode Panel ── */}
        {mode === 'ai' && (
          <div style={styles.aiPanel}>
            <div style={styles.aiPanelHeader}>
              <FaMagic color="#00b38e" />
              <span style={styles.aiPanelTitle}>AI Auto-Fill</span>
              <span style={styles.aiPanelSub}>Upload a product image and AI will fill in the details</span>
            </div>

            <div
              style={styles.aiUploadZone}
              onClick={() => aiFileInputRef.current?.click()}
            >
              {isAnalyzing ? (
                <div style={styles.aiLoadingState}>
                  <FaSpinner size={40} style={{ animation: 'spin 1s linear infinite', color: '#00b38e' }} />
                  <p style={styles.aiLoadingText}>AI is analyzing your image...</p>
                  <p style={styles.aiLoadingSubText}>Extracting product details</p>
                </div>
              ) : analysisResult ? (
                <div style={styles.aiSuccessState}>
                  <FaCheckCircle size={48} color="#00b38e" />
                  <p style={styles.aiSuccessText}>Analysis Complete!</p>
                  <p style={styles.aiSuccessCount}>{aiFilledFields.size} fields auto-filled</p>
                  <button
                    style={styles.aiRetryBtn}
                    onClick={(e) => { e.stopPropagation(); resetAI(); setAiFilledFields(new Set()); }}
                  >
                    Analyze Another Image
                  </button>
                </div>
              ) : (
                <div style={styles.aiIdleState}>
                  <div style={styles.aiIconWrap}>
                    <FaCamera size={48} color="#00b38e" />
                  </div>
                  <p style={styles.aiIdleTitle}>Drop your product image here</p>
                  <p style={styles.aiIdleSub}>JPG, PNG, WebP • Max 10MB</p>
                  <div style={styles.aiFeatures}>
                    <span style={styles.aiFeatureTag}>✓ Product Name</span>
                    <span style={styles.aiFeatureTag}>✓ Category</span>
                    <span style={styles.aiFeatureTag}>✓ Composition</span>
                    <span style={styles.aiFeatureTag}>✓ Dosage</span>
                    <span style={styles.aiFeatureTag}>✓ Price Estimate</span>
                    <span style={styles.aiFeatureTag}>✓ Side Effects</span>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={aiFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleAIImageSelect(e.target.files[0])}
            />

            {aiError && (
              <div style={styles.aiError}>
                <FaExclamationTriangle /> {aiError}
              </div>
            )}

            {analysisResult && (
              <div style={styles.aiNote}>
                <FaEdit size={13} />
                <span>Review and edit the AI-filled fields below. Green fields were auto-filled by AI. Don't forget to set the price and stock before saving!</span>
              </div>
            )}
          </div>
        )}

        {/* ── Product Images Gallery ── */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FaCamera color="#00b38e" />
            <span style={styles.sectionTitle}>Product Images</span>
            <span style={styles.imageCount}>{images.length} / {MAX_IMAGES}</span>
          </div>

          {images.length > 0 ? (
            <div style={styles.gallery}>
              <div style={styles.mainImgWrap}>
                <img src={images[currentIdx]?.preview} alt="Product" style={styles.mainImg} />

                {images.length > 1 && (
                  <>
                    <button style={{ ...styles.navBtn, left: 12 }} onClick={() => setCurrentIdx(i => (i - 1 + images.length) % images.length)}>
                      <FaChevronLeft />
                    </button>
                    <button style={{ ...styles.navBtn, right: 12 }} onClick={() => setCurrentIdx(i => (i + 1) % images.length)}>
                      <FaChevronRight />
                    </button>
                  </>
                )}

                <span style={styles.imgCounter}>{currentIdx + 1} / {images.length}</span>

                <button style={styles.removeMainBtn} onClick={() => removeImage(currentIdx)}>
                  <FaTrash size={14} />
                </button>
              </div>

              <div style={styles.thumbRow}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{ ...styles.thumb, ...(idx === currentIdx ? styles.thumbActive : {}) }}
                    onClick={() => setCurrentIdx(idx)}
                  >
                    <img src={img.preview} alt="" style={styles.thumbImg} />
                    <button
                      style={styles.thumbRemoveBtn}
                      onClick={e => { e.stopPropagation(); removeImage(idx); }}
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <div style={styles.thumbAdd} onClick={() => fileInputRef.current?.click()}>
                    <FaPlus size={18} color="#00b38e" />
                    <span style={{ fontSize: 11, color: '#00b38e', fontWeight: 700 }}>Add</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{ ...styles.dropzone, ...(isDragging ? styles.dropzoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaImage size={48} color={isDragging ? '#00b38e' : '#ccc'} />
              <p style={styles.dropzoneTitle}>Drag & drop product images</p>
              <p style={styles.dropzoneSub}>Up to {MAX_IMAGES} images • JPG, PNG, WebP • Max 10MB each</p>
              <button style={styles.browseBtn} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <FaUpload /> Browse Files
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => addImages(e.target.files)}
          />
        </div>

        {/* ── Form Fields ── */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FaClipboardList color="#00b38e" />
            <span style={styles.sectionTitle}>Product Details</span>
          </div>

          <div style={styles.grid}>
            {/* Category */}
            <Field label="Category *" icon={<FaTag />} full>
              <select
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                style={fieldStyle(aiFilledFields.has('category'))}
              >
                <option value="">Select category</option>
                {ALL_CATEGORIES.map(grp => (
                  <optgroup key={grp.group} label={grp.group}>
                    {grp.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {aiFilledFields.has('category') && <AIBadge />}
            </Field>

            {/* Name */}
            <Field label="Product Name *" icon={<FaBox />} aiField={aiFilledFields.has('name')}>
              <input
                type="text"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Enter product name"
                style={fieldStyle(aiFilledFields.has('name'))}
              />
              {aiFilledFields.has('name') && <AIBadge />}
            </Field>

            {/* Generic Name (medicine only) */}
            {isMedicine && (
              <Field label="Generic Name" icon={<FaPills />} aiField={aiFilledFields.has('generic_name')}>
                <input
                  type="text"
                  value={form.generic_name}
                  onChange={e => setField('generic_name', e.target.value)}
                  placeholder="Generic / chemical name"
                  style={fieldStyle(aiFilledFields.has('generic_name'))}
                />
                {aiFilledFields.has('generic_name') && <AIBadge />}
              </Field>
            )}

            {/* Manufacturer / Brand */}
            <Field label={isMedicine ? 'Manufacturer' : 'Brand'} icon={<FaTag />} aiField={aiFilledFields.has(isMedicine ? 'manufacturer' : 'brand')}>
              <input
                type="text"
                value={isMedicine ? form.manufacturer : form.brand}
                onChange={e => setField(isMedicine ? 'manufacturer' : 'brand', e.target.value)}
                placeholder={isMedicine ? 'Manufacturer name' : 'Brand name'}
                style={fieldStyle(aiFilledFields.has(isMedicine ? 'manufacturer' : 'brand'))}
              />
              {aiFilledFields.has(isMedicine ? 'manufacturer' : 'brand') && <AIBadge />}
            </Field>

            {/* Form (medicine only) */}
            {isMedicine && (
              <Field label="Form *" icon={<FaPills />} aiField={aiFilledFields.has('form')}>
                <select
                  value={form.form}
                  onChange={e => setField('form', e.target.value)}
                  style={fieldStyle(aiFilledFields.has('form'))}
                >
                  <option value="">Select form</option>
                  {['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'gel', 'patch'].map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
                {aiFilledFields.has('form') && <AIBadge />}
              </Field>
            )}

            {/* Strength (medicine only) */}
            {isMedicine && (
              <Field label="Strength / Dosage" icon={<FaChartBar />} aiField={aiFilledFields.has('strength')}>
                <input
                  type="text"
                  value={form.strength}
                  onChange={e => setField('strength', e.target.value)}
                  placeholder="e.g. 500mg, 10ml"
                  style={fieldStyle(aiFilledFields.has('strength'))}
                />
                {aiFilledFields.has('strength') && <AIBadge />}
              </Field>
            )}

            {/* Type/Model (non-medicine) */}
            {!isMedicine && (
              <Field label="Type / Model" icon={<FaStethoscope />}>
                <input
                  type="text"
                  value={form.form}
                  onChange={e => setField('form', e.target.value)}
                  placeholder="e.g. Digital, Disposable"
                  style={fieldStyle(false)}
                />
              </Field>
            )}

            {/* Pack Size */}
            <Field label="Pack Size" icon={<FaBox />} aiField={aiFilledFields.has('pack_size')}>
              <input
                type="text"
                value={form.pack_size}
                onChange={e => setField('pack_size', e.target.value)}
                placeholder="e.g. 10 tablets, 100ml"
                style={fieldStyle(aiFilledFields.has('pack_size'))}
              />
              {aiFilledFields.has('pack_size') && <AIBadge />}
            </Field>

            {/* MRP */}
            <Field label="MRP (₹) *" icon={<FaDollarSign />} aiField={aiFilledFields.has('mrp')}>
              <input
                type="number"
                step="0.01"
                value={form.mrp}
                onChange={e => setField('mrp', e.target.value)}
                placeholder="Maximum Retail Price"
                style={fieldStyle(aiFilledFields.has('mrp'))}
              />
              {aiFilledFields.has('mrp') && <AIBadge />}
            </Field>

            {/* Selling Price */}
            <Field label="Selling Price (₹) *" icon={<FaDollarSign />} aiField={aiFilledFields.has('price')}>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={e => setField('price', e.target.value)}
                placeholder="Your selling price"
                style={fieldStyle(aiFilledFields.has('price'))}
              />
              {aiFilledFields.has('price') && <AIBadge />}
            </Field>

            {/* Stock */}
            <Field label="Stock Quantity *" icon={<FaWarehouse />}>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={e => setField('stock_quantity', e.target.value)}
                placeholder="Available quantity"
                style={fieldStyle(false)}
              />
            </Field>

            {/* Batch Number */}
            <Field label="Batch Number" icon={<FaCalendar />}>
              <input
                type="text"
                value={form.batch_number}
                onChange={e => setField('batch_number', e.target.value)}
                placeholder="Batch / Lot number"
                style={fieldStyle(false)}
              />
            </Field>

            {/* Expiry Date */}
            <Field label="Expiry Date" icon={<FaCalendar />}>
              <input
                type="date"
                value={form.expiry_date}
                onChange={e => setField('expiry_date', e.target.value)}
                style={fieldStyle(false)}
              />
            </Field>

            {/* Storage (medicine only) */}
            {isMedicine && (
              <Field label="Storage Condition" icon={<FaThermometerHalf />}>
                <select
                  value={form.storage_instructions}
                  onChange={e => setField('storage_instructions', e.target.value)}
                  style={fieldStyle(false)}
                >
                  <option value="room_temp">🌡️ Room Temperature</option>
                  <option value="cool_place">❄️ Cool Place (&lt;25°C)</option>
                  <option value="refrigerated">🧊 Refrigerated (2-8°C)</option>
                  <option value="frozen">🧊 Frozen</option>
                </select>
              </Field>
            )}

            {/* Description */}
            <Field label="Description" icon={<FaClipboardList />} aiField={aiFilledFields.has('description')} full>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Product description, usage instructions..."
                rows={3}
                style={{ ...fieldStyle(aiFilledFields.has('description')), resize: 'vertical' }}
              />
              {aiFilledFields.has('description') && <AIBadge />}
            </Field>

            {/* Medicine-specific advanced fields */}
            {isMedicine && (
              <>
                <Field label="Composition" icon={<FaPills />} aiField={aiFilledFields.has('composition')} full>
                  <textarea
                    value={form.composition}
                    onChange={e => setField('composition', e.target.value)}
                    placeholder="Active ingredients and their quantities..."
                    rows={2}
                    style={{ ...fieldStyle(aiFilledFields.has('composition')), resize: 'vertical' }}
                  />
                  {aiFilledFields.has('composition') && <AIBadge />}
                </Field>

                <Field label="Side Effects" icon={<FaExclamationTriangle />} aiField={aiFilledFields.has('side_effects')} full>
                  <textarea
                    value={form.side_effects}
                    onChange={e => setField('side_effects', e.target.value)}
                    placeholder="Known side effects..."
                    rows={2}
                    style={{ ...fieldStyle(aiFilledFields.has('side_effects')), resize: 'vertical' }}
                  />
                  {aiFilledFields.has('side_effects') && <AIBadge />}
                </Field>

                <Field label="Contraindications" icon={<FaExclamationTriangle />} aiField={aiFilledFields.has('contraindications')} full>
                  <textarea
                    value={form.contraindications}
                    onChange={e => setField('contraindications', e.target.value)}
                    placeholder="When not to use this medicine..."
                    rows={2}
                    style={{ ...fieldStyle(aiFilledFields.has('contraindications')), resize: 'vertical' }}
                  />
                  {aiFilledFields.has('contraindications') && <AIBadge />}
                </Field>

                {/* Prescription Checkbox */}
                <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.requires_prescription}
                      onChange={e => setField('requires_prescription', e.target.checked)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ ...styles.checkboxBox, ...(form.requires_prescription ? styles.checkboxBoxChecked : {}) }}>
                      {form.requires_prescription && '✓'}
                    </span>
                    <span style={styles.checkboxText}>
                      <FaFileAlt size={14} color="#00b38e" /> Requires Prescription
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div style={styles.progressWrap}>
          <div style={styles.progressInfo}>
            <span>Saving product...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {aiFilledFields.size > 0 && (
            <span style={styles.aiSummary}>
              <FaMagic color="#00b38e" /> {aiFilledFields.size} fields AI-filled
            </span>
          )}
        </div>
        <div style={styles.footerRight}>
          {onCancel && (
            <button style={styles.cancelBtn} onClick={onCancel}>
              <FaTimes /> Cancel
            </button>
          )}
          <button
            style={{
              ...styles.saveBtn,
              ...(!form.name || !form.category || !form.price || !form.stock_quantity || isSaving
                ? styles.saveBtnDisabled : {}),
            }}
            onClick={handleSave}
            disabled={!form.name || !form.category || !form.price || !form.stock_quantity || isSaving}
          >
            {isSaving ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
            {isSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { padding: 8px; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.6; }
      `}</style>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const AIBadge = () => (
  <span style={styles.aiBadge}>
    <FaMagic size={10} /> AI
  </span>
);

const Field = ({ label, icon, children, full, aiField }) => (
  <div style={{ ...styles.field, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
    <label style={styles.label}>
      <span style={styles.labelIcon}>{icon}</span>
      {label}
      {aiField && <span style={styles.aiLabelBadge}>✨ AI</span>}
    </label>
    <div style={{ position: 'relative' }}>
      {children}
    </div>
  </div>
);

const fieldStyle = (isAI) => ({
  width: '100%',
  padding: '11px 14px',
  border: `2px solid ${isAI ? '#00b38e' : '#e5e7eb'}`,
  borderRadius: 8,
  fontSize: 14,
  color: '#1a1a1a',
  background: isAI ? '#f0fdf9' : '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
});

const styles = {
  wrapper: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: 900,
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px',
    borderBottom: '2px solid #f3f4f6',
    background: 'linear-gradient(135deg, #f0fdf9, #fff)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerIcon: {
    width: 48, height: 48,
    background: 'linear-gradient(135deg, #00b38e, #009973)',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: 0 },
  headerSub: { fontSize: 13, color: '#888', margin: '2px 0 0' },
  modeToggle: {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'transparent',
    color: '#666',
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    background: '#fff',
    color: '#00b38e',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  body: { padding: 28, display: 'flex', flexDirection: 'column', gap: 28 },
  aiPanel: {
    background: 'linear-gradient(135deg, #f0fdf9, #fff)',
    border: '2px solid #00b38e30',
    borderRadius: 14,
    padding: 24,
  },
  aiPanelHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 20,
  },
  aiPanelTitle: { fontSize: 16, fontWeight: 800, color: '#1a1a1a' },
  aiPanelSub: { fontSize: 13, color: '#888', marginLeft: 4 },
  aiUploadZone: {
    border: '2px dashed #00b38e80',
    borderRadius: 12,
    padding: 36,
    textAlign: 'center',
    cursor: 'pointer',
    background: '#fff',
    transition: 'all 0.2s',
    minHeight: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  aiLoadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  aiLoadingText: { fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  aiLoadingSubText: { fontSize: 13, color: '#888', margin: 0 },
  aiSuccessState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  aiSuccessText: { fontSize: 18, fontWeight: 800, color: '#00b38e', margin: 0 },
  aiSuccessCount: { fontSize: 13, color: '#666', margin: 0 },
  aiRetryBtn: {
    marginTop: 8,
    padding: '8px 20px',
    background: '#f0fdf9',
    border: '2px solid #00b38e',
    borderRadius: 8,
    color: '#00b38e',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  aiIdleState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  aiIconWrap: {
    width: 88, height: 88,
    background: '#f0fdf9',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  aiIdleTitle: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  aiIdleSub: { fontSize: 13, color: '#aaa', margin: 0 },
  aiFeatures: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  aiFeatureTag: {
    padding: '4px 12px',
    background: '#f0fdf9',
    border: '1px solid #00b38e40',
    borderRadius: 20,
    fontSize: 12,
    color: '#00b38e',
    fontWeight: 600,
  },
  aiError: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 12,
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 13,
    fontWeight: 600,
  },
  aiNote: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    marginTop: 12,
    padding: '10px 14px',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: 8,
    color: '#92400e',
    fontSize: 13,
  },
  section: {
    border: '2px solid #f3f4f6',
    borderRadius: 14,
    padding: 24,
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: 800, color: '#1a1a1a' },
  imageCount: {
    marginLeft: 'auto',
    padding: '3px 12px',
    background: '#f0fdf9',
    border: '1px solid #00b38e40',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    color: '#00b38e',
  },
  gallery: { display: 'flex', flexDirection: 'column', gap: 16 },
  mainImgWrap: {
    position: 'relative',
    width: '100%',
    height: 340,
    borderRadius: 12,
    overflow: 'hidden',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
  },
  mainImg: { width: '100%', height: '100%', objectFit: 'contain', background: '#fff' },
  navBtn: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontSize: 16, color: '#333',
    zIndex: 10,
  },
  imgCounter: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff', padding: '5px 14px', borderRadius: 20,
    fontSize: 12, fontWeight: 700, zIndex: 10,
  },
  removeMainBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: '50%',
    background: '#dc2626', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  thumbRow: {
    display: 'flex', gap: 10, overflowX: 'auto',
    paddingBottom: 4,
  },
  thumb: {
    position: 'relative', width: 90, height: 90,
    flexShrink: 0, borderRadius: 8, overflow: 'hidden',
    border: '3px solid #e5e7eb', cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.2s',
  },
  thumbActive: { borderColor: '#00b38e', transform: 'scale(1.05)' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbRemoveBtn: {
    position: 'absolute', top: 3, right: 3,
    width: 20, height: 20, borderRadius: '50%',
    background: '#dc2626', color: '#fff',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  thumbAdd: {
    width: 90, height: 90, flexShrink: 0,
    borderRadius: 8,
    border: '3px dashed #00b38e',
    background: '#f0fdf9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 4, cursor: 'pointer',
  },
  dropzone: {
    border: '3px dashed #d1d5db',
    borderRadius: 12, padding: 40,
    textAlign: 'center', cursor: 'pointer',
    background: '#fafafa',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    transition: 'all 0.2s',
  },
  dropzoneActive: { borderColor: '#00b38e', background: '#f0fdf9' },
  dropzoneTitle: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  dropzoneSub: { fontSize: 13, color: '#aaa', margin: 0 },
  browseBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #00b38e, #009973)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 20,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 13, fontWeight: 700, color: '#374151',
  },
  labelIcon: { color: '#00b38e', fontSize: 13 },
  aiLabelBadge: {
    marginLeft: 4,
    padding: '1px 8px',
    background: '#dcfce7',
    color: '#16a34a',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  aiBadge: {
    position: 'absolute',
    right: 10, top: '50%', transform: 'translateY(-50%)',
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '2px 9px',
    background: '#dcfce7',
    color: '#16a34a',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    pointerEvents: 'none',
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', userSelect: 'none',
  },
  checkboxBox: {
    width: 22, height: 22,
    border: '2px solid #d1d5db', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 900,
    transition: 'all 0.2s',
  },
  checkboxBoxChecked: {
    background: 'linear-gradient(135deg, #00b38e, #009973)',
    borderColor: '#00b38e',
    color: '#fff',
  },
  checkboxText: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 14, fontWeight: 600, color: '#374151',
  },
  progressWrap: { padding: '0 28px 16px' },
  progressInfo: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
  },
  progressBar: {
    height: 8, background: '#e5e7eb',
    borderRadius: 20, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00b38e, #00d4a1)',
    borderRadius: 20, transition: 'width 0.3s ease',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 28px',
    borderTop: '2px solid #f3f4f6',
    background: '#fafafa',
  },
  footerLeft: { display: 'flex', alignItems: 'center' },
  footerRight: { display: 'flex', gap: 12 },
  aiSummary: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 14px',
    background: '#dcfce7',
    borderRadius: 20,
    fontSize: 13, fontWeight: 700, color: '#16a34a',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '11px 24px',
    background: '#fff', color: '#374151',
    border: '2px solid #d1d5db', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '11px 28px',
    background: 'linear-gradient(135deg, #00b38e, #009973)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,179,142,0.25)',
  },
  saveBtnDisabled: {
    background: '#d1d5db', color: '#9ca3af',
    cursor: 'not-allowed', boxShadow: 'none',
  },
  toast: {
    position: 'fixed', bottom: 28, right: 28,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 22px',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    fontWeight: 600, fontSize: 14, color: '#1a1a1a',
    zIndex: 99999,
    borderLeft: '4px solid #00b38e',
  },
  toastSuccess: { borderLeftColor: '#00b38e', color: '#065f46' },
  toastError: { borderLeftColor: '#dc2626', color: '#7f1d1d' },
  toastInfo: { borderLeftColor: '#3b82f6', color: '#1e3a8a' },
};

export default AddMedicineWithAI;