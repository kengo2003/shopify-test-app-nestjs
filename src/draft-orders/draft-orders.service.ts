import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DraftOrdersService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/draft_orders.json`;
  private shopifyGraphqlUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private shopifyRestBase = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  async getHello() {
    return 'Hello';
  }

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
      // console.error(
      //   'Draft Order API error:',
      //   err.response?.data || err.message,
      // );
      console.log(err);
    }
  }

  async createOrder(draftOrderId: string) {
    const gid = `gid://shopify/DraftOrder/${draftOrderId}`;

    const query = `
      mutation {
        draftOrderComplete(id: "${gid}") {
          draftOrder {
            id
            status
            completedAt
            order {
              id
              name
              createdAt
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await axios.post(
      this.shopifyGraphqlUrl,
      { query },
      { headers: this.headers },
    );

    const data = response.data;

    if (data.errors) {
      console.error('[createOrder] GraphQL error:', data.errors);
      throw new Error('Shopify GraphQL error');
    }

    const result = data.data.draftOrderComplete;

    if (result.userErrors.length > 0) {
      console.error('[createOrder] userErrors:', result.userErrors);
      throw new Error('Shopify userErrors occurred');
    }

    try {
      await this.delete(draftOrderId);
    } catch (err) {
      console.error('[createOrder] Error:', err);
    }
    //下書き注文を削除
    return result.draftOrder.order;
  }

  async delete(draftOrderId: string) {
    try {
      const url = `${this.shopifyRestBase}/draft_orders/${draftOrderId}.json`;
      await axios.delete(url, { headers: this.headers });

      return { message: `[delete] Draft order ${draftOrderId}` };
    } catch (err) {
      console.error('[delete] Error:', err);
      throw new Error('Failed to delete draft order');
    }
  }

  async deleteOrder(orderId: string, userId: string, points: number) {
    // ここにポイント処理や下書き削除処理を実装
    console.log(
      `[deleteOrder] orderId: ${orderId}, userId: ${userId}, points: ${points}`,
    );
    return { message: 'Draft order deleted (stub)' };
  }
}
