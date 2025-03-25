/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Node.js script to run automated functional tests in
 * Chrome, via webdriver.
 *
 * This file is to be used in the suiteSetup for any automated fuctional test.
 *
 * Note: In this file many functions return browser elements that can
 * be clicked or otherwise interacted with through Selenium WebDriver. These
 * elements are not the raw HTML and SVG elements on the page; they are
 * identifiers that Selenium can use to find those elements.
 */

import * as webdriverio from 'webdriverio';

let driver = null;

/**
 * The default amount of time to wait during a test. Increase this to make
 * tests easier to watch; decrease it to make tests run faster.
 */
export const PAUSE_TIME = 50;

/**
 * Start up the test page. This should only be done once, to avoid
 * constantly popping browser windows open and closed.
 * @return A Promsie that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function driverSetup() {
  const options = {
    capabilities: {
      'browserName': 'chrome',
      'unhandledPromptBehavior': 'ignore',
      'goog:chromeOptions': {
        args: ['--allow-file-access-from-files'],
      },
    },
    logLevel: 'warn',
  };

  // Run in headless mode on Github Actions.
  if (process.env.CI) {
    options.capabilities['goog:chromeOptions'].args.push(
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    );
  } else {
    // --disable-gpu is needed to prevent Chrome from hanging on Linux with
    // NVIDIA drivers older than v295.20. See
    // https://github.com/google/blockly/issues/5345 for details.
    options.capabilities['goog:chromeOptions'].args.push('--disable-gpu');
  }
  // Use Selenium to bring up the page
  console.log('Starting webdriverio...');
  driver = await webdriverio.remote(options);
  return driver;
}

/**
 * End the webdriverIO session.
 * @return A Promise that resolves after the actions have been completed.
 */
export async function driverTeardown() {
  await driver.deleteSession();
  driver = null;
  return;
}

/**
 * Navigate to the correct URL for the test, using the shared driver.
 * @param {string} playgroundUrl The URL to open for the test, which should be
 *     a Blockly playground with a workspace.
 * @return A Promsie that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function testSetup(playgroundUrl) {
  console.log('url was ' + playgroundUrl);
    if (!driver) {
      await driverSetup();
    }
    await driver.url(playgroundUrl);
    // Wait for the workspace to exist and be rendered.
    await driver
      .$('.blocklySvg .blocklyWorkspace > .blocklyBlockCanvas')
      .waitForExist({timeout: 20000});
    return driver;
  }

