import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  private shopifyUrl = `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2025-01/graphql.json`;
  private headers = {
    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  };

  constructor(private readonly prisma: PrismaService) {}

  // GraphQL顧客情報取得
  async getCustomers() {
    const query = `
    {
      customers(first: 10) {
        edges {
          node {
            id
            firstName
            lastName
            email
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
    return response.data.data.customers.edges.map((edge) => edge.node);
  }

  // REST API顧客情報取得;
  // async getCustomers() {
  //   const response = await axios.get(`${this.shopifyUrl}/customers.json`, {
  //     headers: {
  //       'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  //     },
  //   });
  //   return response.data;
  // }

  // GraphQL顧客情報更新
  async updateCustomer(customerId: string, updateData: any) {
    const mutation = `
    mutation updateCustomer($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          firstName
          lastName
          email
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
        id: `gid://shopify/Customer/${customerId}`,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email,
      },
    };

    const response = await axios.post(
      this.shopifyUrl,
      { query: mutation, variables },
      { headers: this.headers },
    );

    if (response.data.data.customerUpdate.userErrors.length) {
      throw new Error(response.data.data.customerUpdate.userErrors[0].message);
    }

    return response.data.data.customerUpdate.customer;
  }

  // REST API顧客情報更新
  // async updateCustomer(customerId: number, updateData: any) {
  //   const response = await axios.put(
  //     `${this.shopifyUrl}/customers/${customerId}.json`,
  //     { customer: updateData },
  //     {
  //       headers: {
  //         'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //   return response.data;
  // }

  async processCustomerCreateWebhook(webhookData: any) {
    console.log(
      `webhookData in processCustomerCreateWebhook: ${JSON.stringify(
        webhookData,
      )}`,
    );
    const customerId = String(webhookData.id);
    const rewardPoints = 0;
    const gachaPoints = 0;

    // 顧客情報をPrismaを使用してデータベースに保存
    try {
      await this.prisma.customer.create({
        data: {
          id: customerId,
          gachaPoints: gachaPoints,
          rewardPoints: rewardPoints,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        },
      });
    } catch (error: any) {
      // 既に存在する場合のエラーハンドリング
      if (error.code === 'P2002') {
        // Prismaの一意制約違反エラーコード
        console.log(`顧客ID ${customerId} は既に存在します`);
      } else {
        console.log(`error in processCustomerCreateWebhook: ${error}`);
        throw error;
      }
    }
  }
}
