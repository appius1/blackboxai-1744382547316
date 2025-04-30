import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TopNav = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  
  const [notifications] = useState([
    {
      id: 1,
      type: 'low-stock',
      message: 'Product "Laptop" is running low on stock',
      time: '5 min ago'
    },
    {
      id: 2,
      type: 'sale',
      message: 'New sale completed - Order #1234',
      time: '10 min ago'
    }
  ]);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-md z-30">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button 
              className="text-gray-500 hover:text-gray-700 md:hidden focus:outline-none transition-colors duration-300"
              onClick={onMobileMenuToggle}
              aria-label="Toggle menu"
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 shadow-sm transition-shadow duration-300 hover:shadow-md">
              <i className="fas fa-search text-gray-400"></i>
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none focus:outline-none ml-2 w-48"
              />
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none relative transition-colors duration-300"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <i className="fas fa-bell text-xl"></i>
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200 transition-opacity duration-300">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      >
                        <div className="flex items-start">
                          <div className={`
                            rounded-full p-2 mr-3 flex items-center justify-center
                            ${notification.type === 'low-stock' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}
                          `}>
                            <i className={`fas ${notification.type === 'low-stock' ? 'fa-exclamation' : 'fa-check'} text-sm`}></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button 
                      className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors duration-150"
                      onClick={() => navigate('/notifications')}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <img
                className="h-9 w-9 rounded-full object-cover border-2 border-gray-200"
                src="https://ui-avatars.com/api/?name=Kushal&background=6366f1&color=fff"
                alt="User avatar"
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">Kushal</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
