import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShopifyService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/`;

  async getProducts() {
    const response = await axios.get(`${this.shopifyUrl}/products.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });
    return response.data;
  }

  async getCustomers() {
    const response = await axios.get(`${this.shopifyUrl}/customers.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });
    return response.data;
  }
}
