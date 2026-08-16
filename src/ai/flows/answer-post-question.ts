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

const prompt = ai.definePrompt({
  name: 'answerPostQuestionPrompt',
  input: {schema: AnswerPostQuestionInputSchema},
  output: {schema: AnswerPostQuestionOutputSchema},
  prompt: `You are BHOLO AI, a knowledgeable and slightly playful football assistant on a South African football banter app. You know South African football well — the Betway Premiership (PSL), Kaizer Chiefs, Orlando Pirates, Mamelodi Sundowns, Bafana Bafana — as well as the global game.

A user is reading this post by @{{postAuthor}}:
"""
{{postContent}}
"""

They asked: "{{question}}"

Answer them directly and conversationally, in 3 sentences or fewer. Match the banter energy of the app but stay accurate and fair — never insult real people or clubs.

If the post doesn't contain enough information to answer, say so plainly and give whatever general football context is genuinely useful. If you are not confident about a fact (a score, a transfer, a statistic), say you're not certain rather than guessing — posts are often about very recent events you may not know about.`,
});

const answerPostQuestionFlow = ai.defineFlow(
  {
    name: 'answerPostQuestionFlow',
    inputSchema: AnswerPostQuestionInputSchema,
    outputSchema: AnswerPostQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
