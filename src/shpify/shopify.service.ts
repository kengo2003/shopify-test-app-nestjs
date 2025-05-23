import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ShopifyService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  // GraphQL商品情報取得
  async getProducts() {
    const query = `
    {
        products(first: 10) {
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
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
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
    // コスト情報
    console.log('response:', response.data.extensions);
    return response.data.data.products.edges.map((edge) => edge.node);
  }

  // REST API商品情報取得
  // async getProducts() {
  //   const response = await axios.get(`${this.shopifyUrl}/products.json`, {
  //     headers: {
  //       'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  //     },
  //   });
  //   return response.data;
  // }

  // GraphQL商品情報更新
  async updateProduct(productId: string, updateData: any) {
    const mutation = `
    mutation updateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                price
              }
            }
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
        id: `gid://shopify/Product/${productId}`,
        title: updateData.title,
        variants: updateData.variants?.map((variant) => ({
          id: `gid://shopify/ProductVariant/${variant.id}`,
          price: variant.price,
        })),
      },
    };

    const response = await axios.post(
      this.shopifyUrl,
      { query: mutation, variables },
      { headers: this.headers },
    );

    if (response.data.data.productUpdate.userErrors.length) {
      throw new Error(response.data.data.productUpdate.userErrors[0].message);
    }

    return response.data.data.productUpdate.product;
  }

  // REST API商品情報更新
  // async updateProduct(productId: number, updateData: any) {
  //   const response = await axios.put(
  //     `${this.shopifyUrl}/products/${productId}.json`,
  //     { product: updateData },
  //     {
  //       headers: {
  //         'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //   return response.data;
  // }

  // GraphQL決済API
  async createDraftOrder(productId: string, quantity: number) {
    const mutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
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
        lineItems: [
          {
            variantId: `gid://shopify/ProductVariant/${productId}`,
            quantity: quantity,
          },
        ],
        useCustomerDefaultAddress: true,
      },
    };

    try {
      const response = await axios.post(
        this.shopifyUrl,
        { query: mutation, variables },
        { headers: this.headers },
      );

      console.log(
        'Shopify GraphQL Response:',
        JSON.stringify(response.data, null, 2),
      );

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Shopify API');
      }

      const draftOrderData = response.data.data.draftOrderCreate;

      if (!draftOrderData || draftOrderData.userErrors.length) {
        console.error('Shopify GraphQL Error:', draftOrderData.userErrors);
        throw new Error(
          draftOrderData.userErrors.map((err) => err.message).join(', '),
        );
      }

      return draftOrderData.draftOrder.invoiceUrl; // ここで支払いURLを取得
    } catch (error) {
      console.error('Shopify API Error:', error);
      throw new Error('Failed to create draft order');
    }
  }

  async handleOrderWebhook(orderData: any) {
    const pointsEarned = orderData.line_items.reduce((acc, item) => {
      if (item.sku.startsWith('point_')) {
        return acc + parseInt(item.sku.replace('point_', ''));
      }
      return acc;
    }, 0);
    if (pointsEarned > 0) {
      console.log(`ポイント付与: ${pointsEarned}ポイント`);
      // DBにユーザー情報にポイントを保存
    }
  }

  async handleDraftOrderDelete(payload: any) {
    console.log(`Draft Order Deleted: ${JSON.stringify(payload)}`);
    // const draftOrderId = payload.id;
    const lineItems = payload.line_items || [];
    const points = lineItems.reduce((sum, item) => {
      const itemPoints = item.properties?.['ポイント変換値'] || 0;
      return sum + itemPoints;
    }, 0);

    const userId = payload.customer?.id;
    console.log(`userID: ${userId}, Point: ${points}`);

    if (userId && points > 0) {
      await this.addPointsToUser(userId, points);
    }
    return { message: 'Webhook processed successfully' };
  }

  async addPointsToUser(userId: number, points: number) {
    // データベースの処理
    console.log(`${userId}に${points}付与`);
  }
}
