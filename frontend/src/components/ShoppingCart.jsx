import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaShoppingCart, FaTrash, FaPlus, FaMinus, FaArrowRight,
  FaTruck, FaShieldAlt, FaPercent, FaTag, FaExclamationTriangle,
  FaCreditCard, FaMoneyBillWave, FaBox, FaCheckCircle, FaChevronLeft,
  FaPills
} from 'react-icons/fa';
import './ShoppingCart.css';
import { cartAPI } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
// ✅ Django media files are served from the root, not /api
const MEDIA_BASE_URL = process.env.REACT_APP_MEDIA_URL || 'http://localhost:8000';

/**
 * Resolves a medicine image URL.
 * Django often returns paths like "/media/medicines/image.jpg" or
 * "http://localhost:8000/media/..." — this handles both cases.
 */
const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path — prepend the media base
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Picks the best available image from a medicine_details object.
 * Tries: primary_image → images[0].image_url → images[0].image
 */
const getMedicineImage = (medicine) => {
  if (!medicine) return null;

  if (medicine.primary_image) return resolveImageUrl(medicine.primary_image);

  if (medicine.images && medicine.images.length > 0) {
    const img = medicine.images.find(i => i.is_primary) || medicine.images[0];
    return resolveImageUrl(img.image_url || img.image);
  }

  return null;
};

const ShoppingCart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Track which item images have errored so we show the fallback icon
  const [imgErrors, setImgErrors] = useState({});

  const [checkoutForm, setCheckoutForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    payment_method: 'cash_on_delivery',
    prescription_file: null
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setCheckoutForm(prev => ({
        ...prev,
        full_name: `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim(),
        phone: parsedUser.phone_number || '',
        email: parsedUser.email || '',
      }));
    }
    loadCart();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const getSessionId = () => {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!currentUser) {
        params.append('session_id', getSessionId());
      }

      const response = await fetch(`${API_BASE_URL}/cart/?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to load cart');

      const data = await response.json();
      console.log('[Cart] Loaded:', data);

      if (data.success && data.cart) {
        setCart(data.cart.items || []);
        if (data.cart.applied_coupon) {
          setAppliedCoupon({
            code: data.cart.applied_coupon,
            discount: data.cart.discount
          });
        }
      }
    } catch (err) {
      console.error('[Cart] Load error:', err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, delta) => {
    try {
      const item = cart.find(i => i.id === cartItemId);
      if (!item) return;
      const newQuantity = item.quantity + delta;
      if (newQuantity < 1) return;

      const requestBody = { quantity: newQuantity };
      if (!user) requestBody.session_id = getSessionId();

      const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}/update_quantity/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update quantity');
      }

      await loadCart();
    } catch (err) {
      console.error('[Cart] Update error:', err);
      alert('Failed to update quantity: ' + err.message);
    }
  };

  const removeItem = async (cartItemId) => {
    try {
      const requestBody = {};
      if (!user) requestBody.session_id = getSessionId();

      const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}/remove_item/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove item');
      }

      await loadCart();
    } catch (err) {
      console.error('[Cart] Remove error:', err);
      alert('Failed to remove item: ' + err.message);
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    try {
      const params = new URLSearchParams();
      if (!user) params.append('session_id', getSessionId());

      const response = await fetch(`${API_BASE_URL}/cart/clear/?${params.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to clear cart');

      setCart([]);
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (err) {
      console.error('[Cart] Clear error:', err);
      alert('Failed to clear cart: ' + err.message);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) { alert('Please enter a coupon code'); return; }
    try {
      const requestBody = { coupon_code: couponCode.toUpperCase() };
      if (!user) requestBody.session_id = getSessionId();

      const response = await fetch(`${API_BASE_URL}/cart/apply_coupon/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid coupon code');
      }

      const data = await response.json();
      setAppliedCoupon({ code: data.coupon.code, discount: data.discount_amount });
      alert(`Coupon "${data.coupon.code}" applied successfully!`);
      await loadCart();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeCoupon = async () => {
    setAppliedCoupon(null);
    setCouponCode('');
    await loadCart();
  };

  const calculateSubtotal = () =>
    cart.reduce((sum, item) => {
      const price = parseFloat(item.medicine_details?.price || item.price_at_addition || 0);
      return sum + price * item.quantity;
    }, 0);

  const calculateDiscount = () => parseFloat(appliedCoupon?.discount || 0);
  const calculateDeliveryFee = () => (calculateSubtotal() >= 500 ? 0 : 40);
  const calculateTotal = () => calculateSubtotal() - calculateDiscount() + calculateDeliveryFee();

  const hasPrescriptionItems = () =>
    cart.some(item => item.medicine_details?.requires_prescription || item.requires_prescription);

  const handleCheckoutFormChange = (e) => {
    const { name, value } = e.target;
    setCheckoutForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePrescriptionUpload = (e) => {
    const file = e.target.files[0];
    if (file) setCheckoutForm(prev => ({ ...prev, prescription_file: file }));
  };

  const validateCheckoutForm = () => {
    const errors = [];
    if (!checkoutForm.full_name?.trim())   errors.push('Full name is required');
    if (!checkoutForm.phone?.trim())        errors.push('Phone number is required');
    else if (!/^\d{10}$/.test(checkoutForm.phone.replace(/\D/g, '')))
      errors.push('Phone number must be 10 digits');
    if (!checkoutForm.address?.trim())      errors.push('Address is required');
    if (!checkoutForm.city?.trim())         errors.push('City is required');
    if (!checkoutForm.state?.trim())        errors.push('State is required');
    if (!checkoutForm.pincode?.trim())      errors.push('Pincode is required');
    else if (!/^\d{6}$/.test(checkoutForm.pincode))
      errors.push('Pincode must be 6 digits');
    if (hasPrescriptionItems() && !checkoutForm.prescription_file)
      errors.push('Prescription upload is required for prescription medicines');
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateCheckoutForm()) return;
    try {
      setSubmitting(true);
      const subtotal    = calculateSubtotal();
      const discount    = calculateDiscount();
      const deliveryCharge = calculateDeliveryFee();
      const total       = calculateTotal();

      const orderData = {
        full_name: checkoutForm.full_name,
        delivery_address: `${checkoutForm.address}, ${checkoutForm.city}, ${checkoutForm.state} - ${checkoutForm.pincode}`,
        delivery_phone: checkoutForm.phone,
        payment_method: checkoutForm.payment_method,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        delivery_charge: deliveryCharge.toFixed(2),
        total_amount: total.toFixed(2)
      };

      if (!user) orderData.session_id = getSessionId();

      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        const token = localStorage.getItem('accessToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/orders/create-from-cart/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to place order';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch { errorMessage = errorText || errorMessage; }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCart([]);
      setAppliedCoupon(null);
      localStorage.removeItem('applied_coupon');

      alert(
        `Order placed successfully!\n\nOrder Number: ${data.order.order_number}\nTotal: ₹${data.order.total_amount}\n\nYou will be redirected to your orders.`
      );
      navigate('/pharmacy/orders');
    } catch (err) {
      console.error('[Order] Error:', err);
      alert(`Failed to place order: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // CART ITEM IMAGE — with resolved URL + pill icon fallback
  // ============================================================
  const CartItemImage = ({ item }) => {
    const medicine = item.medicine_details || {};
    const imgSrc   = getMedicineImage(medicine);
    const hasError = imgErrors[item.id];

    // No URL at all, or already errored → show pill icon
    if (!imgSrc || hasError) {
      return (
        <div className="item-image item-image--fallback"
          onClick={() => navigate(`/pharmacy/product/${item.medicine}`)}>
          <FaPills />
        </div>
      );
    }

    return (
      <div className="item-image"
        onClick={() => navigate(`/pharmacy/product/${item.medicine}`)}>
        <img
          src={imgSrc}
          alt={medicine.name}
          onError={() => {
            console.warn('[Cart] Image failed to load:', imgSrc);
            setImgErrors(prev => ({ ...prev, [item.id]: true }));
          }}
        />
      </div>
    );
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading && cart.length === 0) {
    return (
      <div className="shopping-cart-page">
        <div className="cart-container">
          <div className="cart-loading">
            <div className="spinner"></div>
            <p>Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <FaShoppingCart size={64} />
        <h2>Your Cart is Empty</h2>
        <p>Add some products to get started</p>
        <button onClick={() => navigate('/pharmacy/browse')} className="btn-continue-shopping">
          Continue Shopping
        </button>
      </div>
    );
  }

  // ── Checkout page ────────────────────────────────────────────
  if (showCheckout) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-header">
            <button onClick={() => setShowCheckout(false)} className="btn-back-to-cart">
              <FaChevronLeft /> Back to Cart
            </button>
            <h1>Checkout</h1>
          </div>

          <div className="checkout-layout">
            <div className="checkout-form-section">
              <div className="form-section">
                <h2><FaBox /> Delivery Information</h2>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Full Name *</label>
                    <input type="text" name="full_name" value={checkoutForm.full_name}
                      onChange={handleCheckoutFormChange} placeholder="Enter your full name" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" name="phone" value={checkoutForm.phone}
                      onChange={handleCheckoutFormChange} placeholder="10-digit mobile number" maxLength="10" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={checkoutForm.email}
                      onChange={handleCheckoutFormChange} placeholder="your@email.com" />
                  </div>
                  <div className="form-group full-width">
                    <label>Delivery Address *</label>
                    <textarea name="address" value={checkoutForm.address}
                      onChange={handleCheckoutFormChange}
                      placeholder="House/Flat No., Building Name, Street" rows="3" />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" name="city" value={checkoutForm.city}
                      onChange={handleCheckoutFormChange} placeholder="City" />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input type="text" name="state" value={checkoutForm.state}
                      onChange={handleCheckoutFormChange} placeholder="State" />
                  </div>
                  <div className="form-group">
                    <label>Pincode *</label>
                    <input type="text" name="pincode" value={checkoutForm.pincode}
                      onChange={handleCheckoutFormChange} placeholder="6-digit pincode" maxLength="6" />
                  </div>
                </div>
              </div>

              {hasPrescriptionItems() && (
                <div className="form-section">
                  <h2><FaExclamationTriangle /> Prescription Required</h2>
                  <div className="prescription-upload-area">
                    <p>Some items in your cart require a valid prescription</p>
                    <input type="file" accept="image/*,.pdf"
                      onChange={handlePrescriptionUpload} id="prescription-upload" />
                    <label htmlFor="prescription-upload" className="upload-label">
                      {checkoutForm.prescription_file
                        ? <><FaCheckCircle /> {checkoutForm.prescription_file.name}</>
                        : <><FaBox /> Upload Prescription</>}
                    </label>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h2><FaCreditCard /> Payment Method</h2>
                <div className="payment-methods">
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="cash_on_delivery"
                      checked={checkoutForm.payment_method === 'cash_on_delivery'}
                      onChange={handleCheckoutFormChange} />
                    <span className="payment-label">
                      <FaMoneyBillWave />
                      <div><strong>Cash on Delivery</strong><span>Pay when you receive</span></div>
                    </span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="online"
                      checked={checkoutForm.payment_method === 'online'}
                      onChange={handleCheckoutFormChange} />
                    <span className="payment-label">
                      <FaCreditCard />
                      <div><strong>Online Payment</strong><span>UPI / Cards / Net Banking</span></div>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="checkout-summary-section">
              <div className="order-summary-sticky">
                <h3>Order Summary</h3>
                <div className="summary-items">
                  {cart.map(item => {
                    const medicine = item.medicine_details || {};
                    const price = parseFloat(medicine.price || item.price_at_addition || 0);
                    return (
                      <div key={item.id} className="summary-item">
                        <div className="summary-item-info">
                          <span className="item-name">{medicine.name || 'Product'}</span>
                          <span className="item-qty">Qty: {item.quantity}</span>
                        </div>
                        <span className="item-price">₹{(price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="summary-calculations">
                  <div className="calc-row"><span>Subtotal</span><span>₹{calculateSubtotal().toFixed(2)}</span></div>
                  {appliedCoupon && (
                    <div className="calc-row discount">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="calc-row">
                    <span>Delivery Fee</span>
                    <span>{calculateDeliveryFee() === 0
                      ? <span className="free-delivery">FREE</span>
                      : `₹${calculateDeliveryFee()}`}
                    </span>
                  </div>
                  <div className="calc-row total">
                    <span>Total</span><span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                <button className="btn-place-order" onClick={handlePlaceOrder} disabled={submitting}>
                  {submitting ? <>Processing...</> : <><FaCheckCircle /> Place Order</>}
                </button>
                <div className="checkout-guarantees">
                  <div className="guarantee-item"><FaShieldAlt /> Secure Payment</div>
                  <div className="guarantee-item"><FaTruck /> Fast Delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Cart page ────────────────────────────────────────────────
  return (
    <div className="shopping-cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h1><FaShoppingCart /> Shopping Cart ({cart.length} items)</h1>
          <button onClick={clearCart} className="btn-clear-cart" disabled={loading}>
            <FaTrash /> Clear Cart
          </button>
        </div>

        <div className="cart-layout">
          <div className="cart-items-section">
            {cart.map(item => {
              const medicine = item.medicine_details || {};
              const price = parseFloat(medicine.price || item.price_at_addition || 0);
              const mrp   = parseFloat(medicine.mrp || 0);

              return (
                <div key={item.id} className="cart-item">
                  {/* ✅ Fixed image component */}
                  <CartItemImage item={item} />

                  <div className="item-details">
                    <h3 onClick={() => navigate(`/pharmacy/product/${item.medicine}`)}>
                      {medicine.name || 'Product'}
                    </h3>
                    {medicine.category && (
                      <span className="item-category">{medicine.category.replace(/_/g, ' ')}</span>
                    )}
                    {medicine.requires_prescription && (
                      <span className="prescription-badge">
                        <FaExclamationTriangle /> Prescription Required
                      </span>
                    )}
                  </div>

                  <div className="item-quantity">
                    <button onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1 || loading}>
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}
                      disabled={item.quantity >= (medicine.stock_quantity || 100) || loading}>
                      <FaPlus />
                    </button>
                  </div>

                  <div className="item-price">
                    <div className="price-current">₹{(price * item.quantity).toFixed(2)}</div>
                    {mrp > 0 && mrp > price && (
                      <div className="price-original">₹{(mrp * item.quantity).toFixed(2)}</div>
                    )}
                  </div>

                  <button className="btn-remove" onClick={() => removeItem(item.id)} disabled={loading}>
                    <FaTrash />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary-section">
            <div className="cart-summary-sticky">
              <h2>Order Summary</h2>

              <div className="coupon-section">
                <div className="coupon-input-group">
                  <input type="text" placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null} />
                  {appliedCoupon
                    ? <button onClick={removeCoupon} className="btn-remove-coupon">Remove</button>
                    : <button onClick={applyCoupon} className="btn-apply-coupon">Apply</button>
                  }
                </div>
                {appliedCoupon && (
                  <div className="coupon-applied">
                    <FaTag /> Coupon "{appliedCoupon.code}" applied!
                  </div>
                )}
              </div>

              <div className="price-breakdown">
                <div className="price-row">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="price-row discount">
                    <span>Discount</span>
                    <span>-₹{calculateDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="price-row">
                  <span>Delivery Fee</span>
                  <span>
                    {calculateDeliveryFee() === 0
                      ? <span className="free-tag">FREE</span>
                      : `₹${calculateDeliveryFee()}`}
                  </span>
                </div>
                {calculateDeliveryFee() > 0 && calculateSubtotal() < 500 && (
                  <div className="free-delivery-info">
                    <FaTruck /> Add ₹{(500 - calculateSubtotal()).toFixed(2)} more for FREE delivery
                  </div>
                )}
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <button className="btn-checkout" onClick={() => setShowCheckout(true)}>
                Proceed to Checkout <FaArrowRight />
              </button>

              <div className="cart-benefits">
                <div className="benefit-item"><FaShieldAlt /><span>100% Authentic Products</span></div>
                <div className="benefit-item"><FaTruck /><span>Fast &amp; Secure Delivery</span></div>
                <div className="benefit-item"><FaPercent /><span>Best Prices Guaranteed</span></div>
              </div>

              <button className="btn-continue-shopping" onClick={() => navigate('/pharmacy/browse')}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;