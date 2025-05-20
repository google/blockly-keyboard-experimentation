/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Browser, Key} from 'webdriverio';
import {
  getFocusedBlockType,
  PAUSE_TIME,
  setCurrentCursorNodeById,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';

suite('Move tests', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Clear the workspace and load start blocks
  setup(async function () {
    this.browser = await testSetup(testFileLocations.MOVE_TEST_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });

  // When a move of a statement block begins, it is expected that only
  // that block (and all blocks connected to its inputs) will be
  // moved, with subsequent statement blocks below it in the stack
  // reattached to where the moving block was - i.e., that a stack
  // heal will occur.
  test.only('Start moving statement blocks', async function () {
    for (let i = 1; i < 7; i++) {
      // Navigate to statement_<i>.
      await tabNavigateToWorkspace(this.browser);
      await setCurrentCursorNodeById(this.browser, `statement_${i}`);

      // Get information about parent connection of selected block,
      // and block connected to selected block's next connection.
      const info = await getSelectedNeighbourInfo(this.browser);

      chai.assert(info.parentId, 'selected block has no parent block');
      chai.assert(
        typeof info.parentIndex === 'number',
        'parent connection index not found',
      );
      chai.assert(info.nextId, 'selected block has no next block');

      // Start move.
      await this.browser.keys('m');

      // Check that the moving block has nothing connected it its
      // next/previous connections, and same thing connected to value
      // input.
      const newInfo = await getSelectedNeighbourInfo(this.browser);
      chai.assert(
        newInfo.parentId === null,
        'moving block should have no parent block',
      );
      chai.assert(
        newInfo.nextId === null,
        'moving block should have no next block',
      );
      chai.assert.strictEqual(
        newInfo.valueId,
        info.valueId,
        'moving block should have same attached value block',
      );

      // Get ID of next block now connected to the (former) parent
      // connection of the currently-moving block (skipping insertion
      // markers), and make sure it's same as the ID of the block that
      // was formerly attached to the moving block's next connection.
      const newNextId = await this.browser.execute(
        (parentId: string, index: number) => {
          const parent = Blockly.getMainWorkspace().getBlockById(parentId);
          if (!parent) throw new Error('parent block gone');
          let block = parent.getConnections_(true)[index].targetBlock();
          while (block?.isInsertionMarker()) {
            block = block.getNextBlock();
          }
          return block?.id;
        },
        info.parentId,
        info.parentIndex,
      );
      chai.assert.strictEqual(
        newNextId,
        info.nextId,
        'former parent connection should be connected to former next block',
      );

      // Abort move.
      await this.browser.keys(Key.Escape);
    }
  });

  // When a move of a value block begins, it is expected that block
  // and all blocks connected to its inputs will be moved - i.e., that
  // a stack heal (really: unary operator chain heal) will NOT occur.
  test.only('Start moving value blocks', async function () {
    for (let i = 1; i < 7; i++) {
      // Navigate to statement_<i>.
      await tabNavigateToWorkspace(this.browser);
      await setCurrentCursorNodeById(this.browser, `value_${i}`);

      // Get information about parent connection of selected block,
      // and block connected to selected block's value input.
      const info = await getSelectedNeighbourInfo(this.browser);

      chai.assert(info.parentId, 'selected block has no parent block');
      chai.assert(
        typeof info.parentIndex === 'number',
        'parent connection index not found',
      );
      chai.assert(info.valueId, 'selected block has no child value block');

      // Start move.
      await this.browser.keys('m');

      // Check that the moving block has nothing connected it its
      // next/previous connections, and same thing connected to value
      // input.
      const newInfo = await getSelectedNeighbourInfo(this.browser);
      chai.assert(
        newInfo.parentId === null,
        'moving block should have no parent block',
      );
      chai.assert(
        newInfo.nextId === null,
        'moving block should have no next block',
      );
      chai.assert.strictEqual(
        newInfo.valueId,
        info.valueId,
        'moving block should have same attached value block',
      );

      // Check the (former) parent connection of the currently-moving
      // block is (skipping insertion markers) either unconnected or
      // connected to a shadow block, and that is is not the block
      // (originally and still) connected to the moving block's zeroth
      // value input.
      const newValueInfo = await this.browser.execute(
        (parentId: string, index: number) => {
          const parent = Blockly.getMainWorkspace().getBlockById(parentId);
          if (!parent) throw new Error('parent block gone');
          let block = parent.getConnections_(true)[index].targetBlock() ?? null;
          while (block?.isInsertionMarker()) {
            block = block.inputList[0].connection?.targetBlock() ?? null;
          }
          return {
            id: block?.id ?? null,
            shadow: block?.isShadow() ?? null,
          };
        },
        info.parentId,
        info.parentIndex,
      );
      chai.assert(
        newValueInfo.id === null || newValueInfo.shadow,
        'former parent connection should be unconnected (or shadow)',
      );
      chai.assert.notStrictEqual(
        newValueInfo.id,
        info.valueId,
        'former parent connection should NOT be connected to value block',
      );

      // Abort move.
      await this.browser.keys(Key.Escape);
    }
  });
});

/**
 * Get information about the currently-selected block's parent and
 * child blocks.
 *
 * N.B. explicitly converts any undefined values to null because
 * browser.execute does this implicitly and so otherwise this function
 * would return values that were not compliant with its own inferred
 * type signature!
 *
 * @returns A promise setting to an object containing the parent block
 * ID, index of parent connection, next block ID, and ID of the block
 * connected to the zeroth value value input.
 */
function getSelectedNeighbourInfo(browser: WebdriverIO.Browser) {
  return browser.execute(() => {
    const block = Blockly.getFocusManager().getFocusedNode() as
      | Blockly.BlockSvg
      | undefined;
    if (!block) throw new Error('no selected block');
    const parent = block?.getParent();
    return {
      parentId: parent?.id ?? null,
      parentIndex:
        parent
          ?.getConnections_(true)
          .findIndex((conn) => conn.targetBlock() === block) ?? null,
      nextId: block?.getNextBlock()?.id ?? null,
      valueId: block?.inputList[0].connection?.targetBlock()?.id ?? null,
    };
  });
}
