/**
 * Website Chat Tool Executors — FlowB EC
 *
 * TEMPORARILY DISABLED: This feature is not fully implemented.
 * All functions return "not available" messages.
 */

import type { SbConfig } from "../utils/supabase.js";
import type { BizUserContext } from "./chat-tools-biz.js";

const notAvailable = async (): Promise<string> =>
  "This feature is not yet available. Check back soon!";

// Site Management
export const siteList = notAvailable;
export const siteStatus = notAvailable;
export const siteRebuild = notAvailable;
export const siteActivity = notAvailable;

// Product Tools
export const siteListProducts = notAvailable;
export const siteAddProduct = notAvailable;
export const siteUpdateProduct = notAvailable;
export const siteDeleteProduct = notAvailable;

// Article Tools
export const siteListArticles = notAvailable;
export const siteCreateArticle = notAvailable;
export const siteUpdateArticle = notAvailable;
export const siteScheduleArticle = notAvailable;
export const sitePublishArticle = notAvailable;

// SEO Tools
export const siteSeoStatus = notAvailable;
export const siteSeoCheckArticle = notAvailable;
export const siteSeoSuggestions = notAvailable;

// Stripe E-commerce Tools
export const stripeListProducts = notAvailable;
export const stripeCreateCheckout = notAvailable;
export const stripeListOrders = notAvailable;
export const stripeRefund = notAvailable;
export const stripeRevenue = notAvailable;
export const stripeSyncProducts = notAvailable;
