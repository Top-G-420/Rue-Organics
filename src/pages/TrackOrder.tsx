// Updated src/pages/TrackOrder.tsx with redirect if no orderId
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

interface Stage {
  name: string;
  timestamp?: string;
  completed: boolean;
}

interface OrderItem {
  product_id: string;
  variant_id?: string;
  size?: string;
  quantity: number;
  name: string;
  price: number; // Enriched
}

interface Order {
  id: string;
  user_id: string;
  total_price: number;
  items: OrderItem[];
  status: string;
  stages: Stage[];
  created_at: string;
  // Delivery info extracted from stages
  delivery_address?: string;
  instructions?: string;
}

const TrackOrder = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, session } = useAuth();
  const { totalItems } = useCart();
  const [order, setOrder] = useState<Order | null>(null);

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  // Redirect if no orderId provided
  useEffect(() => {
    if (!orderId) {
      console.log('No orderId provided, redirecting to /orders');
      navigate('/orders', { replace: true });
    }
  }, [orderId, navigate]);

  // Enhanced logging for debugging
  console.log('TrackOrder params:', { orderId, userId: user?.id, hasSession: !!session });

  // Fetch order from Supabase - Relaxed enabled to always run, handle checks inside
  const { data: fetchedOrder, isLoading, error, refetch } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      console.log('Query running for orderId:', orderId); // Log query start
      if (!orderId) {
        console.error('No order ID provided');
        throw new Error('No order ID provided');
      }
      if (!session) {
        console.error('No session available');
        throw new Error('Please sign in');
      }
      if (!user) {
        console.error('No user available');
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (fetchError) {
        console.error('Supabase fetch error:', fetchError); // Detailed error
        throw fetchError;
      }
      if (!data) {
        console.error('No order data returned for ID:', orderId);
        throw new Error('Order not found');
      }
      if (data.user_id !== user.id) {
        console.error('Access denied: Order user_id', data.user_id, '!= current user', user.id);
        throw new Error('Access denied');
      }
      
      console.log('Raw order data fetched:', { id: data.id, user_id: data.user_id, total_price: data.total_price }); // Log raw data
      
      // Parse items from jsonb
      let parsedItems: any[] = [];
      try {
        parsedItems = JSON.parse(data.items || '[]');
        console.log('Parsed items:', parsedItems);
      } catch (parseError) {
        console.error('Items parse error:', parseError, 'Fallback to empty');
        parsedItems = [];
      }

      // Enrich items with product names and prices (fetch from products/variants)
      const enrichedItems: OrderItem[] = await Promise.all(
        parsedItems.map(async (item: any) => {
          let productName = 'Unknown Product';
          let itemPrice = 0;
          let variantSize = item.size || '';
          try {
            const { data: product } = await supabase.from('products').select('name, price').eq('id', item.product_id).single();
            productName = product?.name || 'Unknown Product';
            itemPrice = typeof product?.price === 'string' ? parseFloat(product.price.replace(/[^\d.]/g, '')) : (product?.price as number) || 0;
            
            if (item.variant_id) {
              const { data: variant } = await supabase.from('product_variants').select('size, price').eq('id', item.variant_id).single();
              variantSize = variant?.size || '';
              itemPrice = typeof variant?.price === 'string' ? parseFloat(variant.price.replace(/[^\d.]/g, '')) : (variant?.price as number) || itemPrice;
            }
            console.log('Enriched item:', { product_id: item.product_id, name: productName, price: itemPrice });
          } catch (enrichError) {
            console.error('Item enrichment error for', item.product_id, ':', enrichError);
          }
          return { ...item, name: productName, price: itemPrice, size: variantSize };
        })
      );

      // Parse stages from jsonb and extract delivery info
      let parsedStages: any[] = [];
      let deliveryAddress = '';
      let instructions = '';
      try {
        parsedStages = JSON.parse(data.stages || '[]');
        console.log('Raw stages:', data.stages, 'Parsed:', parsedStages);
        // If stages is a single delivery object, wrap it and add default workflow stages
        if (parsedStages.length === 1 && parsedStages[0].stage === 'delivery') {
          deliveryAddress = parsedStages[0].address || '';
          instructions = parsedStages[0].instructions || '';
          // Default stages for tracking
          parsedStages = [
            { name: 'Order Placed', completed: true, timestamp: data.created_at },
            { name: 'Payment Pending', completed: false, timestamp: '' },
            { name: 'Processing', completed: false, timestamp: '' },
            { name: 'Shipped', completed: false, timestamp: '' },
            { name: 'Delivered', completed: false, timestamp: '' },
            { name: 'Confirmed Received', completed: false, timestamp: '' }
          ];
        } else {
          // Assume proper stages array; extract delivery if embedded
          const deliveryStage = parsedStages.find(s => s.address);
          if (deliveryStage) {
            deliveryAddress = deliveryStage.address || '';
            instructions = deliveryStage.instructions || '';
          }
        }
        // Ensure stages conform to interface
        parsedStages = parsedStages.map((s: any) => ({
          name: s.name || s.stage || 'Unknown',
          timestamp: s.timestamp || '',
          completed: !!s.completed
        }));
      } catch (parseError) {
        console.error('Stages parse error:', parseError);
        // Fallback default stages
        parsedStages = [
          { name: 'Order Placed', completed: true, timestamp: data.created_at },
          { name: 'Payment Pending', completed: false, timestamp: '' },
          { name: 'Processing', completed: false, timestamp: '' },
          { name: 'Shipped', completed: false, timestamp: '' },
          { name: 'Delivered', completed: false, timestamp: '' },
          { name: 'Confirmed Received', completed: false, timestamp: '' }
        ];
      }

      console.log('Final enriched order:', { id: data.id, itemsCount: enrichedItems.length, stagesCount: parsedStages.length, deliveryAddress });

      return { 
        ...data, 
        items: enrichedItems, 
        stages: parsedStages, 
        delivery_address: deliveryAddress,
        instructions 
      };
    },
    enabled: !!orderId, // Relaxed: Always run if orderId present, handle auth inside
  });

  useEffect(() => {
    if (fetchedOrder) {
      console.log('Setting order from fetchedOrder');
      setOrder(fetchedOrder);
    }
  }, [fetchedOrder]);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!orderId || !session) return;

    const channel = supabase.channel(`order-${orderId}`);
    channel
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          console.log('Order update:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, session, refetch]);

  const advanceStage = async () => {
    if (!order || !user) return;
    const currentIndex = order.stages.findIndex(s => !s.completed);
    if (currentIndex > -1 && currentIndex < order.stages.length - 1) {
      const now = new Date().toISOString();
      const updatedStages = [...order.stages];
      updatedStages[currentIndex] = { ...updatedStages[currentIndex], completed: true, timestamp: now };
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: updatedStages[currentIndex + 1].name,
          stages: JSON.stringify(updatedStages)
        })
        .eq('id', orderId)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error advancing stage:', error);
        alert('Failed to advance stage. Please contact support.');
      } else {
        refetch(); // Refresh to update UI
      }
    }
  };

  const confirmReceipt = async () => {
    if (!order || !user || order.stages[order.stages.length - 1].completed) return;
    const now = new Date().toISOString();
    const updatedStages = [...order.stages];
    const lastIndex = updatedStages.length - 1;
    updatedStages[lastIndex] = { ...updatedStages[lastIndex], completed: true, timestamp: now };
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'Confirmed Received',
        stages: JSON.stringify(updatedStages)
      })
      .eq('id', orderId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error confirming receipt:', error);
      alert('Failed to confirm receipt. Please contact support.');
    } else {
      alert('Order confirmed as received! Thank you.');
      refetch();
    }
  };

  console.log('Render state:', { isLoading, error: error?.message, fetchedOrder: !!fetchedOrder, order: !!order }); // Log render state

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading order details...</div>
      </div>
    );
  }

  if (error || !fetchedOrder || !order) {
    console.error('TrackOrder error details:', error ? error.message : 'No data/order'); // More specific
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">
          {error ? `Error: ${error.message}` : 'Order not found or access denied.'}
        </div>
        <p className="text-sm text-gray-600 mt-2">Debug: orderId={orderId}, user={user?.email || 'none'}, session={!!session}</p>
        <button onClick={() => refetch()} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md mr-2">
          Retry
        </button>
        <button onClick={() => navigate('/orders')} className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md">
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Fixed Header - Consistent with Orders */}
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
        <h1 className="text-xl font-bold">Track Order #{order.id.slice(-6).toUpperCase()}</h1>
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

      {/* Slide-out Navigation Panel - Consistent with Orders */}
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
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Order Summary</h2>
          <p className="text-sm text-gray-600 mb-2">Placed: {new Date(order.created_at).toLocaleDateString()}</p>
          <p className="text-sm text-gray-600 mb-2">Total: KES {order.total_price.toFixed(2)}</p>
          {order.delivery_address && (
            <p className="text-sm text-gray-600 mb-2">Delivery Address: {order.delivery_address}</p>
          )}
          {order.instructions && (
            <p className="text-sm text-gray-600 mb-4">Instructions: {order.instructions}</p>
          )}
          <div className="space-y-1">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{item.name} {item.size ? `(${item.size})` : ''} x {item.quantity}</span>
                <span>KES {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-1">Current Status: {order.status}</h3>
          <p className="text-sm text-blue-700">Your order is {order.status.toLowerCase()}.</p>
        </div>

        {/* Interactive Timeline */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tracking Timeline</h3>
          <div className="relative border-l-4 border-gray-200 pl-4 space-y-6">
            {order.stages.map((stage, idx) => {
              const isCurrent = !stage.completed && idx === order.stages.findIndex(s => !s.completed);
              return (
                <div key={idx} className="relative flex items-start">
                  <div className={`absolute w-5 h-5 rounded-full flex items-center justify-center -left-2.5 mt-0.5 ${
                    stage.completed ? 'bg-green-600 text-white font-bold' : isCurrent ? 'bg-blue-600 text-white font-bold' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {stage.completed ? '✓' : isCurrent ? '→' : idx + 1}
                  </div>
                  <div className="ml-6 w-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${stage.completed ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                          {stage.name}
                        </p>
                        {stage.timestamp && (
                          <p className="text-xs text-gray-500">{new Date(stage.timestamp).toLocaleString()}</p>
                        )}
                      </div>
                      {isCurrent && stage.name === 'Confirmed Received' && (
                        <button
                          onClick={advanceStage}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700"
                          disabled={stage.completed}
                        >
                          Mark as Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {order.stages[order.stages.length - 1].name === 'Delivered' && !order.stages[order.stages.length - 1].completed && (
            <button
              onClick={confirmReceipt}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Confirm Received
            </button>
          )}
          <button
            onClick={() => window.open(`tel:0725600710`, '_blank')}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700"
          >
            Call Support
          </button>
        </div>
      </main>
    </div>
  );
};

export default TrackOrder;