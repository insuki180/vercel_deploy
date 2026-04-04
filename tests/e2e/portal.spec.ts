import { expect, test } from "@playwright/test";

test("admin can log in, view employers, and open an employee modal", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@eor.com");
  await page.getByLabel("Password").fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin\/overview$/);
  await expect(page.getByText("Admin workspace")).toBeVisible();

  await page.locator("aside").getByRole("link", { name: "Employers", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/employers$/);
  await expect(page.getByRole("heading", { name: "Employer directory", exact: true })).toBeVisible();

  await page.locator("aside").getByRole("link", { name: "Employees", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/employees$/);

  await page.getByRole("cell", { name: "Priya Sharma" }).first().click();
  await expect(page.getByText("Expanded record view for faster operational decisions.")).toBeVisible();
});

test("employer can create a hiring request", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("employer@globex.com");
  await page.getByLabel("Password").fill("Employer@123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/employer\/overview$/);
  await page.locator("aside").getByRole("link", { name: "Hiring", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/hiring$/);

  await page.getByPlaceholder("Candidate full name").fill("Nisha Kapoor");
  await page.getByPlaceholder("Candidate work email").fill("nisha@example.com");
  await page.getByPlaceholder("Candidate phone").fill("+91 9999988888");
  await page.getByPlaceholder("Designation").fill("HR Generalist");
  await page.getByPlaceholder("Contract type").fill("Full-time");
  await page.getByPlaceholder("Work location").fill("Remote");
  await page.getByPlaceholder("Monthly salary (INR)").fill("70000");
  await page.getByRole("button", { name: "Create hiring request" }).click();

  await expect(page.getByText("Nisha Kapoor")).toBeVisible();
});

test("employee can submit a leave request and access a payslip PDF", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("employee@globex.com");
  await page.getByLabel("Password").fill("Employee@123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/employee\/overview$/);
  await page.locator("aside").getByRole("link", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/employee\/leave$/);

  await page.getByRole("combobox").first().selectOption("sick");
  await page.getByRole("spinbutton").first().fill("2");
  await page.getByRole("textbox", { name: "Leave reason" }).fill("Fever");
  await page.getByRole("button", { name: "Submit leave request" }).click();

  await expect(page.getByText("2 paid · 0 loss of pay")).toBeVisible();

  await page.locator("aside").getByRole("link", { name: "Payslips", exact: true }).click();
  await expect(page).toHaveURL(/\/employee\/payslips$/);

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).first().getAttribute("href");
  expect(pdfHref).toBeTruthy();

  const pdfResponse = await request.get(pdfHref!);
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
});
