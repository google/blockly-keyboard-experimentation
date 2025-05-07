/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  setCurrentCursorNodeById,
  setCurrentCursorNodeByIdAndFieldName,
  getCurrentFocusNodeId,
  getFocusedConnectionType,
  getFocusedFieldName,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite('Keyboard navigation on Blocks', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  suiteSetup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
  });

  test('Default workspace', async function () {
    const blockCount = await this.browser.execute(() => {
      return Blockly.getMainWorkspace().getAllBlocks(false).length;
    });

    chai.assert.equal(blockCount, 16);
  });

  test('Selected block', async function () {
    await tabNavigateToWorkspace(this.browser);

    for (let i = 0; i < 14; i++) {
      await this.browser.keys(Key.ArrowDown);
      await this.browser.pause(PAUSE_TIME);
    }

    const selectedId = await this.browser.execute(() => {
      return Blockly.common.getSelected()?.id;
    });
    chai.assert.equal(selectedId, 'controls_repeat_1');
  });

  test('Down from statement block selects next connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test("Up from statement block selects previous block's connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('draw_emoji_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test('Down from parent block selects input connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_setup_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);
    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_setup_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test('Up from child block selects input connection', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);
    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_setup_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test('Right from block selects first field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(await getFocusedFieldName(this.browser), 'WIDTH');
  });

  test('Right from block selects first inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'colour_picker_1',
    );
  });

  test('Up from inline input selects statement block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'controls_repeat_ext_1',
    );
  });

  test('Left from first inline input selects block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'math_modulo_1',
    );
  });

  test('Right from first inline input selects second inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'math_number_3',
    );
  });

  test('Left from second inline input selects first inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_3');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'math_number_2',
    );
  });

  // Test will fail until we update to a newer version of field-colour
  test.skip("Right from last inline input selects block's next connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('simple_circle_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  // Test will fail until we update to a newer version of field-colour
  test.skip("Down from inline input selects block's next connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('simple_circle_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test("Down from inline input selects block's child connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_repeat_ext_1_connection_');
  });

  // This test fails because the curly quote icons get selected.
  test.skip('Right from text block selects input and skips curly quote icons', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'text_print_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(await getCurrentFocusNodeId(this.browser), 'text_1');

    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'text_print_1',
    );
    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });
});

// These tests fail because focusing on a field doesn't update the cursor
suite.skip('Keyboard navigation on Fields', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  suiteSetup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
  });

  test('Up from first field selects block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'p5_canvas_1',
    );
  });

  test('Left from first field selects block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentFocusNodeId(this.browser),
      'p5_canvas_1',
    );
  });

  test('Right from first field selects second field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(
      await getFocusedFieldName(this.browser),
      'HIGHT',
    );
  });

  test('Left from second field selects first field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'HEIGHT',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(
      await getFocusedFieldName(this.browser),
      'WIDTH',
    );
  });

  test("Right from second field selects block's next connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'HEIGHT',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.containSubset(
      await getCurrentFocusNodeId(this.browser),
      'p5_canvas_1_connection_',
    );
  });

  test("Down from field selects block's next connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.NEXT_STATEMENT,
    );
  });

  test("Down from field selects block's child connection", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'controls_repeat_1',
      'TIMES',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('controls_repeat_1_connection_');

    chai.assert.equal(
      await getFocusedConnectionType(this.browser),
      Blockly.ConnectionType.INPUT_VALUE,
    );
  });

});
