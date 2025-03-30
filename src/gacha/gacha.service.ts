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

  async drawGacha(gachaId: string, customerId: string) {
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

      // 下書き作成
      await this.createDraftOrder(customerId, [
        {
          title: selectedCardId,
          price: '0.00',
          quantity: 1,
          properties: {
            カードID: selectedCardId,
          },
        },
      ]);

      return { cardId: selectedCardId };
    } catch (err) {
      console.log('[drawGacha]', err);
    }
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
  async createDraftOrder(customerId: string, lineItems: any[]) {
    const draftOrderData = {
      draft_order: {
        customer: {
          id: customerId,
        },
        line_items: lineItems,
        use_customer_default_address: true,
      },
    };

    const response = await axios.post(this.shopifyRestUrl, draftOrderData, {
      headers: this.headers,
    });
    return response.data;
  }
}
