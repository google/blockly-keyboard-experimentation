/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Browser, Key} from 'webdriverio';
import {
  PAUSE_TIME,
  focusOnBlock,
  testFileLocations,
  testSetup,
  sendKeyAndWait,
  keyDown,
  contextMenuItems,
} from './test_setup.js';

suite('Move start tests', function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts if when non-zero PAUSE_TIME is used to watch tests) run.
  this.timeout(PAUSE_TIME ? 0 : 10000);

  // Clear the workspace and load start blocks.
  setup(async function () {
    this.browser = await testSetup(testFileLocations.MOVE_START_TEST_BLOCKS);
    await this.browser.pause(PAUSE_TIME);
  });

  // When a move of a statement block begins, it is expected that only
  // that block (and all blocks connected to its inputs) will be
  // moved, with subsequent statement blocks below it in the stack
  // reattached to where the moving block was - i.e., that a stack
  // heal will occur.
  //
  // Also tests initating a move using the shortcut key.
  test('Start moving statement blocks', async function () {
    for (let i = 1; i < 7; i++) {
      // Navigate to statement_<i>.
      await focusOnBlock(this.browser, `statement_${i}`);

      // Get information about parent connection of selected block,
      // and block connected to selected block's next connection.
      const info = await getFocusedNeighbourInfo(this.browser);

      chai.assert(info.parentId, 'selected block has no parent block');
      chai.assert(
        typeof info.parentIndex === 'number',
        'parent connection index not found',
      );
      chai.assert(info.nextId, 'selected block has no next block');

      // Start move using keyboard shortcut.
      await sendKeyAndWait(this.browser, 'm');

      // Check that the moving block has nothing connected it its
      // next/previous connections, and same thing connected to value
      // input.
      const newInfo = await getFocusedNeighbourInfo(this.browser);
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

      // Check that the block connected to the former parent
      // connection of the currently-moving block (if any) is the one
      // that was attached to the moving block's next connection.
      const parentInfo = await getConnectedBlockInfo(
        this.browser,
        info.parentId,
        info.parentIndex,
      );
      chai.assert.strictEqual(
        parentInfo.id,
        info.nextId,
        'former parent connection should be connected to former next block',
      );

      // Abort move.
      await sendKeyAndWait(this.browser, Key.Escape);
    }
  });

  // When a move of a value block begins, it is expected that block
  // and all blocks connected to its inputs will be moved - i.e., that
  // a stack heal (really: unary operator chain heal) will NOT occur.
  //
  // Also tests initiating a move via the context menu.
  test('Start moving value blocks', async function () {
    for (let i = 1; i < 7; i++) {
      // Navigate to statement_<i>.
      await focusOnBlock(this.browser, `value_${i}`);

      // Get information about parent connection of selected block,
      // and block connected to selected block's value input.
      const info = await getFocusedNeighbourInfo(this.browser);

      chai.assert(info.parentId, 'selected block has no parent block');
      chai.assert(
        typeof info.parentIndex === 'number',
        'parent connection index not found',
      );
      chai.assert(info.valueId, 'selected block has no child value block');

      // Start move using context menu (using keyboard nav).
      await sendKeyAndWait(this.browser, [Key.Ctrl, Key.Return]);
      await sendKeyAndWait(this.browser, 'm');
      await keyDown(
        this.browser,
        (await contextMenuItems(this.browser)).findIndex(({text}) =>
          text.includes('Move'),
        ),
      );
      await sendKeyAndWait(this.browser, Key.Return);

      // Check that the moving block has nothing connected it its
      // next/previous connections, and same thing connected to value
      // input.
      const newInfo = await getFocusedNeighbourInfo(this.browser);
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

      // Check that the former parent connection of the
      // currently-moving block is either unconnected or connected to
      // a shadow block.
      const parentInfo = await getConnectedBlockInfo(
        this.browser,
        info.parentId,
        info.parentIndex,
      );
      chai.assert(
        parentInfo.id === null || parentInfo.shadow,
        'former parent connection should be unconnected (or shadow)',
      );

      // Abort move.
      await sendKeyAndWait(this.browser, Key.Escape);
    }
  });
});

suite('Statement move tests', function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts if when non-zero PAUSE_TIME is used to watch tests) run.
  this.timeout(PAUSE_TIME ? 0 : 10000);

  // Clear the workspace and load start blocks.
  setup(async function () {
    this.browser = await testSetup(
      testFileLocations.MOVE_STATEMENT_TEST_BLOCKS,
    );
    await this.browser.pause(PAUSE_TIME);
  });

  // When a top-level block with no previous, next or output
  // connections is subject to a constrained move, it should not move.
  //
  // This includes a regression test for issue #446 (fixed in PR #599)
  // where, due to an implementation error in Mover, constrained
  // movement following unconstrained movement would result in the
  // block unexpectedly moving (unless workspace scale was === 1).
  test('Constrained move of unattachable top-level block', async function () {
    // Block ID of an unconnectable block.
    const BLOCK = 'p5_setup';

    // Scale workspace.
    await this.browser.execute(() => {
      (Blockly.getMainWorkspace() as Blockly.WorkspaceSvg).setScale(0.9);
    });

    // Navigate to unconnectable block, get initial coords and start move.
    await focusOnBlock(this.browser, BLOCK);
    const startCoordinate = await getCoordinate(this.browser, BLOCK);
    await sendKeyAndWait(this.browser, 'm');

    // Check constrained moves have no effect.
    await keyDown(this.browser, 5);
    const coordinate = await getCoordinate(this.browser, BLOCK);
    chai.assert.deepEqual(
      coordinate,
      startCoordinate,
      'constrained move should have no effect',
    );

    // Unconstrained moves.
    await sendKeyAndWait(this.browser, [Key.Alt, Key.ArrowDown]);
    await sendKeyAndWait(this.browser, [Key.Alt, Key.ArrowRight]);
    const newCoordinate = await getCoordinate(this.browser, BLOCK);
    chai.assert.notDeepEqual(
      newCoordinate,
      startCoordinate,
      'unconstrained move should have effect',
    );

    // Try multiple constrained moves, as first might (correctly) do nothing.
    for (let i = 0; i < 5; i++) {
      await keyDown(this.browser);
      const coordinate = await getCoordinate(this.browser, BLOCK);
      chai.assert.deepEqual(
        coordinate,
        newCoordinate,
        'constrained move after unconstrained move should have no effect',
      );
    }

    // Abort move.
    await sendKeyAndWait(this.browser, Key.Escape);
  });
});

/**
 * Get information about the currently-selected block's parent and
 * child blocks.
 *
 * @param browser The webdriverio browser session.
 * @returns A promise setting to {parentId, parentIndex, nextId,
 *   valueId}, being respectively the parent block ID, index of parent
 *   connection, next block ID, and ID of the block connected to the
 *   zeroth value value input, or null if the given item does not
 *   exist.
 */
function getFocusedNeighbourInfo(browser: Browser) {
  return browser.execute(() => {
    const focused = Blockly.getFocusManager().getFocusedNode();
    if (!focused) throw new Error('nothing focused');
    if (!(focused instanceof Blockly.BlockSvg)) {
      throw new TypeError('focused node is not a BlockSvg');
    }
    const block = focused; // Inferred as BlockSvg.
    const parent = block?.getParent();
    // N.B. explicitly converts any undefined values to null because
    // browser.execute does this implicitly and so otherwise this
    // function would return values that were not compliant with its
    // own inferred type signature!
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

/**
 * Given a block ID and index of a connection on that block, find the
 * first block connected to that block (skipping any insertion markers),
 * and return that block's ID and a boolean indicating whether that
 * block is a shadow or not.
 *
 * @param browser The webdriverio browser session.
 * @param id The ID of the block having the connection we wish to examine.
 * @param index The index of the connection we wish to examine, within
 *     the array returned by calling .getConnections_(true) on that block.
 * @returns A promise settling to {id, shadow}, where id is the ID of
 *     the connected block or null if no block is connected, and
 *     shadow is true iff the connected block is a shadow.
 */
function getConnectedBlockInfo(browser: Browser, id: string, index: number) {
  return browser.execute(
    (id: string, index: number) => {
      const parent = Blockly.getMainWorkspace().getBlockById(id);
      if (!parent) throw new Error('parent block gone');
      let block = parent.getConnections_(true)[index].targetBlock() ?? null;
      while (block?.isInsertionMarker()) {
        // If insertion marker, try to follow next or zeroth input connection.
        const connection =
          block.nextConnection ?? block.inputList[0].connection;
        block = connection?.targetBlock() ?? null;
      }
      return {
        id: block?.id ?? null,
        shadow: block?.isShadow() ?? false,
      };
    },
    id,
    index,
  );
}

/**
 * Given a block ID, get the coordinates of that block, as returned by
 * getRelativeTosSurfaceXY().
 *
 * @param browser The webdriverio browser session.
 * @param id The ID of the block having the connection we wish to examine.
 * @returns The coordinates of the block.
 */
function getCoordinate(
  browser: Browser,
  id: string,
): Promise<Blockly.utils.Coordinate> {
  return browser.execute((id: string) => {
    const block = Blockly.getMainWorkspace().getBlockById(id);
    if (!block) throw new Error('block not found');
    return block.getRelativeToSurfaceXY();
  }, id);
}
