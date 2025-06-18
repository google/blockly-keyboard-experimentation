/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BlockSvg,
  IDragger,
  IDragStrategy,
  RenderedConnection,
} from 'blockly';
import {
  Connection,
  dragging,
  getFocusManager,
  registry,
  utils,
  WorkspaceSvg,
  ShortcutRegistry,
} from 'blockly';
import * as Constants from '../constants';
import {Direction, getXYFromDirection} from '../drag_direction';
import {KeyboardDragStrategy} from '../keyboard_drag_strategy';
import {Navigation} from '../navigation';
import {clearMoveHints} from '../hints';

/**
 * The distance to move an item, in workspace coordinates, when
 * making an unconstrained move.
 */
const UNCONSTRAINED_MOVE_DISTANCE = 20;

/**
 * The amount of additional padding to include during a constrained move.
 */
const CONSTRAINED_ADDITIONAL_PADDING = 70;

/**
 * Identifier for a keyboard shortcut that commits the in-progress move.
 */
const COMMIT_MOVE_SHORTCUT = 'commitMove';

/**
 * Low-level code for moving blocks with keyboard shortcuts.
 */
export class Mover {
  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving a block on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected moves: Map<WorkspaceSvg, MoveInfo> = new Map();

  /**
   * The block's base drag strategy, which will be overridden during
   * keyboard drags and reset at the end of the drag.
   */
  private oldDragStrategy: IDragStrategy | null = null;

  constructor(protected navigation: Navigation) {}

  /**
   * Returns true iff we are able to begin moving the block which
   * currently has focus on the given workspace.
   *
   * @param workspace The workspace to move on.
   * @param block The block to try to drag.
   * @returns True iff we can begin a move.
   */
  canMove(workspace: WorkspaceSvg, block: BlockSvg) {
    return !!(
      this.navigation.getState(workspace) === Constants.STATE.WORKSPACE &&
      this.navigation.canCurrentlyEdit(workspace) &&
      !this.moves.has(workspace) && // No move in progress.
      block?.isMovable()
    );
  }

  /**
   * Returns true iff we are currently moving a block on the given
   * workspace.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff we are moving.
   */
  isMoving(workspace: WorkspaceSvg) {
    return (
      this.navigation.canCurrentlyEdit(workspace) && this.moves.has(workspace)
    );
  }

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @param block The block to start dragging.
   * @param insertStartPoint Where to insert the block, or null if the block
   *     already existed.
   * @returns True iff a move has successfully begun.
   */
  startMove(
    workspace: WorkspaceSvg,
    block: BlockSvg,
    insertStartPoint: RenderedConnection | null,
  ) {
    this.patchDragStrategy(block, insertStartPoint);
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Set up a blur listener to end the move if the user clicks away
    const blurListener = () => {
      this.finishMove(workspace);
    };
    // Record that a move is in progress and start dragging.
    workspace.setKeyboardMoveInProgress(true);
    const info = new MoveInfo(block, dragger, blurListener);
    this.moves.set(workspace, info);
    // Begin drag.
    dragger.onDragStart(info.fakePointerEvent('pointerdown'));
    info.updateTotalDelta();
    // In case the block is detached, ensure that it still retains focus
    // (otherwise dragging will break).
    getFocusManager().focusNode(block);
    block.getFocusableElement().addEventListener('blur', blurListener);

    // Register a keyboard shortcut under the key combos of all existing
    // keyboard shortcuts that commits the move before allowing the real
    // shortcut to proceed. This avoids all kinds of fun brokenness when
    // deleting/copying/otherwise acting on a block in move mode.
    const shortcutKeys = Object.values(ShortcutRegistry.registry.getRegistry())
      .flatMap((shortcut) => shortcut.keyCodes)
      .filter((keyCode) => {
        return (
          keyCode &&
          ![
            utils.KeyCodes.RIGHT,
            utils.KeyCodes.LEFT,
            utils.KeyCodes.UP,
            utils.KeyCodes.DOWN,
            utils.KeyCodes.ENTER,
            utils.KeyCodes.ESC,
          ].includes(
            typeof keyCode === 'number'
              ? keyCode
              : parseInt(`${keyCode.split('+').pop()}`),
          )
        );
      })
      // Convince TS there aren't undefined values.
      .filter((keyCode): keyCode is string | number => !!keyCode);

    const commitMoveShortcut = {
      name: COMMIT_MOVE_SHORTCUT,
      preconditionFn: (workspace: WorkspaceSvg) => {
        return !!this.moves.get(workspace);
      },
      callback: (workspace: WorkspaceSvg) => {
        this.finishMove(workspace);
        return false;
      },
      keyCodes: shortcutKeys,
      allowCollision: true,
    };

    ShortcutRegistry.registry.register(commitMoveShortcut);

    return true;
  }

  /**
   * Finish moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully finished.
   */
  finishMove(workspace: WorkspaceSvg) {
    const info = this.preDragEndCleanup(workspace);

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.postDragEndCleanup(workspace, info);
    return true;
  }

  /**
   * Abort moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully aborted.
   */
  abortMove(workspace: WorkspaceSvg) {
    const info = this.preDragEndCleanup(workspace);

    const dragStrategy = info.block.getDragStrategy() as KeyboardDragStrategy;
    this.patchDragger(
      info.dragger as dragging.Dragger,
      dragStrategy.isNewBlock,
    );

    // Save the position so we can put the cursor in a reasonable spot.
    // @ts-expect-error Access to private property connectionCandidate.
    const target = dragStrategy.connectionCandidate?.neighbour;

    // Prevent the stragegy connecting the block so we just delete one block.
    // @ts-expect-error Access to private property connectionCandidate.
    dragStrategy.connectionCandidate = null;

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      info.startLocation,
    );

    if (dragStrategy.isNewBlock && target) {
      workspace.getCursor()?.setCurNode(target);
    }

    this.postDragEndCleanup(workspace, info);
    return true;
  }

  /**
   * Common clean-up for finish/abort.
   *
   * @param workspace The workspace on which we are moving.
   * @returns The info for the block.
   */
  private preDragEndCleanup(workspace: WorkspaceSvg) {
    ShortcutRegistry.registry.unregister(COMMIT_MOVE_SHORTCUT);
    clearMoveHints(workspace);

    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Remove the blur listener before ending the drag
    info.block
      .getFocusableElement()
      .removeEventListener('blur', info.blurListener);

    return info;
  }

  /**
   * Common clean-up for finish/abort.
   *
   * @param workspace The workspace on which we are moving.
   * @param info The info for the block.
   */
  private postDragEndCleanup(workspace: WorkspaceSvg, info: MoveInfo) {
    this.unpatchDragStrategy(info.block);
    this.moves.delete(workspace);
    workspace.setKeyboardMoveInProgress(false);
    // Delay scroll until after block has finished moving.
    setTimeout(() => this.scrollCurrentBlockIntoView(workspace), 0);
    // If the block gets reattached, ensure it retains focus.
    getFocusManager().focusNode(info.block);
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveConstrained(workspace: WorkspaceSvg, direction: Direction) {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDrag(
      info.fakePointerEvent('pointermove', direction),
      info.totalDelta,
    );

    info.updateTotalDelta();
    this.scrollCurrentBlockIntoView(workspace, CONSTRAINED_ADDITIONAL_PADDING);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * without constraint.
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveUnconstrained(workspace: WorkspaceSvg, direction: Direction): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    const {x, y} = getXYFromDirection(direction);
    info.totalDelta.x += x * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y += y * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    this.scrollCurrentBlockIntoView(workspace);
    return true;
  }

  /**
   * Monkeypatch: replace the block's drag strategy and cache the old value.
   *
   * @param block The block to patch.
   * @param insertStartPoint Where to insert the block, or null if the block
   *     already existed.
   */
  private patchDragStrategy(
    block: BlockSvg,
    insertStartPoint: RenderedConnection | null,
  ) {
    // @ts-expect-error block.dragStrategy is private.
    this.oldDragStrategy = block.dragStrategy;
    block.setDragStrategy(new KeyboardDragStrategy(block, insertStartPoint));
  }

  /**
   * Undo the monkeypatching of the block's drag strategy.
   *
   * @param block The block to patch.
   */
  private unpatchDragStrategy(block: BlockSvg) {
    if (this.oldDragStrategy) {
      block.setDragStrategy(this.oldDragStrategy);
      this.oldDragStrategy = null;
    }
  }

  /**
   * Scrolls the current block into view if one exists.
   *
   * @param workspace The workspace to get current block from.
   * @param padding Amount of spacing to put between the bounds and the edge of
   *     the workspace's viewport.
   */
  private scrollCurrentBlockIntoView(workspace: WorkspaceSvg, padding = 0) {
    const blockToView = this.moves.get(workspace)?.block;
    if (blockToView) {
      const bounds = blockToView.getBoundingRectangleWithoutChildren().clone();
      bounds.top -= padding;
      bounds.bottom += padding;
      bounds.left -= padding;
      bounds.right += padding;
      workspace.scrollBoundsIntoView(bounds);
    }
  }

  /**
   * Monkeypatch: override either wouldDeleteDraggable or shouldReturnToStart,
   * based on whether this was an insertion of a new block or a movement of
   * an existing block.
   *
   * @param dragger The dragger to patch.
   * @param isNewBlock Whether the moving block was created for this action.
   */
  private patchDragger(dragger: dragging.Dragger, isNewBlock: boolean) {
    if (isNewBlock) {
      // Monkey patch dragger to trigger delete.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).wouldDeleteDraggable = () => true;
    } else {
      // Monkey patch dragger to trigger call to draggable.revertDrag.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dragger as any).shouldReturnToStart = () => true;
    }
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
export class MoveInfo {
  /** Total distance moved, in workspace units. */
  totalDelta = new utils.Coordinate(0, 0);
  readonly parentNext: Connection | null;
  readonly parentInput: Connection | null;
  readonly startLocation: utils.Coordinate;

  constructor(
    readonly block: BlockSvg,
    readonly dragger: IDragger,
    readonly blurListener: EventListener,
  ) {
    this.parentNext = block.previousConnection?.targetConnection ?? null;
    this.parentInput = block.outputConnection?.targetConnection ?? null;
    this.startLocation = block.getRelativeToSurfaceXY();
  }

  /**
   * Create a fake pointer event for dragging.
   *
   * @param type Which type of pointer event to create.
   * @param direction The direction if this movement is a constrained drag.
   * @returns A synthetic PointerEvent that can be consumed by Blockly's
   *     dragging code.
   */
  fakePointerEvent(type: string, direction?: Direction): PointerEvent {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    const blockCoords = utils.svgMath.wsToScreenCoordinates(
      workspace,
      new utils.Coordinate(
        this.startLocation.x + this.totalDelta.x,
        this.startLocation.y + this.totalDelta.y,
      ),
    );
    const tilts = getXYFromDirection(direction);
    return new PointerEvent(type, {
      clientX: blockCoords.x,
      clientY: blockCoords.y,
      tiltX: tilts.x,
      tiltY: tilts.y,
    });
  }

  /**
   * The keyboard drag may have moved the block to an appropriate location
   * for a preview. Update the saved delta to reflect the block's new
   * location, so that it does not jump during the next unconstrained move.
   */
  updateTotalDelta() {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    this.totalDelta = new utils.Coordinate(
      this.block.relativeCoords.x - this.startLocation.x,
      this.block.relativeCoords.y - this.startLocation.y,
    );
  }
}
