import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ExchangeService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01`;
  private graphqlUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  // ストアの商品から報酬ポイントを取得
  async getRewardPointValue(productId: string) {
    const response = await axios.get(
      `${this.shopifyUrl}/products/${productId}/metafields.json`,
      { headers: this.headers },
    );

    const rewardField = response.data.metafields.find(
      (mf) => mf.namespace === 'custom' && mf.key === 'reward_point_value',
    );

    return { reward_point_value: rewardField?.value || 0 };
  }

  // 顧客のポイントを取得（ダミー実装）
  // async getCustomerPoints(customerId: string) {
  async getCustomerPoints() {
    return { points: 120 }; // 仮のポイント（DB未接続）
  }

  // 交換商品一覧を取得
  async getExchangeItems() {
    const query = `
      {
        collectionByHandle(handle: "交換所") {
          products (first: 100) {
            edges {
              node {
                id
                title
                featuredImage {
                  url
                }
                metafield(namespace: "custom", key: "required_reward_points") {
                  value
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      this.graphqlUrl,
      { query },
      { headers: this.headers },
    );

    const edges = response.data.data.collectionByHandle?.products.edges || [];

    return edges.map((edge) => {
      const product = edge.node;
      return {
        id: product.id,
        title: product.title,
        image: product.featuredImage?.url || '',
        requiredPoints: Number(product.metafield?.value || 0),
      };
    });
  }

  // 商品とポイントの交換処理（仮実装）
  async exchangeItem(
    customerId: number,
    itemId: string,
    requiredPoints: number,
  ) {
    // DBでユーザーのポイントを減らす
    // 注文生成などの処理を行う
    return {
      message: `顧客:${customerId}がアイテム（ID: ${itemId}）と交換：-${requiredPoints}pt`,
    };
  }
}
