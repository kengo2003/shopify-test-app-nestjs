import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DraftOrdersService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/draft_orders.json`;
  private shopifyGraphqlUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
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
          }
          order {
            id
            name
            createdAt
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
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const result = data.data.draftOrderComplete;

    if (result.userErrors.length > 0) {
      throw new Error(
        `Shopify userErrors: ${JSON.stringify(result.userErrors)}`,
      );
    }

    return result;
  }
}
