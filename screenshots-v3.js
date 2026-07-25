const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const dir = '/Users/jlowder/dev/time-block/screenshots';

  await page.addInitScript(() => {
    const defaultSchedule = {
      slots: [
        {
          id: '1', startH: 6, startM: 0, endH: 7, endM: 0,
          title: 'Morning Exercise', desc: 'Light jogging and stretching',
          icon: '🏃', theme: 'exercise',
        },
        {
          id: '2', startH: 7, startM: 30, endH: 9, endM: 0,
          title: 'Deep Work: Project', desc: 'Focus on the main deliverable',
          icon: '💻', theme: 'study', badge: 'Focus',
        },
        {
          id: '3', startH: 9, startM: 0, endH: 9, endM: 30,
          title: 'Break', desc: 'Coffee and rest',
          icon: '☕', theme: 'break',
        },
        {
          id: '4', startH: 9, startM: 30, endH: 12, endM: 0,
          title: 'Team Meeting', desc: 'Weekly sync with the team',
          icon: '👥', theme: 'leisure', badge: '2h',
        },
        {
          id: '5', startH: 12, startM: 0, endH: 13, endM: 0,
          title: 'Lunch', desc: 'Meal break',
          icon: '🍽', theme: 'break',
        },
        {
          id: '6', startH: 13, startM: 0, endH: 16, endM: 0,
          title: 'Development', desc: 'Coding and debugging',
          icon: '⌨️', theme: 'study', badge: 'Sprint',
        },
      ],
    };
    localStorage.setItem('dailySchedule', JSON.stringify(defaultSchedule));
  });

  await page.goto('http://localhost:3099', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cardCount = await page.locator('.schedule-card').count();
  console.log(`Schedule loaded: ${cardCount} cards`);

  // 1. Full page screenshot
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${dir}/full-v3.png`, fullPage: false });
  console.log('full-v3.png saved');

  // 2. Schedule cards close-up - scroll to middle
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.evaluate(() => window.scrollTo(0, 180));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/schedule-v3.png`, fullPage: false });
  console.log('schedule-v3.png saved');

  await browser.close();
  console.log('All v3 screenshots captured!');
})();
