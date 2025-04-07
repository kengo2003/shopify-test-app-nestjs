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

  async drawGacha(
    collectionHandle: string,
    customerId: number,
    amount: number,
  ) {
    const lineup = await this.getGachaLineupFromCollection(collectionHandle);
    if (!lineup.length) throw new Error('ガチャのラインナップがありません');

    const results = [];

    for (let i = 0; i < amount; i++) {
      // 在庫に応じた重み付き配列作成
      const pool = lineup.flatMap((item) => Array(item.inventory).fill(item));

      const selected = pool[Math.floor(Math.random() * pool.length)];

      // 注文作成
      await this.createDraftOrder(customerId, [
        {
          variant_id: selected.variantId.replace(
            'gid://shopify/ProductVariant/',
            '',
          ),
          quantity: 1,
          properties: [
            { name: 'カードID', value: selected.productId },
            { name: '商品名', value: selected.title },
          ],
        },
      ]);

      results.push({
        cardId: selected.productId,
        title: selected.title,
        image: selected.image,
      });
    }
    return { results };
  }

  catch(err: any) {
    console.error(
      '[drawGacha] エラー詳細:',
      err.response?.data || err.message || err,
    );
    throw new Error('ガチャ処理中にエラーが発生しました');
  }

  async getGachaLineupFromCollection(handle: string) {
    const query = `
    {
      collectionByHandle(handle: "${handle}") {
        products(first: 150) {
          edges {
            node {
              id
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    inventoryQuantity
                  }
                }
              }
              featuredImage {
                url
              }
            }
          }
        }
      }
    }
  `;

    const res = await axios.post(
      this.shopifyUrl,
      { query },
      { headers: this.headers },
    );
    const products = res.data.data.collectionByHandle?.products?.edges || [];

    return products
      .map((edge) => {
        const product = edge.node;
        const variant = product.variants.edges[0]?.node;

        if (!variant || variant.inventoryQuantity <= 0) return null;

        return {
          productId: product.id,
          title: product.title,
          variantId: variant.id,
          inventory: variant.inventoryQuantity,
          image: product.featuredImage?.url || '',
        };
      })
      .filter((item) => item !== null);
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

    const metafield = res.data?.data?.shop?.metafield;
    if (!metafield || !metafield.value) {
      console.warn(
        '[RewardPoint] メタフィールドが未設定です。デフォルト0ptを返します',
      );
      return 0;
    }

    return parseInt(metafield.value, 10);
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
