import { test, expect } from '@playwright/test';

async function selectPhoto(page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '選択', exact: true }).click();
  await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByRole('button', { name: '変更', exact: true })).toBeVisible();
}

test('photo, caption and export work; removal survives reload', async ({ page }) => {
  await page.goto('/');
  await selectPhoto(page);
  await page.getByPlaceholder('キャプション(任意)').fill('思い出');
  await expect(page.getByRole('status')).toHaveText('端末に自動保存しました');
  for (const name of ['JPEGを保存', 'PDFを保存']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name }).click();
    expect(await (await download).failure()).toBeNull();
  }
  await page.reload();
  await expect(page.getByPlaceholder('キャプション(任意)')).toHaveValue('思い出');
  // Delete while another debounced write is pending.
  await page.getByPlaceholder('キャプション(任意)').fill('削除前');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeEnabled();
  await expect(page.getByPlaceholder('キャプション(任意)')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'JPEGを保存' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('storage failure is visible and can be retried', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    window.originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === 'readwrite') throw new DOMException('full', 'QuotaExceededError');
      return window.originalTransaction.apply(this, args);
    };
  });
  await selectPhoto(page);
  await expect(page.getByRole('alert')).toContainText('自動保存に失敗');
  await page.evaluate(() => { IDBDatabase.prototype.transaction = window.originalTransaction; });
  await page.getByRole('button', { name: '自動保存を再試行' }).click();
  await expect(page.getByRole('status')).toHaveText('端末に自動保存しました');
  await page.reload();
  await expect(page.getByRole('button', { name: '変更', exact: true })).toBeVisible();
});

test('a failed deletion keeps the photo and allows another attempt', async ({ page }) => {
  await page.goto('/');
  await selectPhoto(page);
  await expect(page.getByRole('status')).toHaveText('端末に自動保存しました');
  await page.evaluate(() => {
    window.originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = () => { throw new Error('unavailable'); };
  });
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('削除できませんでした');
  await expect(page.getByRole('button', { name: '変更', exact: true })).toBeVisible();
  await page.evaluate(() => { IDBDatabase.prototype.transaction = window.originalTransaction; });
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeVisible();
});

test('invalid images and failed exports show a message', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeEnabled();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '選択', exact: true }).click();
  await (await chooser).setFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('写真を読み込めませんでした');
  await selectPhoto(page);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (callback) => callback(null); });
  await page.getByRole('button', { name: 'JPEGを保存' }).click();
  await expect(page.getByRole('alert')).toContainText('書き出しに失敗しました');
  await expect(page.getByRole('button', { name: 'JPEGを保存' })).toBeEnabled();
});

test('an unreadable saved photo can still be deleted', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const { saveCellRecord } = await import('/src/lib/persistence.js');
    await saveCellRecord(0, { blob: new Blob(['broken image'], { type: 'image/png' }) });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('前回の写真を復元できませんでした');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByRole('button', { name: '削除', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: '選択', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
