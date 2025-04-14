import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Customer } from '@prisma/client';
import axios from 'axios';

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

  async getCustomer(id: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

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

    try {
      const response = await axios.post(
        this.shopifyUrl,
        { query: mutation, variables },
        { headers: this.headers },
      );

      if (response.data.data.customerUpdate.userErrors.length) {
        throw new Error(
          response.data.data.customerUpdate.userErrors[0].message,
        );
      }

      return response.data.data.customerUpdate.customer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
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
      await this.createCustomer(customerId, gachaPoints, rewardPoints);
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

  async createCustomer(
    customerId: string,
    gachaPoints: number = 0,
    rewardPoints: number = 0,
  ): Promise<Customer> {
    // 招待コードを生成
    const inviteCode = await this.generateUniqueInviteCode();

    // 顧客を作成
    const customer = await this.prisma.customer.create({
      data: {
        id: customerId,
        gachaPoints: gachaPoints,
        rewardPoints: rewardPoints,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        // 招待コードも同時に作成
        inviteCodes: {
          create: {
            code: inviteCode,
            maxUses: 10,
            currentUses: 0,
            isActive: true,
            // デフォルトで半年の有効期限を設定
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        inviteCodes: true,
      },
    });

    return customer;
  }

  // 一意な招待コードを生成するメソッド
  private async generateUniqueInviteCode(length: number = 8): Promise<string> {
    // 最大10回試行
    for (let i = 0; i < 10; i++) {
      // ランダムな文字列を生成（英数字のみ）
      const code = this.generateRandomString(length);

      // 既存の招待コードと重複していないか確認
      const existingCode = await this.prisma.inviteCode.findUnique({
        where: { code },
      });

      // 重複していなければそのコードを返す
      if (!existingCode) {
        return code;
      }
    }

    // 10回試行しても重複が解消されない場合は、長さを増やして再試行
    return this.generateUniqueInviteCode(length + 1);
  }

  // ランダムな文字列を生成するメソッド
  private generateRandomString(length: number): string {
    // 使用する文字（英数字のみ）
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    // 指定された長さのランダムな文字列を生成
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }

    return result;
  }

  async getInviteCode(id: string) {
    const inviteCode = await this.prisma.inviteCode.findFirst({
      where: {
        customerId: id,
        isActive: true,
      },
    });
    return inviteCode;
  }

  async useInviteCode(id: string, body: any) {
    const { inviteCode: codeToUse } = body;
    const amount = 100;
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        inviteCodes: true,
      },
    });
    if (!customer) {
      throw new Error('Customer not found');
    }
    const foundInviteCode = customer.inviteCodes.find(
      (code) => code.code === codeToUse,
    );
    if (!foundInviteCode) {
      throw new Error('Invite code not found');
    }
    if (foundInviteCode.maxUses <= foundInviteCode.currentUses) {
      throw new Error('Invite code has reached its maximum usage');
    }
    if (foundInviteCode.expiresAt < new Date()) {
      throw new Error('Invite code has expired');
    }
    await this.prisma.inviteCode.update({
      where: { id: foundInviteCode.id },
      data: {
        currentUses: foundInviteCode.currentUses + 1,
      },
    });
    await this.prisma.customer.update({
      where: { id },
      data: {
        gachaPoints: customer.gachaPoints + amount,
      },
    });
    await this.prisma.gachaPointTransaction.create({
      data: {
        customerId: id,
        amount: amount,
        description: '招待コード利用',
        orderId: '',
        balanceAtTransaction: customer.gachaPoints + amount,
      },
    });
    return { success: true };
  }
}
