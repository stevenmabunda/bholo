
'use server';

import {
  generateTrendingTopics,
  type GenerateTrendingTopicsOutput,
} from '@/ai/flows/generate-trending-topics';
import { createClient } from '@/lib/supabase/server';

async function getRecentTopics(): Promise<string[]> {
  const supabase = await createClient();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('topics')
    .select('topic')
    .gte('created_at', seventyTwoHoursAgo);
  if (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
  return (data ?? []).map(row => row.topic as string);
}

function popularTopicsFrom(recentTopics: string[]): { topic: string; count: number }[] {
  const topicCounts = recentTopics.reduce((acc, topic) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(topicCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => ({ topic, count }));
}

export async function getTrendingTopics(
  // @ts-ignore - next doesn't like passing objects with optional props through server actions
  input: { numberOfTopics?: number }
): Promise<GenerateTrendingTopicsOutput> {
  const numberOfTopicsToGenerate = input.numberOfTopics || 5;

  const recentTopics = await getRecentTopics();
  if (recentTopics.length === 0) return { topics: [] };

  const popular = popularTopicsFrom(recentTopics).slice(0, numberOfTopicsToGenerate);
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

  const recentTopics = await getRecentTopics();
  if (recentTopics.length === 0) return [];

  return popularTopicsFrom(recentTopics)
    .slice(0, numberOfTopicsToFetch)
    .map(({ topic, count }) => ({
      topic: topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'Football · Trending',
      postCount: `${count.toLocaleString()} ${count === 1 ? 'post' : 'posts'}`,
    }));
}
