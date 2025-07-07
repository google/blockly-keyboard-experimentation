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
} from './test_setup.js';

suite('Menus test', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Menu action opens menu', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Collapse Block'),
      'The menu should be openable on a block',
    );
  });

  test('Menu action returns true in the toolbox', async function () {
    // Navigate to draw_circle_1.
    await tabNavigateToWorkspace(this.browser);
    await focusOnBlock(this.browser, 'draw_circle_1');
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
      await contextMenuExists(this.browser, 'Collapse Block', true),
      'The menu should not be openable during a move',
    );
  });
});
