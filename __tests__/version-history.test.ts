import appConfig from '@/app.json';
import packageConfig from '@/package.json';
import { CURRENT_APP_VERSION, RELEASE_HISTORY } from '@/constants/release-history';

describe('version history', () => {
  test('published version is synchronized everywhere', () => {
    expect(appConfig.expo.version).toBe(CURRENT_APP_VERSION);
    expect(packageConfig.version).toBe(CURRENT_APP_VERSION);
    expect(RELEASE_HISTORY[0].version).toBe(CURRENT_APP_VERSION);
  });

  test('history is ordered and every release contains improvements', () => {
    expect(RELEASE_HISTORY.length).toBeGreaterThan(0);
    expect(RELEASE_HISTORY.every((release) => release.highlights.length > 0)).toBe(true);
  });
});
