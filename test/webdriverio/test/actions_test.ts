/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {Key} from 'webdriverio';
import {
  clickBlock,
  contextMenuExists,
  moveToToolboxCategory,
  PAUSE_TIME,
  focusOnBlock,
  focusWorkspace,
  rightClickOnFlyoutBlockType,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
  sendKeyAndWait,
  keyRight,
  contextMenuItems,
} from './test_setup.js';

const isDarwin = process.platform === 'darwin';

const blockActionsViaKeyboard = [
  {'text': 'Duplicate D'},
  {'text': 'Add Comment'},
  {'text': 'External Inputs'},
  {'text': 'Collapse Block'},
  {'text': 'Disable Block'},
  {'text': 'Delete 2 Blocks Delete'},
  {'text': 'Move Block M'},
  {'text': 'Edit Block contents Right'},
  {'text': isDarwin ? 'Cut ⌘ X' : 'Cut Ctrl + X'},
  {'text': isDarwin ? 'Copy ⌘ C' : 'Copy Ctrl + C'},
  {'disabled': true, 'text': isDarwin ? 'Paste ⌘ V' : 'Paste Ctrl + V'},
];

const blockActionsViaMouse = [
  {'text': 'Duplicate D'},
  {'text': 'Add Comment'},
  {'text': 'External Inputs'},
  {'text': 'Collapse Block'},
  {'text': 'Disable Block'},
  {'text': 'Delete 2 Blocks Delete'},
  {'text': isDarwin ? 'Cut ⌘ X' : 'Cut Ctrl + X'},
  {'text': isDarwin ? 'Copy ⌘ C' : 'Copy Ctrl + C'},
  {'disabled': true, 'text': isDarwin ? 'Paste ⌘ V' : 'Paste Ctrl + V'},
];

const shadowBlockActionsViaKeyboard = [
  {'text': 'Add Comment'},
  {'text': 'Collapse Block'},
  {'text': 'Disable Block'},
  {'text': 'Help'},
  {'text': 'Move Block M'},
  {'text': 'Edit Block contents Right'},
  {'disabled': true, 'text': isDarwin ? 'Cut ⌘ X' : 'Cut Ctrl + X'},
  {'text': isDarwin ? 'Copy ⌘ C' : 'Copy Ctrl + C'},
  {'disabled': true, 'text': isDarwin ? 'Paste ⌘ V' : 'Paste Ctrl + V'},
];

const toolboxBlockActionsViaKeyboard = [
  {'text': 'Help'},
  {'disabled': true, 'text': 'Move Block M'},
  {'disabled': true, 'text': isDarwin ? 'Cut ⌘ X' : 'Cut Ctrl + X'},
  {'text': isDarwin ? 'Copy ⌘ C' : 'Copy Ctrl + C'},
];

const flyoutBlockActionsViaMouse = [
  {'text': 'Help'},
  {'disabled': true, 'text': isDarwin ? 'Cut ⌘ X' : 'Cut Ctrl + X'},
  {'text': isDarwin ? 'Copy ⌘ C' : 'Copy Ctrl + C'},
];

const workspaceActionsViaKeyboard = [
  {'disabled': true, 'text': 'Undo'},
  {'disabled': true, 'text': 'Redo'},
  {'text': 'Clean up Blocks'},
  {'text': 'Collapse Blocks'},
  {'disabled': true, 'text': 'Expand Blocks'},
  {'text': 'Delete 14 Blocks'},
  {'text': 'Add Comment'},
  {'disabled': true, 'text': isDarwin ? 'Paste ⌘ V' : 'Paste Ctrl + V'},
];

suite('Menus test', function () {
  // Disable timeouts when non-zero PAUSE_TIME is used to watch tests run.
  if (PAUSE_TIME) this.timeout(0);

  // Clear the workspace and load start blocks.
  setup(async function () {
    // This is the first test suite, which must wait for Chrome +
    // chromedriver to start up, which can be slow—perhaps a few
    // seconds.  Allow 30s just in case.
    this.timeout(30000);

    this.browser = await testSetup(testFileLocations.MORE_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Menu action via keyboard on block opens menu', async function () {
    // Navigate to draw_circle_1.
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await sendKeyAndWait(this.browser, [Key.Ctrl, Key.Return]);

    chai.assert.deepEqual(
      await contextMenuItems(this.browser),
      blockActionsViaKeyboard,
    );
  });

  test('Block menu via mouse displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    await clickBlock(this.browser, 'draw_circle_1', {button: 'right'});

    chai.assert.deepEqual(
      await contextMenuItems(this.browser),
      blockActionsViaMouse,
    );
  });

  test('Shadow block menu via keyboard displays expected items', async function () {
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'text_print_1');
    await this.browser.keys(Key.ArrowRight);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      await contextMenuItems(this.browser),
      shadowBlockActionsViaKeyboard,
    );
  });

  test('Menu action on block in the toolbox', async function () {
    await tabNavigateToWorkspace(this.browser);
    // Navigate to a toolbox category
    await moveToToolboxCategory(this.browser, 'Functions');
    // Move to flyout.
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, [Key.Ctrl, Key.Return]);

    chai.assert.deepEqual(
      await contextMenuItems(this.browser),
      toolboxBlockActionsViaKeyboard,
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
      await contextMenuItems(this.browser),
      flyoutBlockActionsViaMouse,
    );
  });

  test('Menu on workspace', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await sendKeyAndWait(this.browser, 'w');
    await sendKeyAndWait(this.browser, [Key.Ctrl, Key.Return]);

    chai.assert.deepEqual(
      await contextMenuItems(this.browser),
      workspaceActionsViaKeyboard,
    );
  });

  test('Menu on block during drag is not shown', async function () {
    // Navigate to draw_circle_1.
    await focusOnBlock(this.browser, 'draw_circle_1');
    // Start moving the block
    await sendKeyAndWait(this.browser, 'm');
    await sendKeyAndWait(this.browser, [Key.Ctrl, Key.Return]);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Collapse Block', true),
      'The menu should not be openable during a move',
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
    await clickBlock(this.browser, 'draw_circle_1', {button: 'right'});
    await this.browser.pause(PAUSE_TIME);
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate', /* reverse= */ true),
      'The menu should be closed',
    );
  });
});
