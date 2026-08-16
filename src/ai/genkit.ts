import {config} from 'dotenv';
config();

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // Pinned rather than left on the gemini-flash-latest alias, which was
  // resolving to a noticeably older model than this key can actually use.
  model: 'googleai/gemini-3.7-flash',
});