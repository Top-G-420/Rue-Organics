// Updated src/pages/Offers.tsx - Now fetches from Supabase
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase'; // Assuming your Supabase client import path

interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  code: string;
  expiry: string; // ISO timestamp from Supabase
  banner_url?: string; // From Supabase
  created_at?: string;
}

const Offers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch offers from Supabase
  const { data: offers = [], isLoading, error } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .order('expiry', { ascending: false }); // Sort by expiry (newest first)
      
      if (fetchError) {
        console.error('Error fetching offers:', fetchError);
        throw fetchError;
      }
      
      // Filter active offers (not expired)
      const now = new Date().toISOString();
      return (data || []).filter(offer => new Date(offer.expiry) > new Date(now));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // toast.success('Code copied!'); // Add toast if you have a notification lib
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading offers...</div>
      </div>
    );
  }

  if (error || offers.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">
          {error ? 'Failed to load offers. Please try again.' : 'No active offers available.'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md"
        >
          Retry
        </button>
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
        <h1 className="text-xl font-bold">Special Offers ({offers.length})</h1>
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
                {/* Admin link - hidden for non-admins */}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 px-4 pb-8">
        {/* Holiday Banner - Prominent CTA */}
        <div className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg p-4 mb-6 text-center">
          <h2 className="text-xl font-bold mb-2">Limited-Time Offers – Don’t Miss Out!</h2>
          <p className="text-sm mb-3">
            Our exclusive offers are available for a limited time only and are updated frequently. Be sure to check back regularly so you don’t miss any new deals. Terms and conditions apply.
          </p>
          
          <Link to="/" className="inline-block bg-white text-green-700 px-6 py-2 rounded-md font-medium hover:bg-gray-100">
            Shop Now
          </Link>
        </div>

        <div className="space-y-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              {/* Banner Image */}
              <div className="bg-gray-200 h-32 flex items-center justify-center">
                {offer.banner_url ? (
                  <img src={offer.banner_url} alt={offer.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-sm">Offer Banner</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{offer.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{offer.description}</p>
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {offer.discount}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Expires: {new Date(offer.expiry).toLocaleDateString()}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyCode(offer.code)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    Click To Copy Code: {offer.code}
                  </button>
                  <Link
                    to="/cart"
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Apply
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Offers;