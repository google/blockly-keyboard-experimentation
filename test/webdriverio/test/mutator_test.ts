/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly';
import {
  focusedTreeIsMainWorkspace,
  isDragging,
  focusOnBlock,
  focusOnBlockField,
  getCurrentFocusNodeId,
  getCurrentFocusedBlockId,
  getFocusedBlockType,
  getFocusedFieldName,
  testSetup,
  testFileLocations,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  keyLeft,
  keyRight,
  keyUp,
  keyDown,
} from './test_setup.js';
import {Key} from 'webdriverio';

suite.only('Mutator navigation', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  setup(async function () {
    this.browser = await testSetup(testFileLocations.NAVIGATION_TEST_BLOCKS);
    this.openMutator = async () => {
      await tabNavigateToWorkspace(this.browser);
      await this.browser.pause(PAUSE_TIME);
      await focusOnBlock(this.browser, 'controls_if_1');
      await this.browser.pause(PAUSE_TIME);
      // Navigate to the mutator icon
      await keyRight(this.browser);
      // Activate the icon
      await this.browser.keys(Key.Enter);
      await this.browser.pause(PAUSE_TIME);
    };
  });

  test('Enter opens mutator', async function () {
    await this.openMutator();

    // Main workspace should not be focused (because mutator workspace is)
    const mainWorkspaceFocused = await focusedTreeIsMainWorkspace(this.browser);
    chai.assert.isFalse(mainWorkspaceFocused);

    // The "if" placeholder block in the mutator should be focused
    const focusedBlockType = await getFocusedBlockType(this.browser);
    chai.assert.equal(focusedBlockType, 'controls_if_if');
  });

  test('Escape dismisses mutator', async function () {
    await this.openMutator();
    await this.browser.keys(Key.Escape);
    await this.browser.pause(PAUSE_TIME);

    // Main workspace should be the focused tree (since mutator workspace is gone)
    const mainWorkspaceFocused = await focusedTreeIsMainWorkspace(this.browser);
    chai.assert.isTrue(mainWorkspaceFocused);

    const mutatorIconId = await this.browser.execute(() => {
      const block = Blockly.getMainWorkspace().getBlockById('controls_if_1');
      const icon = block?.getIcon(Blockly.icons.IconType.MUTATOR);
      return icon?.getFocusableElement().id;
    });

    // Mutator icon should now be focused
    const focusedNodeId = await getCurrentFocusNodeId(this.browser);
    chai.assert.equal(mutatorIconId, focusedNodeId);
  });

  test('T focuses the mutator flyout', async function () {
    await this.openMutator();
    await this.browser.keys('t');
    await this.browser.pause(PAUSE_TIME);

    // The "else if" block in the mutator flyout should be focused
    const focusedBlockType = await getFocusedBlockType(this.browser);
    chai.assert.equal(focusedBlockType, 'controls_if_elseif');
  });

  test('Blocks can be inserted from the mutator flyout', async function () {
    await this.openMutator();
    await this.browser.keys('t');
    await this.browser.pause(PAUSE_TIME);
    // Navigate down to the second block in the flyout
    await keyDown(this.browser);
    await this.browser.pause(PAUSE_TIME);
    // Hit enter to enter insert mode
    await this.browser.keys(Key.Enter);
    await this.browser.pause(PAUSE_TIME);
    // Hit enter again to lock it into place on the connection
    await this.browser.keys(Key.Enter);

    const topBlocks = await this.browser.execute(() => {
      const focusedTree = Blockly.getFocusManager().getFocusedTree();
      if (!(focusedTree instanceof Blockly.WorkspaceSvg)) return [];

      return focusedTree.getAllBlocks(true).map((block) => block.type);
    });

    chai.assert.deepEqual(topBlocks, ['controls_if_if', 'controls_if_else']);
  });
});
