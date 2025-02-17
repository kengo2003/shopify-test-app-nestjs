import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GachaService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  async drawGacha(gachaId: string) {
    const lineup = await this.getGachaLineup(gachaId);
    if (!lineup.length) throw new Error('ガチャのラインナップがありません');

    // 全てのカードを配列に展開
    const pool = lineup.flatMap((item) =>
      Array(item.quantity).fill(item.cardId),
    );

    // ランダムに1枚選ぶ
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedCardId = pool[randomIndex];

    return { cardId: selectedCardId };
  }

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

    const response = await axios.post(
      this.shopifyUrl,
      { query },
      { headers: this.headers },
    );
    // console.log(
    //   `response: ${response.data.data.product.metafields.edges[0].node.value}`,
    // );
    return JSON.parse(
      response.data.data.product.metafields.edges[0].node.value,
    );
  }
}
