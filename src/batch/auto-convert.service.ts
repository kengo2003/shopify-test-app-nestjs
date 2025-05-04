import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { DraftOrdersService } from '../draft-orders/draft-orders.service';

dotenv.config();

interface Draft {
  id: string;
  createdAt: string;
  name: string;
  tags?: string[];
  customer?: { id: string };
  lineItems?: {
    edges: Array<{
      node: {
        product: {
          metafield: { value: string } | null;
        } | null;
      };
    }>;
  };
}

@Injectable()
export class AutoConvertService {
  private readonly headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  private readonly shopifyGraphqlUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;

  constructor(private readonly draftOrdersService: DraftOrdersService) {}

  async autoConvertOlderThan(days = 7) {
    const jstNow = DateTime.now().setZone('Asia/Tokyo');
    const thresholdUtcIso = jstNow
      .minus({ days })
      .startOf('day')
      .toUTC()
      .toISO();

    let cursor: string | null = null;
    let processedCount = 0;
    let errorCount = 0;

    try {
      do {
        const { orders, nextCursor } = await this.fetchDraftOrders({
          beforeIso: thresholdUtcIso,
          cursor,
        });

        for (const draft of orders) {
          try {
            if (draft.tags?.includes('autoConverted')) {
              console.debug(`[autoConvert] スキップ - Draft ID: ${draft.id}`);
              continue;
            }

            const customerId = draft.customer?.id;
            if (!customerId) {
              console.warn(`[autoConvert] 顧客IDなし - Draft ID: ${draft.id}`);
              continue;
            }

            const point = this.getPointValueFromDraft(draft);
            // 顧客IDから数値部分のみを抽出
            const numericCustomerId = customerId.split('/').pop();
            if (!numericCustomerId) {
              console.warn(
                `[autoConvert] 不正な顧客ID形式 - Customer ID: ${customerId}`,
              );
              continue;
            }

            if (point <= 0) {
              console.warn(
                `[autoConvert] 無効なポイント値 - Draft ID: ${draft.id}, Points: ${point}`,
              );
              continue;
            }

            try {
              await this.draftOrdersService.deleteFn(
                draft.id,
                numericCustomerId,
                point,
              );
              processedCount++;
              console.log(
                `[autoConvert] 処理成功 - Draft: ${draft.id}, Customer: ${numericCustomerId}, Points: ${point}`,
              );
            } catch (error) {
              errorCount++;
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.error(
                `[autoConvert] 処理失敗 - Draft: ${draft.id}, Customer: ${numericCustomerId}, Points: ${point}, エラー: ${errorMessage}`,
              );
            }
          } catch (error) {
            errorCount++;
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(
              `[autoConvert] エラー - Draft: ${draft.id}, エラー: ${errorMessage}`,
            );
          }
        }

        cursor = nextCursor;
      } while (cursor);

      console.log(
        `[autoConvert] 処理完了 - 成功: ${processedCount}件, 失敗: ${errorCount}件`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[autoConvert] 致命的なエラー: ${errorMessage}`);
      throw error;
    }
  }

  private getPointValueFromDraft(draft: Draft): number {
    const metafieldValue =
      draft.lineItems?.edges[0]?.node?.product?.metafield?.value;
    if (!metafieldValue) {
      console.debug(
        `[autoConvert] ポイント値が未設定です。Draft ID: ${draft.id}`,
      );
      return 0;
    }

    const pointValue = parseInt(metafieldValue, 10);
    if (isNaN(pointValue)) {
      console.error(
        `[autoConvert] 不正なポイント値です。Draft ID: ${draft.id}, Value: ${metafieldValue}`,
      );
      return 0;
    }

    return pointValue;
  }

  /** GraphQL で OPEN & 古いものだけ取得 */
  private async fetchDraftOrders(opts: {
    beforeIso: string;
    cursor: string | null;
  }): Promise<{ orders: Draft[]; nextCursor: string | null }> {
    const query = `
      query($cursor:String) {
        draftOrders(first: 100, after:$cursor,
                    query:"status:open AND created_at:<${opts.beforeIso}") {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            createdAt
            name
            tags
            customer { id }
            lineItems(first: 1) {
              edges {
                node {
                  product {
                    metafield(namespace: "custom", key: "card_point_value") {
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('[fetchDraftOrders] リクエスト開始', {
      url: this.shopifyGraphqlUrl,
      variables: {
        cursor: opts.cursor,
      },
    });

    const resp = await axios.post(
      this.shopifyGraphqlUrl,
      {
        query,
        variables: {
          cursor: opts.cursor,
        },
      },
      { headers: this.headers },
    );

    console.log('[fetchDraftOrders] レスポンス', {
      status: resp.status,
      data: JSON.stringify(resp.data, null, 2),
    });

    if (resp.data.errors) {
      console.error('[fetchDraftOrders] GraphQLエラー:', resp.data.errors);
      throw new Error('GraphQLクエリの実行に失敗しました');
    }

    const page = resp.data.data.draftOrders;
    return {
      orders: page.nodes,
      nextCursor: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
    };
  }
}
