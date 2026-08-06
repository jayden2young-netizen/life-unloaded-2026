'use strict';

const fs = require('node:fs');
const { chromium } = require('playwright');

function chromiumLaunchOptions(options = {}) {
  const executablePath = process.env.CHROME_PATH?.trim();
  if (executablePath && !fs.existsSync(executablePath)) {
    throw new Error(`CHROME_PATH does not exist: ${executablePath}`);
  }

  return {
    headless: true,
    ...options,
    ...(executablePath ? { executablePath } : {}),
  };
}

function launchChromium(options) {
  return chromium.launch(chromiumLaunchOptions(options));
}

module.exports = { chromiumLaunchOptions, launchChromium };
