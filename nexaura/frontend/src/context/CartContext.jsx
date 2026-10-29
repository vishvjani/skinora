import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('skinora_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('skinora_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const FREE_SHIPPING_THRESHOLD = 499;

  useEffect(() => {
    localStorage.setItem('skinora_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('skinora_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('skinora_coupon');
    }
  }, [appliedCoupon]);

  const addToCart = (product, quantity = 1, form = null, size = null) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.form === (form || product.form)
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity,
            form: form || product.form,
            size: size || product.size,
          }
        ];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = async (code, userId = null) => {
    setCouponError('');
    setCouponSuccess('');
    
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return false;
    }

    const subtotal = cartSubtotal;
    const res = await apiService.validateCoupon(code, subtotal, userId || 'guest');

    if (res.valid) {
      setAppliedCoupon(res);
      setCouponSuccess(res.message);
      return true;
    } else {
      setCouponError(res.message);
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartMrpTotal = cart.reduce(
    (sum, item) => sum + item.product.mrp * item.quantity,
    0
  );

  // Calculate discount — supports both API response shape (discount_amount / discount_type / discount_value)
  // and legacy fallback shape (discountPercent / flatDiscount)
  let discountAmount = 0;
  if (appliedCoupon) {
    if (typeof appliedCoupon.discount_amount === 'number') {
      // API / validate endpoint response
      discountAmount = Math.round(appliedCoupon.discount_amount);
    } else if (appliedCoupon.discount_type === 'percent' && typeof appliedCoupon.discount_value === 'number') {
      discountAmount = Math.round((cartSubtotal * appliedCoupon.discount_value) / 100);
    } else if (appliedCoupon.discount_type === 'flat' && typeof appliedCoupon.discount_value === 'number') {
      discountAmount = Math.min(appliedCoupon.discount_value, cartSubtotal);
    } else if (typeof appliedCoupon.discountPercent === 'number' && appliedCoupon.discountPercent > 0) {
      // Legacy fallback shape
      discountAmount = Math.round((cartSubtotal * appliedCoupon.discountPercent) / 100);
    } else if (typeof appliedCoupon.flatDiscount === 'number' && appliedCoupon.flatDiscount > 0) {
      discountAmount = Math.min(appliedCoupon.flatDiscount, cartSubtotal);
    }
  }

  const isFreeShipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD || (appliedCoupon && (appliedCoupon.freeShipping || appliedCoupon.free_shipping));
  const shippingFee = cartSubtotal > 0 && !isFreeShipping ? 49 : 0;

  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);
  const totalSavings = cartMrpTotal - cartSubtotal + discountAmount;
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const couponCode = appliedCoupon ? (appliedCoupon.code || null) : null;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        couponError,
        couponSuccess,
        isCartOpen,
        setIsCartOpen,
        cartCount,
        cartSubtotal,
        cartMrpTotal,
        discountAmount,
        shippingFee,
        isFreeShipping,
        cartTotal,
        totalSavings,
        couponCode,
        FREE_SHIPPING_THRESHOLD,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
