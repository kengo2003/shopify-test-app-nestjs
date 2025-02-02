import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ShopifyService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01`;

  async getProducts() {
    const response = await axios.get(`${this.shopifyUrl}/products.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });
    return response.data;
  }

  async updateProduct(productId: number, updateData: any) {
    const response = await axios.put(
      `${this.shopifyUrl}/products/${productId}.json`,
      { product: updateData },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );
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
  async updateCustomer(customerId: number, updateData: any) {
    const response = await axios.put(
      `${this.shopifyUrl}/customers/${customerId}.json`,
      { customer: updateData },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }
}
