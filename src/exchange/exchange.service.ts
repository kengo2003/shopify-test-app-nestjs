import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ExchangeService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01`;
  private graphqlUrl = `${this.shopifyUrl}/graphql.json`;
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
      products(first: 100) {
        edges {
          node {
            id
            title
            featuredImage {
              url
            }
            variants(first: 1) {
              edges {
                node {
                  id
                }
              }
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
      const variantGid = product.variants.edges[0]?.node?.id || '';
      const numericVariantId = variantGid.replace(
        'gid://shopify/ProductVariant/',
        '',
      );

      return {
        id: product.id,
        title: product.title,
        image: product.featuredImage?.url || '',
        requiredPoints: Number(product.metafield?.value || 0),
        variantId: numericVariantId,
      };
    });
  }

  // 商品とポイントの交換処理
  async exchangeItem(
    customerId: number,
    variantId: number,
    requiredPoints: number,
  ) {
    try {
      if (!variantId) throw new Error('variant_id not found');

      // Draft Order作成
      const draftOrderRes = await axios.post(
        `${this.shopifyUrl}/draft_orders.json`,
        {
          draft_order: {
            customer: {
              id: customerId,
            },
            line_items: [
              {
                variant_id: variantId,
                quantity: 1,
                properties: [
                  { name: '交換所経由', value: 'true' },
                  { name: 'ポイント利用', value: `${requiredPoints}pt` },
                ],
              },
            ],
            use_customer_default_address: true,
          },
        },
        { headers: this.headers },
      );

      const draftGid = draftOrderRes.data.draft_order.admin_graphql_api_id;

      // 正式な注文に変換
      const query = `
        mutation {
          draftOrderComplete(id: "${draftGid}") {
            draftOrder {
              id
              name
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const completeRes = await axios.post(
        this.graphqlUrl,
        { query },
        { headers: this.headers },
      );

      if (completeRes.data.errors) {
        throw new Error(
          `GraphQLエラー: ${JSON.stringify(completeRes.data.errors)}`,
        );
      }

      const result = completeRes.data.data?.draftOrderComplete;

      if (!result) {
        throw new Error('draftOrderComplete がレスポンスに含まれていません');
      }

      if (result.userErrors && result.userErrors.length > 0) {
        throw new Error(
          `Shopify userErrors: ${JSON.stringify(result.userErrors)}`,
        );
      }

      // 正常時のレスポンス処理
      return {
        message: `顧客:${customerId} がアイテム:${variantId}を${requiredPoints}ptで交換`,
        draftOrder: result.draftOrder,
      };
    } catch (err: any) {
      console.error(
        '[exchangeItem error]',
        err.response?.data || err.message || err,
      );
      throw new Error('交換中にエラーが発生しました');
    }
  }
}
