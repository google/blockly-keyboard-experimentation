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
  createTestUrl,
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

  /** ID of a statement block with no inputs. */
  const BLOCK_SIMPLE = 'simple_mover';

  /**
   * Expected connection candidates when moving BLOCK_SIMPLE, after
   * pressing right (or down) arrow n times.
   */
  const EXPECTED_SIMPLE_RIGHT = [
    {id: 'p5_canvas', index: 1, ownIndex: 0}, // Next; starting location.
    {id: 'complex_mover', index: 3, ownIndex: 0}, // "If" statement input.
    {id: 'complex_mover', index: 4, ownIndex: 0}, // "Else" statement input.
    {id: 'complex_mover', index: 1, ownIndex: 0}, // Next.
    {id: 'text_print', index: 0, ownIndex: 1}, // Previous.
    {id: 'text_print', index: 1, ownIndex: 0}, // Next.
    {id: 'controls_if', index: 3, ownIndex: 0}, // "If" statement input.
    {id: 'controls_repeat_ext', index: 3, ownIndex: 0}, // Statement input.
    {id: 'controls_repeat_ext', index: 1, ownIndex: 0}, // Next.
    {id: 'controls_if', index: 5, ownIndex: 0}, // "Else if" statement input.
    {id: 'controls_if', index: 6, ownIndex: 0}, // "Else" statement input.
    {id: 'controls_if', index: 1, ownIndex: 0}, // Next.
    {id: 'p5_draw', index: 0, ownIndex: 0}, // Statement input.
  ];
  /**
   * Expected connection candidates when moving BLOCK_SIMPLE after
   * pressing left (or up) arrow n times.
   */
  const EXPECTED_SIMPLE_LEFT = EXPECTED_SIMPLE_RIGHT.slice(0, 1).concat(
    EXPECTED_SIMPLE_RIGHT.slice(1).reverse(),
  );

  suite('Constrained moves of simple stack block', function () {
    test(
      'moving right',
      moveTest(BLOCK_SIMPLE, Key.ArrowRight, EXPECTED_SIMPLE_RIGHT),
    );
    test(
      'moving left',
      moveTest(BLOCK_SIMPLE, Key.ArrowLeft, EXPECTED_SIMPLE_LEFT),
    );
    test(
      'moving down',
      moveTest(BLOCK_SIMPLE, Key.ArrowDown, EXPECTED_SIMPLE_RIGHT),
    );
    test(
      'moving up',
      moveTest(BLOCK_SIMPLE, Key.ArrowUp, EXPECTED_SIMPLE_LEFT),
    );
  });

  /** ID of a statement block with multiple statement inputs. */
  const BLOCK_COMPLEX = 'complex_mover';

  /**
   * Expected connection candidates when moving BLOCK_COMPLEX, after
   * pressing right (or down) arrow n times.
   */
  const EXPECTED_COMPLEX_RIGHT = [
    // TODO(#702): Due to a bug in KeyboardDragStrategy, certain
    // connection candidates that can be found using the mouse are not
    // visited when doing a keyboard drag.  They appear in the list
    // below, but commented out for now.
    // is fixed.
    {id: 'simple_mover', index: 1, ownIndex: 0}, // Next; starting location.
    // {id: 'text_print', index: 0, ownIndex: 1}, // Previous to own next.
    {id: 'text_print', index: 0, ownIndex: 4}, // Previous to own else input.
    // {id: 'text_print', index: 0, ownIndex: 3}, // Previous to own if input.
    {id: 'text_print', index: 1, ownIndex: 0}, // Next.
    {id: 'controls_if', index: 3, ownIndex: 0}, // "If" statement input.
    {id: 'controls_repeat_ext', index: 3, ownIndex: 0}, // Statement input.
    {id: 'controls_repeat_ext', index: 1, ownIndex: 0}, // Next.
    {id: 'controls_if', index: 5, ownIndex: 0}, // "Else if" statement input.
    {id: 'controls_if', index: 6, ownIndex: 0}, // "Else" statement input.
    {id: 'controls_if', index: 1, ownIndex: 0}, // Next.
    {id: 'p5_draw', index: 0, ownIndex: 0}, // Statement input.
    {id: 'p5_canvas', index: 1, ownIndex: 0}, // Next; starting location again.
  ];
  /**
   * Expected connection candidates when moving BLOCK_COMPLEX after
   * pressing left or up arrow n times.
   */
  const EXPECTED_COMPLEX_LEFT = EXPECTED_COMPLEX_RIGHT.slice(0, 1).concat(
    EXPECTED_COMPLEX_RIGHT.slice(1).reverse(),
  );

  suite('Constrained moves of stack block with statement inputs', function () {
    test(
      'moving right',
      moveTest(BLOCK_COMPLEX, Key.ArrowRight, EXPECTED_COMPLEX_RIGHT),
    );
    test(
      'moving left',
      moveTest(BLOCK_COMPLEX, Key.ArrowLeft, EXPECTED_COMPLEX_LEFT),
    );
    test(
      'moving down',
      moveTest(BLOCK_COMPLEX, Key.ArrowDown, EXPECTED_COMPLEX_RIGHT),
    );
    test(
      'moving up',
      moveTest(BLOCK_COMPLEX, Key.ArrowUp, EXPECTED_COMPLEX_LEFT),
    );
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

suite(`Value expression move tests`, function () {
  // Increase timeout to 10s for this longer test (but disable
  // timeouts if when non-zero PAUSE_TIME is used to watch tests) run.
  this.timeout(PAUSE_TIME ? 0 : 10000);

  /** ID of a simple reporter (a value block with no inputs). */
  const BLOCK_SIMPLE = 'simple_mover';

  /**
   * Expected connection candidates when moving BLOCK_SIMPLE, after
   * pressing ArrowRight n times.
   */
  const EXPECTED_SIMPLE_RIGHT = [
    {id: 'complex_mover', index: 1, ownIndex: 0}, // Starting location.
    {id: 'print1', index: 2, ownIndex: 0}, // Print block with no shadow.
    {id: 'print2', index: 2, ownIndex: 0}, // Print block with shadow.
    // Skip draw_emoji block as it has no value inputs.
    {id: 'print3', index: 2, ownIndex: 0}, // Replacing  join expression.
    {id: 'text_join1', index: 1, ownIndex: 0}, // Join block ADD0 input.
    {id: 'text_join1', index: 2, ownIndex: 0}, // Join block ADD1 input.
    // Skip controls_repeat_ext block's TIMES input as it is incompatible.
    {id: 'print4', index: 2, ownIndex: 0}, // Replacing join expression.
    {id: 'text_join2', index: 1, ownIndex: 0}, // Join block ADD0 input.
    {id: 'text_join2', index: 2, ownIndex: 0}, // Join block ADD1 input.
    // Skip unconnected text block as it has no inputs.
    {id: 'print0', index: 2, ownIndex: 0}, // Print block having complex_mover.
  ];
  /**
   * Expected connection candidates when moving BLOCK_SIMPLE, after
   * pressing ArrowLeft n times.
   */
  const EXPECTED_SIMPLE_LEFT = EXPECTED_SIMPLE_RIGHT.slice(0, 1).concat(
    EXPECTED_SIMPLE_RIGHT.slice(1).reverse(),
  );

  /** ID of a unary expression block (block with one value input + output) */
  const BLOCK_COMPLEX = 'complex_mover';

  /**
   * Expected connection candidates when moving row consisting of
   * BLOCK_COMPLEX, with a block (in this case BLOCK_SIMPLE) attached
   * to its input, after pressing ArrowRight n times.
   */
  const EXPECTED_ROW_RIGHT = EXPECTED_SIMPLE_RIGHT.slice();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  EXPECTED_ROW_RIGHT[0] = EXPECTED_ROW_RIGHT.pop()!;
  /**
   * Expected connection candidates when moving row consisting of
   * BLOCK_COMPLEX, with a block (in this case BLOCK_SIMPLE) attached
   * to its input, after pressing ArrowLeft n times.
   */
  const EXPECTED_ROW_LEFT = EXPECTED_ROW_RIGHT.slice(0, 1).concat(
    EXPECTED_ROW_RIGHT.slice(1).reverse(),
  );

  /**
   * Expected connection candidates when moving row consisting of
   * BLOCK_COMPLEX on its own after pressing ArrowRight n times.
   */
  const EXPECTED_UNARY_RIGHT = [
    {id: 'print0', index: 2, ownIndex: 0}, // Starting location.
    {id: 'print1', index: 2, ownIndex: 0}, // Print block with no shadow.
    {id: 'print2', index: 2, ownIndex: 0}, // Print block with shadow.
    // Skip draw_emoji block as it has no value inputs.
    {id: 'print3', index: 2, ownIndex: 0}, // Replacing  join expression.
    {id: 'text_join1', index: 1, ownIndex: 0}, // Join block ADD0 input.
    {id: 'text_join1', index: 2, ownIndex: 0}, // Join block ADD1 input.
    // Skip controls_repeat_ext block's TIMES input as it is incompatible.
    {id: 'print4', index: 2, ownIndex: 0}, // Replacing join expression.
    {id: 'text_join2', index: 1, ownIndex: 0}, // Join block ADD0 input.
    {id: 'text_join2', index: 2, ownIndex: 0}, // Join block ADD1 input.
    {id: 'unattached', index: 0, ownIndex: 1}, // Unattached text to own input.
  ];
  /**
   * Expected connection candidates when moving row consisting of
   * BLOCK_UNARY on its own after pressing ArrowLEFT n times.
   */
  const EXPECTED_UNARY_LEFT = EXPECTED_UNARY_RIGHT.slice(0, 1).concat(
    EXPECTED_UNARY_RIGHT.slice(1).reverse(),
  );

  for (const renderer of ['geras', 'thrasos', 'zelos']) {
    // TODO(#707): These tests fail when run using zelos, so for now
    // we skip entire suite.  Stop skipping suite when bug is fixed.
    const suiteOrSkip = renderer === 'zelos' ? suite.skip : suite;
    suiteOrSkip(`using ${renderer}`, function () {
      // Clear the workspace and load start blocks.
      setup(async function () {
        this.browser = await testSetup(
          createTestUrl(
            new URLSearchParams({renderer, scenario: 'moveValueTestBlocks'}),
          ),
        );
        await this.browser.pause(PAUSE_TIME);
      });

      suite('Constrained moves of a simple reporter block', function () {
        test(
          'moving right',
          moveTest(BLOCK_SIMPLE, Key.ArrowRight, EXPECTED_SIMPLE_RIGHT),
        );
        test(
          'moving left',
          moveTest(BLOCK_SIMPLE, Key.ArrowLeft, EXPECTED_SIMPLE_LEFT),
        );
      });
      suite('Constrained moves of two blocks with no free inputs', function () {
        test(
          'moving right',
          moveTest(BLOCK_COMPLEX, Key.ArrowRight, EXPECTED_ROW_RIGHT),
        );
        test(
          'moving left',
          moveTest(BLOCK_COMPLEX, Key.ArrowLeft, EXPECTED_ROW_LEFT),
        );
      });
      suite('Constrained moves of unary expression block', function () {
        setup(async function () {
          // Delete block connected to complex_mover's input.
          await focusOnBlock(this.browser, BLOCK_SIMPLE);
          await sendKeyAndWait(this.browser, Key.Delete);
        });

        // TODO(#709): Reenable test once crash bug is fixed.
        test.skip(
          'moving right',
          moveTest(BLOCK_COMPLEX, Key.ArrowRight, EXPECTED_UNARY_RIGHT),
        );
        test(
          'moving left',
          moveTest(BLOCK_COMPLEX, Key.ArrowLeft, EXPECTED_UNARY_LEFT),
        );
      });
    });
  }
});

/**
 * Create a mocha test function moving a specified block in a
 * particular direction, checking that it has the the expected
 * connection candidate after each step, and that once the move
 * finishes that the moving block is reconnected to its initial
 * location.
 *
 * @param mover Block ID of the block to be moved.
 * @param key Key to send to move one step.
 * @param candidates Array of expected connection candidates.
 * @returns function to pass as second argument to mocha's test function.
 */
function moveTest(
  mover: string,
  key: string | string[],
  candidates: Array<{id: string; index: number}>,
) {
  return async function (this: Mocha.Context) {
    // Navigate to block to be moved and intiate move.
    await focusOnBlock(this.browser, mover);
    const initialInfo = await getFocusedNeighbourInfo(this.browser);
    await sendKeyAndWait(this.browser, 'm');
    // Press specified key multiple times, checking connection candidates.
    for (let i = 0; i < candidates.length; i++) {
      const candidate = await getConnectionCandidate(this.browser);
      chai.assert.deepEqual(candidate, candidates[i]);
      await sendKeyAndWait(this.browser, key);
    }

    // Finish move and check final location of moved block.
    await sendKeyAndWait(this.browser, Key.Enter);
    const finalInfo = await getFocusedNeighbourInfo(this.browser);
    chai.assert.deepEqual(initialInfo, finalInfo);
  };
}

/**
 * Get information about the currently-focused block's parent and
 * child blocks.
 *
 * @param browser The webdriverio browser session.
 * @returns A promise setting to
 *
 *         {parentId, parentIndex, nextId, valueId}
 *
 *     where parentId, parentIndex are the ID of the parent block and
 *     the index of the connection on that block to which the
 *     currently-focused block is connected, nextId is the ID of block
 *     connected to the focused block's next connection, and valueID
 *     is the ID of a block connected to the zeroth input of the
 *     focused block (or, in each case, null if there is no such
 *     block).
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

/**
 * Get information about the connection candidate for the
 * currently-moving block (if any).
 *
 * @param browser The webdriverio browser session.
 * @returns A promise setting to either null if there is no connection
 *     candidate, or otherwise if there is one to
 *
 *         {id, index, ownIndex}
 *
 *     where id is the block ID of the neighbour, index is the index
 *     of the candidate connection on the neighbour, and ownIndex is
 *     the index of the candidate connection on the moving block.
 */
function getConnectionCandidate(
  browser: Browser,
): Promise<{id: string; index: number} | null> {
  return browser.execute(() => {
    const focused = Blockly.getFocusManager().getFocusedNode();
    if (!focused) throw new Error('nothing focused');
    if (!(focused instanceof Blockly.BlockSvg)) {
      throw new TypeError('focused node is not a BlockSvg');
    }
    const block = focused; // Inferred as BlockSvg.
    const dragStrategy =
      block.getDragStrategy() as Blockly.dragging.BlockDragStrategy;
    if (!dragStrategy) throw new Error('no drag strategy');
    // @ts-expect-error connectionCandidate is private.
    const candidate = dragStrategy.connectionCandidate;
    if (!candidate) return null;
    const neighbourBlock = candidate.neighbour.getSourceBlock();
    if (!neighbourBlock) throw new TypeError('connection has no source block');
    const neighbourConnections = neighbourBlock.getConnections_(true);
    const index = neighbourConnections.indexOf(candidate.neighbour);
    const ownConnections = block.getConnections_(true);
    const ownIndex = ownConnections.indexOf(candidate.local);
    return {id: neighbourBlock.id, index, ownIndex};
  });
}

/**
 * Create a new block from serialised state (parsed JSON) and
 * optionally attach it to an existing block on the workspace.
 *
 * @param browser The WebdriverIO browser object.
 * @param state The JSON definition of the new block.
 * @param parentId The ID of the block to attach to. If undefined, the
 *     new block is not attached.
 * @param inputName The name of the input on the parent block to
 *     attach to. If undefined, the new block is attached to the
 *     parent's next connection.
 * @returns A promise that resolves with the new block's ID.
 */
async function appendBlock(
  browser: Browser,
  state: Blockly.serialization.blocks.State,
  parentId?: string,
  inputName?: string,
): Promise<string> {
  return await browser.execute(
    (state, parentId, inputName) => {
      const workspace = Blockly.getMainWorkspace();
      if (!workspace) throw new Error('workspace not found');

      const block = Blockly.serialization.blocks.append(state, workspace);
      if (!block) throw new Error('failed to create block from state');
      if (!parentId) return block.id;

      try {
        const parent = workspace.getBlockById(parentId);
        if (!parent) throw new Error(`parent block not found: ${parentId}`);

        let parentConnection;
        let childConnection;

        if (inputName) {
          parentConnection = parent.getInput(inputName)?.connection;
          if (!parentConnection) {
            throw new Error(`input ${inputName} not found on parent`);
          }
          childConnection = block.outputConnection ?? block.previousConnection;
        } else {
          parentConnection = parent.nextConnection;
          if (!parentConnection) {
            throw new Error('parent has no next connection');
          }
          childConnection = block.previousConnection;
        }
        if (!childConnection) throw new Error('new block not compatible');
        parentConnection.connect(childConnection);
        return block.id;
      } catch (e) {
        // If anything goes wrong during attachment, clean up the new block.
        block.dispose();
        throw e;
      }
    },
    state,
    parentId,
    inputName,
  );
}
