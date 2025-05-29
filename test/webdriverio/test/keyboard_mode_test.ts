/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  focusOnBlock,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  getBlockElementById,
  tabNavigateToWorkspace,
} from './test_setup.js';
import {Key} from 'webdriverio';

const isKeyboardNavigating = function (browser: WebdriverIO.Browser) {
  return browser.execute(() => {
    return document.body.classList.contains('blocklyKeyboardNavigation');
  });
};

suite(
  'Keyboard navigation mode set on mouse or keyboard interaction',
  function () {
    // Setting timeout to unlimited as these tests take a longer time to run than most mocha tests
    this.timeout(0);

    setup(async function () {
      // Reload the page between tests
      this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);

      await this.browser.pause(PAUSE_TIME);

      // Reset the keyboard navigation state between tests.
      await this.browser.execute(() => {
        Blockly.keyboardNavigationController.setIsActive(false);
      });

      // Start with the workspace focused.
      await tabNavigateToWorkspace(this.browser);
    });

    test('T to open toolbox enables keyboard mode', async function () {
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys('t');
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('M for move mode enables keyboard mode', async function () {
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys('m');

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('W for workspace cursor enables keyboard mode', async function () {
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys('w');
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('X to disconnect enables keyboard mode', async function () {
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys('x');
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('Copy does not change keyboard mode state', async function () {
      // Make sure we're on a copyable block so that copy occurs
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys(Key.Ctrl);
      await this.browser.keys('c');
      await this.browser.keys(Key.Ctrl); // release ctrl key
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isFalse(await isKeyboardNavigating(this.browser));

      this.browser.execute(() => {
        Blockly.keyboardNavigationController.setIsActive(true);
      });

      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys(Key.Ctrl);
      await this.browser.keys('c');
      await this.browser.keys(Key.Ctrl); // release ctrl key
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('Delete does not change keyboard mode state', async function () {
      // Make sure we're on a deletable block so that delete occurs
      await focusOnBlock(this.browser, 'controls_if_2');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys(Key.Backspace);
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isFalse(await isKeyboardNavigating(this.browser));

      this.browser.execute(() => {
        Blockly.keyboardNavigationController.setIsActive(true);
      });

      // Focus a different deletable block
      await focusOnBlock(this.browser, 'controls_if_1');
      await this.browser.pause(PAUSE_TIME);
      await this.browser.keys(Key.Backspace);
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isTrue(await isKeyboardNavigating(this.browser));
    });

    test('Right clicking a block disables keyboard mode', async function () {
      await this.browser.execute(() => {
        Blockly.keyboardNavigationController.setIsActive(true);
      });

      await this.browser.pause(PAUSE_TIME);
      // Right click a block
      const element = await getBlockElementById(this.browser, 'controls_if_1');
      await element.click({button: 'right'});
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isFalse(await isKeyboardNavigating(this.browser));
    });

    test('Dragging a block with mouse disables keyboard mode', async function () {
      await this.browser.execute(() => {
        Blockly.keyboardNavigationController.setIsActive(true);
      });

      await this.browser.pause(PAUSE_TIME);
      // Drag a block
      const element = await getBlockElementById(this.browser, 'controls_if_1');
      await element.dragAndDrop({x: 10, y: 10});
      await this.browser.pause(PAUSE_TIME);

      chai.assert.isFalse(await isKeyboardNavigating(this.browser));
    });
  },
);
