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

      const draftOrders = response.data.draft_orders.filter(
        (order) => String(order.customer?.id) === String(customerId),
      );
      const productIds = draftOrders
        .flatMap((order) => order.line_items.map((item) => item.product_id))
        .filter((id, i, arr) => id && arr.indexOf(id) === i); // 重複除外

      const metafields = await this.fetchProductMetafields(productIds);

      const enrichedOrders = draftOrders.map((order) => {
        const line_items = order.line_items.map((item) => {
          const point = metafields[item.product_id] || null;
          return {
            ...item,
            card_point_value: point,
          };
        });
        return {
          ...order,
          line_items,
        };
      });

      return enrichedOrders;
    } catch (err) {
      throw new Error('下書き注文の取得に失敗しました');
    }
  }

  async fetchProductMetafields(
    productIds: number[],
  ): Promise<Record<number, string>> {
    if (productIds.length === 0) return {};

    const idsGIDs = productIds
      .map((id) => `"gid://shopify/Product/${id}"`)
      .join(', ');

    const query = `
    {
      nodes(ids: [${idsGIDs}]) {
        ... on Product {
          id
          metafield(namespace: "custom", key: "card_point_value") {
            value
          }
        }
      }
    }
  `;

    const res = await axios.post(
      this.shopifyGraphqlUrl,
      { query },
      { headers: this.headers },
    );
    const result: Record<number, string> = {};
    res.data.data.nodes.forEach((node) => {
      const productId = Number(node.id.split('/').pop());
      const point = node.metafield?.value || null;
      result[productId] = point;
    });

    return result;
  }

  async createOrder(orderId: string) {
    const gid = `gid://shopify/DraftOrder/${orderId}`;

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
      //下書き注文を削除
      await this.delete(orderId);
    } catch (err) {
      console.error('[createOrder][delete] Error:', err);
    }
    return result.draftOrder.order;
  }

  //下書き注文削除関数
  async delete(orderId: string) {
    try {
      const url = `${this.shopifyRestBase}/draft_orders/${orderId}.json`;
      await axios.delete(url, { headers: this.headers });

      return { message: `[delete] Draft order ${orderId}` };
    } catch (err) {
      console.error('[delete] Error:', err);
      throw new Error('Failed to delete draft order');
    }
  }

  async deleteFn(orderId: string, userId: string, point: number) {
    // ポイント処理と下書き削除処理
    try {
      //ここにポイント処理
      await this.delete(orderId);
    } catch (err) {
      console.error('[deleteFn][delete] Error:', err);
    }
    console.log(
      `[deleteFn] orderId: ${orderId}, userId: ${userId}, point: ${point}`,
    );
    return { message: '[deleteFn] Draft order deleted and Add point' };
  }
}
