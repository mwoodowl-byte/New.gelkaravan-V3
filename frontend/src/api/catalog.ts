import client from './client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  order: number;
  children?: Category[];
}

export interface ProductVariant {
  label: string;
  price: number;
  photo_url: string | null;
  stock_quantity: number | null;
}

export interface Product {
  article: string;
  name: string;
  description: string | null;
  price: number;
  category_id: number;
  category_name?: string;
  photo_url: string | null;
  is_pack: boolean;
  pack_size: number | null;
  variants: ProductVariant[];
}

export interface ProductsParams {
  section_id?: number;
  q?: string;
  offset?: number;
  limit?: number;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}

export const catalogAPI = {
  getCategories: () =>
    client.get('/catalog/sections').then((res) => {
      const sections = res.data?.sections ?? res.data ?? [];
      // Разворачиваем дерево в плоский список с parent_id
      const flat: Category[] = [];
      const flatten = (items: any[], parentId: number | null = null) => {
        for (const s of items) {
          flat.push({ id: s.id, name: s.name, slug: s.slug, parent_id: parentId, order: s.sort_order });
          if (s.children?.length) flatten(s.children, s.id);
        }
      };
      flatten(sections);
      return flat;
    }),

  getProducts: (params: ProductsParams) =>
    client.get('/catalog', { params }).then((res) => res.data),

  getProduct: (article: string) =>
    client.get(`/catalog/${article}`).then((res) => res.data),
};
