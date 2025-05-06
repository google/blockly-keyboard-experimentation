/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  focusWorkspace,
  setCurrentCursorNodeById,
  setCurrentCursorNodeByIdAndFieldName,
  getCurrentCursorNodeFieldName,
  getCurrentCursorNodeId,
  getCurrentCursorNodeType,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite('Keyboard navigation', function () {
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
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Down from statement block selects next connection', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test("Up from statement block selects previous block's connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'draw_emoji_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test('Down from parent block selects input connection', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_setup_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(await getCurrentCursorNodeId(this.browser), 'p5_setup_1');
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.INPUT,
    );
  });

  test('Up from child block selects input connection', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(await getCurrentCursorNodeId(this.browser), 'p5_setup_1');
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.INPUT,
    );
  });

  test('Right from block selects first field', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.FIELD,
    );
    chai.assert.equal(
      await getCurrentCursorNodeFieldName(this.browser),
      'WIDTH',
    );
  });

  test('Right from block selects first inline input', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'colour_picker_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Up from first field selects block', async function () {
    await focusWorkspace(this.browser);
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
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Left from first field selects block', async function () {
    await focusWorkspace(this.browser);
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
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Right from first field selects second field', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.FIELD,
    );
    chai.assert.equal(
      await getCurrentCursorNodeFieldName(this.browser),
      'HEIGHT',
    );
  });

  test('Left from second field selects first field', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'HEIGHT',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.FIELD,
    );
    chai.assert.equal(
      await getCurrentCursorNodeFieldName(this.browser),
      'WIDTH',
    );
  });

  test("Right from second field selects block's next connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'HEIGHT',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test("Down from field selects block's next connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'p5_canvas_1',
      'WIDTH',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'p5_canvas_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test("Down from field selects block's child connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeByIdAndFieldName(
      this.browser,
      'controls_repeat_1',
      'TIMES',
    );
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'controls_repeat_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.INPUT,
    );
  });

  test('Up from inline input selects statement block', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'controls_repeat_ext_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Left from first inline input selects block', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'math_modulo_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Right from first inline input selects second inline input', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'math_number_3',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test('Left from second inline input selects first inline input', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_3');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowLeft);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'math_number_2',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );
  });

  test("Right from last inline input selects block's next connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'simple_circle_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test("Down from inline input selects block's next connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'simple_circle_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });

  test("Down from inline input selects block's child connection", async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'controls_repeat_ext_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.INPUT,
    );
  });

  /*
  // This test fails because the curly quote icons get selected.
  test('Right from text block selects input and skips curly quote icons', async function () {
    await focusWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'text_print_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(await getCurrentCursorNodeId(this.browser), 'text_1');
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.BLOCK,
    );

    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(
      await getCurrentCursorNodeId(this.browser),
      'text_print_1',
    );
    chai.assert.equal(
      await getCurrentCursorNodeType(this.browser),
      Blockly.ASTNode.types.NEXT,
    );
  });
  */
});
