/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  contextMenuExists,
  focusOnBlock,
  getCurrentFocusNodeId,
  getFocusedBlockType,
  testSetup,
  focusOnWorkspaceComment,
  testFileLocations,
  PAUSE_TIME,
  keyLeft,
  keyRight,
  keyDown,
  keyUp,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite('Workspace comment navigation', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  setup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
    [this.comment1, this.comment2] = await this.browser.execute(() => {
      const workspace = Blockly.getMainWorkspace();
      const comment1 = Blockly.serialization.workspaceComments.append(
        {
          text: 'Comment one',
          x: 200,
          y: 200,
        },
        workspace,
      );

      const comment2 = Blockly.serialization.workspaceComments.append(
        {
          text: 'Comment two',
          x: 300,
          y: 300,
        },
        workspace,
      );

      return [comment1.id, comment2.id];
    });
  });

  test('Navigate forward from block to workspace comment', async function () {
    await focusOnBlock(this.browser, 'p5_canvas_1');
    await keyDown(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, this.comment1);
  });

  test('Navigate forward from workspace comment to block', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment2);
    await keyDown(this.browser);
    const focusedBlock = await getFocusedBlockType(this.browser);
    chai.assert.equal(focusedBlock, 'p5_draw');
  });

  test('Navigate backward from block to workspace comment', async function () {
    await focusOnBlock(this.browser, 'p5_draw_1');
    await keyUp(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, this.comment2);
  });

  test('Navigate backward from workspace comment to block', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyUp(this.browser);
    const focusedBlock = await getFocusedBlockType(this.browser);
    chai.assert.equal(focusedBlock, 'p5_canvas');
  });

  test('Navigate forward from workspace comment to workspace comment', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyDown(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, this.comment2);
  });

  test('Navigate backward from workspace comment to workspace comment', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment2);
    await keyUp(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, this.comment1);
  });

  test('Navigate forward from workspace comment to workspace comment button', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyRight(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, `${this.comment1}_collapse_bar_button`);
  });

  test('Navigate backward from workspace comment button to workspace comment', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyRight(this.browser);
    await keyLeft(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, this.comment1);
  });

  test('Navigate forward from workspace comment button to workspace comment button', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyRight(this.browser);
    await keyRight(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, `${this.comment1}_delete_bar_button`);
  });

  test('Navigate backward from workspace comment button to workspace comment button', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyRight(this.browser);
    await keyRight(this.browser);
    await keyLeft(this.browser);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, `${this.comment1}_collapse_bar_button`);
  });

  test('Activate workspace comment button', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await keyRight(this.browser);
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    const collapsed = await this.browser.execute((commentId) => {
      return Blockly.getMainWorkspace()
        .getCommentById(commentId)
        ?.isCollapsed();
    }, this.comment1);
    chai.assert.isTrue(collapsed);
  });

  test('Activating workspace comment focuses its editor', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, `${this.comment1}_comment_textarea_`);
  });

  test('Terminating editing commits edits and focuses root workspace comment', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys('Hello world');
    await this.browser.pause(PAUSE_TIME);
    await this.browser.keys(Key.Escape);
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(focusedNodeId, `${this.comment1}`);

    const commentText = await this.browser.execute((commentId) => {
      return Blockly.getMainWorkspace().getCommentById(commentId)?.getText();
    }, this.comment1);
    chai.assert.equal(commentText, 'Comment oneHello world');
  });

  test('Action menu can be displayed for a workspace comment', async function () {
    await focusOnWorkspaceComment(this.browser, this.comment1);
    await this.browser.keys([Key.Ctrl, Key.Return]);
    await this.browser.pause(PAUSE_TIME);
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Duplicate Comment'),
      'The menu should be openable on a workspace comment',
    );
    chai.assert.isTrue(
      await contextMenuExists(this.browser, 'Remove Comment'),
      'The menu should be openable on a workspace comment',
    );
  });
});
