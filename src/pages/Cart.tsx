// Updated src/pages/Cart.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Removed unused useLocation
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext'; // Your existing path

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  pricing_tiers?: Array<{
    min_quantity: number;
    price: number;
  }>;
  size?: string;
  variant_id?: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, totalItems, subtotal } = useCart();
  const { user, loading } = useAuth(); // FIXED: Use 'user' and 'loading' from your AuthContext
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Unused, but kept for potential future
  // NEW: State for auth warning modal
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  const getUnitPrice = (item: CartItem): number => {
    if (!item.pricing_tiers || item.pricing_tiers.length === 0) {
      return item.price;
    }
    const tier = item.pricing_tiers.find(t => item.quantity >= t.min_quantity);
    return tier ? tier.price : item.price;
  };

  const lineTotal = (item: CartItem): number => {
    return getUnitPrice(item) * item.quantity;
  };

  const computedSubtotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);

  // UPDATED: Handle proceed to checkout with auth check + modal
  const handleProceedToCheckout = () => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // Show warning modal first, then redirect
      setShowAuthWarning(true);
      return;
    }
    // If signed in, proceed directly (no warning)
    navigate('/checkout');
  };

  // NEW: Handle modal confirm (redirect to account)
  const handleAuthWarningConfirm = () => {
    setShowAuthWarning(false);
    navigate('/account', { 
      state: { 
        from: 'cart', 
        message: 'Sign in first in order to place order' // Your suggested message (also for Account page if needed)
      } 
    });
  };

  const handleContinueShopping = () => {
    navigate('/');
  };

  // NEW: Auth warning modal (simple overlay)
  if (showAuthWarning) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign In Required</h3>
          <p className="text-gray-600 mb-6">Sign in first in order to place order</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAuthWarning(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthWarningConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-md px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold ml-2">Shopping Cart</h1>
        </header>

        <main className="pt-16 px-4 pb-8 flex flex-col items-center justify-center text-center">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3.5A2 2 0 005 19h14a2 2 0 001.1-3.7l-1.5-3.5z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to get started.</p>
          <button
            onClick={handleContinueShopping}
            className="bg-green-600 text-white px-8 py-3 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Browse Products
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-md px-4 py-3 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-2">Shopping Cart ({totalItems})</h1>
      </header>

      <main className="pt-16 px-4 pb-12">
        <div className="space-y-4 mb-6">
          {cart.map((item) => {
            const unitPrice = getUnitPrice(item);
            const lineTotalPrice = lineTotal(item);
            return (
              <div key={`${item.id}-${item.variant_id}`} className="flex items-center space-x-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="bg-gray-200 w-20 h-20 flex items-center justify-center rounded-md flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <span className="text-gray-500 text-xs">Image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h3>
                  {item.size && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                  <p className="text-green-600 font-medium text-sm">KES {unitPrice.toFixed(2)} each</p>
                  {item.pricing_tiers && item.pricing_tiers.length > 0 && item.quantity >= 5 && (
                    <p className="text-xs text-green-600">Bulk discount applied</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    disabled={item.quantity <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <span className="text-lg font-bold text-green-600">KES {lineTotalPrice.toFixed(2)}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 focus:outline-none"
                  aria-label="Remove item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-900 mb-2">
            <span>Subtotal ({totalItems} items):</span>
            <span>KES {computedSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping:</span>
            <span>Depends on courier service</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span>KES {computedSubtotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleProceedToCheckout}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors mb-4 disabled:opacity-50"
          disabled={totalItems === 0 || loading} // UPDATED: Disable during auth loading
        >
          {loading ? 'Loading...' : 'Proceed to Checkout'} {/* Show loading text */}
        </button>

        <button
          onClick={handleContinueShopping}
          className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Continue Shopping
        </button>
      </main>
    </div>
  );
};

export default Cart;