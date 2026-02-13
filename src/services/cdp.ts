/**
 * Coinbase CDP REST API v2 client for Base network
 * Zero npm deps - uses Node.js crypto + fetch
 *
 * Env:
 *   CDP_API_KEY_NAME        - API key name (UUID)
 *   CDP_API_KEY_PRIVATE_KEY - API key private key (PEM or raw base64)
 *   CDP_WALLET_SECRET       - Wallet secret for signing (base64 DER EC key)
 *   CDP_ACCOUNT_ADDRESS     - Default sender address
 */

import crypto from "node:crypto";

const CDP_BASE = "https://api.cdp.coinbase.com/platform";
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// ============================================================================
// Types
// ============================================================================

export interface CDPConfig {
  apiKeyName: string;
  apiKeyPrivateKey: string;
  walletSecret: string;
  accountAddress: string;
}

export interface SendResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface BalanceEntry {
  symbol: string;
  amount: string;
  decimals: number;
}

export interface SwapPriceResult {
  buyAmount: string;
  sellAmount: string;
  price: string;
  buyToken: string;
  sellToken: string;
  estimatedGas?: string;
}

export interface SwapQuote {
  buyAmount: string;
  sellAmount: string;
  price: string;
  buyToken: string;
  sellToken: string;
  allowanceTarget?: string;
  transaction?: {
    to: string;
    data: string;
    value: string;
    gas: string;
  };
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  buyAmount?: string;
  sellAmount?: string;
  error?: string;
}

// Well-known token addresses on Base
export const WETH_BASE = "0x4200000000000000000000000000000000000006";
export const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const DEGEN_BASE = "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed";

// ============================================================================
// Key Parsing
// ============================================================================

function parseApiKey(keyStr: string): { key: crypto.KeyObject; algorithm: string } {
  const trimmed = keyStr.trim().replace(/\\n/g, "\n");

  if (trimmed.startsWith("-----BEGIN")) {
    return {
      key: crypto.createPrivateKey({ key: trimmed, format: "pem" }),
      algorithm: "ES256",
    };
  }

  const raw = Buffer.from(trimmed, "base64");
  if (raw.length === 64) {
    const seed = raw.slice(0, 32);
    const pubKey = raw.slice(32, 64);
    try {
      const key = crypto.createPrivateKey({
        key: {
          kty: "OKP",
          crv: "Ed25519",
          d: seed.toString("base64url"),
          x: pubKey.toString("base64url"),
        },
        format: "jwk",
      });
      const derived = crypto.createPublicKey(key).export({ format: "jwk" });
      if (Buffer.from(derived.x!, "base64url").equals(pubKey)) {
        return { key, algorithm: "EdDSA" };
      }
    } catch {
      /* not Ed25519 */
    }
  }

  throw new Error(`Unsupported CDP API key format (${raw.length} bytes)`);
}

// ============================================================================
// JWT Generation
// ============================================================================

function randomNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function createApiJWT(
  privateKey: crypto.KeyObject,
  algorithm: string,
  keyName: string,
  method: string,
  url: string,
): string {
  const urlObj = new URL(url);
  const uri = `${method} ${urlObj.host}${urlObj.pathname}`;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: algorithm, kid: keyName, typ: "JWT", nonce: randomNonce() };
  const claims = {
    sub: keyName,
    iss: "cdp",
    aud: ["cdp_service"],
    nbf: now,
    exp: now + 120,
    uris: [uri],
  };

  const b64h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64p = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sigInput = `${b64h}.${b64p}`;

  let sig: string;
  if (algorithm === "EdDSA") {
    sig = crypto.sign(null, Buffer.from(sigInput), privateKey).toString("base64url");
  } else {
    sig = crypto
      .sign("SHA256", Buffer.from(sigInput), { key: privateKey, dsaEncoding: "ieee-p1363" })
      .toString("base64url");
  }

  return `${sigInput}.${sig}`;
}

function sortKeys(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.keys(obj)
    .sort()
    .reduce((acc: any, k: string) => {
      acc[k] = sortKeys(obj[k]);
      return acc;
    }, {});
}

function createWalletAuthJWT(
  walletSecret: string,
  method: string,
  url: string,
  body?: Record<string, any>,
): string {
  const urlObj = new URL(url);
  const uri = `${method} ${urlObj.host}${urlObj.pathname}`;
  const now = Math.floor(Date.now() / 1000);

  const claims: Record<string, any> = { uris: [uri] };

  if (body && Object.keys(body).length > 0) {
    const sorted = sortKeys(body);
    const hash = crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
    claims.reqHash = hash;
  }

  const derBuf = Buffer.from(walletSecret, "base64");
  const pem = `-----BEGIN PRIVATE KEY-----\n${derBuf
    .toString("base64")
    .match(/.{1,64}/g)!
    .join("\n")}\n-----END PRIVATE KEY-----`;
  const ecKey = crypto.createPrivateKey({ key: pem, format: "pem" });

  const header = { alg: "ES256", typ: "JWT" };
  const b64h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payload = { ...claims, iat: now, nbf: now, jti: randomNonce() };
  const b64p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sigInput = `${b64h}.${b64p}`;

  const sig = crypto
    .sign("SHA256", Buffer.from(sigInput), { key: ecKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");

  return `${sigInput}.${sig}`;
}

// ============================================================================
// CDP API Fetch
// ============================================================================

function needsWalletAuth(method: string, path: string): boolean {
  return (
    (path.includes("/accounts") || path.includes("/spend-permissions")) &&
    (method === "POST" || method === "PUT" || method === "DELETE")
  );
}

async function cdpFetch(
  apiKey: crypto.KeyObject,
  apiAlg: string,
  keyName: string,
  walletSecret: string,
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const url = `${CDP_BASE}${path}`;
  const jwt = createApiJWT(apiKey, apiAlg, keyName, method, url);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };

  if (needsWalletAuth(method, path)) {
    headers["X-Wallet-Auth"] = createWalletAuthJWT(walletSecret, method, url, body || {});
  }

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`CDP ${method} ${path} -> ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ============================================================================
// RLP Encoding (minimal, for EIP-1559)
// ============================================================================

function rlpEncode(input: Buffer | Buffer[]): Buffer {
  if (Buffer.isBuffer(input)) {
    if (input.length === 1 && input[0] < 0x80) return input;
    if (input.length <= 55) return Buffer.concat([Buffer.from([0x80 + input.length]), input]);
    const lenBuf = intToMinBuf(input.length);
    return Buffer.concat([Buffer.from([0xb7 + lenBuf.length]), lenBuf, input]);
  }
  if (Array.isArray(input)) {
    const encoded = Buffer.concat(input.map(rlpEncode));
    if (encoded.length <= 55) return Buffer.concat([Buffer.from([0xc0 + encoded.length]), encoded]);
    const lenBuf = intToMinBuf(encoded.length);
    return Buffer.concat([Buffer.from([0xf7 + lenBuf.length]), lenBuf, encoded]);
  }
  throw new Error("RLP: unsupported type");
}

function intToMinBuf(n: number): Buffer {
  if (n === 0) return Buffer.alloc(0);
  const hex = n.toString(16);
  return Buffer.from(hex.length % 2 ? "0" + hex : hex, "hex");
}

function hexToRlpBuf(hex: string | null): Buffer {
  if (!hex || hex === "0x" || hex === "0x0") return Buffer.alloc(0);
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean === "" || clean === "0" || clean === "00") return Buffer.alloc(0);
  const padded = clean.length % 2 ? "0" + clean : clean;
  const buf = Buffer.from(padded, "hex");
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  return buf.slice(i);
}

function encodeERC20Transfer(to: string, amountAtomic: string): string {
  const selector = "a9059cbb";
  const addr = to.replace("0x", "").toLowerCase().padStart(64, "0");
  const amt = BigInt(amountAtomic).toString(16).padStart(64, "0");
  return "0x" + selector + addr + amt;
}

function serializeEIP1559Tx(params: { to: string; data: string; value?: string | null }): string {
  const fields: (Buffer | Buffer[])[] = [
    hexToRlpBuf("0x2105"), // Base chainId = 8453
    Buffer.alloc(0),
    Buffer.alloc(0),
    Buffer.alloc(0),
    Buffer.alloc(0),
    Buffer.from(params.to.replace("0x", ""), "hex"),
    params.value ? hexToRlpBuf(params.value) : Buffer.alloc(0),
    Buffer.from(params.data.replace("0x", ""), "hex"),
    [],
  ];
  const encoded = rlpEncode(fields as any);
  return "0x02" + encoded.toString("hex");
}

// ============================================================================
// Public CDP Client
// ============================================================================

export class CDPClient {
  private apiKey: crypto.KeyObject;
  private apiAlg: string;
  private keyName: string;
  private walletSecret: string;
  private accountAddress: string;

  constructor(config: CDPConfig) {
    const parsed = parseApiKey(config.apiKeyPrivateKey);
    this.apiKey = parsed.key;
    this.apiAlg = parsed.algorithm;
    this.keyName = config.apiKeyName;
    this.walletSecret = config.walletSecret;
    this.accountAddress = config.accountAddress;
  }

  async sendUSDC(recipient: string, amount: number): Promise<SendResult> {
    try {
      const atomicAmount = Math.round(amount * 1e6).toString();
      const calldata = encodeERC20Transfer(recipient, atomicAmount);
      const txHex = serializeEIP1559Tx({ to: USDC_BASE, data: calldata });

      const result = await cdpFetch(
        this.apiKey,
        this.apiAlg,
        this.keyName,
        this.walletSecret,
        "POST",
        `/v2/evm/accounts/${this.accountAddress}/send/transaction`,
        { transaction: txHex, network: "base" },
      );

      if (result.transactionHash) {
        console.log(`[cdp] USDC sent: ${amount} to ${recipient} tx=${result.transactionHash}`);
        return { success: true, txHash: result.transactionHash };
      }
      return { success: false, error: "No transaction hash returned" };
    } catch (err: any) {
      console.error("[cdp] sendUSDC error:", err.message);
      return { success: false, error: err.message };
    }
  }

  async getBalance(): Promise<BalanceEntry[]> {
    const result = await cdpFetch(
      this.apiKey,
      this.apiAlg,
      this.keyName,
      this.walletSecret,
      "GET",
      `/v2/evm/token-balances/base/${this.accountAddress}`,
    );

    if (!result.balances?.length) return [];
    return result.balances.map((b: any) => ({
      symbol: b.token?.symbol || "unknown",
      amount: b.amount?.amount || "0",
      decimals: b.amount?.decimals || 0,
    }));
  }

  async createAccount(): Promise<string> {
    const account = await cdpFetch(
      this.apiKey,
      this.apiAlg,
      this.keyName,
      this.walletSecret,
      "POST",
      "/v2/evm/accounts",
      {},
    );
    console.log(`[cdp] New account created: ${account.address}`);
    return account.address;
  }

  /**
   * Get indicative swap price (read-only, no wallet auth needed).
   * Uses CDP swap/price endpoint (0x aggregator under the hood).
   */
  async getSwapPrice(
    sellToken: string,
    buyToken: string,
    sellAmount: string,
  ): Promise<SwapPriceResult> {
    const params = new URLSearchParams({
      sellToken,
      buyToken,
      sellAmount,
      network: "base",
    });

    const result = await cdpFetch(
      this.apiKey,
      this.apiAlg,
      this.keyName,
      this.walletSecret,
      "GET",
      `/v2/evm/swap/price?${params.toString()}`,
    );

    return {
      buyAmount: result.buyAmount || "0",
      sellAmount: result.sellAmount || sellAmount,
      price: result.price || "0",
      buyToken: result.buyTokenAddress || buyToken,
      sellToken: result.sellTokenAddress || sellToken,
      estimatedGas: result.estimatedGas,
    };
  }

  /**
   * Get a firm swap quote with transaction data.
   */
  async getSwapQuote(
    sellToken: string,
    buyToken: string,
    sellAmount: string,
    slippageBps: number = 100,
  ): Promise<SwapQuote> {
    const result = await cdpFetch(
      this.apiKey,
      this.apiAlg,
      this.keyName,
      this.walletSecret,
      "POST",
      "/v2/evm/swap/quote",
      {
        sellToken,
        buyToken,
        sellAmount,
        slippagePercentage: (slippageBps / 10000).toString(),
        network: "base",
        takerAddress: this.accountAddress,
      },
    );

    return {
      buyAmount: result.buyAmount || "0",
      sellAmount: result.sellAmount || sellAmount,
      price: result.price || "0",
      buyToken: result.buyTokenAddress || buyToken,
      sellToken: result.sellTokenAddress || sellToken,
      allowanceTarget: result.allowanceTarget,
      transaction: result.transaction,
    };
  }

  /**
   * Execute a token swap via CDP account swap endpoint.
   * This requires X-Wallet-Auth (write operation on accounts path).
   */
  async executeSwap(
    sellToken: string,
    buyToken: string,
    sellAmount: string,
    slippageBps: number = 100,
  ): Promise<SwapResult> {
    try {
      const result = await cdpFetch(
        this.apiKey,
        this.apiAlg,
        this.keyName,
        this.walletSecret,
        "POST",
        `/v2/evm/accounts/${this.accountAddress}/swap`,
        {
          sellToken,
          buyToken,
          sellAmount,
          slippagePercentage: (slippageBps / 10000).toString(),
          network: "base",
        },
      );

      if (result.transactionHash) {
        console.log(`[cdp] Swap executed: ${sellToken} -> ${buyToken}, tx=${result.transactionHash}`);
        return {
          success: true,
          txHash: result.transactionHash,
          buyAmount: result.buyAmount,
          sellAmount: result.sellAmount,
        };
      }

      return { success: false, error: "No transaction hash returned" };
    } catch (err: any) {
      console.error("[cdp] executeSwap error:", err.message);
      return { success: false, error: err.message };
    }
  }

  get address(): string {
    return this.accountAddress;
  }
}
