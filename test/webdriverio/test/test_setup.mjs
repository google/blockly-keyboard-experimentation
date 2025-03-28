/**
 * @license
 * Copyright 2025 Google LLC
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
import * as path from 'path';
import {fileURLToPath} from 'url';

/**
 * The directory where this code was run.
 *
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The webdriverio instance, which should only be initialized once.
 */
let driver = null;

/**
 * The default amount of time to wait during a test. Increase this to make
 * tests easier to watch; decrease it to make tests run faster.
 */
export const PAUSE_TIME = 50;

/**
 * Start up the test page. This should only be done once, to avoid
 * constantly popping browser windows open and closed.
 * @returns {Promise<webdriverio.Browser>} A Promise that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function driverSetup() {
  const options = {
    capabilities: {
      'browserName': 'chrome',
      'unhandledPromptBehavior': 'ignore',
      'goog:chromeOptions': {
        args: ['--allow-file-access-from-files'],
      },
      // We aren't (yet) using any BiDi features, and BiDi is sensitive to
      // mismatches between Chrome version and Chromedriver version.
      'wdio:enforceWebDriverClassic': 'true',
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
 * @returns {Promise<webdriverio.Browser>} A Promsie that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function testSetup(playgroundUrl) {
  if (!driver) {
    await driverSetup();
  }
  await driver.url(playgroundUrl);
  // Wait for the workspace to exist and be rendered.
  await driver
    .$('.blocklySvg .blocklyWorkspace > .blocklyBlockCanvas')
    .waitForExist({timeout: 2000});
  return driver;
}

/**
 * Replaces OS-specific path with POSIX style path.
 *
 * Simplified implementation based on
 * https://stackoverflow.com/a/63251716/4969945
 * @param {string} target target path
 * @returns {string} posix path
 */
function posixPath(target) {
  const result = target.split(path.sep).join(path.posix.sep);
  console.log(result);
  return result;
}

export const testFileLocations = {
  BASE:
    'file://' + posixPath(path.join(__dirname, '..', 'build')) + '/index.html',
  GERAS:
    'file://' +
    posixPath(path.join(__dirname, '..', 'build')) +
    '/index.html?renderer=geras',
};
