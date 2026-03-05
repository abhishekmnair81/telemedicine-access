import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import {
  FaShoppingCart, FaHeart, FaShare, FaChevronLeft, FaChevronRight,
  FaTruck, FaShieldAlt, FaUndo, FaClock, FaMapMarkerAlt, FaPhone,
  FaCheck, FaTimes, FaBox, FaStar, FaStarHalfAlt, FaPlus, FaMinus,
  FaExclamationTriangle, FaInfoCircle, FaPills, FaFirstAid, FaStethoscope,
  FaChevronDown, FaChevronUp, FaPercentage, FaCertificate, FaSpinner
} from 'react-icons/fa';
import { pharmacyAPI, cartAPI } from '../services/api';  // ✅ ADD cartAPI
import './PharmacyProductDetail.css';

const PharmacyProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState([]);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [addingToCart, setAddingToCart] = useState(false);  // ✅ ADD THIS
  const [expandedSections, setExpandedSections] = useState({
    keyFeatures: true,
    usage: false,
    benefits: false,
    ingredients: false
  });

  useEffect(() => {
    loadProduct();
    loadCartCount();  // ✅ Load cart count from backend
    loadWishlist();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await pharmacyAPI.getMedicineById(productId);
      setProduct(response);
      
      if (response.category) {
        loadRelatedProducts(response.category);
      }
      
      setError(null);
    } catch (err) {
      console.error('[ProductDetail] Error:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ REPLACE loadCartCount with backend API call
  const loadCartCount = async () => {
    try {
      const count = await cartAPI.getCartCount();
      setCartCount(count);
    } catch (err) {
      console.error('[ProductDetail] Error loading cart count:', err);
      setCartCount(0);
    }
  };

  const loadRelatedProducts = async (category) => {
    try {
      const response = await pharmacyAPI.getAllMedicines();
      const related = response
        .filter(p => p.category === category && p.id !== parseInt(productId))
        .slice(0, 6);
      setRelatedProducts(related);
    } catch (err) {
      console.error('[ProductDetail] Error loading related:', err);
    }
  };

  const loadWishlist = () => {
    const savedWishlist = localStorage.getItem('pharmacy_wishlist');
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist));
    }
  };

  const saveWishlist = (updatedWishlist) => {
    localStorage.setItem('pharmacy_wishlist', JSON.stringify(updatedWishlist));
    setWishlist(updatedWishlist);
  };

  // ✅ REPLACE handleAddToCart with backend API call
  const handleAddToCart = async () => {
    if (!product || addingToCart) return;

    try {
      setAddingToCart(true);
      
      // Call backend API
      await cartAPI.addToCart(product.id, quantity);
      
      // Show success message
      setShowAddedToCart(true);
      setTimeout(() => setShowAddedToCart(false), 3000);
      
      // Reload cart count
      await loadCartCount();
      
      console.log(`[ProductDetail] Added ${quantity}x ${product.name} to cart`);
    } catch (err) {
      console.error('[ProductDetail] Add to cart error:', err);
      alert('Failed to add to cart: ' + err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = () => {
    if (!product) return;

    const isInWishlist = wishlist.some(item => item.id === product.id);
    
    let updatedWishlist;
    if (isInWishlist) {
      updatedWishlist = wishlist.filter(item => item.id !== product.id);
    } else {
      updatedWishlist = [...wishlist, {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp || product.price),
        image: product.primary_image || (product.images && product.images[0]?.image_url),
        category: product.category
      }];
    }

    saveWishlist(updatedWishlist);
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= product.stock_quantity) {
      setQuantity(newQuantity);
    }
  };

  const navigateImage = (direction) => {
    if (!product || !product.images || product.images.length === 0) return;
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const calculateDiscount = () => {
    if (!product || !product.mrp) return 0;
    const mrp = parseFloat(product.mrp);
    const price = parseFloat(product.price);
    return Math.round(((mrp - price) / mrp) * 100);
  };

  const isInWishlist = () => {
    return wishlist.some(item => item.id === product?.id);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="pe-loading-container">
        <div className="pe-spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pe-error-container">
        <FaExclamationTriangle size={48} />
        <h2>{error || 'Product not found'}</h2>
        <button onClick={() => navigate('/pharmacy-home')} className="pe-btn-primary">
          Back to Shop
        </button>
      </div>
    );
  }

  const discount = calculateDiscount();
  const images = product.images || [];
  const currentImage = images.length > 0 
    ? images[currentImageIndex]?.image_url 
    : product.primary_image || null;

  return (
    <div className="pe-product-page">
      {/* Breadcrumb */}
      <div className="pe-breadcrumb">
        <div className="pe-container">
          <span onClick={() => navigate('/')}>Home</span>
          <span className="pe-separator">/</span>
          <span onClick={() => navigate(`/pharmacy?category=${product.category}`)}>
            {product.category}
          </span>
          <span className="pe-separator">/</span>
          <span className="pe-active">{product.name}</span>
        </div>
      </div>

      {/* Success Toast */}
      {showAddedToCart && (
        <div className="pe-toast">
          <FaCheck /> Added to cart successfully!
        </div>
      )}

      <div className="pe-container">
        <div className="pe-product-container">
          {/* Image Gallery Section */}
          <div className="pe-image-section">
            <div className="pe-image-wrapper">
              <div className="pe-main-image">
                {currentImage ? (
                  <img src={currentImage} alt={product.name} />
                ) : (
                  <div className="pe-no-image">
                    <FaBox size={80} />
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="pe-discount-badge">
                    {discount}% OFF
                  </div>
                )}

                <button 
                  className="pe-wishlist-btn"
                  onClick={handleAddToWishlist}
                >
                  <FaHeart className={isInWishlist() ? 'pe-filled' : ''} />
                </button>
              </div>

              {images.length > 1 && (
                <div className="pe-thumbnail-list">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`pe-thumbnail ${idx === currentImageIndex ? 'pe-active' : ''}`}
                      onClick={() => setCurrentImageIndex(idx)}
                    >
                      <img src={img.image_url} alt={`${product.name} ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Info Section */}
          <div className="pe-info-section">
            <h1 className="pe-product-title">{product.name}</h1>
            
            {product.generic_name && (
              <p className="pe-generic-name">{product.generic_name}</p>
            )}

            {product.manufacturer && (
              <p className="pe-manufacturer">
                <span className="pe-label">Manufacturer:</span> {product.manufacturer}
              </p>
            )}

            {/* Rating */}
            <div className="pe-rating">
              <div className="pe-stars">
                <FaStar />
                <FaStar />
                <FaStar />
                <FaStar />
                <FaStarHalfAlt />
              </div>
              <span className="pe-rating-text">4.5 | 120 ratings</span>
            </div>

            {/* Price Section */}
            <div className="pe-price-section">
              <div className="pe-price-row">
                <div className="pe-price-main">₹{product.price}</div>
                {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                  <>
                    <div className="pe-price-mrp">MRP ₹{product.mrp}</div>
                    <div className="pe-price-save">Save {discount}%</div>
                  </>
                )}
              </div>
              <p className="pe-tax-info">Inclusive of all taxes</p>
            </div>

            {/* Stock Status */}
            {product.stock_quantity > 0 ? (
              <div className="pe-stock-available">
                <FaCheck /> In Stock
              </div>
            ) : (
              <div className="pe-stock-out">
                <FaTimes /> Out of Stock
              </div>
            )}

            {/* Prescription Warning */}
            {product.requires_prescription && (
              <div className="pe-prescription-alert">
                <FaExclamationTriangle />
                <span>Prescription Required - Upload valid prescription during checkout</span>
              </div>
            )}

            {/* Key Information */}
            <div className="pe-key-info">
              {product.form && (
                <div className="pe-info-item">
                  <span className="pe-info-label">Form:</span>
                  <span className="pe-info-value">{product.form}</span>
                </div>
              )}
              {product.strength && (
                <div className="pe-info-item">
                  <span className="pe-info-label">Strength:</span>
                  <span className="pe-info-value">{product.strength}</span>
                </div>
              )}
              {product.pack_size && (
                <div className="pe-info-item">
                  <span className="pe-info-label">Pack Size:</span>
                  <span className="pe-info-value">{product.pack_size}</span>
                </div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock_quantity > 0 && (
              <>
                <div className="pe-quantity-section">
                  <label className="pe-quantity-label">Quantity:</label>
                  <div className="pe-quantity-control">
                    <button 
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="pe-qty-btn"
                    >
                      <FaMinus />
                    </button>
                    <span className="pe-qty-value">{quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock_quantity}
                      className="pe-qty-btn"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>

                {/* ✅ UPDATED Add to Cart button */}
                <button 
                  className="pe-add-to-cart" 
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                >
                  {addingToCart ? (
                    <>
                      <FaSpinner className="spinner" /> Adding...
                    </>
                  ) : (
                    <>
                      <FaShoppingCart /> Add to Cart
                    </>
                  )}
                </button>

                {/* ✅ View Cart button */}
                {cartCount > 0 && (
                  <button 
                    className="pe-view-cart-btn" 
                    onClick={() => navigate('/cart')}
                  >
                    <FaShoppingCart />
                    View Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                    <FaArrowRight />
                  </button>
                )}
              </>
            )}

            {/* Delivery Benefits */}
            <div className="pe-delivery-benefits">
              <div className="pe-benefit">
                <FaTruck className="pe-benefit-icon" />
                <div>
                  <div className="pe-benefit-title">Free Delivery</div>
                  <div className="pe-benefit-desc">On orders above ₹500</div>
                </div>
              </div>
              <div className="pe-benefit">
                <FaClock className="pe-benefit-icon" />
                <div>
                  <div className="pe-benefit-title">Delivery in 2-3 Days</div>
                  <div className="pe-benefit-desc">Fast and reliable</div>
                </div>
              </div>
              <div className="pe-benefit">
                <FaShieldAlt className="pe-benefit-icon" />
                <div>
                  <div className="pe-benefit-title">100% Authentic</div>
                  <div className="pe-benefit-desc">All products verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Accordion */}
        <div className="pe-details-section">
          {/* Description */}
          {product.description && (
            <div className="pe-accordion-item">
              <div 
                className="pe-accordion-header"
                onClick={() => toggleSection('keyFeatures')}
              >
                <h3>Product Description</h3>
                {expandedSections.keyFeatures ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              {expandedSections.keyFeatures && (
                <div className="pe-accordion-content">
                  <p>{product.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Product Information */}
          <div className="pe-accordion-item">
            <div 
              className="pe-accordion-header"
              onClick={() => toggleSection('usage')}
            >
              <h3>Product Information</h3>
              {expandedSections.usage ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            {expandedSections.usage && (
              <div className="pe-accordion-content">
                <table className="pe-info-table">
                  <tbody>
                    {product.form && (
                      <tr>
                        <td>Form</td>
                        <td>{product.form}</td>
                      </tr>
                    )}
                    {product.strength && (
                      <tr>
                        <td>Strength</td>
                        <td>{product.strength}</td>
                      </tr>
                    )}
                    {product.manufacturer && (
                      <tr>
                        <td>Manufacturer</td>
                        <td>{product.manufacturer}</td>
                      </tr>
                    )}
                    {product.pack_size && (
                      <tr>
                        <td>Pack Size</td>
                        <td>{product.pack_size}</td>
                      </tr>
                    )}
                    {product.storage_instructions && (
                      <tr>
                        <td>Storage</td>
                        <td>{product.storage_instructions}</td>
                      </tr>
                    )}
                    {product.batch_number && (
                      <tr>
                        <td>Batch Number</td>
                        <td>{product.batch_number}</td>
                      </tr>
                    )}
                    {product.expiry_date && (
                      <tr>
                        <td>Expiry Date</td>
                        <td>{new Date(product.expiry_date).toLocaleDateString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        {relatedProducts.length > 0 && (
          <div className="pe-similar-section">
            <h2 className="pe-section-title">Similar Products</h2>
            <div className="pe-similar-grid">
              {relatedProducts.map((item) => (
                <div 
                  key={item.id}
                  className="pe-similar-card"
                  onClick={() => navigate(`/pharmacy/product/${item.id}`)}
                >
                  <div className="pe-similar-image">
                    {item.primary_image || (item.images && item.images[0]) ? (
                      <img 
                        src={item.primary_image || item.images[0].image_url} 
                        alt={item.name}
                      />
                    ) : (
                      <FaBox />
                    )}
                  </div>
                  <div className="pe-similar-info">
                    <h4>{item.name}</h4>
                    <div className="pe-similar-price">
                      <span className="pe-sp-price">₹{item.price}</span>
                      {item.mrp && parseFloat(item.mrp) > parseFloat(item.price) && (
                        <span className="pe-sp-mrp">₹{item.mrp}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyProductDetail;