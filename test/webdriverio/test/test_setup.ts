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
  NAVIGATION_TEST_BLOCKS: createTestUrl(
    new URLSearchParams({scenario: 'navigationTestBlocks'}),
  ),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MOVE_TEST_BLOCKS: createTestUrl(
    new URLSearchParams({scenario: 'moveTestBlocks'}),
  ),
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

/**
 * Clicks in the workspace to focus it.
 *
 * @param browser The active WebdriverIO Browser object.
 */
export async function focusWorkspace(browser: WebdriverIO.Browser) {
  const workspaceElement = await browser.$(
    '#blocklyDiv > div > svg.blocklySvg > g',
  );
  await workspaceElement.click();
}

/**
 * Focuses the toolbox category with the given name.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param category The name of the toolbox category to focus.
 */
export async function moveToToolboxCategory(
  browser: WebdriverIO.Browser,
  category: string,
) {
  await browser.keys('t');
  const categoryIndex = await browser.execute((category) => {
    const all = Array.from(
      document.querySelectorAll('.blocklyToolboxCategoryLabel'),
    ).map((node) => node.textContent);
    return all.indexOf(category);
  }, category);
  if (categoryIndex < 0) {
    throw new Error(`No category found: ${category}`);
  }
  if (categoryIndex > 0) await keyDown(browser, categoryIndex);
}

/**
 * Returns whether the workspace contains a block with the given id.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param blockId The id of the block.
 */
export async function blockIsPresent(
  browser: WebdriverIO.Browser,
  blockId: string,
): Promise<boolean> {
  return await browser.execute((blockId) => {
    const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const block = workspaceSvg.getBlockById(blockId);
    return block !== null;
  }, blockId);
}

/**
 * Returns whether the main workspace is the current focus.
 *
 * @param browser The active WebdriverIO Browser object.
 */
export async function currentFocusIsMainWorkspace(
  browser: WebdriverIO.Browser,
): Promise<boolean> {
  return await browser.execute(() => {
    const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    return Blockly.getFocusManager().getFocusedNode() === workspaceSvg;
  });
}

/**
 * Focuses and selects a block with the provided ID.
 *
 * This throws an error if no block exists for the specified ID.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param blockId The ID of the block to select.
 */
export async function focusOnBlock(
  browser: WebdriverIO.Browser,
  blockId: string,
) {
  return await browser.execute((blockId) => {
    const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    const block = workspaceSvg.getBlockById(blockId);
    if (!block) throw new Error(`No block found with ID: ${blockId}.`);
    Blockly.getFocusManager().focusNode(block);
  }, blockId);
}

/**
 * Focuses and selects the field of a block given a block ID and field name.
 *
 * This throws an error if no block exists for the specified ID, or if the block
 * corresponding to the specified ID has no field with the provided name.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param blockId The ID of the block to select.
 * @param fieldName The name of the field on the block to select.
 */
export async function focusOnBlockField(
  browser: WebdriverIO.Browser,
  blockId: string,
  fieldName: string,
) {
  return await browser.execute(
    (blockId, fieldName) => {
      const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
      const block = workspaceSvg.getBlockById(blockId);
      if (!block) throw new Error(`No block found with ID: ${blockId}.`);
      const field = block.getField(fieldName);
      if (!field) {
        throw new Error(`No field found: ${fieldName} (block ${blockId}).`);
      }
      Blockly.getFocusManager().focusNode(field);
    },
    blockId,
    fieldName,
  );
}

/**
 * Get the ID of the node that is currently focused.
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the ID of the current cursor node.
 */
export async function getCurrentFocusNodeId(
  browser: WebdriverIO.Browser,
): Promise<string | undefined> {
  return await browser.execute(() => {
    return Blockly.getFocusManager().getFocusedNode()?.getFocusableElement()
      ?.id;
  });
}

/**
 * Get the ID of the block that is currently focused.
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the ID of the currently focused block.
 */
export async function getCurrentFocusedBlockId(
  browser: WebdriverIO.Browser,
): Promise<string | undefined> {
  return await browser.execute(() => {
    const focusedNode = Blockly.getFocusManager().getFocusedNode();
    if (focusedNode && focusedNode instanceof Blockly.BlockSvg) {
      return focusedNode.id;
    }
    return undefined;
  });
}

/**
 * Get the block type of the current focused node. Assumes the current node
 * is a block.
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the block type of the current cursor
 * node.
 */
export async function getFocusedBlockType(
  browser: WebdriverIO.Browser,
): Promise<string | undefined> {
  return await browser.execute(() => {
    const block = Blockly.getFocusManager().getFocusedNode() as
      | Blockly.BlockSvg
      | undefined;
    return block?.type;
  });
}

/**
 * Get the connection type of the current focused node. Assumes the current node
 * is a connection.
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the connection type of the current cursor
 * node.
 */
export async function getFocusedConnectionType(
  browser: WebdriverIO.Browser,
): Promise<number | undefined> {
  return await browser.execute(() => {
    const connection =
      Blockly.getFocusManager().getFocusedNode() as Blockly.RenderedConnection;
    return connection.type;
  });
}

/**
 * Get the field name of the current focused node. Assumes the current node
 * is a field.
 *
 * @param browser The active WebdriverIO Browser object.
 * @returns A Promise that resolves to the field name of the current focused
 * node.
 */
export async function getFocusedFieldName(
  browser: WebdriverIO.Browser,
): Promise<string | undefined> {
  return await browser.execute(() => {
    const field = Blockly.getFocusManager().getFocusedNode() as Blockly.Field;
    return field.name;
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
 * Uses tabs to navigate to the workspace on the test page (i.e. by going
 * through top-level tab stops).
 *
 * @param browser The active WebdriverIO Browser object.
 * @param hasToolbox Whether a toolbox is configured on the test page.
 * @param hasFlyout Whether a flyout is configured on the test page.
 */
export async function tabNavigateToWorkspace(
  browser: WebdriverIO.Browser,
  hasToolbox = true,
  hasFlyout = true,
) {
  // Navigate past the initial pre-injection focusable div element.
  tabNavigateForward(browser);
  if (hasToolbox) tabNavigateForward(browser);
  if (hasFlyout) tabNavigateForward(browser);
  tabNavigateForward(browser); // Tab to the workspace itself.
}

/**
 * Navigates forward to the test page's next tab stop.
 *
 * @param browser The active WebdriverIO Browser object.
 */
export async function tabNavigateForward(browser: WebdriverIO.Browser) {
  await browser.keys(webdriverio.Key.Tab);
  await browser.pause(PAUSE_TIME);
}

/**
 * Navigates backward to the test page's previous tab stop.
 *
 * @param browser The active WebdriverIO Browser object.
 */
export async function tabNavigateBackward(browser: WebdriverIO.Browser) {
  await browser.keys([webdriverio.Key.Shift, webdriverio.Key.Tab]);
  await browser.pause(PAUSE_TIME);
}

/**
 * Sends the keyboard event for arrow key left.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param times The number of times to repeat the key press (default is 1).
 */
export async function keyLeft(browser: WebdriverIO.Browser, times = 1) {
  await sendKeyAndWait(browser, webdriverio.Key.ArrowLeft, times);
}

/**
 * Sends the keyboard event for arrow key right.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param times The number of times to repeat the key press (default is 1).
 */
export async function keyRight(browser: WebdriverIO.Browser, times = 1) {
  await sendKeyAndWait(browser, webdriverio.Key.ArrowRight, times);
}

/**
 * Sends the keyboard event for arrow key up.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param times The number of times to repeat the key press (default is 1).
 */
export async function keyUp(browser: WebdriverIO.Browser, times = 1) {
  await sendKeyAndWait(browser, webdriverio.Key.ArrowUp, times);
}

/**
 * Sends the keyboard event for arrow key down.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param times The number of times to repeat the key press (default is 1).
 */
export async function keyDown(browser: WebdriverIO.Browser, times = 1) {
  await sendKeyAndWait(browser, webdriverio.Key.ArrowDown, times);
}

/**
 * Sends the specified key for the specified number of times, waiting between
 * each key press to allow changes to keep up.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param key The WebdriverIO representative key value to press.
 * @param times The number of times to repeat the key press.
 */
async function sendKeyAndWait(
  browser: WebdriverIO.Browser,
  key: string,
  times: number,
) {
  for (let i = 0; i < times; i++) {
    await browser.keys(key);
    await browser.pause(PAUSE_TIME);
  }
}

/**
 * Returns whether there's a drag in progress on the main workspace.
 *
 * @param browser The active WebdriverIO Browser object.
 */
export async function isDragging(
  browser: WebdriverIO.Browser,
): Promise<boolean> {
  return await browser.execute(() => {
    const workspaceSvg = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
    return workspaceSvg.isDragging();
  });
}

/**
 * Returns the result of the specified action precondition.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param action The action to check the precondition for.
 */
export async function checkActionPrecondition(
  browser: WebdriverIO.Browser,
  action: string,
): Promise<boolean> {
  return await browser.execute((action) => {
    const node = Blockly.getFocusManager().getFocusedNode();
    let workspace;
    if (node instanceof Blockly.BlockSvg) {
      workspace = node.workspace as Blockly.WorkspaceSvg;
    } else if (node instanceof Blockly.Workspace) {
      workspace = node as Blockly.WorkspaceSvg;
    } else if (node instanceof Blockly.Field) {
      workspace = node.getSourceBlock()?.workspace as Blockly.WorkspaceSvg;
    }

    if (!workspace) {
      throw new Error('Unable to derive workspace from focused node');
    }
    const actionItem = Blockly.ShortcutRegistry.registry.getRegistry()[action];
    if (!actionItem || !actionItem.preconditionFn) {
      throw new Error(
        `No registered action or missing precondition: ${action}`,
      );
    }
    return actionItem.preconditionFn(workspace, {
      focusedNode: node ?? undefined,
    });
  }, action);
}

/**
 * Wait for the specified context menu item to exist.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param itemText The display text of the context menu item to click.
 * @param reverse Whether to check for non-existence instead.
 * @return A Promise that resolves when the actions are completed.
 */
export async function contextMenuExists(
  browser: WebdriverIO.Browser,
  itemText: string,
  reverse = false,
): Promise<boolean> {
  const item = await browser.$(`div=${itemText}`);
  return await item.waitForExist({timeout: 200, reverse: reverse});
}

/**
 * Get a list of the text content of each displayed context menu item.
 *
 * Omits any keyboard shortcuts inside parentheses from all item text for
 * testing consistency across platforms.
 *
 * @param browser The active WebdriverIO Browser object.
 * @return A list of the text content of each displayed context menu item.
 */
export async function getContextMenuItemNames(
  browser: WebdriverIO.Browser,
): Promise<string[]> {
  const items = await browser.$$(`.blocklyContextMenu .blocklyMenuItemContent`);
  return await items.map(async (e) =>
    (await e.getText()).replace(/\s*\([^)]+\)/, ''),
  );
}

/**
 * Right-clicks on a block with the provided ID in the main workspace.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param blockId The ID of the block to right click on.
 */
export async function rightClickOnBlock(
  browser: WebdriverIO.Browser,
  blockId: string,
) {
  const elem = await browser.$(`.blocklySvg [data-id="${blockId}"]`);
  // Click 15 pixels in from the top left corner of the block.
  const x = Math.round(15 - (await elem.getSize('width')) / 2);
  const y = Math.round(15 - (await elem.getSize('height')) / 2);
  await elem.click({button: 'right', x: x, y: y});
}

/**
 * Right-clicks on a block with the provided type in the flyout.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param blockType The name of the type block to right click on.
 */
export async function rightClickOnFlyoutBlockType(
  browser: WebdriverIO.Browser,
  blockType: string,
) {
  const elem = await browser.$(`.blocklyFlyout .${blockType}`);
  await elem.click({button: 'right'});
}

/**
 * Uses the keyboard to activate an action, assuming the context menu is already open.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param actionLabel Any unique substring of the action's label text.
 */
export async function doActionViaKeyboard(
  browser: WebdriverIO.Browser,
  actionLabel: string,
) {
  const items = await browser.$$(`.blocklyContextMenu .blocklyMenuItem`);
  let selectedIndex = await items.findIndex(async (e) =>
    (await e.getAttribute('class')).includes('blocklyMenuItemHighlight'),
  );
  const targetIndex = await items.findIndex(async (e) =>
    (await e.getText()).includes(actionLabel),
  );
  while (selectedIndex < targetIndex) {
    await browser.keys(webdriverio.Key.ArrowDown);
    selectedIndex++;
  }
  while (selectedIndex > targetIndex) {
    await browser.keys(webdriverio.Key.ArrowUp);
    selectedIndex--;
  }
  await browser.keys(webdriverio.Key.Return);
}

/**
 * Clicks on an action item with the given text, assuming the context menu is already open.
 *
 * @param browser The active WebdriverIO Browser object.
 * @param actionLabel Any unique substring of the action's label text.
 */
export async function clickOnAction(
  browser: WebdriverIO.Browser,
  actionLabel: string,
) {
  const items = await browser.$$(`.blocklyContextMenu .blocklyMenuItemContent`);
  for (const item of items) {
    if ((await item.getText()).includes(actionLabel)) {
      await item.click();
      return;
    }
  }
}
