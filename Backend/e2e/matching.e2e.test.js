import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const FRONTEND_URL = "http://localhost:5173";
const ARTIFACT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "artifacts");
const TEST_PASSWORD = "CarryFreeE2E!2026";

const waitFor = async (driver, condition, timeout = 15000) => driver.wait(condition, timeout);

const visibleText = async (driver) => (await driver.findElement(By.css("body"))).getText();

const setSelectValue = (driver, name, value) => driver.executeScript(
  `const select = document.querySelector('select[name="${name}"]');
   const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
   setter.call(select, arguments[0]);
   select.dispatchEvent(new Event("change", { bubbles: true }));`,
  value,
);

const fillField = async (driver, name, value) => {
  const field = await driver.findElement(By.name(name));
  await field.clear();
  await field.sendKeys(value);
};

const fillDateField = (driver, name, value) => driver.executeScript(
  `const field = document.querySelector('input[name="${name}"]');
   const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
   setter.call(field, arguments[0]);
   field.dispatchEvent(new Event("input", { bubbles: true }));
   field.dispatchEvent(new Event("change", { bubbles: true }));`,
  value,
);

const installNetworkCapture = (driver) => driver.executeScript(`(() => {
  if (window.__carryFreeE2EInstalled) return;
  window.__carryFreeE2EInstalled = true;
  window.__carryFreeE2ERequests = JSON.parse(localStorage.getItem("carryfree-e2e-requests") || "[]");
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    let body = "";
    try { body = await response.clone().text(); } catch {}
    window.__carryFreeE2ERequests.push({
      url: String(args[0]),
      method: args[1]?.method || "GET",
      status: response.status,
      body,
    });
    localStorage.setItem("carryfree-e2e-requests", JSON.stringify(window.__carryFreeE2ERequests));
    return response;
  };
})();`);

const getDiagnostics = async (driver) => {
  const requests = await driver.executeScript("return JSON.parse(localStorage.getItem('carryfree-e2e-requests') || '[]');");
  const matchingRequests = requests.filter((request) => request.url.includes("/api/match/lost/"));
  const createdItems = requests
    .filter((request) => request.method === "POST" && /\/api\/(lost|found)-items$/.test(request.url))
    .map((request) => {
      try {
        return JSON.parse(request.body)?.data || null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return {
    url: await driver.getCurrentUrl(),
    visibleText: await visibleText(driver),
    lostItemId: createdItems.find((item) => item.dateLost)?._id || null,
    foundItemId: createdItems.find((item) => item.dateFound)?._id || null,
    matchApiResponse: matchingRequests.at(-1) || null,
    requests,
  };
};

const saveFailureArtifacts = async (driver, label) => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const diagnostics = await getDiagnostics(driver);
  const screenshotPath = path.join(ARTIFACT_DIR, `${label}.png`);
  const diagnosticsPath = path.join(ARTIFACT_DIR, `${label}.json`);
  await driver.takeScreenshot().then((image) => fs.writeFileSync(screenshotPath, image, "base64"));
  fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
  return { diagnostics, screenshotPath, diagnosticsPath };
};

const register = async (driver, account) => {
  await driver.executeScript("localStorage.removeItem('carryfree_token'); sessionStorage.clear();");
  await driver.get(`${FRONTEND_URL}/register`);
  await installNetworkCapture(driver);
  await waitFor(driver, until.elementLocated(By.id("name")));
  await fillField(driver, "name", account.name);
  await fillField(driver, "email", account.email);
  await fillField(driver, "password", TEST_PASSWORD);
  await fillField(driver, "confirmPassword", TEST_PASSWORD);
  await driver.findElement(By.css('button[type="submit"]')).click();
  await waitFor(driver, until.urlContains("/carry-dashboard"));
};

const login = async (driver, account) => {
  await driver.executeScript("localStorage.removeItem('carryfree_token'); sessionStorage.clear();");
  await driver.get(`${FRONTEND_URL}/login`);
  await installNetworkCapture(driver);
  await waitFor(driver, until.elementLocated(By.id("email")));
  await fillField(driver, "email", account.email);
  await fillField(driver, "password", TEST_PASSWORD);
  await driver.findElement(By.css('button[type="submit"]')).click();
  await waitFor(driver, until.urlContains("/carry-dashboard"));
};

const submitFound = async (driver, item) => {
  await driver.get(`${FRONTEND_URL}/report-found`);
  await installNetworkCapture(driver);
  await waitFor(driver, until.elementLocated(By.id("FoundItemName")));
  await fillField(driver, "title", item.title);
  await setSelectValue(driver, "category", item.category);
  await fillField(driver, "color", item.color);
  await fillDateField(driver, "dateFound", item.dateFound);
  await fillField(driver, "location", item.location);
  if (item.phone) {
    await fillField(driver, "phone", item.phone);
  }
  await fillField(driver, "description", item.description);
  await driver.findElement(By.css('button[type="submit"]')).click();
  await waitFor(driver, async () => (await visibleText(driver)).includes("Found item reported successfully"));
};

const submitLost = async (driver, item) => {
  await driver.get(`${FRONTEND_URL}/report-lost`);
  await installNetworkCapture(driver);
  await waitFor(driver, until.elementLocated(By.id("LostItemName")));
  await fillField(driver, "title", item.title);
  await setSelectValue(driver, "category", item.category);
  await fillField(driver, "color", item.color);
  await fillDateField(driver, "dateLost", item.dateLost);
  await fillField(driver, "location", item.location);
  await fillField(driver, "description", item.description);
  await driver.findElement(By.css('button[type="submit"]')).click();
  await waitFor(driver, async () => (await visibleText(driver)).includes("Lost item reported successfully"));
  await waitFor(driver, async () => {
    const text = await visibleText(driver);
    return text.includes("Potential Matches") || text.includes("No Potential Matches Yet") || text.includes("could not be loaded");
  });
};

const makeDriver = async () => {
  const options = new chrome.Options()
    .addArguments("--headless=new", "--window-size=1440,1400", "--disable-gpu", "--no-sandbox");
  return new Builder().forBrowser("chrome").setChromeOptions(options).build();
};

test("Strong Lost -> Found match appears in browser", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const suffix = `${Date.now()}-${process.pid}`;
  const accountA = { name: "CarryFree E2E Lost Owner", email: `carryfree-e2e-a-${suffix}@example.com` };
  const accountB = { name: "CarryFree E2E Finder", email: `carryfree-e2e-b-${suffix}@example.com` };
  const driver = await makeDriver();
  let lastFailureLabel = "matching-e2e-failure";

  try {
    await driver.get(`${FRONTEND_URL}/login`);
    await installNetworkCapture(driver);

    await register(driver, accountB);
    await submitFound(driver, {
      title: "Apple AirPods Pro",
      category: "electronics",
      color: "Black",
      location: "Library",
      dateFound: today,
      phone: "+1 555-0101",
      description: "Black wireless earbuds with a small blue sticker on the case",
    });

    await register(driver, accountA);
    await submitLost(driver, {
      title: "Apple AirPods Pro",
      category: "electronics",
      color: "Black",
      location: "Library 2nd Floor",
      dateLost: today,
      description: "Wireless earbuds in black case with a small blue sticker",
    });

    const strongText = await visibleText(driver);
    const diagnostics = await getDiagnostics(driver);
    const strongMatch = diagnostics.matchApiResponse?.body
      ? JSON.parse(diagnostics.matchApiResponse.body)?.data?.matches?.[0]
      : null;
    assert.match(strongText, /Potential Matches/i);
    assert.match(strongText, /Apple AirPods Pro|AirPods Pro/i);
    assert.match(strongText, /\b(?:[6-9]\d|100)\b/, "Expected a rendered numeric match score");
    assert.match(strongText, /very strong|strong|possible/i);
    assert.match(strongText, /Same category|item-name|description|color|location/i);
    assert.ok(strongMatch?.foundItem?._id, "Expected the FoundItem to appear in the match API response");

    await login(driver, accountB);
    await submitFound(driver, {
      title: "Black HP Laptop",
      category: "electronics",
      color: "Black",
      location: "Cafeteria",
      dateFound: today,
      phone: "+1 555-0102",
      description: "Plain laptop with no sticker",
    });

    await login(driver, accountA);
    await submitLost(driver, {
      title: "Black HP Laptop",
      category: "electronics",
      color: "Black",
      location: "Library",
      dateLost: today,
      description: "Laptop with Spider-Man sticker on the back",
    });

    const badCards = await driver.findElements(By.css(".potential-match-card"));
    for (const card of badCards) {
      const cardText = await card.getText();
      if (/Black HP Laptop/i.test(cardText)) {
        assert.doesNotMatch(cardText, /very[_ ]strong/i);
      }
    }
  } catch (error) {
    const artifacts = await saveFailureArtifacts(driver, lastFailureLabel);
    error.message += `\nE2E diagnostics: ${JSON.stringify(artifacts.diagnostics, null, 2)}\nScreenshot: ${artifacts.screenshotPath}\nDiagnostics: ${artifacts.diagnosticsPath}`;
    throw error;
  } finally {
    await driver.quit();
  }
});