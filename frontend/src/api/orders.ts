import client from './client';

export interface OrderItem {
  article: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  user_id: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  comment: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  comment?: string;
}

export const ordersAPI = {
  getOrders: (): Promise<Order[]> =>
    client.get('/orders').then((res) => res.data),

  createOrder: (data: CreateOrderRequest): Promise<Order> =>
    client.post('/orders', data).then((res) => res.data),

  getOrder: (orderId: number): Promise<Order> =>
    client.get(`/orders/${orderId}`).then((res) => res.data),
};
