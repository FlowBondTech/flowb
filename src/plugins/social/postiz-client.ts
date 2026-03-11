/**
 * Postiz REST API Client
 *
 * Wraps the Postiz /public/v1 API for creating posts,
 * managing media, and listing connected integrations.
 *
 * Each instance is scoped to a single organization via its API key.
 */

import { log } from "../../utils/logger.js";
import type {
  PostizPost,
  PostizIntegration,
  PostizMedia,
  PostizOrg,
} from "./types.js";

export class PostizClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  // ==========================================================================
  // Posts
  // ==========================================================================

  /**
   * Create and publish a post to selected integrations.
   * If scheduleDate is provided, the post is scheduled instead.
   */
  async createPost(
    integrationIds: string[],
    content: string,
    mediaIds?: string[],
    scheduleDate?: string,
  ): Promise<PostizPost | null> {
    const body: Record<string, any> = {
      integration: integrationIds,
      content,
      type: "post",
    };
    if (mediaIds?.length) body.media = mediaIds;
    if (scheduleDate) body.publishDate = scheduleDate;

    return this.request<PostizPost>("POST", "/posts", body);
  }

  /**
   * List posts, optionally filtered by date range.
   */
  async listPosts(startDate?: string, endDate?: string): Promise<PostizPost[]> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const query = params.toString();
    const path = query ? `/posts?${query}` : "/posts";
    return (await this.request<PostizPost[]>("GET", path)) || [];
  }

  /**
   * Delete a post by ID.
   */
  async deletePost(id: string): Promise<boolean> {
    const res = await this.rawRequest("DELETE", `/posts/${id}`);
    return res?.ok ?? false;
  }

  // ==========================================================================
  // Media
  // ==========================================================================

  /**
   * Upload a media file buffer to Postiz.
   */
  async uploadMedia(file: Buffer, filename: string): Promise<PostizMedia | null> {
    try {
      const formData = new FormData();
      const blob = new Blob([file]);
      formData.append("file", blob, filename);

      const res = await fetch(`${this.baseUrl}/public/v1/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        log.warn("[postiz]", `uploadMedia failed: ${res.status}`, { filename });
        return null;
      }
      return res.json() as Promise<PostizMedia>;
    } catch (err) {
      log.error("[postiz]", "uploadMedia error", { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  /**
   * Upload media from a URL.
   */
  async uploadMediaFromUrl(url: string): Promise<PostizMedia | null> {
    return this.request<PostizMedia>("POST", "/media/upload-url", { url });
  }

  // ==========================================================================
  // Integrations (connected social accounts)
  // ==========================================================================

  /**
   * List all connected integrations (social accounts) for this org.
   */
  async listIntegrations(): Promise<PostizIntegration[]> {
    return (await this.request<PostizIntegration[]>("GET", "/integrations")) || [];
  }

  // ==========================================================================
  // Scheduling
  // ==========================================================================

  /**
   * Find the next optimal posting slot for an integration.
   */
  async findOptimalSlot(integrationId: string): Promise<string | null> {
    const result = await this.request<{ date: string }>("GET", `/integrations/${integrationId}/time`);
    return result?.date || null;
  }

  // ==========================================================================
  // Organizations (admin-level, uses master API key)
  // ==========================================================================

  /**
   * Create a new organization in Postiz.
   * Only works with master/admin API key.
   */
  async createOrganization(name: string): Promise<PostizOrg | null> {
    return this.request<PostizOrg>("POST", "/organizations", { name });
  }

  // ==========================================================================
  // Internal
  // ==========================================================================

  private async request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const res = await this.rawRequest(method, path, body);
    if (!res || !res.ok) return null;
    return res.json() as Promise<T>;
  }

  private async rawRequest(method: string, path: string, body?: unknown): Promise<Response | null> {
    try {
      const url = `${this.baseUrl}/public/v1${path}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        log.warn("[postiz]", `${method} ${path} failed: ${res.status}`, { response: text.slice(0, 200) });
      }

      return res;
    } catch (err) {
      log.error("[postiz]", `${method} ${path} error`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
