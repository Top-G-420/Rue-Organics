// Updated src/pages/Checkout.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DeliveryInfo {
  address: string;
  instructions: string;
  geolocation?: { lat: number; lng: number };
}

// Updated CartItem for variants, matching CartContext
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  pricing_tiers?: Array<{ min_quantity: number; price: number }>;
  size?: string;
  variant_id?: string;
}

interface SavedAddress {
  id: string;
  label: string;
  fullAddress: string;
  isDefault: boolean;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart, subtotal } = useCart();
  const { user, session, signIn, signUp } = useAuth();
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({ address: '', instructions: '' });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // Track applied discount
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Load saved addresses from localStorage if signed in
  useEffect(() => {
    if (session && typeof window !== 'undefined') {
      const stored = localStorage.getItem('savedAddresses');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedAddresses(parsed);
      }
    }
  }, [session]);

  // Auto-fill default address on load if available
  useEffect(() => {
    if (savedAddresses.length > 0 && !deliveryInfo.address) {
      const defaultAddr = savedAddresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setDeliveryInfo(prev => ({ ...prev, address: defaultAddr.fullAddress }));
      }
    }
  }, [savedAddresses, deliveryInfo.address]);

  // Helper to get unit price based on quantity and tiers (copied from Cart.tsx)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeliveryInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAddressId(id);
    const addr = savedAddresses.find(a => a.id === id);
    if (addr) {
      setDeliveryInfo(prev => ({ ...prev, address: addr.fullAddress }));
    }
  };

  const handlePaste = async () => {
    if (!navigator.clipboard) {
      console.warn('Clipboard API not supported. Please paste manually.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const trimmedCode = text.trim();
      setDiscountCode(trimmedCode);
      if (trimmedCode === 'SAVE10') {
        setAppliedDiscount(subtotal * 0.1); // 10% discount
      } else {
        setAppliedDiscount(0);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const discountedTotal = subtotal - appliedDiscount;

  const handlePlaceOrder = async () => {
    if (!session) {
      const email = prompt('Enter your email to create an account or sign in:');
      const password = prompt('Enter password:');
      if (email && password) {
        try {
          await signUp(email, password);
        } catch (error) {
          alert('Account creation failed');
          return;
        }
      } else {
        return;
      }
    }

    setIsPlacingOrder(true);
    if (user && deliveryInfo.address) {
      // Include variant_id and size in order items
      const orderItems = cart.map(item => ({
        product_id: item.id,
        variant_id: item.variant_id,
        size: item.size,
        quantity: item.quantity,
      }));
      // Bundle delivery info into stages jsonb for now (since schema lacks dedicated columns)
      const deliveryStages = [
        { stage: 'delivery', address: deliveryInfo.address, instructions: deliveryInfo.instructions, status: 'pending' }
      ];
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          items: orderItems, // jsonb
          total_price: discountedTotal, // Matches schema (numeric)
          status: 'Order Placed (Making Order)', // Matches schema
          stages: JSON.stringify(deliveryStages), // Bundle delivery info here (jsonb)
        })
        .select()
        .single();
      if (orderError) {
        console.error('Order insert error:', orderError); // Log for debugging
        alert(`Order creation failed: ${orderError.message}`);
      } else {
        // Insert notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Order Created',
            message: `Your order #${order.id.slice(-6).toUpperCase()} has been placed successfully. Call 0725600710 to complete payment.`,
          });
        if (notifError) console.error('Notification insert failed:', notifError);
        alert(`Order placed! Call 0725600710. Order ID: ${order.id.slice(-6).toUpperCase()}`);
        clearCart();
        navigate('/orders');
      }
    }
    setIsPlacingOrder(false);
  };

  const total = discountedTotal;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-md px-4 py-3 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-2">Checkout</h1>
      </header>

      <main className="pt-16 px-4 pb-8">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Order Summary</h2>
          {cart.map((item) => {
            const itemTotal = lineTotal(item);
            return (
              <div key={item.id} className="flex justify-between items-center text-sm mb-2">
                <span>{item.name} {item.size ? `(${item.size})` : ''} x {item.quantity}</span>
                <span>KES {itemTotal.toFixed(2)}</span>
              </div>
            );
          })}
          <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span>KES {total.toFixed(2)}</span>
          </div>
          {appliedDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600 mt-1">
              <span>Discount Applied:</span>
              <span>-KES {appliedDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {!session && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">Sign in or create an account to save your delivery info.</p>
          </div>
        )}

        {/* Delivery Form */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-bold text-gray-800">Delivery Details</h2>
          {session && savedAddresses.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Saved Address</label>
              <select
                value={selectedAddressId}
                onChange={handleAddressSelect}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Select a saved address --</option>
                {savedAddresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} {addr.isDefault && '(Default)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <input
            type="text"
            name="address"
            placeholder="Full delivery address (e.g., Plot 123, Ngong Road, Nairobi)"
            value={deliveryInfo.address}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <textarea
            name="instructions"
            placeholder="Special delivery instructions (optional)"
            value={deliveryInfo.instructions}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Discount Code */}
        <div className="flex space-x-2 mb-6">
          <input
            type="text"
            placeholder="Discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handlePaste}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Paste
          </button>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || !deliveryInfo.address || subtotal === 0}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isPlacingOrder ? 'Placing Order...' : `Place Order - KES ${total.toFixed(2)}`}
        </button>

        <div className="text-center text-sm text-gray-600 mt-4">
          <p>Orders are processed offline.</p>
        </div>
        <div className="text-center text-sm text-gray-600 mt-4">
          <p>
            To complete your order, please make payment using the following Paybill details:<br />
            <strong>Business No:</strong> 247247<br />
            <strong>Account No:</strong> 0766500594<br /><br />
            After payment, please call to confirm.
          </p>
          <button
            onClick={() => window.open(`tel:0725600710`, '_blank')}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 mt-2"
          >
            Call Support
          </button>
        </div>       
      </main>
    </div>
  );
};

export default Checkout;