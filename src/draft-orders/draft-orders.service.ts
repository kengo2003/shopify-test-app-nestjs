import { Injectable, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { GachaPointsService } from '../points/gacha-points/gacha-points.service';
import { GachaService } from '../gacha/gacha.service';

dotenv.config();

@Injectable()
export class DraftOrdersService {
  constructor(
    private readonly gachaPointsService: GachaPointsService,
    @Inject(forwardRef(() => GachaService))
    private readonly gachaService: GachaService,
  ) {}
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

  async fetchCompletedOrders(draftOrders: any[]) {
    console.log(JSON.stringify(draftOrders));
    const completedOrders = [];
    draftOrders.forEach(async (completedDraftOrder) => {
      const orderId = completedDraftOrder.order_id;
      if (orderId === null) {
        console.log(completedDraftOrder);
        throw new Error('order_id is null');
      }
      const getOrderQuery = `
      query {
        order(id: "${orderId}") {
          id
        }
      }
      `;
      const res = await axios.post(
        this.shopifyGraphqlUrl,
        {
          query: getOrderQuery,
        },
        { headers: this.headers },
      );
      console.log(`completedOrder: ${JSON.stringify(res.data.data.order)}`);
      completedOrders.push(res.data.order);
    });
    return completedOrders;
  }

  async getDraftOrders(customerId: string, first: number = 30, after?: string) {
    try {
      const query = `
        query getDraftOrders($customerId: String!, $first: Int!, $after: String) {
          draftOrders(
            first: $first,
            after: $after,
            query: $customerId
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
                totalPrice
                status
                lineItems(first: 1) {
                  edges {
                    node {
                      id
                      product {
                        id
                        title
                        metafield(namespace: "custom", key: "card_point_value") {
                          value
                        }
                      }
                    }
                  }
                } 
                order {
                  id
                  cancelledAt
                  fulfillments {
                    id
                    createdAt
                    displayStatus
                    estimatedDeliveryAt
                  }
                }
              }
            }
          }
        }
      `;

      const res = await axios.post(
        this.shopifyGraphqlUrl,
        {
          query,
          variables: {
            customerId: `customer_id:${customerId}`,
            first: first,
            after: after || null,
          },
        },
        { headers: this.headers },
      );

      // キャンセルされた注文を除外
      const filteredEdges = res.data.data.draftOrders.edges.filter(
        (edge) => !edge.node.order?.cancelledAt,
      );

      return {
        pageInfo: res.data.data.draftOrders.pageInfo,
        edges: filteredEdges,
      };
    } catch (err) {
      console.error('Error:', err);
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
    const gid = orderId.startsWith('gid://')
      ? orderId
      : `gid://shopify/DraftOrder/${orderId}`;

    // 1. 下書き注文の商品情報を取得
    const { inventoryItemId, locationId } =
      await this.getDraftOrderLineItems(orderId);
    console.log(
      `[createOrder] 商品情報取得成功: inventoryItemId=${inventoryItemId}, locationId=${locationId}`,
    );

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

    // 2. 在庫を戻す（バックエンド側の在庫管理のため）
    await this.gachaService.adjustInventory(inventoryItemId, locationId, 1);
    console.log('[createOrder] 在庫調整成功');

    return result.draftOrder.order;
  }

  // 下書き注文の商品情報を取得するメソッド
  private async getDraftOrderLineItems(draftOrderId: string) {
    const gid = draftOrderId.startsWith('gid://')
      ? draftOrderId
      : `gid://shopify/DraftOrder/${draftOrderId}`;

    const query = `
      query {
        draftOrder(id: "${gid}") {
          lineItems(first: 1) {
            edges {
              node {
                variant {
                  id
                  inventoryItem {
                    id
                    inventoryLevels(first: 1) {
                      edges {
                        node {
                          location {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      this.shopifyGraphqlUrl,
      { query },
      { headers: this.headers },
    );

    if (response.data.errors) {
      console.error('[getDraftOrderLineItems] エラー:', response.data.errors);
      throw new Error('下書き注文の商品情報取得に失敗しました');
    }

    const lineItem = response.data.data.draftOrder.lineItems.edges[0]?.node;
    if (!lineItem) {
      throw new Error('下書き注文に商品が見つかりません');
    }

    return {
      inventoryItemId: lineItem.variant.inventoryItem.id,
      locationId:
        lineItem.variant.inventoryItem.inventoryLevels.edges[0]?.node?.location
          ?.id,
    };
  }

  private async cancelOrder(orderId: string) {
    const gid = orderId.startsWith('gid://')
      ? orderId
      : `gid://shopify/Order/${orderId}`;

    const query = `
      mutation {
        orderCancel(
          orderId: "${gid}",
          reason: CUSTOMER,
          refund: true,
          restock: true,
          notifyCustomer: false
        ) {
          job { id }  
          orderCancelUserErrors { field message }
          userErrors { field message }
        }
      }
    `;

    try {
      const response = await axios.post(
        this.shopifyGraphqlUrl,
        { query },
        { headers: this.headers },
      );

      const data = response.data;

      if (data.errors) {
        console.error('[cancelOrder] GraphQL error:', {
          errors: data.errors,
          orderId,
          gid,
          query,
        });
        throw new Error(
          `Shopify GraphQL error: ${JSON.stringify(data.errors)}`,
        );
      }

      const result = data.data.orderCancel;

      if (result.userErrors.length > 0) {
        console.error('[cancelOrder] userErrors:', {
          userErrors: result.userErrors,
          orderId,
          gid,
        });
        throw new Error(
          `Shopify userErrors: ${JSON.stringify(result.userErrors)}`,
        );
      }

      return result.order;
    } catch (error) {
      console.error('[cancelOrder] Unexpected error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        orderId,
        gid,
      });
      throw error;
    }
  }

  async deleteFn(orderId: string, userId: string, point: number) {
    try {
      // 1. 下書き注文を正式注文化（この中で在庫を戻す処理も実行）
      const order = await this.createOrder(orderId);
      console.log('[deleteFn] 下書き注文を正式注文化成功');

      // 2. 正式注文をキャンセル
      await this.cancelOrder(order.id);
      console.log('[deleteFn] 正式注文をキャンセル成功');

      // 3. ポイント加算
      await this.gachaPointsService.addPoints({
        customerId: userId.toString(),
        amount: Number(point),
        description: 'ポイント変換による加算',
        orderId: orderId.toString(),
      });
      console.log(`[deleteFn] ポイント加算成功: ${point}ポイント`);

      return {
        message:
          '[deleteFn] Draft order converted to order, cancelled and Add point',
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `[deleteFn] エラー - Draft: ${orderId}, エラー: ${errorMessage}`,
      );
      throw new Error(
        `ポイント加算または注文処理に失敗しました: ${errorMessage}`,
      );
    }
  }
}
