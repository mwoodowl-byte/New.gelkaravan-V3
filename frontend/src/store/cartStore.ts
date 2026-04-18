import { create } from 'zustand';

export interface CartItem {
  id: number;
  article: string;
  variant_label: string | null;
  quantity: number;
  price: number;
  product_name: string;
  photo_url: string | null;
}

interface CartState {
  items: CartItem[];
  total: number;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  updateQty: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  
  setItems: (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    set({ items, total });
  },
  
  addItem: (item) => {
    const items = [...get().items, item];
    const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    set({ items, total });
  },
  
  updateQty: (itemId, quantity) => {
    const items = get().items.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    set({ items, total });
  },
  
  removeItem: (itemId) => {
    const items = get().items.filter((item) => item.id !== itemId);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    set({ items, total });
  },
  
  clearCart: () => set({ items: [], total: 0 }),
  
  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
