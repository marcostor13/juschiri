import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: [],
  addToCart: (product) => set((state) => {
    const cartId = product.cartId || product._id;
    const existingIndex = state.cart.findIndex(item => item.cartId === cartId);
    if (existingIndex !== -1) {
      const newCart = [...state.cart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        cantidad: (newCart[existingIndex].cantidad || 1) + 1,
      };
      return { cart: newCart };
    }
    return { cart: [...state.cart, { ...product, cartId, cantidad: 1 }] };
  }),
  removeFromCart: (cartId) => set((state) => ({
    cart: state.cart.filter(item => item.cartId !== cartId),
  })),
  clearCart: () => set({ cart: [] }),
}));
