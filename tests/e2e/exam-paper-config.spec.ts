import { expect, test } from "@playwright/test";

test("L&D can open exam tab and see Bloom/live configuration controls", async ({ page }) => {
  const resetResponse = await page.request.post("http://127.0.0.1:5000/api/admin/reset-db");
  expect(resetResponse.ok()).toBeTruthy();

  const email = `playwright.ld.${Date.now()}@lms.local`;
  const registerResponse = await page.request.post("http://127.0.0.1:5000/api/auth/register", {
    data: {
      email,
      password: "password",
      fullName: "Playwright L&D",
      role: "l_and_d",
    },
  });
  expect(registerResponse.ok()).toBeTruthy();

  await page.goto("/courses/1");
  await page.getByRole("button", { name: "Exam Paper" }).click();

  await expect(page.getByText("No Exam Paper Generated")).toBeVisible();
  await expect(page.getByText("Bloom taxonomy weights")).toBeVisible();
  await expect(page.getByText("Question count")).toBeVisible();
  await expect(page.getByText("Enable live exam mode")).toBeVisible();
  await expect(page.getByText("Notify these users on exam submission")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Exam Paper" })).toBeVisible();
});
