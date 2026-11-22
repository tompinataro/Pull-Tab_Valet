import { beforeEach, describe, expect, it, vi } from 'vitest';

const { canOpenURL, openURL, share } = vi.hoisted(() => ({
  canOpenURL: vi.fn(),
  openURL: vi.fn(),
  share: vi.fn(),
}));
vi.mock('react-native', () => ({ Linking: { canOpenURL, openURL }, Share: { share } }));

import { shareEmail } from '../src/shared/utils/email';

describe('shareEmail native fallbacks', () => {
  const subject = 'A & B';
  const body = 'line 1\nline 2';
  const url = 'mailto:?subject=A%20%26%20B&body=line%201%0Aline%202';

  beforeEach(() => {
    vi.resetAllMocks();
    canOpenURL.mockResolvedValue(true);
    openURL.mockResolvedValue(undefined);
    share.mockResolvedValue(undefined);
  });

  it('opens the encoded mail URL and skips the share sheet', async () => {
    await expect(shareEmail(subject, body)).resolves.toBe(true);
    expect(canOpenURL).toHaveBeenCalledWith(url);
    expect(openURL).toHaveBeenCalledWith(url);
    expect(share).not.toHaveBeenCalled();
  });

  it('uses the share sheet when no mail app is available', async () => {
    canOpenURL.mockResolvedValue(false);
    await expect(shareEmail(subject, body)).resolves.toBe(true);
    expect(openURL).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledWith({ title: subject, message: body });
  });

  it('uses the share sheet after a failed mail availability check', async () => {
    canOpenURL.mockRejectedValue(new Error('mail availability'));
    await expect(shareEmail(subject, body)).resolves.toBe(true);
    expect(openURL).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledOnce();
  });

  it('uses the share sheet after a failed mail launch', async () => {
    openURL.mockRejectedValue(new Error('mail launch'));
    await expect(shareEmail(subject, body)).resolves.toBe(true);
    expect(share).toHaveBeenCalledOnce();
  });

  it('returns false rather than rejecting when both paths fail', async () => {
    openURL.mockRejectedValue(new Error('mail launch'));
    share.mockRejectedValue(new Error('share launch'));
    await expect(shareEmail(subject, body)).resolves.toBe(false);
  });
});
