// Updated src/pages/Notifications.tsx - Fixed persistence for read status and clear all
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isActive = (path: string) => location.pathname === path ? 'font-medium text-green-600' : '';

  // Fetch notifications from Supabase - persisted in DB
  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Error fetching notifications:', fetchError);
        throw fetchError;
      }
      
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // Cache for 30s
  });

  // Mutation: Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id); // Security: only update own notifications
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation: Clear all notifications (delete for the user)
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id); // Only delete own notifications
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const clearAll = () => {
    if (notifications.length > 0 && confirm('Are you sure you want to clear all notifications?')) {
      clearAllMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-gray-600">Loading notifications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-white justify-center items-center">
        <div className="text-lg text-red-600">Failed to load notifications. Please try again.</div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
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
        <h1 className="text-xl font-bold">Notifications ({notifications.length})</h1>
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
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">You'll see updates here when something happens.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <button
                onClick={clearAll}
                disabled={clearAllMutation.isPending || notifications.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {clearAllMutation.isPending ? 'Clearing...' : `Clear All (${notifications.length})`}
              </button>
            </div>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="ml-4 bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {markAsReadMutation.isPending ? 'Reading...' : 'Mark as Read'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Notifications;