// Updated src/pages/Account.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SavedAddress {
  id: string;
  label: string;
  fullAddress: string;
  isDefault: boolean;
}

const Account = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, session, signIn, signUp, signOut, signInWithGoogle, isAdmin, loading } = useAuth();
  const [newAddress, setNewAddress] = useState({ label: '', fullAddress: '' });
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin'); // Toggle between sign in and sign up
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [otpSent, setOtpSent] = useState(false); // For OTP flow
  // Load saved addresses from localStorage (user-specific persistence)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('savedAddresses');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // Sync savedAddresses to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
    }
  }, [savedAddresses]);

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuthForm(prev => ({ ...prev, [name]: value }));
    setAuthError(''); // Clear error on input
  };

  const sendOtp = async () => {
    const { email } = authForm;
    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }
    try {
      // Use OTP for confirmation-free flow (update AuthContext if needed for signInWithOtp)
      await supabase.auth.signInWithOtp({ email });
      setOtpSent(true);
      setAuthError(''); // Clear any previous errors
      alert('Confirmation code sent to your email. Check your inbox (and spam folder).');
    } catch (error: any) {
      setAuthError(error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleSignIn = async () => {
    const { email, password } = authForm;
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    try {
      await signIn(email, password);
      setAuthForm({ email: '', password: '', confirmPassword: '' });
      setOtpSent(false);
    } catch (error: any) {
      if (error.message.includes('Email not confirmed')) {
        setAuthError('Email not confirmed. Resend confirmation?');
        // Optionally auto-trigger resend
        if (confirm('Resend confirmation email?')) {
          await sendOtp();
        }
      } else {
        setAuthError(error.message || 'Sign in failed. Please try again.');
      }
    }
  };

  const handleSignUp = async () => {
    const { email, password, confirmPassword } = authForm;
    if (!email || !password || !confirmPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    try {
      await signUp(email, password);
      alert('Account created! Confirmation code sent to your email. Enter it below to verify.');
      setOtpSent(true);
      setAuthForm({ email, password: '', confirmPassword: '' }); // Keep email, clear passwords
    } catch (error: any) {
      setAuthError(error.message || 'Account creation failed. Please try again.');
    }
  };

  // For OTP verification (simplified; update AuthContext for full OTP handling if needed)
  const verifyOtp = async () => {
    const { email } = authForm;
    const otp = prompt('Enter the 6-digit code from your email:');
    if (!otp || otp.length !== 6) {
      setAuthError('Invalid OTP code.');
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) throw error;
      alert('Account verified! You can now sign in.');
      setOtpSent(false);
      setAuthMode('signin');
    } catch (error: any) {
      setAuthError(error.message || 'OTP verification failed.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError(error.message || 'Google sign in failed. Please try again.');
    }
  };

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAddress.label && newAddress.fullAddress && user) {
      const newId = Date.now().toString(); // Use timestamp for unique ID
      const newAddressObj: SavedAddress = {
        id: newId,
        label: newAddress.label,
        fullAddress: newAddress.fullAddress,
        isDefault: savedAddresses.length === 0, // Set as default if first address
      };
      setSavedAddresses(prev => [...prev, newAddressObj]);
      setNewAddress({ label: '', fullAddress: '' });
      // Later: Insert to Supabase with user.id
    }
  };

  const setDefaultAddress = (id: string) => {
    setSavedAddresses(prev => prev.map(addr => ({ ...addr, isDefault: addr.id === id })));
    // Later: Update in Supabase
  };

  const deleteAddress = (id: string) => {
    setSavedAddresses(prev => prev.filter(addr => addr.id !== id));
    // Later: Delete from Supabase
  };

  if (loading) {
    return <div className="flex flex-col min-h-screen bg-white justify-center items-center"><div>Loading...</div></div>;
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
        <h1 className="text-xl font-bold">Account</h1>
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
                {/* Admin link - visible if isAdmin */}
                {isAdmin && <Link to="/admin" className={`block py-2 text-lg ${isActive('/admin')}`}>Admin Dashboard</Link>}
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16 px-4 pb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">My Account</h2>
          <p className="text-gray-600">Manage your profile and settings.</p>
        </div>

        {/* Auth Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">My Account</h3>
          {session ? (
            <div className="space-y-3 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-lg font-semibold text-gray-900 mb-1">Welcome back!</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
                {isAdmin && <p className="text-xs text-blue-600 mt-1">Admin Role Active</p>}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleGoogleAuth}
                className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or use email</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-2 rounded-md font-medium ${
                    authMode === 'signin' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 rounded-md font-medium ${
                    authMode === 'signup' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Create Account
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={handleAuthInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={handleAuthInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {authMode === 'signup' && (
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={authForm.confirmPassword}
                    onChange={handleAuthInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                {authError && <p className="text-red-600 text-sm">{authError}</p>}
                {otpSent && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">OTP sent to {authForm.email}. Check your email.</p>
                    <button
                      onClick={verifyOtp}
                      className="mt-2 w-full bg-yellow-600 text-white py-2 rounded-md text-sm hover:bg-yellow-700"
                    >
                      Verify OTP
                    </button>
                  </div>
                )}
                <button
                  onClick={authMode === 'signin' ? handleSignIn : handleSignUp}
                  className="w-full bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700"
                >
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Saved Addresses - Only if signed in */}
        {session && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Saved Delivery Addresses</h3>
            <div className="space-y-3 mb-6">
              {savedAddresses.length === 0 ? (
                <p className="text-gray-500 text-sm">No addresses saved yet. Add one below.</p>
              ) : (
                savedAddresses.map((address) => (
                  <div key={address.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{address.label}</p>
                      <p className="text-sm text-gray-600">{address.fullAddress}</p>
                      {address.isDefault && <span className="text-xs text-green-600">Default</span>}
                    </div>
                    <div className="space-x-2">
                      {!address.isDefault && (
                        <button
                          onClick={() => setDefaultAddress(address.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => deleteAddress(address.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Address Form */}
            <form onSubmit={addAddress} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Add New Address</h3>
              <input
                type="text"
                placeholder="Label (e.g., Home)"
                value={newAddress.label}
                onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Full Address"
                value={newAddress.fullAddress}
                onChange={(e) => setNewAddress({ ...newAddress, fullAddress: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-md font-medium hover:bg-green-700"
              >
                Save Address
              </button>
            </form>
          </>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-4">
          <Link
            to="/orders"
            className="block bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center"
          >
            <h4 className="font-semibold text-gray-900 mb-1">Order History</h4>
            <p className="text-sm text-gray-600">View past orders</p>
          </Link>
          <Link
            to="/support"
            className="block bg-white p-4 rounded-lg shadow-md border border-gray-200 text-center"
          >
            <h4 className="font-semibold text-gray-900 mb-1">Farmer Support</h4>
            <p className="text-sm text-gray-600">Get expert advice</p>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="block bg-blue-50 p-4 rounded-lg shadow-md border border-blue-200 text-center"
            >
              <h4 className="font-semibold text-blue-900 mb-1">Admin Dashboard</h4>
              <p className="text-sm text-blue-600">Manage orders & products</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
};

export default Account;
