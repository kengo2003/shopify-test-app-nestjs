import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { RewardPointsService } from '../points/reward-points/reward-points.service';
import { PrismaService } from '../prisma/prisma.service';
import { GachaResultStatus } from '@prisma/client';
import { GachaPointsService } from '../points/gacha-points/gacha-points.service';
import { ExchangeService } from '../exchange/exchange.service';
dotenv.config();

@Injectable()
export class GachaService {
  constructor(
    private readonly rewardPointsService: RewardPointsService,
    private readonly prisma: PrismaService,
    private readonly gachaPointService: GachaPointsService,
    private readonly exchangeService: ExchangeService,
  ) {}

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
    try {
      const lineup = await this.getGachaLineupFromCollection(collectionHandle);
      console.log('Lineup:', JSON.stringify(lineup));
      if (!lineup.cards.length) {
        console.error('在庫が不足しています。!lineup.length');
        return { results: [], error: '在庫が不足しています。' };
      }

      // 全カードを在庫に応じてpoolに展開
      const pool = lineup.cards.flatMap((item) =>
        Array(item.inventory).fill(item),
      );
      // 抽選回数分の在庫があるか確認
      if (pool.length < amount) {
        console.error('在庫不足です。!pool.length < amount');
        return {
          results: [],
          error: `在庫不足です。残り ${pool.length} 回しか引けません。`,
        };
      }
      const results = [];

      //check if the customer has enough points
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId.toString() },
      });
      if (customer.gachaPoints < amount * lineup.cost) {
        console.error(
          '[drawGacha] ポイント不足です。',
          customer.gachaPoints,
          amount,
        );
        return {
          results: [],
          error: `ポイント不足です。${amount * lineup.cost - customer.gachaPoints}pt不足です。`,
        };
      }

      for (let i = 0; i < amount; i++) {
        // 重複排除のため、選んだ要素は pool から削除
        const index = Math.floor(Math.random() * pool.length);
        const selected = pool.splice(index, 1)[0];

        // 注文作成（在庫は正式注文で減る前提、ここでは確認のみ）
        const draftOrder = await this.createDraftOrder(customerId, [
          {
            variant_id: selected.variantId,
            quantity: 1,
            properties: [
              { name: 'カードID', value: selected.productId },
              { name: '商品名', value: selected.title },
            ],
          },
        ]);
        console.log('draftOrder:', JSON.stringify(draftOrder));

        // 在庫を減らす処理
        await this.adjustInventory(
          selected.inventoryItemId,
          selected.locationId,
          -1,
        );

        // 報酬ポイント（後にDBに加算）
        const rewardPoints = await this.getRewardPointValue();

        // ポイント付与処理
        const rewardPointTransaction = await this.rewardPointsService.addPoints(
          {
            customerId: customerId.toString(),
            amount: rewardPoints,
            description: `ガチャ実行報酬: ${selected.title}`,
            gachaResultId: selected.productId,
          },
        );

        // ガチャ結果を保存
        await this.prisma.gachaResult.create({
          data: {
            customerId: customerId.toString(),
            gachaId: collectionHandle,
            cardId: selected.productId,
            draftOrderId: draftOrder.id,
            createdAt: new Date(),
            status: GachaResultStatus.PENDING,
            selectionDeadline: new Date(
              new Date().getTime() + 2 * 7 * 24 * 60 * 60 * 1000,
            ),
            rewardPointTransactionId: rewardPointTransaction.id,
          },
        });

        //gachaPointTransactionを発行し、customerのgachaPointsを減らす
        await this.gachaPointService.usePoints({
          customerId: customerId.toString(),
          amount: lineup.cost,
          description: `ガチャ実行報酬: ${selected.title}`,
          gachaResultId: selected.productId,
        });

        results.push({
          cardId: selected.productId,
          title: selected.title,
          image: selected.image,
          rarity: selected.rarity,
        });
      }

      const maxRarity = Math.max(...results.map((result) => result.rarity));
      return { maxRarity, results: results };
    } catch (error) {
      console.error('ガチャラインナップ取得エラー:', error);
      return { results: [], error: 'ガチャラインナップの取得に失敗しました。' };
    }
  }

  // ガチャラインナップの取得
  async getGachaLineupFromCollection(handle: string) {
    try {
      console.log('getGachaLineupFromCollection開始:', handle);
      const query = `
      {
        collectionByHandle(handle: "${handle}") {
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
          products(first: 150) {
            edges {
              node {
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
                variants(first: 1) {
                  edges {
                    node {
                      id
                      inventoryQuantity
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

      const edges = res.data?.data?.collectionByHandle?.products?.edges || [];
      const metafields =
        res.data?.data?.collectionByHandle?.metafields?.edges || [];

      // console.log(`res: ${JSON.stringify(res.data)}`);
      // console.log('Edges:', JSON.stringify(edges));
      // console.log('Metafields:', JSON.stringify(metafields));

      const cost = metafields.find(
        (edge) =>
          edge.node.key === 'point_cost' && edge.node.namespace === 'custom',
      )?.node?.value;
      console.log('Found cost:', cost);

      // 商品データの変換処理
      const transformedProducts = edges.map((edge) => {
        const product = edge.node;
        const variant = product.variants.edges[0]?.node;
        const locationId =
          variant?.inventoryItem?.inventoryLevels?.edges[0]?.node?.location?.id;

        // バリデーションチェック
        const isValidVariant = variant && variant.inventoryQuantity > 0;
        const hasLocationId = !!locationId;

        // 条件を満たさない場合はnullを返す
        if (!isValidVariant || !hasLocationId) {
          console.log('条件を満たさない場合はnullを返す');
          return null;
        }

        // 最終的な返り値の構築
        return {
          productId: product.id,
          title: product.title,
          variantId: variant.id.replace('gid://shopify/ProductVariant/', ''),
          inventoryItemId: variant.inventoryItem.id,
          locationId,
          inventory: variant.inventoryQuantity,
          image: product.featuredImage?.url || '',
          rarity: parseInt(
            product.metafields.edges.find(
              (edge) =>
                edge.node.key === 'card_rarity' &&
                edge.node.namespace === 'custom',
            )?.node?.value || '1',
            10,
          ),
        };
      });

      console.log('getGachaLineupFromCollection終了');
      return {
        cost: cost ? parseInt(cost, 10) : null,
        cards: transformedProducts.filter((item) => item !== null),
      };
    } catch (error) {
      console.error('getGachaLineupFromCollectionエラー:', error);
      throw error;
    }
  }

  async adjustInventory(
    inventoryItemId: string,
    locationId: string,
    delta: number,
  ) {
    const mutation = `
    mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        inventoryAdjustmentGroup {
          createdAt
          reason
          changes {
            delta
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

    const variables = {
      input: {
        name: 'available',
        reason: 'correction',
        changes: [
          {
            inventoryItemId,
            locationId,
            delta,
          },
        ],
      },
    };

    const res = await axios.post(
      this.shopifyUrl,
      { query: mutation, variables },
      { headers: this.headers },
    );

    const data = res.data?.data?.inventoryAdjustQuantities;
    if (!data) {
      console.error('[adjustInventory] 無効なレスポンス:', res.data);
      throw new Error('Shopifyから在庫調整のレスポンスが無効です');
    }

    if (data.userErrors?.length) {
      console.error('[Inventory Error]', data.userErrors);
      throw new Error('在庫の更新に失敗しました');
    }

    console.log('[adjustInventory] 成功:', JSON.stringify(data));
  }

  // メタフィールドから報酬ポイントを取得
  async getRewardPointValue(): Promise<number> {
    //   const query = `
    //   {
    //     shop {
    //       metafield(namespace: "custom", key: "required_reward_points") {
    //         value
    //       }
    //     }
    //   }
    // `;
    // const res = await axios.post(
    //   this.shopifyUrl,
    //   { query },
    //   { headers: this.headers },
    // );

    try {
      const { reward_point_value } =
        await this.exchangeService.getRewardPointValue('7574722347091');
      console.log('[getRewardPointValue]:', reward_point_value);
      return reward_point_value;
    } catch (err) {
      console.error('報酬ポイントの取得に失敗:', err);
      return 0;
    }
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

    // console.log(
    //   '[createDraftOrder] payload:',
    //   JSON.stringify(draftOrderData, null, 2),
    // );

    const response = await axios.post(this.shopifyRestUrl, draftOrderData, {
      headers: this.headers,
    });
    // console.log('[createDraftOrder] response:', response.data);
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

  // handleからコレクションIDを取得するメソッド
  async getCollectionIdByHandle(handle: string): Promise<string | null> {
    const query = `
    query GetCollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
      }
    }
  `;

    const response = await axios.post(
      this.shopifyUrl,
      { query, variables: { handle } },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.data.collectionByHandle?.id || null;
  }

  // 在庫合計を取得するメソッド（collectionIdを渡す）
  async getTotalInventoryInCollection(collectionId: string): Promise<number> {
    let hasNextPage = true;
    let cursor: string | null = null;
    let totalInventory = 0;

    while (hasNextPage) {
      try {
        // APIコール間に遅延を入れる（商品数が50以上の場合の対策）
        if (cursor) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const query = `
        query CollectionInventory($collectionId: ID!, $cursor: String) {
          collection(id: $collectionId) {
            products(first: 50, after: $cursor) {
              edges {
                node {
                  variants(first: 5) {
                    edges {
                      node {
                        inventoryQuantity
                      }
                    }
                  }
                }
                cursor
              }
              pageInfo {
                hasNextPage
              }
            }
          }
        }
      `;

        const response = await axios.post(
          this.shopifyUrl,
          { query, variables: { collectionId, cursor } },
          {
            headers: this.headers,
          },
        );

        console.log(
          'response of CollectionInventory:',
          JSON.stringify(response.data),
        );

        // レスポンスデータの構造を確認
        if (
          !response.data ||
          !response.data.data ||
          !response.data.data.collection
        ) {
          console.error('Invalid response structure:', response.data);
          throw new Error('Shopifyからのレスポンスが無効です');
        }

        const productsEdges = response.data.data.collection.products.edges;

        productsEdges.forEach((product) => {
          product.node.variants.edges.forEach((variant) => {
            totalInventory += variant.node.inventoryQuantity;
          });
        });

        hasNextPage =
          response.data.data.collection.products.pageInfo.hasNextPage;
        cursor = hasNextPage
          ? productsEdges[productsEdges.length - 1].cursor
          : null;
      } catch (error: any) {
        if (error.response?.status === 429) {
          // レート制限エラー
          console.log('レート制限に達しました。5秒待機します');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        throw error;
      }
    }

    return totalInventory;
  }

  // handleだけで在庫数を合計するメソッド
  async getGachaStock(handle: string): Promise<number | null> {
    const collectionId = await this.getCollectionIdByHandle(handle);
    if (!collectionId) {
      return null; // コレクションが見つからない場合
    }
    return await this.getTotalInventoryInCollection(collectionId);
  }
}
