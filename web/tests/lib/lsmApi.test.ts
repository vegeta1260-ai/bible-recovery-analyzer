import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRecoveryText, type RecoveryResult } from '@/lib/lsmApi';

const mockResponse = {
  verses: [{ ref: 'John 1:1', text: 'In the beginning was the Word...' }],
  inputstring: 'John 1:1',
  detected: 'verse',
  message: '',
  copyright: 'Copyright LSM',
};

describe('fetchRecoveryText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls LSM API with correct params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    await fetchRecoveryText('John 1:1');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://api.lsm.org/recver/txo.php');
    expect(url.searchParams.get('String')).toBe('John 1:1');
    expect(url.searchParams.get('Out')).toBe('json');
  });

  it('parses verses from response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const result = await fetchRecoveryText('John 1:1');
    expect(result.verses.length).toBe(1);
    expect(result.verses[0].text).toContain('beginning');
    expect(result.copyright).toBe('Copyright LSM');
  });

  it('returns error result on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchRecoveryText('John 1:1');
    expect(result.error).toBe(true);
    expect(result.errorMessage).toContain('Network error');
  });

  it('returns error result on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 })
    );

    const result = await fetchRecoveryText('John 1:1');
    expect(result.error).toBe(true);
  });

  it('retries once on failure then gives up', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

    const result = await fetchRecoveryText('John 1:1');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.error).toBeFalsy();
  });
});
