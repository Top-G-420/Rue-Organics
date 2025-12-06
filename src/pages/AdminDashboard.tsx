// Updated src/pages/AdminDashboard.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  price: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  image_url?: string;
  pricing_tiers: Array<{
    min_quantity: number;
    price: string;
  }>;
}

interface PricingTier {
  min_quantity: number;
  price: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('orders');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'> & { pricing_tiers: PricingTier[]; variants: ProductVariant[] }>({
    name: '',
    price: '',
    description: '',
    pricing_tiers: [],
    variants: [],
  });
  const [editingTiers, setEditingTiers] = useState<PricingTier[]>([]);
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([]);

  // Fetch products and their variants
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, product_variants(*)'); // Join variants
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation for updating product tiers
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, pricing_tiers }: { id: string; pricing_tiers: PricingTier[] }) => {
      const { error } = await supabase
        .from('products')
        .update({ pricing_tiers })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditingProductId(null);
    },
  });

  // Mutation for adding/editing variant
  const upsertVariantMutation = useMutation({
    mutationFn: async (variant: ProductVariant) => {
      const { error } = await supabase
        .from('product_variants')
        .upsert(variant); // Upsert for add/edit
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // Mutation for adding new product
  const addProductMutation = useMutation({
    mutationFn: async (newProductData: Omit<Product, 'id'>) => {
      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert(newProductData)
        .select()
        .single();
      if (insertError) throw insertError;
      // Add variants if any
      if (newProductData.variants && newProductData.variants.length > 0) {
        const variantsWithProductId = newProductData.variants.map(v => ({ ...v, product_id: product.id }));
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variantsWithProductId);
        if (variantsError) throw variantsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setNewProduct({ name: '', price: '', description: '', pricing_tiers: [], variants: [] });
    },
  });

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  const handleEditTiers = (product: Product) => {
    setEditingProductId(product.id);
    setEditingTiers(product.pricing_tiers || []);
  };

  const addTier = () => {
    setEditingTiers(prev => [...prev, { min_quantity: 0, price: '' }]);
  };

  const removeTier = (index: number) => {
    setEditingTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof PricingTier, value: number | string) => {
    setEditingTiers(prev => prev.map((tier, i) => i === index ? { ...tier, [field]: value } : tier));
  };

  const saveTiers = () => {
    if (editingProductId) {
      updateProductMutation.mutate({ id: editingProductId, pricing_tiers: editingTiers });
    }
  };

  const handleEditVariants = (product: Product) => {
    setEditingProductId(product.id); // Reuse ID for variants too
    setEditingVariants(product.product_variants || []);
  };

  const addVariant = () => {
    setEditingVariants(prev => [...prev, { id: '', product_id: '', size: '', price: '', stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    const variant = editingVariants[index];
    if (variant.id) {
      // Delete from DB if existing
      supabase.from('product_variants').delete().eq('id', variant.id);
    }
    setEditingVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    setEditingVariants(prev => prev.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
  };

  const saveVariants = () => {
    editingVariants.forEach(variant => {
      upsertVariantMutation.mutate(variant);
    });
    setEditingProductId(null);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate(newProduct);
  };

  const filteredOrders = []; // Simulated; fetch real if needed

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button 
          onClick={() => navigate('/cart')}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white relative" 
          aria-label="Cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3.5A2 2 0 005 19h14a2 2 0 001.1-3.7l-1.5-3.5z" />
          </svg>
        </button>
      </header>

      {/* Slide-out Navigation Panel */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out" style={{ transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
            <div className="p-4">
              <button onClick={() => setIsMenuOpen(false)} className="mb-4 text-gray-600">Close</button>
              <nav className="space-y-4">
                <Link to="/" className={`block py-2 text-lg ${isActive('/')}`}>Home/Catalog</Link>
                <Link to="/orders" className={`block py-2 text-lg ${isActive('/orders')}`}>Orders</Link>
                <Link to="/track" className={`block py-2 text-lg ${isActive('/track')}`}>Track Order</Link>
                <Link to="/offers" className={`block py-2 text-lg ${isActive('/offers')}`}>Offers</Link>
                <Link to="/support" className={`block py-2 text-lg ${isActive('/support')}`}>Farmer Support</Link>
                <Link to="/account" className={`block py-2 text-lg ${isActive('/account')}`}>Account</Link>
                <Link to="/notifications" className={`block py-2 text-lg ${isActive('/notifications')}`}>Notifications</Link>
                <Link to="/admin" className={`block py-2 text-lg font-medium text-green-600`}>Admin Dashboard</Link>
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16 px-4 pb-8">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto border-b border-gray-200">
          {['orders', 'products', 'analytics', 'notifications', 'discounts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 border-b-2 font-medium ${
                activeTab === tab
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold">Manage Orders</h3>
              <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="space-y-4">
              {/* Simulated orders; replace with real query */}
              {[] /* filteredOrders */.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-4 border">
                  {/* ... order content ... */}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Manage Products</h3>
            <div className="space-y-4 mb-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md p-4 border">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.description}</p>
                      <p className="text-green-600 font-medium">Base Price: {product.price}</p>
                      {product.pricing_tiers && product.pricing_tiers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-800">Pricing Tiers:</p>
                          <ul className="text-xs text-gray-600 ml-4 list-disc">
                            {product.pricing_tiers.map((tier, idx) => (
                              <li key={idx}>{tier.min_quantity}+ units: {tier.price}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {product.product_variants && product.product_variants.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-800">Variants:</p>
                          <ul className="text-xs text-gray-600 ml-4 list-disc">
                            {product.product_variants.map((variant, idx) => (
                              <li key={idx}>{variant.size}: {variant.price} (Stock: {variant.stock})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleEditTiers(product)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Edit Tiers
                      </button>
                      <button 
                        onClick={() => handleEditVariants(product)}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        Edit Variants
                      </button>
                      <button className="text-red-600 text-sm hover:underline">Delete</button>
                    </div>
                  </div>

                  {/* Edit Tiers Form */}
                  {editingProductId === product.id && editingTiers.length >= 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2">Edit Pricing Tiers</h5>
                      {editingTiers.map((tier, idx) => (
                        <div key={idx} className="flex space-x-2 items-center mb-2">
                          <input
                            type="number"
                            placeholder="Min Qty"
                            value={tier.min_quantity}
                            onChange={(e) => updateTier(idx, 'min_quantity', parseInt(e.target.value) || 0)}
                            className="w-20 p-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Price (KES)"
                            value={tier.price}
                            onChange={(e) => updateTier(idx, 'price', e.target.value)}
                            className="flex-1 p-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => removeTier(idx)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button onClick={addTier} className="text-blue-600 text-sm hover:underline mb-2">
                        Add Tier
                      </button>
                      <div className="flex space-x-2">
                        <button onClick={saveTiers} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                          Save Tiers
                        </button>
                        <button onClick={() => setEditingProductId(null)} className="bg-gray-300 px-3 py-1 rounded text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Variants Form */}
                  {editingProductId === product.id && editingVariants.length >= 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h5 className="font-medium mb-2">Edit Variants</h5>
                      {editingVariants.map((variant, idx) => (
                        <div key={idx} className="flex space-x-2 items-center mb-2">
                          <input
                            type="text"
                            placeholder="Size (e.g., 500ml)"
                            value={variant.size}
                            onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                            className="flex-1 p-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Price (KES)"
                            value={variant.price}
                            onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                            className="w-24 p-1 border rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={variant.stock}
                            onChange={(e) => updateVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                            className="w-20 p-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => removeVariant(idx)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button onClick={addVariant} className="text-blue-600 text-sm hover:underline mb-2">
                        Add Variant
                      </button>
                      <div className="flex space-x-2">
                        <button onClick={saveVariants} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                          Save Variants
                        </button>
                        <button onClick={() => setEditingProductId(null)} className="bg-gray-300 px-3 py-1 rounded text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Add Product Form */}
            <form onSubmit={handleAddProduct} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Add New Product</h4>
              <input 
                placeholder="Name" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full p-2 border rounded mb-2" 
              />
              <input 
                placeholder="Base Price (KES)" 
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="w-full p-2 border rounded mb-2" 
              />
              <textarea 
                placeholder="Description" 
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full p-2 border rounded mb-2" 
                rows={3}
              />
              {/* Pricing Tiers */}
              <div className="mb-3">
                <h5 className="font-medium mb-2">Pricing Tiers (Optional)</h5>
                {newProduct.pricing_tiers.map((tier, idx) => (
                  <div key={idx} className="flex space-x-2 items-center mb-2">
                    <input
                      type="number"
                      placeholder="Min Qty"
                      value={tier.min_quantity}
                      onChange={(e) => {
                        const newTiers = [...newProduct.pricing_tiers];
                        newTiers[idx].min_quantity = parseInt(e.target.value) || 0;
                        setNewProduct({ ...newProduct, pricing_tiers: newTiers });
                      }}
                      className="w-20 p-1 border rounded text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Price (KES)"
                      value={tier.price}
                      onChange={(e) => {
                        const newTiers = [...newProduct.pricing_tiers];
                        newTiers[idx].price = e.target.value;
                        setNewProduct({ ...newProduct, pricing_tiers: newTiers });
                      }}
                      className="flex-1 p-1 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newTiers = newProduct.pricing_tiers.filter((_, i) => i !== idx);
                        setNewProduct({ ...newProduct, pricing_tiers: newTiers });
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewProduct({ ...newProduct, pricing_tiers: [...newProduct.pricing_tiers, { min_quantity: 0, price: '' }] })}
                  className="text-blue-600 text-sm hover:underline mb-2"
                >
                  Add Tier
                </button>
              </div>
              {/* Variants */}
              <div className="mb-3">
                <h5 className="font-medium mb-2">Variants (Sizes)</h5>
                {newProduct.variants.map((variant, idx) => (
                  <div key={idx} className="flex space-x-2 items-center mb-2">
                    <input
                      type="text"
                      placeholder="Size (e.g., 500ml)"
                      value={variant.size}
                      onChange={(e) => {
                        const newVariants = [...newProduct.variants];
                        newVariants[idx].size = e.target.value;
                        setNewProduct({ ...newProduct, variants: newVariants });
                      }}
                      className="flex-1 p-1 border rounded text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Price (KES)"
                      value={variant.price}
                      onChange={(e) => {
                        const newVariants = [...newProduct.variants];
                        newVariants[idx].price = e.target.value;
                        setNewProduct({ ...newProduct, variants: newVariants });
                      }}
                      className="w-24 p-1 border rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(e) => {
                        const newVariants = [...newProduct.variants];
                        newVariants[idx].stock = parseInt(e.target.value) || 0;
                        setNewProduct({ ...newProduct, variants: newVariants });
                      }}
                      className="w-20 p-1 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVariants = newProduct.variants.filter((_, i) => i !== idx);
                        setNewProduct({ ...newProduct, variants: newVariants });
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewProduct({ ...newProduct, variants: [...newProduct.variants, { id: '', product_id: '', size: '', price: '', stock: 0 }] })}
                  className="text-blue-600 text-sm hover:underline mb-2"
                >
                  Add Variant
                </button>
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add Product</button>
            </form>
          </div>
        )}

        {/* Other tabs remain the same */}
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            {/* ... existing analytics content ... */}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            {/* ... existing ... */}
          </div>
        )}

        {/* Discounts Tab */}
        {activeTab === 'discounts' && (
          <div>
            {/* ... existing ... */}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;