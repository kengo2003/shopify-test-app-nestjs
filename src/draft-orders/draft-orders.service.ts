import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DraftOrdersService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/draft_orders.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  async getDraftOrders(customerId: string) {
    console.log(customerId);
    try {
      const response = await axios.get(this.shopifyUrl, {
        headers: this.headers,
      });
      // console.log(response.data.draft_orders);
      // return response.data;

      const filtered = response.data.draft_orders.filter((order) => {
        return String(order.customer?.id) === String(customerId);
      });
      // console.log('filtered:', filtered);
      return filtered;
    } catch (err) {
      console.error(
        'Draft Order API error:',
        err.response?.data || err.message,
      );
    }
  }

  async getHallo() {
    return 'Hallo';
  }
}
