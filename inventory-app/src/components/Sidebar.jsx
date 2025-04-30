import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Sidebar = ({ isMobileMenuOpen }) => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { path: '/products', icon: 'fa-box', label: 'Products' },
    { path: '/sales', icon: 'fa-shopping-cart', label: 'Sales' },
    { path: '/reports', icon: 'fa-chart-bar', label: 'Reports' },
    { path: '/settings', icon: 'fa-cog', label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        bg-gradient-to-b from-indigo-700 to-indigo-900 text-white 
        w-64 flex-shrink-0 flex flex-col shadow-lg
      `}>
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center space-x-3">
            <i className="fas fa-boxes text-2xl text-indigo-300"></i>
            <span className="text-xl font-semibold tracking-wider">Inventory Pro</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-800 scrollbar-track-transparent">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 transition-all duration-300 rounded-lg group ${
                  isActive 
                    ? 'bg-indigo-800 text-white shadow-lg scale-105' 
                    : 'text-indigo-100 hover:bg-indigo-800/60 hover:text-white hover:scale-105'
                } transform`
              }
            >
              <i className={`fas ${item.icon} w-6 ${
                location.pathname === item.path 
                  ? 'text-white' 
                  : 'text-indigo-300 group-hover:text-white'
              } transition-colors duration-300`}></i>
              <span className="ml-3">{item.label}</span>
              
              {/* Active indicator */}
              {location.pathname === item.path && (
                <span className="ml-auto w-1.5 h-8 bg-indigo-400 rounded-full shadow-md"></span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center space-x-3 group cursor-pointer hover:bg-indigo-800 p-3 rounded-lg transition-all duration-300">
            <img
              src="https://ui-avatars.com/api/?name=Kushal&background=6366f1&color=fff"
              alt="User avatar"
              className="h-10 w-10 rounded-full border-2 border-indigo-300 group-hover:border-white transition-colors duration-300"
            />
            <div>
              <p className="text-sm font-medium">Kushal</p>
              <p className="text-xs text-indigo-300 group-hover:text-indigo-200">Administrator</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
