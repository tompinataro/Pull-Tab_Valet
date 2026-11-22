import { describe, expect, it, vi } from 'vitest';
import { tryApplyAddressLocation } from '../src/shared/utils/optionalAddressLocation';

describe('optional client address geocoding', () => {
  const fixture = { latitude: 8.12, longitude: 3.45 };
  it('applies the first hit without using the fallback', async () => {
    const geocode = vi.fn().mockResolvedValue([fixture, { latitude: 10, longitude: 11 }]);
    const apply = vi.fn(), gpsFallback = vi.fn();
    if (!await tryApplyAddressLocation('Synthetic office', geocode, apply)) gpsFallback();
    expect(geocode).toHaveBeenCalledWith('Synthetic office');
    expect(apply).toHaveBeenCalledExactlyOnceWith(fixture);
    expect(gpsFallback).not.toHaveBeenCalled();
  });
  it.each(['empty address', 'no hit', 'geocoder error', 'apply error'])('keeps the GPS fallback available after %s', async mode => {
    const geocode = mode === 'geocoder error' ? vi.fn().mockRejectedValue(new Error('fixture')) :
      vi.fn().mockResolvedValue(mode === 'no hit' ? [] : [fixture]);
    const apply = mode === 'apply error' ? vi.fn(() => { throw new Error('fixture'); }) : vi.fn();
    const gpsFallback = vi.fn();
    if (!await tryApplyAddressLocation(mode === 'empty address' ? '' : 'Synthetic office', geocode, apply)) gpsFallback();
    expect(gpsFallback).toHaveBeenCalledOnce();
    expect(geocode).toHaveBeenCalledTimes(mode === 'empty address' ? 0 : 1);
    expect(apply).toHaveBeenCalledTimes(mode === 'apply error' ? 1 : 0);
  });
});
