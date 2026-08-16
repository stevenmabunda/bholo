'use server';

import { createClient } from '@/lib/supabase/server';
import { formatTimestamp } from '@/lib/utils';

export type NotificationType = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  postId?: string;
  postContentSnippet?: string;
  createdAt: Date;
  read: boolean;
  formattedTimestamp: string;
};

export async function getNotifications(userId: string): Promise<NotificationType[]> {
  if (!userId) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*, from_user:profiles!notifications_from_user_id_fkey(display_name, photo_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    // Notifications are never pruned, so this grows for the life of an
    // account. Newest-first means an explicit bound drops the oldest rather
    // than PostgREST's silent cap hiding recent activity.
    .limit(100);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    return {
      id: row.id,
      type: row.type,
      fromUserId: row.from_user_id,
      fromUserName: row.from_user?.display_name || 'User',
      fromUserAvatar: row.from_user?.photo_url || 'https://placehold.co/40x40.png',
      postId: row.post_id ?? undefined,
      postContentSnippet: row.content_snippet ?? undefined,
      read: row.read,
      createdAt,
      formattedTimestamp: formatTimestamp(createdAt),
    } as NotificationType;
  });
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error("Error fetching unread notifications count:", error);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationsAsRead(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false };
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error("Error marking notifications as read:", error);
    return { success: false };
  }
  return { success: true };
}
