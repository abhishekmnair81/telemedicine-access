import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaSearch, FaArrowLeft, FaBox, FaPills, FaStethoscope,
  FaWarehouse, FaFilter
} from 'react-icons/fa';
import { pharmacyAPI } from '../services/api';
import './PharmacistHomepage.css';

const PharmacySearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = searchParams.get('tab') || 'medicines';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const products = await pharmacyAPI.getAllMedicines();
        setAllProducts(products);
      } catch (error) {
        console.error('[PharmacySearch] Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Filter products based on search and tab
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // Define medicine categories
    const medicineCategories = [
      'medicines', 'prescription_drugs', 'otc_medicines',
      'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
    ];
    
    const filtered = allProducts.filter(product => {
      // Search filter
      const matchesQuery = !query || 
        product.name?.toLowerCase().includes(query) ||
        product.generic_name?.toLowerCase().includes(query) ||
        product.manufacturer?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query);
      
      // Tab filter
      const isMedicine = medicineCategories.includes(product.category?.toLowerCase());
      const matchesTab = activeTab === 'medicines' ? isMedicine : !isMedicine;
      
      return matchesQuery && matchesTab;
    });
    
    setFilteredProducts(filtered);
  }, [searchQuery, activeTab, allProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const renderProductCard = (product) => (
    <div key={product.id} className="pharma-product-card-ultra">
      <div className="pharma-product-image-ultra">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} />
        ) : product.images && product.images.length > 0 ? (
          <img src={product.images[0].image_url} alt={product.name} />
        ) : (
          <div className="pharma-product-placeholder-ultra">
            <FaBox />
          </div>
        )}
        
        {product.stock_quantity <= 10 && product.stock_quantity > 0 && (
          <span className="pharma-product-badge-ultra badge-warning">
            Low Stock
          </span>
        )}
      </div>

      <div className="pharma-product-content-ultra">
        <div className="pharma-product-category">
          {product.category}
        </div>
        <h3>{product.name}</h3>
        {product.generic_name && (
          <p className="pharma-generic-ultra">{product.generic_name}</p>
        )}
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

  // Count products for each tab
  const medicineCategories = [
    'medicines', 'prescription_drugs', 'otc_medicines',
    'antibiotics', 'painkillers', 'vitamins', 'ayurvedic', 'homeopathy'
  ];
  
  const medicineCount = allProducts.filter(p => 
    medicineCategories.includes(p.category?.toLowerCase())
  ).length;
  
  const otherCount = allProducts.filter(p => 
    !medicineCategories.includes(p.category?.toLowerCase())
  ).length;

  return (
    <div className="pharma-homepage-ultra">
      {/* Header */}
      <header className="pharma-header-ultra">
        <div className="pharma-main-header-ultra">
          <div className="pharma-container">
            <div className="pharma-header-content-ultra">
              <button 
                className="pharma-btn-secondary-ultra"
                onClick={() => navigate(-1)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FaArrowLeft /> Back
              </button>

              <form className="pharma-search-ultra" onSubmit={handleSearch} style={{ flex: 1 }}>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search medicines, devices, supplies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Search Results */}
      <section className="pharma-products-ultra" style={{ paddingTop: '100px' }}>
        <div className="pharma-container">
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '32px',
            borderBottom: '2px solid #e5e5e5'
          }}>
            <button
              onClick={() => setActiveTab('medicines')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'medicines' ? '#00b38e' : 'transparent',
                color: activeTab === 'medicines' ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === 'medicines' ? '3px solid #00b38e' : '3px solid transparent',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaPills /> Medicines ({medicineCount})
            </button>
            <button
              onClick={() => setActiveTab('other')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'other' ? '#0070cd' : 'transparent',
                color: activeTab === 'other' ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === 'other' ? '3px solid #0070cd' : '3px solid transparent',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaStethoscope /> Other Products ({otherCount})
            </button>
          </div>

          {/* Results Header */}
          <div className="pharma-section-header-ultra">
            <div>
              <h2>
                {searchQuery ? `Search Results: "${searchQuery}"` : 'All Products'}
              </h2>
              <p>Found {filteredProducts.length} products</p>
            </div>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="pharma-products-grid-ultra">
              {filteredProducts.map(renderProductCard)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <FaSearch size={64} color="#ccc" />
              <h3 style={{ marginTop: '20px', color: '#666' }}>
                {searchQuery ? 'No products found' : 'Start searching'}
              </h3>
              <p style={{ color: '#999' }}>
                {searchQuery 
                  ? 'Try different keywords or check spelling' 
                  : 'Enter a product name, category, or manufacturer'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PharmacySearch;