/**
 * Crypto Payment Service
 * Handles USDC direct transfers, WalletConnect, and crypto swaps
 */

import { PaymentNetwork } from "./types.js";

// USDC contract addresses by network
const USDC_ADDRESSES: Record<PaymentNetwork, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
};

// RPC endpoints by network
const RPC_ENDPOINTS: Record<PaymentNetwork, string> = {
  base: "https://mainnet.base.org",
  ethereum: "https://eth.llamarpc.com",
  polygon: "https://polygon-rpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
};

// Minimum confirmations required
const MIN_CONFIRMATIONS: Record<PaymentNetwork, number> = {
  base: 1,
  ethereum: 2,
  polygon: 10,
  arbitrum: 1,
  optimism: 1,
};

interface VerifyTransactionParams {
  txHash: string;
  expectedAmount: number;
  expectedRecipient: string;
  network: PaymentNetwork;
}

interface TransactionDetails {
  confirmed: boolean;
  from: string;
  to: string;
  value: string;
  tokenAddress?: string;
  tokenAmount?: string;
  blockNumber: number;
  confirmations: number;
}

export class CryptoService {
  private multisigAddress: string;

  constructor(multisigAddress: string) {
    this.multisigAddress = multisigAddress.toLowerCase();
  }

  async verifyTransaction(params: VerifyTransactionParams): Promise<boolean> {
    try {
      const details = await this.getTransactionDetails(
        params.txHash,
        params.network
      );

      if (!details) return false;

      // Check confirmations
      const minConf = MIN_CONFIRMATIONS[params.network];
      if (details.confirmations < minConf) return false;

      // Check recipient
      if (details.to.toLowerCase() !== params.expectedRecipient.toLowerCase()) {
        return false;
      }

      // For USDC transfers, check token amount
      if (details.tokenAmount) {
        const receivedAmount = parseFloat(details.tokenAmount) / 1e6; // USDC has 6 decimals
        // Allow 0.1% slippage
        if (receivedAmount < params.expectedAmount * 0.999) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("[crypto] Transaction verification failed:", error);
      return false;
    }
  }

  async getTransactionDetails(
    txHash: string,
    network: PaymentNetwork
  ): Promise<TransactionDetails | null> {
    const rpcUrl = RPC_ENDPOINTS[network];

    try {
      // Get transaction receipt
      const receiptResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [txHash],
          id: 1,
        }),
      });

      const receiptData = await receiptResponse.json();
      if (!receiptData.result) return null;

      const receipt = receiptData.result;

      // Check if transaction was successful
      if (receipt.status !== "0x1") return null;

      // Get current block for confirmations
      const blockResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 2,
        }),
      });

      const blockData = await blockResponse.json();
      const currentBlock = parseInt(blockData.result, 16);
      const txBlock = parseInt(receipt.blockNumber, 16);
      const confirmations = currentBlock - txBlock;

      // Get transaction details
      const txResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionByHash",
          params: [txHash],
          id: 3,
        }),
      });

      const txData = await txResponse.json();
      if (!txData.result) return null;

      const tx = txData.result;

      // Parse USDC transfer from logs
      let tokenAmount: string | undefined;
      let actualTo = tx.to?.toLowerCase();

      const usdcAddress = USDC_ADDRESSES[network].toLowerCase();

      // Check if this is a USDC transfer
      for (const log of receipt.logs || []) {
        if (log.address.toLowerCase() === usdcAddress) {
          // ERC20 Transfer event signature
          if (
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
          ) {
            // topics[1] = from, topics[2] = to, data = amount
            actualTo = "0x" + log.topics[2].slice(26);
            tokenAmount = BigInt(log.data).toString();
          }
        }
      }

      return {
        confirmed: confirmations >= MIN_CONFIRMATIONS[network],
        from: tx.from,
        to: actualTo || tx.to,
        value: tx.value,
        tokenAddress: usdcAddress,
        tokenAmount,
        blockNumber: txBlock,
        confirmations,
      };
    } catch (error) {
      console.error("[crypto] Failed to get transaction details:", error);
      return null;
    }
  }

  async getUsdcBalance(
    address: string,
    network: PaymentNetwork
  ): Promise<number> {
    const rpcUrl = RPC_ENDPOINTS[network];
    const usdcAddress = USDC_ADDRESSES[network];

    try {
      // balanceOf(address) function selector
      const data =
        "0x70a08231000000000000000000000000" + address.slice(2).toLowerCase();

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: usdcAddress, data }, "latest"],
          id: 1,
        }),
      });

      const result = await response.json();
      if (!result.result || result.result === "0x") return 0;

      const balance = BigInt(result.result);
      return Number(balance) / 1e6; // USDC has 6 decimals
    } catch {
      return 0;
    }
  }

  getPaymentAddress(): string {
    return this.multisigAddress;
  }

  getUsdcAddress(network: PaymentNetwork): string {
    return USDC_ADDRESSES[network];
  }

  getExplorerTxUrl(txHash: string, network: PaymentNetwork): string {
    const explorers: Record<PaymentNetwork, string> = {
      base: "https://basescan.org/tx/",
      ethereum: "https://etherscan.io/tx/",
      polygon: "https://polygonscan.com/tx/",
      arbitrum: "https://arbiscan.io/tx/",
      optimism: "https://optimistic.etherscan.io/tx/",
    };
    return explorers[network] + txHash;
  }

  // Generate payment data for mobile app
  generatePaymentData(
    amount: number,
    network: PaymentNetwork
  ): {
    recipientAddress: string;
    usdcAddress: string;
    amountRaw: string;
    chainId: number;
    transferData: string;
  } {
    const chainIds: Record<PaymentNetwork, number> = {
      base: 8453,
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
    };

    const amountRaw = BigInt(Math.round(amount * 1e6)).toString();
    const usdcAddress = USDC_ADDRESSES[network];

    // Generate ERC20 transfer calldata
    // transfer(address to, uint256 amount)
    const transferSelector = "0xa9059cbb";
    const toParam = this.multisigAddress.slice(2).padStart(64, "0");
    const amountParam = BigInt(amountRaw).toString(16).padStart(64, "0");
    const transferData = transferSelector + toParam + amountParam;

    return {
      recipientAddress: this.multisigAddress,
      usdcAddress,
      amountRaw,
      chainId: chainIds[network],
      transferData,
    };
  }
}
