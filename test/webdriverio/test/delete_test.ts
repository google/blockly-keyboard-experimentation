/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {
  blockIsPresent,
  clickOnAction,
  doActionViaKeyboard,
  focusOnBlock,
  getCurrentFocusedBlockId,
  getFocusedBlockType,
  moveToToolboxCategory,
  rightClickOnBlock,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  keyRight,
  focusOnBlockField,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite('Deleting Blocks', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  const deletionStrategies = [
    {
      strategyName: 'backspace',
      deletionStrategy: async (browser: WebdriverIO.Browser) =>
        await browser.keys(Key.Backspace),
    },
    {
      strategyName: 'cut',
      deletionStrategy: async (browser: WebdriverIO.Browser) =>
        await browser.keys([Key.Ctrl, 'x']),
    },
    {
      strategyName: 'keyboard action',
      deletionStrategy: async (browser: WebdriverIO.Browser) => {
        await browser.keys([Key.Ctrl, Key.Return]);
        await doActionViaKeyboard(browser, 'Delete');
      },
    },
    {
      strategyName: 'mouse action',
      deletionStrategy: async (browser: WebdriverIO.Browser) => {
        const blockIdToDelete = await getCurrentFocusedBlockId(browser);
        if (blockIdToDelete) {
          await rightClickOnBlock(browser, blockIdToDelete);
          await clickOnAction(browser, 'Delete');
        }
      },
    },
  ];

  setup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });

  for (const {strategyName, deletionStrategy} of deletionStrategies) {
    test(`Deleting block via ${strategyName} selects parent block`, async function () {
      await tabNavigateToWorkspace(this.browser);
      await this.browser.pause(PAUSE_TIME);
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'controls_if_2'))
        .equal(true);

      await deletionStrategy(this.browser);
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'controls_if_2'))
        .equal(false);

      chai
        .expect(await getCurrentFocusedBlockId(this.browser))
        .to.include('controls_if_1');
    });

    test(`Deleting block via ${strategyName} also deletes children and inputs`, async function () {
      await tabNavigateToWorkspace(this.browser);
      await this.browser.pause(PAUSE_TIME);
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
        .equal(true);
      chai
        .expect(await blockIsPresent(this.browser, 'text_print_1'))
        .equal(true);

      await deletionStrategy(this.browser);
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
        .equal(false);
      chai
        .expect(await blockIsPresent(this.browser, 'text_print_1'))
        .equal(false);
    });

    test(`Deleting inline input via ${strategyName} selects parent block`, async function () {
      await tabNavigateToWorkspace(this.browser);
      await this.browser.pause(PAUSE_TIME);
      await focusOnBlock(this.browser, 'logic_boolean_1');
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
        .equal(true);

      await deletionStrategy(this.browser);
      await this.browser.pause(PAUSE_TIME);

      chai
        .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
        .equal(false);

      chai
        .expect(await getCurrentFocusedBlockId(this.browser))
        .to.include('controls_if_2');
    });

    test(`Deleting stranded block via ${strategyName} selects top block`, async function () {
      // Deleting a stranded block should result in the workspace being
      // focused, which then focuses the top block. If that
      // behavior ever changes, this test should be updated as well.
      // We want deleting a block to focus the workspace, whatever that
      // means at the time.
      await tabNavigateToWorkspace(this.browser);
      await this.browser.pause(PAUSE_TIME);

      // The test workspace doesn't already contain a stranded block, so add one.
      await moveToToolboxCategory(this.browser, 'Math');
      await this.browser.pause(PAUSE_TIME);
      // Move to flyout.
      await keyRight(this.browser);
      // Select number block.
      await this.browser.keys(Key.Enter);
      await this.browser.pause(PAUSE_TIME);
      // Confirm move.
      await this.browser.keys(Key.Enter);
      await this.browser.pause(PAUSE_TIME);

      chai.assert.equal('math_number', await getFocusedBlockType(this.browser));

      await deletionStrategy(this.browser);
      await this.browser.pause(PAUSE_TIME);

      chai.assert.equal(
        await getCurrentFocusedBlockId(this.browser),
        'p5_setup_1',
      );
    });

    test(`Do not delete block via ${strategyName} while field editor is open`, async function () {
      // Open a field editor
      await focusOnBlockField(this.browser, 'colour_picker_1', 'COLOUR');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys(Key.Enter);
      await this.browser.pause(PAUSE_TIME);

      // Try to delete block while field editor is open
      await deletionStrategy(this.browser);

      // Block is not deleted
      chai.assert.isTrue(await blockIsPresent(this.browser, 'colour_picker_1'));
    });
  }
});
