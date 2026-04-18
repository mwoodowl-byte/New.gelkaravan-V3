import client from './client';
import { CartItem } from '@/store/cartStore';

export interface AddToCartRequest {
  article: string;
  variant_label: string | null;
  quantity: number;
}

export interface UpdateCartRequest {
  quantity: number;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
}

export const cartAPI = {
  getCart: (): Promise<CartResponse> =>
    client.get('/cart').then((res) => res.data),

  addToCart: (data: AddToCartRequest): Promise<CartItem> =>
    client.post('/cart/items', data).then((res) => res.data),

  updateCart: (itemId: number, data: UpdateCartRequest): Promise<CartItem> =>
    client.put(`/cart/items/${itemId}`, data).then((res) => res.data),

  removeFromCart: (itemId: number): Promise<void> =>
    client.delete(`/cart/items/${itemId}`).then((res) => res.data),
};
