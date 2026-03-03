import { test, expect } from './auth.fixture';
import { LoginPage } from '../pages/login.page';
import { SignupPage } from '../pages/signup.page';
import { OnboardPage } from '../pages/onboard.page';
import { RequestPage } from '../pages/request.page';
import { AdminPage } from '../pages/admin.page';
import { ProfilePage } from '../pages/profile.page';
import { HistoryPage } from '../pages/history.page';
import { NewsPage } from '../pages/news.page';

type PageFixtures = {
  loginPage: LoginPage;
  signupPage: SignupPage;
  onboardPage: OnboardPage;
  requestPage: RequestPage;
  adminPage: AdminPage;
  profilePage: ProfilePage;
  historyPage: HistoryPage;
  newsPage: NewsPage;
};

export const extendedTest = test.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  onboardPage: async ({ page }, use) => {
    await use(new OnboardPage(page));
  },
  requestPage: async ({ page }, use) => {
    await use(new RequestPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },
  newsPage: async ({ page }, use) => {
    await use(new NewsPage(page));
  },
});

export { expect };
export * from './test-data';
