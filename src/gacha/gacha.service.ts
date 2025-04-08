import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { RewardPointsService } from '../points/reward-points/reward-points.service';
import { PrismaService } from '../prisma/prisma.service';
import { GachaResultStatus } from '@prisma/client';
dotenv.config();

@Injectable()
export class GachaService {
  constructor(
    private readonly rewardPointsService: RewardPointsService,
    private readonly prisma: PrismaService,
  ) {}

  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private shopifyRestUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/draft_orders.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  // ガチャで必要な情報｛ガチャID,metaData,custmerId,amount｝

  async drawGacha(gachaId: string, customerId: number) {
    const lineup = await this.getGachaLineup(gachaId);
    if (!lineup.length) throw new Error('ガチャのラインナップがありません');

    // 1日の制限回数を取得
    const dailyDrawLimit = await this.getDailyDrawLimit(gachaId);

    // その日の実行回数を取得
    const todayDrawCount = await this.getTodayDrawCount(
      customerId.toString(),
      gachaId,
    );

    console.log('todayDrawCount', todayDrawCount);
    console.log('dailyDrawLimit', dailyDrawLimit);

    // 制限回数チェック
    if (dailyDrawLimit !== null && todayDrawCount >= dailyDrawLimit) {
      console.log('ERR [drawGacha] 本日のガチャ実行回数上限に達しました');
      throw new Error('本日のガチャ実行回数上限に達しました');
    }

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
      const draftOrder = await this.createDraftOrder(customerId, [
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

      // ポイント付与処理
      await this.rewardPointsService.addPoints({
        customerId: customerId.toString(),
        amount: rewardPoints,
        description: `ガチャ実行報酬: ${title}`,
        gachaResultId: selectedCardId,
      });

      // ガチャ結果を保存
      await this.prisma.gachaResult.create({
        data: {
          customerId: customerId.toString(),
          gachaId,
          cardId: selectedCardId,
          draftOrderId: draftOrder.id,
          createdAt: new Date(),
          status: GachaResultStatus.PENDING,
          selectionDeadline: new Date(
            new Date().getTime() + 2 * 7 * 24 * 60 * 60 * 1000,
          ),
        },
      });

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
          id
          title
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

      const product = response.data.data.product;
      if (!product) {
        throw new Error(`商品が見つかりません。gachaId: ${gachaId}`);
      }

      if (!product.metafields?.edges?.length) {
        throw new Error(
          `商品のmetafieldsが設定されていません。商品名: ${product.title}`,
        );
      }

      const resultValue = product.metafields.edges[0].node.value;
      console.log('Result Value:', resultValue);
      console.log(`Type: ${typeof resultValue}`);

      return JSON.parse(resultValue);
    } catch (err: any) {
      console.error('ERR [getGachaLineup]', {
        error: err.message,
        gachaId,
        response: err.response?.data,
      });
      throw new Error('ガチャのラインナップ取得に失敗しました');
    }
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

  // ガチャの1日の制限回数を取得
  async getDailyDrawLimit(gachaId: string): Promise<number | null> {
    const query = `
      {
        product(id: "gid://shopify/Product/${gachaId}") {
          metafield(namespace: "custom", key: "daily_draw_limit") {
            value
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
      const limit = response.data.data.product.metafield?.value;
      return limit ? parseInt(limit, 10) : null;
    } catch (err) {
      console.error('[getDailyDrawLimit] エラー:', err);
      return null;
    }
  }

  // その日のガチャ実行回数を取得
  async getTodayDrawCount(
    customerId: string,
    gachaId: string,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.prisma.gachaResult.count({
      where: {
        customerId,
        gachaId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return count;
  }
}
