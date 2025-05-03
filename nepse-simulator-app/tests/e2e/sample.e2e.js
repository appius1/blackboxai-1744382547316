describe('Sample E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show Watchlist screen', async () => {
    await expect(element(by.text('Watchlist'))).toBeVisible();
  });

  it('should navigate to Trading screen', async () => {
    await element(by.text('Trading')).tap();
    await expect(element(by.text('Trading'))).toBeVisible();
  });

  it('should navigate to Analytics screen', async () => {
    await element(by.text('Analytics')).tap();
    await expect(element(by.text('Analytics'))).toBeVisible();
  });
});
