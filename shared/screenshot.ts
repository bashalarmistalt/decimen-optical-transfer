import puppeteer from "puppeteer";
(async () => {
  const browser = await puppeteer.launch({
    acceptInsecureCerts: true,
    args: [
      "--no-sandbox",
      "--ignore-certificate-errors",
      "--allow-insecure-localhost",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1024 });

    const url = process.env.URL ?? "https://lvh.me:5173/";
    console.log(`Navigating to ${url}...`);

    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const outputPath = "./public/screenshot.png";
    await page.screenshot({
      path: outputPath,
    });
    console.log(`Screenshot saved to ${outputPath}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("Screenshot capture failed:", err.message || err);
  process.exitCode = 1;
});
