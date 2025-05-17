/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {
  blockIsPresent,
  currentFocusIsMainWorkspace,
  setCurrentCursorNodeById,
  getCurrentFocusNodeId,
  getFocusedBlockType,
  moveToToolboxCategory,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite.only('Deleting Blocks', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  setup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Deleting block selects previous connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'controls_if_2');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'controls_if_2'))
      .equal(true);

    await this.browser.keys(Key.Backspace);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'controls_if_2'))
      .equal(false);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_if_1_connection_');
  });

  test('Cutting block selects previous connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'controls_if_2');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'controls_if_2'))
      .equal(true);

    await this.browser.keys([Key.Ctrl, 'x']);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'controls_if_2'))
      .equal(false);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_if_1_connection_');
  });

  test('Deleting block also deletes children and inputs', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'controls_if_2');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(true);
    chai.expect(await blockIsPresent(this.browser, 'text_print_1')).equal(true);

    await this.browser.keys(Key.Backspace);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(false);
    chai
      .expect(await blockIsPresent(this.browser, 'text_print_1'))
      .equal(false);
  });

  test('Cutting block also removes children and inputs', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'controls_if_2');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(true);
    chai.expect(await blockIsPresent(this.browser, 'text_print_1')).equal(true);

    await this.browser.keys([Key.Ctrl, 'x']);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(false);
    chai
      .expect(await blockIsPresent(this.browser, 'text_print_1'))
      .equal(false);
  });

  test('Deleting inline input selects parent connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'logic_boolean_1');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(true);

    await this.browser.keys(Key.Backspace);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(false);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_if_2_connection_');
  });

  test('Cutting inline input selects parent connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'logic_boolean_1');
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(true);

    await this.browser.keys([Key.Ctrl, 'x']);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await blockIsPresent(this.browser, 'logic_boolean_1'))
      .equal(false);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_if_2_connection_');
  });

  test('Deleting stranded block selects workspace', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);

    await moveToToolboxCategory(this.browser, 'Math');
    await this.browser.pause(PAUSE_TIME);
    // Move to flyout.
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);
    // Select number block.
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    // Confirm move.
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal('math_number', await getFocusedBlockType(this.browser));

    await this.browser.keys(Key.Backspace);
    await this.browser.pause(PAUSE_TIME);

    chai.expect(await currentFocusIsMainWorkspace(this.browser)).equal(true);
  });

  test('Cutting stranded block selects workspace', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);

    await moveToToolboxCategory(this.browser, 'Math');
    await this.browser.pause(PAUSE_TIME);
    // Move to flyout.
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);
    // Select number block.
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    // Confirm move.
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal('math_number', await getFocusedBlockType(this.browser));

    await this.browser.keys([Key.Ctrl, 'x']);
    await this.browser.pause(PAUSE_TIME);

    chai.expect(await currentFocusIsMainWorkspace(this.browser)).equal(true);
  });
});
