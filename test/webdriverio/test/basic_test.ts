/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  isDragging,
  focusOnBlock,
  focusOnBlockField,
  getCurrentFocusNodeId,
  getCurrentFocusedBlockId,
  getFocusedFieldName,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  keyLeft,
  keyRight,
  keyUp,
  keyDown,
  sendKeyAndWait,
  isEphemeralFocusActive,
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
    await this.browser.pause(PAUSE_TIME);

    await keyDown(this.browser, 14);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_if_2');
  });

  test('Down from statement block selects next block across stacks', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test('Up from statement block selects previous block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await keyUp(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('draw_emoji_1');
  });

  test('Down from parent block selects first child block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'p5_setup_1');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);
    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_canvas_1');
  });

  test('Up from child block selects parent block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await keyUp(this.browser);
    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_setup_1');
  });

  test('Right from block selects first field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(await getFocusedFieldName(this.browser), 'WIDTH');
  });

  test('Right from block selects first inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'simple_circle_1');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'colour_picker_1',
    );
  });

  test('Up from inline input selects statement block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await keyUp(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'controls_repeat_ext_1',
    );
  });

  test('Left from first inline input selects block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await keyLeft(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'math_modulo_1',
    );
  });

  test('Right from first inline input selects second inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'math_number_2');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'math_number_3',
    );
  });

  test('Left from second inline input selects first inline input', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'math_number_3');
    await this.browser.pause(PAUSE_TIME);
    await keyLeft(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'math_number_2',
    );
  });

  test('Right from last inline input selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_ext_1');
  });

  test('Down from inline input selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'colour_picker_1');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_ext_1');
  });

  test("Down from inline input selects block's child block", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'logic_boolean_1');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('text_print_1');
  });

  test('Right from text block selects shadow block then field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'text_print_1');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai.assert.equal(await getCurrentFocusedBlockId(this.browser), 'text_1');

    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('text_1_field_');

    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('controls_repeat_1');
  });

  test('Losing focus cancels move', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlock(this.browser, 'text_print_1');
    await sendKeyAndWait(this.browser, 'm');

    chai.assert.isTrue(await isDragging(this.browser));

    await sendKeyAndWait(this.browser, Key.Tab);

    chai.assert.isFalse(await isDragging(this.browser));
  });
});

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
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'WIDTH');
    await this.browser.pause(PAUSE_TIME);
    await keyUp(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'p5_canvas_1',
    );
  });

  test('Left from first field selects block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'WIDTH');
    await this.browser.pause(PAUSE_TIME);
    await keyLeft(this.browser);

    chai.assert.equal(
      await getCurrentFocusedBlockId(this.browser),
      'p5_canvas_1',
    );
  });

  test('Right from first field selects second field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'WIDTH');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(await getFocusedFieldName(this.browser), 'HEIGHT');
  });

  test('Left from second field selects first field', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'HEIGHT');
    await this.browser.pause(PAUSE_TIME);
    await keyLeft(this.browser);

    chai
      .expect(await getCurrentFocusNodeId(this.browser))
      .to.include('p5_canvas_1_field_');

    chai.assert.equal(await getFocusedFieldName(this.browser), 'WIDTH');
  });

  test('Right from second field selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'HEIGHT');
    await this.browser.pause(PAUSE_TIME);
    await keyRight(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test('Down from field selects next block', async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'p5_canvas_1', 'WIDTH');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('p5_draw_1');
  });

  test("Down from field selects block's child block", async function () {
    await tabNavigateToWorkspace(this.browser);
    await this.browser.pause(PAUSE_TIME);
    await focusOnBlockField(this.browser, 'controls_repeat_1', 'TIMES');
    await this.browser.pause(PAUSE_TIME);
    await keyDown(this.browser);

    chai
      .expect(await getCurrentFocusedBlockId(this.browser))
      .equal('draw_emoji_1');
  });

  test('Do not navigate while field editor is open', async function () {
    // Open a field editor dropdown
    await focusOnBlockField(this.browser, 'logic_boolean_1', 'BOOL');
    await this.browser.pause(PAUSE_TIME);
    await sendKeyAndWait(this.browser, Key.Enter);

    // Try to navigate to a different block
    await keyRight(this.browser);

    // The same field should still be focused
    chai.assert.equal(await getFocusedFieldName(this.browser), 'BOOL');
  });

  test('Do not reopen field editor when handling enter to make a choice inside the editor', async function () {
    // Open colour picker
    await focusOnBlockField(this.browser, 'colour_picker_1', 'COLOUR');
    await this.browser.pause(PAUSE_TIME);
    await sendKeyAndWait(this.browser, Key.Enter);

    // Move right to pick a new colour.
    await keyRight(this.browser);
    // Enter to choose.
    await sendKeyAndWait(this.browser, Key.Enter);

    // Focus seems to take longer than a single pause to settle.
    await this.browser.waitUntil(
      () =>
        this.browser.execute(() =>
          document.activeElement?.classList.contains('blocklyActiveFocus'),
        ),
      {timeout: 1000},
    );
  });

  test('Exiting inline field editor should restore focus to field', async function () {
    // Select a block with an inline-editable field.
    await focusOnBlock(this.browser, 'p5_canvas_1');
    // Select the field.
    await keyRight(this.browser);
    // Open the field's editor.
    await sendKeyAndWait(this.browser, Key.Enter);

    // Exit the editor.
    await sendKeyAndWait(this.browser, Key.Escape);

    // The field should be focused without ephemeral focus.
    chai.assert.equal(await getFocusedFieldName(this.browser), 'WIDTH');
    chai.assert.isFalse(await isEphemeralFocusActive(this.browser));
  });

  test('Exiting drop-down field editor should restore focus to field', async function () {
    // Select a block with a drop-down editable field.
    await focusOnBlock(this.browser, 'logic_boolean_1');
    // Select the field.
    await keyRight(this.browser);
    // Open the field's editor and select the first option to give a child of
    // the editor focus.
    await sendKeyAndWait(this.browser, Key.Enter);
    await keyDown(this.browser);

    // Exit the editor.
    await sendKeyAndWait(this.browser, Key.Escape);

    // The field should be focused without ephemeral focus.
    chai.assert.equal(await getFocusedFieldName(this.browser), 'BOOL');
    chai.assert.isFalse(await isEphemeralFocusActive(this.browser));
  });
});
