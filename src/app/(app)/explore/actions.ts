
'use server';

import {
  generateTrendingTopics,
  type GenerateTrendingTopicsOutput,
} from '@/ai/flows/generate-trending-topics';
import { createClient } from '@/lib/supabase/server';

/**
 * The most-mentioned topics of the last 72 hours, counted by Postgres.
 *
 * This used to select every topic row in the window and tally them in JS.
 * PostgREST caps a response at 1000 rows, and the query passed no limit and no
 * ordering — so once the window held more than 1000 rows the action silently
 * received only the first 1000, which without an ORDER BY is effectively the
 * oldest. The counts froze at that moment: rows kept being written for every
 * new post and not one of them was ever counted again.
 */
async function popularTopics(limit: number): Promise<{ topic: string; count: number }[]> {
  const supabase = await createClient();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc('trending_topics', {
    since: seventyTwoHoursAgo,
    min_count: 2,
    max_topics: limit,
  });

  if (error) {
    console.error('Error fetching trending topics:', error);
    return [];
  }

  return (data ?? []).map((row: { topic: string; post_count: number }) => ({
    topic: row.topic,
    count: Number(row.post_count),
  }));
}

export async function getTrendingTopics(
  // @ts-ignore - next doesn't like passing objects with optional props through server actions
  input: { numberOfTopics?: number }
): Promise<GenerateTrendingTopicsOutput> {
  const numberOfTopicsToGenerate = input.numberOfTopics || 5;

  const popular = await popularTopics(numberOfTopicsToGenerate);
  if (popular.length === 0) return { topics: [] };

  const maxRetries = 3;
  const retryDelayMs = 1000;
  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const topicsWithCounts = popular.map(({ topic, count }) => `${topic} (${count} posts)`);
      return await generateTrendingTopics({ topics: topicsWithCounts });
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed to generate trending topics:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw new Error(`Failed to generate trending topics after ${maxRetries} retries: ${lastError}`);
}

export type TrendingKeyword = {
  topic: string;
  category: string;
  postCount: string;
};

export async function getTrendingKeywords(
  input: { numberOfTopics?: number }
): Promise<TrendingKeyword[]> {
  const numberOfTopicsToFetch = input.numberOfTopics || 5;

  const popular = await popularTopics(numberOfTopicsToFetch);

  return popular
    .map(({ topic, count }) => ({
      topic: topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'Football · Trending',
      postCount: `${count.toLocaleString()} ${count === 1 ? 'post' : 'posts'}`,
    }));
}
