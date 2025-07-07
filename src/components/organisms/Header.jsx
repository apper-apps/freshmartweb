import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ApperIcon from '@/components/ApperIcon';
import SearchBar from '@/components/molecules/SearchBar';
import { selectCartItemCount } from '@/store/cartSlice';

const Header = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const cartCount = useSelector(selectCartItemCount);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (searchTerm) => {
    if (searchTerm.trim()) {
      navigate(`/category/All?search=${encodeURIComponent(searchTerm)}`);
    }
};

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
              <ApperIcon name="ShoppingBag" size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">FreshMart</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/category/All" className="text-gray-700 hover:text-primary transition-colors">
              Shop
            </Link>
            <Link to="/orders" className="text-gray-700 hover:text-primary transition-colors">
              Orders
            </Link>
<Link to="/admin/dashboard" className="text-gray-700 hover:text-primary transition-colors">
              Admin
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name="ShoppingCart" size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Account */}
            <Link 
              to="/account" 
              className="p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name="User" size={24} />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
            >
              <ApperIcon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <nav className="px-4 py-2 space-y-2">
            <Link 
              to="/" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/category/All" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Shop
            </Link>
            <Link 
              to="/orders" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Orders
            </Link>
<Link 
              to="/admin/dashboard" 
              className="block px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;