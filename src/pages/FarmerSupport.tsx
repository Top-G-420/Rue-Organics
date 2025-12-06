// src/pages/FarmerSupport.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const FarmerSupport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  const handleCall = () => {
    window.open('tel:0725600710', '_blank');
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hi Mr. Rue, I have a question about organic farming...');
    window.open(`https://wa.me/254725600710?text=${message}`, '_blank');
  };

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
        <h1 className="text-xl font-bold">Farmer Support</h1>
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

      <main className="pt-16 px-4 pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Farmer Support</h2>
          <p className="text-gray-600">Get expert advice and tutorials from Mr. Rue.</p>
        </div>

        {/* YouTube Channel Embed */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Watch Tutorials</h3>
          <iframe
            className="w-full h-64 rounded-lg"
            src="https://www.youtube.com/embed/SI9sMXTEmA8" 
            title="Mr. Rue's Farming Techniques"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <p className="text-sm text-gray-600 mt-3">
            Subscribe to <a href="https://www.youtube.com/@FarmingTechniquesMrRue" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Mr. Rue's YouTube Channel</a> for more videos.
          </p>
        </div>

        {/* Contact CTA */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Ask an Expert</h3>
          <button
            onClick={handleCall}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          >
            Call Mr. Rue: 0725600710
          </button>
          <button
            onClick={handleWhatsApp}
            className="w-full bg-green-500 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
            Message on WhatsApp
          </button>
          <a
            href="https://www.facebook.com/p/RUE-Organics-Products-100071092243252/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
          >
            Visit Our Facebook
          </a>
          <p className="text-sm text-gray-600 text-center">For questions on products, orders, or farming tips.</p>
        </div>

        {/* Additional Resources */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>Apply STOPGEL early in the morning for best results.</li>
            <li>Use M-FORTE every 2 weeks for soil health.</li>
            <li>Watch our video on pest control.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default FarmerSupport;