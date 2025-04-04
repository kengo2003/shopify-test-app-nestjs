import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GachaService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private shopifyRestUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/draft_orders.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  // ガチャで必要な情報｛ガチャID,metaData,custmerId,amount｝
  // カード選択後メタフィールドを更新する処理必要

  async drawGacha(gachaId: string, customerId: number) {
    const lineup = await this.getGachaLineup(gachaId);
    if (!lineup.length) throw new Error('ガチャのラインナップがありません');

    try {
      // 全てのカードを配列に展開
      const pool = lineup.flatMap((item) =>
        Array(item.quantity).fill(item.cardId),
      );
      // ランダムに1枚選ぶ
      const randomIndex = Math.floor(Math.random() * pool.length);
      const selectedCardId = pool[randomIndex];

      // 商品詳細を取得してvariant_idを取り出す
      const numericId = selectedCardId.replace('gid://shopify/Product/', '');
      const productRes = await axios.get(
        `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/products/${numericId}.json`,
        { headers: this.headers },
      );

      const product = productRes.data.product;
      const variantId = product.variants[0]?.id;
      const title = product.title;
      if (!variantId) throw new Error('variant_id not found');

      // 下書き作成
      await this.createDraftOrder(customerId, [
        {
          variant_id: variantId,
          quantity: 1,
          properties: [
            { name: 'カードID', value: selectedCardId },
            { name: '商品名', value: title },
          ],
        },
      ]);

      // Shopifyから報酬ポイントのメタフィールドを取得
      const rewardPoints = await this.getRewardPointValue();

      // 後にDB更新予定の処理（仮）
      console.log(`[RewardPoint] ${rewardPoints}pt をユーザーに付与予定`);

      return {
        cardId: selectedCardId,
        title,
        image: product.image?.src || null,
      };
    } catch (err: any) {
      console.error(
        '[drawGacha] エラー詳細:',
        err.response?.data || err.message || err,
      );
      throw new Error('ガチャ処理中にエラーが発生しました');
    }
  }

  // メタフィールドから報酬ポイントを取得
  async getRewardPointValue(): Promise<number> {
    const query = `
    {
      shop {
        metafield(namespace: "custom", key: "reward_point_value") {
          value
        }
      }
    }
  `;
    const res = await axios.post(
      this.shopifyUrl,
      { query },
      { headers: this.headers },
    );
    return parseInt(res.data.data.shop.metafield.value, 10);
  }

  //ガチャのラインナップ取得関数
  async getGachaLineup(gachaId: string) {
    const query = `
      {
        product(id: "gid://shopify/Product/${gachaId}") {
          metafields(first: 5) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(
        this.shopifyUrl,
        { query },
        { headers: this.headers },
      );
      // コスト情報
      // console.log('response:', response.data.extensions);
      const resultValue =
        response.data.data.product.metafields.edges[0].node.value;
      // console.log('Result Value:', resultValue);
      // console.log(`Type:, ${typeof resultValue}`);
      return JSON.parse(resultValue);
    } catch (err) {
      console.log('[getGachaLineup]', err);
    }

    // console.log(
    //   `response: ${response.data.data.product.metafields.edges[0].node.value}`,
    // );
    // return JSON.parse(
    //   response.data.data.product.metafields.edges[0].node.value,
    // );
  }

  // 下書き注文作成関数
  async createDraftOrder(customerId: number, lineItems: any[]) {
    const draftOrderData = {
      draft_order: {
        customer: {
          id: Number(customerId),
        },
        line_items: lineItems,
        use_customer_default_address: true,
      },
    };

    console.log(
      '[createDraftOrder] payload:',
      JSON.stringify(draftOrderData, null, 2),
    );

    const response = await axios.post(this.shopifyRestUrl, draftOrderData, {
      headers: this.headers,
    });
    console.log('[createDraftOrder] response:', response.data);
    return response.data;
  }
}
