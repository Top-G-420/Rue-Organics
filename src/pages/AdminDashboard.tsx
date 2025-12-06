// Updated src/pages/AdminDashboard.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

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
        <button
          onClick={() => navigate('/cart')}
          className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3.5A2 2 0 005 19h14a2 2 0 001.1-3.7l-1.5-3.5z" />
          </svg>
        </button>
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
                <Link to="/notifications" className={`block py-2 text-lg ${isActive('/notifications')}`}>Notifications</Link>
                <Link to="/admin" className={`block py-2 text-lg font-medium text-green-600`}>Admin Dashboard</Link>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Centered Message */}
      <main className="flex-1 pt-16 px-4 pb-16 flex flex-col justify-center items-center text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Restricted</h2>
          <p className="text-lg text-gray-600 mb-6">
            You have to use the admin app to access this section.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Back to Home
          </button>
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
          className="flex flex-col items-center py-2 text-gray-500"
        >
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <span className="text-xs">Cart</span>
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

export default AdminDashboard;
