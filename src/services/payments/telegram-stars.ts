/**
 * Telegram Stars Payment Service
 * Handles Telegram Stars payments for mini app purchases
 */

interface CreateInvoiceParams {
  orderId: string;
  title: string;
  description: string;
  starsAmount: number;
  payload: string;
  photoUrl?: string;
}

interface InvoiceResult {
  invoiceUrl: string;
  starsAmount: number;
}

export class TelegramStarsService {
  private botToken: string | null = null;

  private getBotToken(): string {
    if (!this.botToken) {
      this.botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN || "";
      if (!this.botToken) {
        throw new Error("FLOWB_TELEGRAM_BOT_TOKEN not configured");
      }
    }
    return this.botToken;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceResult> {
    const botToken = this.getBotToken();

    // Create invoice link using Telegram Bot API
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: params.title,
          description: params.description,
          payload: params.payload,
          currency: "XTR", // Telegram Stars
          prices: [
            {
              label: params.title,
              amount: params.starsAmount,
            },
          ],
          photo_url: params.photoUrl,
          need_name: false,
          need_email: false,
          need_phone_number: false,
          need_shipping_address: false,
          is_flexible: false,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(
        `Failed to create Telegram invoice: ${data.description || "Unknown error"}`
      );
    }

    return {
      invoiceUrl: data.result,
      starsAmount: params.starsAmount,
    };
  }

  async handlePreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    errorMessage?: string
  ): Promise<boolean> {
    const botToken = this.getBotToken();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQueryId,
          ok,
          error_message: errorMessage,
        }),
      }
    );

    const data = await response.json();
    return data.ok === true;
  }

  parseSuccessfulPayment(update: any): {
    orderId: string;
    userId: string;
    totalAmount: number;
    telegramPaymentChargeId: string;
  } | null {
    try {
      const payment = update.message?.successful_payment;
      if (!payment) return null;

      const payload = JSON.parse(payment.invoice_payload);

      return {
        orderId: payload.orderId,
        userId: payload.userId,
        totalAmount: payment.total_amount, // In Stars
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
      };
    } catch {
      return null;
    }
  }

  // Convert Stars to USDC equivalent (rough conversion: 50 Stars = $1)
  starsToUsdc(stars: number): number {
    return stars / 50;
  }

  // Convert USDC to Stars
  usdcToStars(usdc: number): number {
    return Math.ceil(usdc * 50);
  }

  async refund(
    telegramPaymentChargeId: string,
    userId: number
  ): Promise<boolean> {
    const botToken = this.getBotToken();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/refundStarPayment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          telegram_payment_charge_id: telegramPaymentChargeId,
        }),
      }
    );

    const data = await response.json();
    return data.ok === true;
  }
}
