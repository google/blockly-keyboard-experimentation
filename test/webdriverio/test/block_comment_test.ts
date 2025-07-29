/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  focusOnBlock,
  getCurrentFocusNodeId,
  testSetup,
  sendKeyAndWait,
  testFileLocations,
  keyRight,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite('Block comment navigation', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  setup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
    await this.browser.execute(() => {
      Blockly.getMainWorkspace()
        .getBlockById('p5_canvas_1')
        ?.setCommentText('test comment');
    });
  });

  test('Activating a block comment icon focuses the comment', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, 'blockly-2s_comment_textarea_');
  });

  test('Escape from a focused comment focuses its bubble', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter);
    await sendKeyAndWait(this.browser, Key.Escape);
    const bubbleFocused = await this.browser.execute(() => {
      return (
        Blockly.getFocusManager().getFocusedNode() ===
        Blockly.getMainWorkspace()
          .getBlockById('p5_canvas_1')
          ?.getIcon(Blockly.icons.IconType.COMMENT)
          ?.getBubble()
      );
    });
    chai.assert.isTrue(bubbleFocused);
  });

  test('Double Escape from a focused comment closes its bubble', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter);
    await sendKeyAndWait(this.browser, Key.Escape);
    await sendKeyAndWait(this.browser, Key.Escape);
    const bubbleVisible = await this.browser.execute(() => {
      return Blockly.getMainWorkspace()
        .getBlockById('p5_canvas_1')
        ?.getIcon(Blockly.icons.IconType.COMMENT)
        ?.bubbleIsVisible();
    });
    chai.assert.isFalse(bubbleVisible);
  });

  test('Double Escape from a focused comment focuses the comment icon', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter);
    await sendKeyAndWait(this.browser, Key.Escape);
    await sendKeyAndWait(this.browser, Key.Escape);
    const commentIconFocused = await this.browser.execute(() => {
      return (
        Blockly.getFocusManager().getFocusedNode() ===
        Blockly.getMainWorkspace()
          .getBlockById('p5_canvas_1')
          ?.getIcon(Blockly.icons.IconType.COMMENT)
      );
    });
    chai.assert.isTrue(commentIconFocused);
  });

  test('Block comments can be edited', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter);
    await sendKeyAndWait(this.browser, 'Hello world');
    await sendKeyAndWait(this.browser, Key.Escape);
    const commentText = await this.browser.execute(() => {
      return Blockly.getMainWorkspace()
        .getBlockById('p5_canvas_1')
        ?.getCommentText();
    });
    chai.assert.equal(commentText, 'test commentHello world');
  });
});
