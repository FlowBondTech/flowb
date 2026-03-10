/**
 * Business project notification stubs.
 * Dispatches notifications to Telegram channels for biz project events.
 */

export async function notifyBizChannel(
  project: { tg_channel_id?: string | null; name?: string | null; slug?: string | null },
  event: string,
  data: Record<string, any>,
): Promise<void> {
  // TODO: implement TG channel notification for biz projects
  console.log(`[biz-notifications] ${project.slug}: ${event}`, data);
}
