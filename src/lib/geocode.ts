'use server';

/**
 * Turns coordinates into a place name.
 *
 * The composer previously stored what the browser handed it — "Lat: -26.20,
 * Lon: 28.04" — which is not a location anyone recognises. Posts should say
 * Johannesburg.
 *
 * Runs on the server so the call is made once by us rather than from every
 * user's browser, and so the User-Agent that OpenStreetMap's usage policy asks
 * for is actually set.
 */

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

/** Coarsest-to-finest fallbacks, because not everywhere is a city. */
function pickPlaceName(address: NominatimAddress): string | null {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.county ||
    address.state ||
    address.country ||
    null
  );
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ place: string } | { error: string }> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: 'Invalid coordinates.' };
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  // City level. Finer zooms return a street address, which is more precision
  // than anyone wants attached to a public post.
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BHOLO/1.0 (South African football banter app)',
        'Accept-Language': 'en',
      },
      // A slow geocoder must not hold up attaching a location.
      signal: AbortSignal.timeout(5000),
      // Same coordinates resolve to the same place; let Next cache it.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) return { error: 'Could not look up that location.' };

    const data = (await response.json()) as { address?: NominatimAddress };
    const place = data.address ? pickPlaceName(data.address) : null;

    if (!place) return { error: 'Could not name that location.' };
    return { place };
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    return { error: 'Could not look up that location.' };
  }
}
