/**
 * The brief's final acceptance scenario, end to end through the UI:
 * a father creates a family and invites the mother, four children get accounts,
 * a child completes a task and proposes an initiative, parents verify both,
 * the week is finalised into levels, rewards are recorded, history is kept.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const father = { email: `father.${stamp}@example.com`, password: 'password-123' };
const mother = { email: `mother.${stamp}@example.com`, password: 'password-123' };
let familyCode = '';
let inviteLink = '';
const secrets: Record<string, string> = {};
let dad: Page;

async function newPage(browser: Browser, mobile = false) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 420, height: 900 } } : {});
  return ctx.newPage();
}

test('father registers and sets up the family with the starter template', async ({ browser }) => {
  dad = await newPage(browser);
  await dad.goto('#/register');
  await dad.fill('#name', 'أبو حاتم');
  await dad.fill('#email', father.email);
  await dad.fill('#password', father.password);
  await dad.fill('#confirm', father.password);
  await dad.click('button[type=submit]');
  await expect(dad).toHaveURL(/#\/onboarding/);

  await dad.fill('#fname', 'عائلة الاختبار');
  await dad.getByRole('button', { name: 'التالي' }).click();
  await dad.getByRole('button', { name: /قالب/ }).click();
  for (const u of ['tuqa', 'retal', 'hatem', 'obai']) {
    const id = (await dad.locator(`input[value="${u}"]`).getAttribute('id'))!.slice(2);
    secrets[u] = await dad.locator(`#s-${id}`).inputValue();
  }
  for (let i = 0; i < 3; i++) await dad.getByRole('button', { name: 'التالي' }).click();
  await dad.fill('#ie', mother.email);
  await dad.getByRole('button', { name: 'ابدأ التحدّي الأول' }).click();
  await expect(dad.getByText('رابط الدعوة')).toBeVisible({ timeout: 45_000 });
  inviteLink = await dad.locator('input[readonly]').inputValue();
  await dad.getByRole('button', { name: 'ابدأ التحدّي الأول' }).click();
  await expect(dad).toHaveURL(/#\/parent$/);
  familyCode = ((await dad.locator('[dir=ltr].font-bold').first().textContent()) ?? '').trim();
  expect(familyCode).toMatch(/^[A-Z2-9]{8}$/);
  await expect(dad.getByRole('heading', { name: 'تقدّم الأسبوع' })).toBeVisible();
  await expect(dad.locator('article').filter({ hasText: 'أُبي' }).first()).toBeVisible();
});

test('mother accepts the invitation', async ({ browser }) => {
  const mom = await newPage(browser);
  await mom.goto(inviteLink.replace(/^.*#/, '#'));
  await expect(mom.getByText('دعوة للانضمام إلى عائلة')).toBeVisible();
  await mom.getByRole('link', { name: 'إنشاء الحساب' }).click();
  await mom.fill('#name', 'أم حاتم');
  await mom.fill('#email', mother.email);
  await mom.fill('#password', mother.password);
  await mom.fill('#confirm', mother.password);
  await mom.click('button[type=submit]');
  await mom.getByRole('button', { name: 'قبول الدعوة' }).click();
  await expect(mom).toHaveURL(/#\/parent$/);
  await mom.goto('#/parent/family');
  await expect(mom.getByText('ولي أمر مشارك')).toBeVisible();
});

test('a child signs in, completes a task independently and proposes an initiative', async ({ browser }) => {
  const kid = await newPage(browser, true);
  await kid.goto('#/child-login');
  await kid.fill('#familyCode', familyCode);
  await kid.fill('#username', 'hatem');
  await kid.fill('#secret', 'wrong-secret-1');
  await kid.click('button[type=submit]');
  await expect(kid.getByRole('alert')).toContainText('بيانات الدخول غير صحيحة');
  await kid.fill('#secret', secrets.hatem);
  await kid.click('button[type=submit]');
  await expect(kid).toHaveURL(/#\/child$/);
  await expect(kid.getByRole('heading', { name: 'مرحباً يا بطل! ⭐' })).toBeVisible();

  await kid.getByRole('button', { name: 'أنجزتها' }).first().click();
  await kid.getByRole('button', { name: /أنجزتها وحدي/ }).click();
  await expect(kid.getByText('أُرسلت!').first()).toBeVisible();
  await expect(kid.getByText('بانتظار التأكيد').first()).toBeVisible();

  await kid.goto('#/child/initiatives');
  await kid.fill('#ci-title', 'ساعدت أخي الصغير في ترتيب ألعابه');
  await kid.getByRole('button', { name: /أرسل مبادرتي/ }).click();
  await expect(kid.getByText('وصلت مبادرتك').first()).toBeVisible();

  // children cannot reach parent screens
  await kid.goto('#/parent/approvals');
  await expect(kid).toHaveURL(/#\/child$/);
});

test('parents verify; points are calculated on the server and appear for the child', async ({ browser }) => {
  await dad.goto('#/parent/approvals');
  await expect(dad.getByText('سيُمنح نقطتان')).toBeVisible();
  await dad.getByRole('button', { name: 'اعتماد', exact: true }).first().click();
  await expect(dad.getByText('تم الاعتماد').first()).toBeVisible();

  await dad.goto('#/parent/initiatives');
  await dad.getByRole('button', { name: 'اعتماد', exact: true }).first().click();
  await expect(dad.getByText(/اعتُمدت المبادرة/).first()).toBeVisible();

  const kid = await newPage(browser, true);
  await kid.goto('#/child-login');
  await kid.fill('#familyCode', familyCode);
  await kid.fill('#username', 'hatem');
  await kid.fill('#secret', secrets.hatem);
  await kid.click('button[type=submit]');
  await expect(kid.locator('[aria-label="2 نجمة، و1 نجمة ذهبية"]').first()).toBeVisible();
});

test('the father finalises the week, records a reward, and history is preserved', async ({ browser }) => {
  await dad.goto('#/parent/week');
  await dad.getByRole('button', { name: 'اعتماد نتائج الأسبوع' }).click();
  await dad.getByRole('alertdialog').getByRole('button', { name: 'اعتماد نتائج الأسبوع' }).click();
  await expect(dad.getByText('تم اعتماد الأسبوع').first()).toBeVisible();
  await expect(dad.getByText(/معتمد في/)).toHaveCount(4);

  await dad.goto('#/parent/rewards');
  await dad.getByRole('button', { name: 'منح مكافأة' }).first().click();
  await dad.fill('#gr-title', 'مصروف إضافي');
  await dad.fill('#gr-amt', '5');
  await dad.getByRole('dialog').getByRole('button', { name: 'منح مكافأة' }).click();
  await expect(dad.getByText('تم تسجيل المكافأة')).toBeVisible();
  await dad.getByRole('button', { name: 'تم الدفع' }).first().click();
  await expect(dad.getByText('مدفوع').first()).toBeVisible();

  await dad.goto('#/parent/reports');
  await expect(dad.getByRole('heading', { name: 'التقارير' })).toBeVisible();
  await expect(dad.locator('table').first()).toContainText('حاتم');

  const kid = await newPage(browser, true);
  await kid.goto('#/child-login');
  await kid.fill('#familyCode', familyCode);
  await kid.fill('#username', 'hatem');
  await kid.fill('#secret', secrets.hatem);
  await kid.click('button[type=submit]');
  await expect(kid).toHaveURL(/#\/child$/);
  await kid.goto('#/child/tasks');
  await expect(kid.getByText('تم اعتماد نتائج هذا الأسبوع')).toBeVisible();
  await kid.goto('#/child/stars');
  await expect(kid.getByText(/أسبوع/).first()).toBeVisible();
});
