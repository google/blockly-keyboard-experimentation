/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  isDragging,
  setCurrentCursorNodeById,
  setCurrentCursorNodeByIdAndFieldName,
  getCurrentFocusNodeId,
  getCurrentFocusedBlockId,
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

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_if_2');
  });

  test('Down from statement block selects next block across stacks', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test('Up from statement block selects previous block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('draw_emoji_1');
  });

  test('Down from parent block selects first child block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_setup_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);
    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_canvas_1');
  });

  test('Up from child block selects parent block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowUp);
    await this.browser.pause(PAUSE_TIME);
    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_setup_1');
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
      await getCurrentFocusedBlockId(this.browser),
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
      await getCurrentFocusedBlockId(this.browser),
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
      await getCurrentFocusedBlockId(this.browser),
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
      await getCurrentFocusedBlockId(this.browser),
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
      await getCurrentFocusedBlockId(this.browser),
      'math_number_2',
    );
  });

  test('Right from last inline input selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_ext_1');
  });

  test('Down from inline input selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_ext_1');
  });

  test("Down from inline input selects block's child block", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'logic_boolean_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowDown);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('text_print_1');
  });

  test('Right from text block selects shadow block then field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'text_print_1');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.equal(await getCurrentFocusedBlockId(this.browser), 'text_1');

    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('text_1_field_');

    await this.browser.keys(Key.ArrowRight);
    await this.browser.pause(PAUSE_TIME);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_1');
  });

  test('Losing focus cancels move', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await setCurrentCursorNodeById(this.browser, 'text_print_1');
    await this.browser.keys('m');
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isTrue(await isDragging(this.browser));

    await this.browser.keys(Key.Tab);
    await this.browser.pause(PAUSE_TIME);

    chai.assert.isFalse(await isDragging(this.browser));
  });
});

// TODO(#499) These tests fail because focusing on a field doesn't update the cursor
suite('Keyboard navigation on Fields', function () {
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
      await getCurrentFocusedBlockId(this.browser),
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
      await getCurrentFocusedBlockId(this.browser),
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

    chai.assert.equal(await getFocusedFieldName(this.browser), 'HEIGHT');
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

    chai.assert.equal(await getFocusedFieldName(this.browser), 'WIDTH');
  });

  test('Right from second field selects next block', async function () {
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

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test('Down from field selects next block', async function () {
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
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test("Down from field selects block's child block", async function () {
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
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('draw_emoji_1');
  });
});
