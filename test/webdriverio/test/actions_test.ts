/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {Key} from 'webdriverio';
import {
  contextMenuExists,
  moveToToolboxCategory,
  PAUSE_TIME,
  focusOnBlock,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
  keyRight,
  contextMenuItems,
} from './test_setup.js';

suite('Menus test', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Menu on block', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      process.platform === 'darwin'
        ? [
            {'text': 'Duplicate D'},
            {'text': 'Add Comment'},
            {'text': 'External Inputs'},
            {'text': 'Collapse Block'},
            {'text': 'Disable Block'},
            {'text': 'Delete 2 Blocks Delete'},
            {'text': 'Move Block M'},
            {'text': 'Edit Block contents Right'},
            {'text': 'Cut ⌘ X'},
            {'text': 'Copy ⌘ C'},
            {'disabled': true, 'text': 'Paste ⌘ V'},
          ]
        : [
            {'text': 'Duplicate D'},
            {'text': 'Add Comment'},
            {'text': 'External Inputs'},
            {'text': 'Collapse Block'},
            {'text': 'Disable Block'},
            {'text': 'Delete 2 Blocks Delete'},
            {'text': 'Move Block M'},
            {'text': 'Edit Block contents Right'},
            {'text': 'Cut Ctrl + X'},
            {'text': 'Copy Ctrl + C'},
            {'disabled': true, 'text': 'Paste Ctrl + V'},
          ],
      await contextMenuItems(this.browser),
    );
  });

  test('Menu on block in the toolbox', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    // Navigate to a toolbox category
    await moveToToolboxCategory(this.browser, 'Functions');
    // Move to flyout.
    await keyRight(this.browser);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      process.platform === 'darwin'
        ? [
            {'text': 'Help'},
            {'disabled': true, 'text': 'Move Block M'},
            {'disabled': true, 'text': 'Cut ⌘ X'},
            {'text': 'Copy ⌘ C'},
          ]
        : [
            {'text': 'Help'},
            {'disabled': true, 'text': 'Move Block M'},
            {'disabled': true, 'text': 'Cut Ctrl + X'},
            {'text': 'Copy Ctrl + C'},
          ],
      await contextMenuItems(this.browser),
    );
  });

  test('Menu on workspace', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await this.browser.keys('w');
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.deepEqual(
      process.platform === 'darwin'
        ? [
            {'disabled': true, 'text': 'Undo'},
            {'disabled': true, 'text': 'Redo'},
            {'text': 'Clean up Blocks'},
            {'text': 'Collapse Blocks'},
            {'disabled': true, 'text': 'Expand Blocks'},
            {'text': 'Delete 4 Blocks'},
            {'text': 'Add Comment'},
            {'disabled': true, 'text': 'Paste ⌘ V'},
          ]
        : [
            {'disabled': true, 'text': 'Undo'},
            {'disabled': true, 'text': 'Redo'},
            {'text': 'Clean up Blocks'},
            {'text': 'Collapse Blocks'},
            {'disabled': true, 'text': 'Expand Blocks'},
            {'text': 'Delete 4 Blocks'},
            {'text': 'Add Comment'},
            {'disabled': true, 'text': 'Paste Ctrl + V'},
          ],
      await contextMenuItems(this.browser),
    );
  });

  test('Menu on block during drag is not shown', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    // Start moving the block
    await this.browser.keys('m');
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Collapse Block', true),
      'The menu should not be openable during a move',
    );
  });
});
