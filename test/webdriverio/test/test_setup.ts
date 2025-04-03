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

import * as Blockly from 'blockly';
import * as webdriverio from 'webdriverio';
import * as path from 'path';
import {fileURLToPath} from 'url';

/**
 * The webdriverio instance, which should only be initialized once.
 */
let driver: webdriverio.Browser | null = null;

/**
 * The default amount of time to wait during a test. Increase this to make
 * tests easier to watch; decrease it to make tests run faster.
 */
export const PAUSE_TIME = 50;

/**
 * Start up the test page. This should only be done once, to avoid
 * constantly popping browser windows open and closed.
 *
 * @returns A Promise that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function driverSetup(): Promise<webdriverio.Browser> {
  const options = {
    capabilities: {
      'browserName': 'chrome',
      'unhandledPromptBehavior': 'ignore',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'goog:chromeOptions': {
        args: ['--allow-file-access-from-files'],
      },
      // We aren't (yet) using any BiDi features, and BiDi is sensitive to
      // mismatches between Chrome version and Chromedriver version.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'wdio:enforceWebDriverClassic': true,
    },
    logLevel: 'warn' as const,
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
 *
 * @return A Promise that resolves after the actions have been completed.
 */
export async function driverTeardown() {
  await driver?.deleteSession();
  driver = null;
  return;
}

/**
 * Navigate to the correct URL for the test, using the shared driver.
 *
 * @param playgroundUrl The URL to open for the test, which should be
 *     a Blockly playground with a workspace.
 * @returns A Promise that resolves to a webdriverIO browser that tests can manipulate.
 */
export async function testSetup(
  playgroundUrl: string,
): Promise<webdriverio.Browser> {
  if (!driver) {
    driver = await driverSetup();
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
 *
 * @param target target path
 * @returns posix path
 */
function posixPath(target: string): string {
  const result = target.split(path.sep).join(path.posix.sep);
  console.log(result);
  return result;
}

// Relative to dist folder for TS build
const createTestUrl = (options?: URLSearchParams) => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const base = new URL(
    `file://${posixPath(path.join(dirname, '..', '..', 'build', 'index.html'))}`,
  );
  base.search = options?.toString() ?? '';
  return base.toString();
};

export const testFileLocations = {
  BASE: createTestUrl(),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  BASE_RTL: createTestUrl(new URLSearchParams({rtl: 'true'})),
  GERAS: createTestUrl(new URLSearchParams({renderer: 'geras'})),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  GERAS_RTL: createTestUrl(
    new URLSearchParams({renderer: 'geras', rtl: 'true'}),
  ),
};

/**
 * Copied from blockly browser test_setup.mjs and amended for typescript
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the ID of the currently selected block.
 */
export async function getSelectedBlockId(browser: WebdriverIO.Browser) {
  return await browser.execute(() => {
    // Note: selected is an ICopyable and I am assuming that it is a BlockSvg.
    return Blockly.common.getSelected()?.id;
  });
}

export interface ElementWithId extends WebdriverIO.Element {
  id: string;
}

/**
 * Copied from blockly browser test_setup.mjs and amended for typescript
 *
 * @param browser The active WebdriverIO Browser object.
 * @param id The ID of the Blockly block to search for.
 * @returns A Promise that resolves to the root SVG element of the block with
 *     the given ID, as an interactable browser element.
 */
export async function getBlockElementById(
  browser: WebdriverIO.Browser,
  id: string,
) {
  const elem = (await browser.$(
    `[data-id="${id}"]`,
  )) as unknown as ElementWithId;
  elem['id'] = id;
  return elem;
}

/**
 * Copied from blockly browser test_setup.mjs and amended for typescript
 *
 * Find a clickable element on the block and click it.
 * We can't always use the block's SVG root because clicking will always happen
 * in the middle of the block's bounds (including children) by default, which
 * causes problems if it has holes (e.g. statement inputs). Instead, this tries
 * to get the first text field on the block. It falls back on the block's SVG root.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param block The block to click, as an interactable element.
 * @param clickOptions The options to pass to webdriverio's element.click function.
 * @return A Promise that resolves when the actions are completed.
 */
export async function clickBlock(
  browser: WebdriverIO.Browser,
  block: ElementWithId,
  clickOptions: webdriverio.ClickOptions,
) {
  const findableId = 'clickTargetElement';
  // In the browser context, find the element that we want and give it a findable ID.
  await browser.execute(
    (blockId, newElemId) => {
      const block = Blockly.getMainWorkspace().getBlockById(blockId);
      if (block) {
        for (const input of block.inputList) {
          for (const field of input.fieldRow) {
            if (field instanceof Blockly.FieldLabel) {
              const fieldSvg = field.getSvgRoot();
              if (fieldSvg) {
                fieldSvg.id = newElemId;
                return;
              }
            }
          }
        }
      }
      // No label field found. Fall back to the block's SVG root.
      (block as Blockly.BlockSvg).getSvgRoot().id = findableId;
    },
    block.id,
    findableId,
  );

  // In the test context, get the Webdriverio Element that we've identified.
  const elem = await browser.$(`#${findableId}`);

  await elem.click(clickOptions);

  // In the browser context, remove the ID.
  await browser.execute((elemId) => {
    const clickElem = document.getElementById(elemId);
    clickElem?.removeAttribute('id');
  }, findableId);
}
