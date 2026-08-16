'use server';

/**
 * @fileOverview Answers a user's question about a specific post.
 *
 * - answerPostQuestion - Ask a question with a post as context.
 * - AnswerPostQuestionInput - Input type.
 * - AnswerPostQuestionOutput - Return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerPostQuestionInputSchema = z.object({
  postContent: z.string().describe('The text content of the post being asked about.'),
  postAuthor: z.string().describe("The handle of the post's author."),
  question: z.string().describe("The user's question about the post."),
});
export type AnswerPostQuestionInput = z.infer<typeof AnswerPostQuestionInputSchema>;

const AnswerPostQuestionOutputSchema = z.object({
  answer: z.string().describe('A concise, conversational answer to the question.'),
});
export type AnswerPostQuestionOutput = z.infer<typeof AnswerPostQuestionOutputSchema>;

export async function answerPostQuestion(
  input: AnswerPostQuestionInput
): Promise<AnswerPostQuestionOutput> {
  return answerPostQuestionFlow(input);
}

const answerPostQuestionFlow = ai.defineFlow(
  {
    name: 'answerPostQuestionFlow',
    inputSchema: AnswerPostQuestionInputSchema,
    outputSchema: AnswerPostQuestionOutputSchema,
  },
  async ({postContent, postAuthor, question}) => {
    const response = await ai.generate({
      model: 'googleai/gemini-3.7-flash',
      // Grounded in live Google Search. Without this the model answers
      // from training data alone, which is badly wrong for a football
      // app — asked who leads the league it confidently named the wrong
      // club, because the season had moved on since its cutoff. Posts
      // here are almost always about last night's match or a transfer
      // that just broke.
      config: {tools: [{googleSearch: {}}]},
      prompt: `You are BHOLO AI, a knowledgeable and slightly playful football assistant on a South African football banter app. You know South African football well — the Betway Premiership (PSL), Kaizer Chiefs, Orlando Pirates, Mamelodi Sundowns, Bafana Bafana — as well as the global game.

A user is reading this post by @${postAuthor}:
"""
${postContent}
"""

They asked: "${question}"

Search for current information when the question depends on recent results, standings, transfers or news, and answer from what you find rather than from memory.

Answer directly and conversationally, in 3 sentences or fewer. Match the banter energy of the app but stay accurate and fair — never insult real people or clubs. If the post doesn't contain enough to answer and you can't find it, say so plainly rather than guessing. Reply with the answer text only — no preamble, no citations, no markdown.`,
    });

    return {answer: response.text.trim()};
  }
);
