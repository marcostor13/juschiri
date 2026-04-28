import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: [],
  addToCart: (product) => set((state) => {
    const existingIndex = state.cart.findIndex(item => item.codigo === product.codigo);
    if (existingIndex !== -1) {
      const newCart = [...state.cart];
      newCart[existingIndex] = { 
          ...newCart[existingIndex], 
          cantidad: (newCart[existingIndex].cantidad || 1) + 1 
      };
      return { cart: newCart };
    }
    return { cart: [...state.cart, { ...product, cantidad: 1 }] };
  }),
  removeFromCart: (codigo) => set((state) => ({
    cart: state.cart.filter(item => item.codigo !== codigo)
  })),
  clearCart: () => set({ cart: [] }),
}));
