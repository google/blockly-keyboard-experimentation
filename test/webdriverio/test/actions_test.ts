/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {Key} from 'webdriverio';
import {
  contextMenuExists,
  getContextMenuItemNames,
  moveToToolboxCategory,
  PAUSE_TIME,
  focusOnBlock,
  focusWorkspace,
  rightClickOnBlock,
  rightClickOnFlyoutBlockType,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
  keyRight,
} from './test_setup.js';

suite('Menus test', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Menu keyboard shortcut on workspace does not open menu', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Undo', /* reverse= */ true),
      'The menu should not be openable on the workspace',
    );
  });

  test('Menu action opens menu', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate'),
      'The menu should be openable on a block',
    );
  });

  test('Menu action returns true in the toolbox', async function () {
    await tabNavigateToWorkspace(this.browser);
    // Navigate to a toolbox category
    await moveToToolboxCategory(this.browser, 'Functions');
    // Move to flyout.
    await keyRight(this.browser);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Help'),
      'The menu should be openable on a block in the toolbox',
    );
  });

  test('Menu action returns false during drag', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    // Start moving the block
    await this.browser.keys('m');
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate', true),
      'The menu should not be openable during a move',
    );
  });

  test('Block menu via keyboard displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      await getContextMenuItemNames(this.browser),
      [
        'Duplicate',
        'Add Comment',
        'External Inputs',
        'Collapse Block',
        'Disable Block',
        'Delete 2 Blocks',
        'Move Block',
        'Edit Block contents',
        'Cut',
        'Copy',
        'Paste',
      ],
      'A block context menu should display certain items',
    );
  });

  test('Block menu via mouse displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    await rightClickOnBlock(this.browser, 'draw_circle_1');

    chai.assert.deepEqual(
      await getContextMenuItemNames(this.browser),
      [
        'Duplicate',
        'Add Comment',
        'External Inputs',
        'Collapse Block',
        'Disable Block',
        'Delete 2 Blocks',
        'Cut',
        'Copy',
        'Paste',
      ],
      'A block context menu should display certain items',
    );
  });

  test('Shadow block menu via keyboard displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1_color');
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      await getContextMenuItemNames(this.browser),
      [
        'Add Comment',
        'Collapse Block',
        'Disable Block',
        'Help',
        'Move Block',
        'Cut',
        'Copy',
        'Paste',
      ],
      'A shadow block context menu should display certain items',
    );
  });

  test('Flyout block menu via keyboard displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    // Navigate to a toolbox category
    await moveToToolboxCategory(this.browser, 'Functions');
    // Move to flyout.
    await keyRight(this.browser);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      await getContextMenuItemNames(this.browser),
      ['Help', 'Move Block', 'Cut', 'Copy', 'Paste'],
      'A flyout block context menu should display certain items',
    );
  });

  test('Flyout block menu via mouse displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    // Navigate to a toolbox category
    await moveToToolboxCategory(this.browser, 'Math');
    // Move to flyout.
    await keyRight(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await rightClickOnFlyoutBlockType(this.browser, 'math_number');
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      await getContextMenuItemNames(this.browser),
      ['Help', 'Cut', 'Copy', 'Paste'],
      'A flyout block context menu should display certain items',
    );
  });

  test('Escape key dismisses menu', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.Escape);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate', /* reverse= */ true),
      'The menu should be closed',
    );
  });

  test('Clicking workspace dismisses menu', async function () {
    await tabNavigateToWorkspace(this.browser);
    await rightClickOnBlock(this.browser, 'create_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate', /* reverse= */ true),
      'The menu should be closed',
    );
  });
});
