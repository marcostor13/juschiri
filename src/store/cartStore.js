import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: [],
  addToCart: (product) => set((state) => ({ cart: [...state.cart, product] })),
  removeFromCart: (index) => set((state) => {
    const newCart = [...state.cart];
    newCart.splice(index, 1);
    return { cart: newCart };
  }),
  clearCart: () => set({ cart: [] }),
}));
