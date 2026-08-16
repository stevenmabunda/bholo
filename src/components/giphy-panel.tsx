'use client';

import { useContext } from 'react';
import { Grid, SearchBar, SearchContext, SearchContextManager } from '@giphy/react-components';
import { useResponsiveGridWidth } from '@/hooks/use-responsive-grid-width';

/**
 * The GIF/sticker picker, in one place and behind its own bundle.
 *
 * The composer and the reply box each carried their own near-identical copy of
 * this, which pulled @giphy/react-components into the main bundle twice over —
 * loaded by everyone on first paint, for a panel that only opens on a click.
 * Both now reach it through next/dynamic, so the Giphy code is fetched the
 * first time someone actually opens the picker.
 */

type GifSelectHandler = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => void;

function PanelContents({
  onSelect,
  maxWidth,
  emptyMessage,
}: {
  onSelect: GifSelectHandler;
  maxWidth: number;
  emptyMessage: string;
}) {
  const { fetchGifs, searchKey } = useContext(SearchContext);
  const width = useResponsiveGridWidth(maxWidth);

  return (
    <div className="flex flex-col">
      <SearchBar />
      <Grid
        key={searchKey}
        width={width}
        columns={3}
        fetchGifs={fetchGifs}
        onGifClick={onSelect}
        noResultsMessage={emptyMessage}
      />
    </div>
  );
}

export function GiphyPanel({
  type,
  onSelect,
  maxWidth,
}: {
  type: 'gifs' | 'stickers';
  onSelect: GifSelectHandler;
  maxWidth: number;
}) {
  return (
    <SearchContextManager
      key={type}
      apiKey={process.env.NEXT_PUBLIC_GIPHY_API_KEY || ''}
      options={type === 'stickers' ? { type: 'stickers' } : undefined}
    >
      <PanelContents
        onSelect={onSelect}
        maxWidth={maxWidth}
        emptyMessage={type === 'stickers' ? 'No stickers found.' : 'No GIFs found.'}
      />
    </SearchContextManager>
  );
}

export default GiphyPanel;
