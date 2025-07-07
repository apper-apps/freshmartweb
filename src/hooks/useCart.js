import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { 
  addToCart as addToCartAction, 
  removeFromCart as removeFromCartAction, 
  updateQuantity as updateQuantityAction, 
  clearCart as clearCartAction,
  setLoading,
  selectCartItems,
  selectCartTotal,
  selectCartItemCount,
  selectCartLoading,
  selectIsProductInCart,
  selectProductQuantityInCart
} from '@/store/cartSlice';

/**
 * Custom hook for cart operations
 * Provides cart state and actions with proper error handling
 */
const useCart = () => {
  const dispatch = useDispatch();
  
  // Cart state selectors - called at hook level
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const itemCount = useSelector(selectCartItemCount);
  const isLoading = useSelector(selectCartLoading);
  
  // Cart actions with error handling
  const addToCart = async (product) => {
    try {
      dispatch(setLoading(true));
      await dispatch(addToCartAction(product));
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  const removeFromCart = async (productId) => {
    try {
      dispatch(setLoading(true));
      await dispatch(removeFromCartAction(productId));
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  const updateQuantity = async (productId, quantity) => {
    try {
      dispatch(setLoading(true));
      await dispatch(updateQuantityAction({ productId, quantity }));
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  const clearCart = async () => {
    try {
      dispatch(setLoading(true));
      await dispatch(clearCartAction());
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  // Utility functions that use pre-computed values
  const isProductInCart = (productId) => {
    if (!productId) return false;
    return items.some(item => item.id === productId);
  };
  
  const getProductQuantityInCart = (productId) => {
    if (!productId) return 0;
    const item = items.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  return {
    // State
    items,
    total,
    itemCount,
    isLoading,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    
    // Utilities
    isProductInCart,
    getProductQuantityInCart
  };
};

export default useCart;