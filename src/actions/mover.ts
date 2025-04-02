/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Constants from '../constants';
import {
  ASTNode,
  Connection,
  ContextMenuRegistry,
  ShortcutRegistry,
  WorkspaceSvg,
  common,
  registry,
  utils,
} from 'blockly';
import type {BlockSvg, IDragger, IDragStrategy} from 'blockly';
import {Navigation} from '../navigation';
import {KeyboardDragStrategy} from '../keyboard_drag_strategy';

const KeyCodes = utils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * The distance to move an item, in workspace coordinates, when
 * making an unconstrained move.
 */
const UNCONSTRAINED_MOVE_DISTANCE = 20;

/**
 * Actions for moving blocks with keyboard shortcuts.
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
   * The stashed isDragging function, which is replaced at the beginning
   * of a keyboard drag and reset at the end of a keyboard drag.
   */
  oldIsDragging: (() => boolean) | null = null;

  /**
   * The block's base drag strategy, which will be overridden during
   * keyboard drags and reset at the end of the drag.
   */
  private oldDragStrategy: IDragStrategy | null = null;

  constructor(
    protected navigation: Navigation,
    protected canEdit: (ws: WorkspaceSvg) => boolean,
  ) {}

  private shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
    // Begin and end move.
    {
      name: 'Start move',
      preconditionFn: (workspace) => this.canMove(workspace),
      callback: (workspace) => this.startMove(workspace),
      keyCodes: [KeyCodes.M],
    },
    {
      name: 'Finish move',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.finishMove(workspace),
      keyCodes: [KeyCodes.ENTER],
      allowCollision: true,
    },
    {
      name: 'Abort move',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.abortMove(workspace),
      keyCodes: [KeyCodes.ESC],
      allowCollision: true,
    },

    // Constrained moves.
    {
      name: 'Move left, constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ...*/),
      keyCodes: [KeyCodes.LEFT],
      allowCollision: true,
    },
    {
      name: 'Move right unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.RIGHT],
      allowCollision: true,
    },
    {
      name: 'Move up, constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.UP],
      allowCollision: true,
    },
    {
      name: 'Move down constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.DOWN],
      allowCollision: true,
    },

    // Unconstrained moves.
    {
      name: 'Move left, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, -1, 0),
      keyCodes: [
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move right, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 1, 0),
      keyCodes: [
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move up unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, -1),
      keyCodes: [
        createSerializedKey(KeyCodes.UP, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.UP, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move down, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, 1),
      keyCodes: [
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.CTRL]),
      ],
    },
  ];

  menuItems: ContextMenuRegistry.RegistryItem[] = [
    {
      displayText: 'Move Block (M)',
      preconditionFn: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return 'hidden';
        return this.canMove(workspace) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return false;
        this.startMove(workspace);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'move',
      weight: 8.5,
    },
  ];

  /**
   * Install the actions as both keyboard shortcuts and (where
   * applicable) context menu items.
   */
  install() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.register(shortcut);
    }
    for (const menuItem of this.menuItems) {
      ContextMenuRegistry.registry.register(menuItem);
    }
  }

  /**
   * Uninstall these actions.
   */
  uninstall() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.unregister(shortcut.name);
    }
    for (const menuItem of this.menuItems) {
      ContextMenuRegistry.registry.unregister(menuItem.id);
    }
  }

  /**
   * Returns true iff we are able to begin moving the block which
   * currently has focus on the given workspace.
   *
   * @param workspace The workspace to move on.
   * @returns True iff we can begin a move.
   */
  canMove(workspace: WorkspaceSvg) {
    const block = this.getCurrentBlock(workspace);

    return !!(
      this.navigation.getState(workspace) === Constants.STATE.WORKSPACE &&
      this.canEdit(workspace) &&
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
    return this.canEdit(workspace) && this.moves.has(workspace);
  }

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff a move has successfully begun.
   */
  startMove(workspace: WorkspaceSvg) {
    const cursor = workspace?.getCursor();
    const block = this.getCurrentBlock(workspace);
    if (!cursor || !block) throw new Error('precondition failure');

    // Select and focus block.
    common.setSelected(block);
    cursor.setCurNode(ASTNode.createBlockNode(block));

    this.patchIsDragging(workspace);
    this.patchDragStrategy(block);
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Record that a move is in progress and start dragging.
    const info = new MoveInfo(block, dragger);
    this.moves.set(workspace, info);
    // Begin drag.
    dragger.onDragStart(info.fakePointerEvent('pointerdown'));
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
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.unpatchIsDragging(workspace);
    this.unpatchDragStrategy(info.block);
    this.moves.delete(workspace);
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
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Monkey patch dragger to trigger call to draggable.revertDrag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info.dragger as any).shouldReturnToStart = () => true;
    const blockSvg = info.block;

    // Explicitly call `hidePreview` because it is not called in revertDrag.
    // @ts-expect-error Access to private property dragStrategy.
    blockSvg.dragStrategy.connectionPreviewer.hidePreview();
    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.unpatchIsDragging(workspace);
    this.unpatchDragStrategy(info.block);
    this.moves.delete(workspace);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @returns True iff this action applies and has been performed.
   */
  moveConstrained(
    workspace: WorkspaceSvg,
    /* ... */
  ) {
    // Not yet implemented.  Absorb keystroke to avoid moving cursor.
    alert(`Constrained movement not implemented.

Use ctrl+arrow or alt+arrow (option+arrow on macOS) for unconstrained move.
Use enter to complete the move, or escape to abort.`);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * without constraint.
   *
   * @param workspace The workspace to move on.
   * @param xDirection -1 to move left. 1 to move right.
   * @param yDirection -1 to move up. 1 to move down.
   * @returns True iff this action applies and has been performed.
   */
  moveUnconstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.totalDelta.x +=
      xDirection * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y +=
      yDirection * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    return true;
  }

  /**
   * Get the source block for the cursor location, or undefined if no
   * source block can be found.
   *
   * @param workspace The workspace to inspect for a cursor.
   * @returns The source block, or undefined if no appropriate block
   *     could be found.
   */
  protected getCurrentBlock(workspace: WorkspaceSvg): BlockSvg | undefined {
    const cursor = workspace?.getCursor();
    const curNode = cursor?.getCurNode();
    return (curNode?.getSourceBlock() as BlockSvg) ?? undefined;
  }

  /**
   * Monkeypatch over workspace.isDragging to return whether a keyboard
   * drag is in progress.
   *
   * @param workspace The workspace to patch.
   */
  private patchIsDragging(workspace: WorkspaceSvg) {
    this.oldIsDragging = workspace.isDragging;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workspace as any).isDragging = () => this.isMoving(workspace);
  }

  /**
   * Remove the monkeypatch on workspace.isDragging.
   *
   * @param workspace The workspace to unpatch.
   */
  private unpatchIsDragging(workspace: WorkspaceSvg) {
    if (this.oldIsDragging) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (workspace as any).isDragging = this.oldIsDragging;
    }
  }
  /**
   * Monkeypatch: replace the block's drag strategy and cache the old value.
   *
   * @param block The block to patch.
   */
  private patchDragStrategy(block: BlockSvg) {
    // @ts-expect-error block.dragStrategy is private.
    this.oldDragStrategy = block.dragStrategy;
    block.setDragStrategy(new KeyboardDragStrategy(block));
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
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
export class MoveInfo {
  /** Total distance moved, in screen pixels */
  totalDelta = new utils.Coordinate(0, 0);
  readonly parentNext: Connection | null;
  readonly parentInput: Connection | null;
  readonly startLocation: utils.Coordinate;

  constructor(
    readonly block: BlockSvg,
    readonly dragger: IDragger,
  ) {
    this.parentNext = block.previousConnection?.targetConnection ?? null;
    this.parentInput = block.outputConnection?.targetConnection ?? null;
    this.startLocation = block.getRelativeToSurfaceXY();
  }

  /**
   * Create a fake pointer event for dragging.
   *
   * @param type Which type of pointer event to create.
   * @returns A synthetic PointerEvent that can be consumed by Blockly's
   *     dragging code.
   */
  fakePointerEvent(type: string): PointerEvent {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    const blockCoords = utils.svgMath.wsToScreenCoordinates(
      workspace,
      new utils.Coordinate(
        this.startLocation.x + this.totalDelta.x,
        this.startLocation.y + this.totalDelta.y,
      ),
    );
    return new PointerEvent(type, {
      clientX: blockCoords.x,
      clientY: blockCoords.y,
    });
  }
}
