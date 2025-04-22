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
    const inviteCode = String(webhookData.note);

    try {
      // 1. 顧客情報をPrismaを使用してデータベースに保存
      await this.createCustomer(customerId, gachaPoints, rewardPoints);

      // 2. 紹介コードが存在する場合の処理
      if (inviteCode) {
        // 紹介コードの検証
        const validationResult = await this.validateInviteCode(inviteCode);
        if (!validationResult.success) {
          console.log(
            `紹介コードの検証に失敗しました: ${validationResult.error}`,
          );
          return;
        }

        // 紹介コードのポイント値を取得
        // const { invite_point_value } =
        //   await this.getInviteCodeValue('7574722347091');
        // console.log('[getInviteCodeValue]:', invite_point_value);

        // 紹介コードを使用してポイントを付与
        await this.useInviteCode(customerId, { inviteCode });
        console.log(`顧客 ${customerId} に ポイントを付与しました`);
      }

      return { success: true };
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

  // 設定用商品から紹介ポイントを取得
  async getInviteCodeValue(productId: string) {
    try {
      const query = `
        {
          product(id: "gid://shopify/Product/${productId}") {
            metafield(namespace: "custom", key: "invite_point_value") {
              value
            }
          }
        }
      `;

      const response = await axios.post(
        this.shopifyUrl,
        { query },
        { headers: this.headers },
      );

      if (response.status !== 200) {
        throw new Error(
          `Shopify API request failed with status ${response.status}`,
        );
      }

      const metafield = response.data.data.product.metafield;

      if (!metafield) {
        console.warn(`メタフィールドが見つかりません: productId=${productId}`);
        return { invite_point_value: 0 };
      }

      return { invite_point_value: Number(metafield.value) || 0 };
    } catch (error) {
      console.error('メタフィールドの取得に失敗しました:', error);
      return { invite_point_value: 0 };
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

  async useInviteCode(id: string, body: { inviteCode: string }) {
    if (!body.inviteCode) {
      throw new Error('招待コードが指定されていません');
    }

    const codeToUse = body.inviteCode;

    // 紹介コードのポイント値を取得
    const { invite_point_value } =
      await this.getInviteCodeValue('7574722347091');
    const amount = invite_point_value;

    console.log(
      `[useInviteCode] 顧客ID: ${id}, 使用する紹介コード: ${codeToUse}`,
    );

    // 紹介コードを検索（コード自体を検索）
    const foundInviteCode = await this.prisma.inviteCode.findFirst({
      where: {
        code: codeToUse,
        isActive: true,
      },
      include: {
        customer: true, // 紹介コードを発行した顧客の情報も取得
      },
    });

    if (!foundInviteCode) {
      console.error(`[useInviteCode] 紹介コードが見つかりません: ${codeToUse}`);
      throw new Error('Invite code not found');
    }

    if (foundInviteCode.maxUses <= foundInviteCode.currentUses) {
      console.error(
        `[useInviteCode] 紹介コードの使用回数上限に達しています: ${codeToUse}`,
      );
      throw new Error('Invite code has reached its maximum usage');
    }

    if (foundInviteCode.expiresAt < new Date()) {
      console.error(
        `[useInviteCode] 紹介コードの有効期限が切れています: ${codeToUse}`,
      );
      throw new Error('Invite code has expired');
    }

    // 紹介コードを発行した顧客（紹介者）の情報を取得
    const referrer = foundInviteCode.customer;

    // 紹介コードを使用する顧客（被紹介者）の情報を取得
    const referee = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!referee) {
      console.error(`[useInviteCode] 顧客が見つかりません: ${id}`);
      throw new Error('Customer not found');
    }

    // トランザクションで一括処理
    await this.prisma.$transaction(async (prisma) => {
      // 1. 紹介コードの使用回数を更新
      await prisma.inviteCode.update({
        where: { id: foundInviteCode.id },
        data: {
          currentUses: foundInviteCode.currentUses + 1,
        },
      });

      // 2. 被紹介者（招待された側）にポイントを付与
      await prisma.customer.update({
        where: { id },
        data: {
          gachaPoints: referee.gachaPoints + amount,
        },
      });

      // 3. 紹介者（招待した側）にポイントを付与
      await prisma.customer.update({
        where: { id: referrer.id },
        data: {
          gachaPoints: referrer.gachaPoints + amount,
        },
      });

      // 4. 被紹介者のポイント取引履歴を記録
      await prisma.gachaPointTransaction.create({
        data: {
          customerId: id,
          amount: amount,
          description: '招待コード利用（被紹介者）',
          orderId: '',
          balanceAtTransaction: referee.gachaPoints + amount,
        },
      });

      // 5. 紹介者のポイント取引履歴を記録
      await prisma.gachaPointTransaction.create({
        data: {
          customerId: referrer.id,
          amount: amount,
          description: '招待コード利用（紹介者）',
          orderId: '',
          balanceAtTransaction: referrer.gachaPoints + amount,
        },
      });
    });

    console.log(
      `[useInviteCode] ポイント付与完了: 被紹介者 ${id} と紹介者 ${referrer.id} に ${amount} ポイントを付与`,
    );
    return { success: true };
  }

  async validateInviteCode(code: string) {
    const inviteCode = await this.prisma.inviteCode.findUnique({
      where: {
        code: code,
      },
    });
    if (!inviteCode) {
      return { success: false, error: 'Invite code not found' };
    }
    if (inviteCode.isActive === false) {
      return { success: false, error: 'Invite code is not active' };
    }
    if (inviteCode.expiresAt < new Date()) {
      return { success: false, error: 'Invite code has expired' };
    }
    if (inviteCode.maxUses <= inviteCode.currentUses) {
      return {
        success: false,
        error: 'Invite code has reached its maximum usage',
      };
    }
    return { success: true, inviteCode };
  }
}
