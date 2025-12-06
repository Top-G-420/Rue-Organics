// Updated src/pages/Orders.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

interface Stage {
  name: string;
  timestamp: string;
  completed: boolean;
}

interface OrderItem {
  product_id: string;
  variant_id?: string;
  size?: string;
  quantity: number;
  name?: string; // Enriched
}

interface Order {
  id: string;
  total_price: number;
  status: string;
  items: OrderItem[];
  stages: Stage[];
  created_at: string;
  delivery_address?: string;
  instructions?: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, session } = useAuth();
  const { totalItems } = useCart();

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  // Fetch user's orders from Supabase
  const { data: orders = [], isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (fetchError) {
        console.error('Orders fetch error:', fetchError); // Log for debugging
        throw fetchError;
      }
      // Parse stages and enrich items
      const enrichedOrders = await Promise.all(
        (data || []).map(async (order) => {
          let parsedStages: Stage[] = [];
          let items: OrderItem[] = [];
          try {
            parsedStages = JSON.parse(order.stages || '[]');
            items = JSON.parse(order.items || '[]');
          } catch (parseError) {
            console.error('JSON parse error for order:', order.id, parseError);
            parsedStages = [];
            items = [];
          }
          // Enrich with product names and sizes
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              let productName = 'Unknown';
              let variantSize = '';
              try {
                const { data: product } = await supabase.from('products').select('name').eq('id', item.product_id).single();
                productName = product?.name || 'Unknown';
                if (item.variant_id) {
                  const { data: variant } = await supabase.from('product_variants').select('size').eq('id', item.variant_id).single();
                  variantSize = variant?.size || '';
                }
              } catch (enrichError) {
                console.error('Enrichment error for item:', item, enrichError);
              }
              return { ...item, name: productName, size: variantSize };
            })
          );
          return { ...order, stages: parsedStages, items: enrichedItems };
        })
      );
      return enrichedOrders;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('user-orders');
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Order change:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  // Separate conditions for better error handling
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">Please sign in to view orders.</div>
        <button onClick={() => navigate('/account')} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md">
          Go to Account
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">Failed to load orders. Please try again.</div>
        <button onClick={() => refetch()} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md">
          Retry
        </button>
        <button onClick={() => navigate('/account')} className="mt-4 ml-2 bg-gray-600 text-white px-4 py-2 rounded-md">
          Go to Account
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading orders...</div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">My Orders</h1>
        <button 
          onClick={() => navigate('/cart')}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white relative" 
          aria-label="Cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3.5A2 2 0 005 19h14a2 2 0 001.1-3.7l-1.5-3.5z" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {totalItems}
            </span>
          )}
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
                {/* Admin link - hidden for non-admins */}
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16 px-4 pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order History</h2>
          <p className="text-gray-600">View your past orders and track status.</p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Order {order.id.slice(-6).toUpperCase()}</h3>
                  <p className="text-sm text-gray-600">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total: KES {order.total_price.toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'Payment Approved' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Items:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {order.items.map((item, idx) => (
                    <li key={idx}>{item.name || 'Unknown'} {item.size ? `(${item.size})` : ''} x {item.quantity}</li>
                  ))}
                </ul>
              </div>

              {/* Order Timeline Summary */}
              <div className="relative border-l-4 border-gray-200 pl-4 space-y-2 mb-4">
                {order.stages.slice(0, 3).map((stage, idx) => (
                  <div key={idx} className="relative flex">
                    <div className={`absolute w-4 h-4 rounded-full flex items-center justify-center -left-2 ${
                      stage.completed ? 'bg-green-600 text-white' : 'bg-gray-300'
                    }`}>
                      {stage.completed ? '✓' : ''}
                    </div>
                    <div className="ml-4">
                      <p className={`font-medium text-sm ${stage.completed ? 'text-green-600' : 'text-gray-500'}`}>
                        {stage.name}
                      </p>
                      {stage.timestamp && (
                        <p className="text-xs text-gray-500">{new Date(stage.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
                {order.stages.length > 3 && (
                  <p className="ml-4 text-xs text-gray-500">... and more</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/track/${order.id}`)}
                  className="text-green-600 text-sm font-medium hover:underline"
                >
                  Track Details
                </button>
                <button className="ml-4 text-sm text-gray-500 hover:underline">Download Receipt</button>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No orders yet.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 text-white px-6 py-2 rounded-md font-medium"
            >
              Start Shopping
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;