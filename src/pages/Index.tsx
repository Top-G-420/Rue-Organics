// Updated src/pages/Index.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

// Define the product type
interface Product {
  id: string;
  name: string;
  description: string;
  controls_or_benefits: string;
  price: string;
  image_url?: string; // From Supabase Storage
}

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();

  // Fetch session for user ID
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Fetch unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', session?.user?.id],
    enabled: !!session?.user?.id,
    retry: false, // Disable retries to avoid spam on errors
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      if (error) {
        console.error('Full Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: error.status,
        });
        throw error;
      }
      return count || 0;
    },
    onError: (error: any) => {
      console.error('Error fetching unread notifications:', error);
    },
  });

  // Fetch products from Supabase
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Debug logs
  console.log('Session user ID:', session?.user?.id);
  console.log('Unread notifications count:', unreadCount);

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">Error loading products. Please try again.</div>
      </div>
    );
  }

  const handleCall = () => {
    window.open('tel:0725600710', '_self');
  };

  const handleNotifications = () => {
    navigate('/notifications');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Fixed Header - Mobile App Style */}
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
        <h1 className="text-xl font-bold text-center flex-1">Rue Organics</h1>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleNotifications}
            className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white relative" 
            aria-label="Notifications"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {/* Call icon */}
          <button 
            onClick={handleCall}
            className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white" 
            aria-label="Call Support"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          {/* Cart icon - Navigate to cart */}
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
        </div>
      </header>

      {/* Slide-out Navigation Panel - Mobile Drawer Style */}
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
                <Link 
                  to="/notifications" 
                  className={`block py-2 text-lg ${isActive('/notifications')}`}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-block bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                {/* Admin link - hidden for non-admins */}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Scrollable with padding for fixed header */}
      <main className="pt-16 px-4 pb-16"> {/* Increased pb for bottom nav */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Catalog</h2>
          <p className="text-gray-600">Browse our organic solutions for healthier crops.</p>
        </div>

        {/* Product Grid - Mobile First: Single Column, Large Touch Targets */}
        <div className="grid grid-cols-1 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                {/* Product Image from Supabase Storage */}
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-auto object-cover rounded-md mb-4" />
                ) : (
                  <div className="bg-gray-200 h-48 flex items-center justify-center rounded-md mb-4">
                    <span className="text-gray-500 text-sm">Product Image</span>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-700 mb-3 text-sm leading-relaxed">{product.description}</p>
                <div className="mb-3">
                  <h4 className="font-medium text-gray-800 mb-1 text-sm">Controls / Benefits:</h4>
                  <p className="text-gray-600 text-sm">{product.controls_or_benefits.split('\n').map((line, idx) => (
                    <span key={idx}>{line}<br /></span>
                  ))}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-lg font-bold text-green-600">{product.price}</span>
                  <span className="text-sm text-gray-500">Tap to view details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Bottom Navigation - For Mobile Feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around z-10">
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center py-2 text-green-600"
        >
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v11a2 2 0 002 2h6a2 2 0 002-2V7z" />
          </svg>
          <span className="text-xs">Home</span>
        </button>
        <button 
          onClick={() => navigate('/cart')}
          className="flex flex-col items-center py-2 text-gray-500 relative"
        >
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <span className="text-xs">Cart</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 block h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        <button 
          onClick={() => navigate('/account')}
          className="flex flex-col items-center py-2 text-gray-500"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">Account</span>
        </button>
      </nav>
    </div>
  );
};

export default Index;