/**
 * Supadata Transcript Adapter
 *
 * Transcribes social media videos (YouTube, TikTok, Instagram, X/Twitter, Facebook)
 * using the Supadata API (https://supadata.ai).
 *
 * Supports both synchronous (short videos) and async job-based (long videos) flows.
 */

const SUPADATA_BASE = "https://api.supadata.ai/v1";

export interface TranscriptChunk {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

export interface TranscriptResult {
  /** Full plain-text transcript */
  content: string;
  /** Detected language */
  lang: string;
  /** Available languages */
  availableLangs: string[];
  /** Timestamped chunks (when requested) */
  chunks?: TranscriptChunk[];
  /** Source URL that was transcribed */
  sourceUrl: string;
  /** Whether this came from a polled job */
  async: boolean;
}

export interface TranscriptOptions {
  /** Preferred language (ISO 639-1) */
  lang?: string;
  /** Return plain text (true) or timestamped chunks (false) */
  text?: boolean;
  /** Max characters per chunk */
  chunkSize?: number;
  /** native | generate | auto */
  mode?: "native" | "generate" | "auto";
}

export class SupadataAdapter {
  constructor(private apiKey: string) {}

  /**
   * Transcribe a video URL. Returns the transcript text.
   * For videos >20min, polls the job endpoint until complete.
   */
  async transcribe(
    url: string,
    options: TranscriptOptions = {},
  ): Promise<TranscriptResult> {
    const params = new URLSearchParams({ url });
    if (options.lang) params.set("lang", options.lang);
    if (options.text !== undefined) params.set("text", String(options.text));
    if (options.chunkSize) params.set("chunkSize", String(options.chunkSize));
    if (options.mode) params.set("mode", options.mode);

    // Default to plain text for simpler output
    if (options.text === undefined) params.set("text", "true");

    const res = await fetch(`${SUPADATA_BASE}/transcript?${params}`, {
      headers: { "x-api-key": this.apiKey },
    });

    // Async job for long videos
    if (res.status === 202) {
      const { jobId } = await res.json();
      console.log(`[supadata] Long video, polling job ${jobId}`);
      return this.pollJob(jobId, url);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supadata ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return {
      content: data.content || "",
      lang: data.lang || "en",
      availableLangs: data.availableLangs || [],
      chunks: data.chunks,
      sourceUrl: url,
      async: false,
    };
  }

  /**
   * Poll a job until it completes or fails. Timeout after 5 minutes.
   */
  private async pollJob(jobId: string, sourceUrl: string): Promise<TranscriptResult> {
    const maxAttempts = 300; // 5 minutes at 1s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await sleep(1000);

      const res = await fetch(`${SUPADATA_BASE}/transcript/${jobId}`, {
        headers: { "x-api-key": this.apiKey },
      });

      if (!res.ok) {
        throw new Error(`Supadata job poll ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      if (data.status === "completed") {
        return {
          content: data.content || "",
          lang: data.lang || "en",
          availableLangs: data.availableLangs || [],
          chunks: data.chunks,
          sourceUrl,
          async: true,
        };
      }

      if (data.status === "failed") {
        throw new Error(`Supadata job failed: ${data.error || "unknown"}`);
      }

      // still queued or active, continue polling
    }

    throw new Error("Supadata job timed out after 5 minutes");
  }

  /**
   * Check if a URL is a supported social media video link.
   */
  static isSupportedUrl(url: string): boolean {
    const supported = [
      "youtube.com",
      "youtu.be",
      "tiktok.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "facebook.com",
      "fb.watch",
    ];
    try {
      const host = new URL(url).hostname.replace("www.", "");
      return supported.some((d) => host.includes(d));
    } catch {
      return false;
    }
  }

  /**
   * Detect the platform from a URL.
   */
  static detectPlatform(url: string): string {
    try {
      const host = new URL(url).hostname.replace("www.", "").toLowerCase();
      if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
      if (host.includes("tiktok")) return "tiktok";
      if (host.includes("instagram")) return "instagram";
      if (host.includes("twitter") || host.includes("x.com")) return "x";
      if (host.includes("facebook") || host.includes("fb.watch")) return "facebook";
    } catch {}
    return "unknown";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
