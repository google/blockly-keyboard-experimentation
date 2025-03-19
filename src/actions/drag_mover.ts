/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Constants from '../constants';
import {
  ASTNode,
  Connection,
  NEXT_STATEMENT,
  PREVIOUS_STATEMENT,
  RenderedConnection,
  ShortcutRegistry,
  WorkspaceSvg,
  common,
  dragging,
  registry,
  utils,
} from 'blockly';
import type {Block, BlockSvg, IConnectionChecker, IDragger} from 'blockly';
import {Mover, MoveInfo} from './mover';
import {Navigation} from '../navigation';
import {LineCursor} from 'src/line_cursor';

/**
 * Represents a nearby valid connection.
 * Redeclaration of a type from core/dragging/block_drag_strategy for monkeypatch purposes.
 */
interface ConnectionCandidate {
  /** A connection on the dragging stack that is compatible with neighbour. */
  local: RenderedConnection;

  /** A nearby connection that is compatible with local. */
  neighbour: RenderedConnection;

  /** The distance between the local connection and the neighbour connection. */
  distance: number;
}

/**
 * An experimental implementation of Mover that uses a dragger to
 * perform unconstraind movment.
 */
export class DragMover extends Mover {
  /**
   * The distance to move an item, in workspace coordinates, when
   * making an unconstrained move.
   */
  UNCONSTRAINED_MOVE_DISTANCE = 20;

  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving a block on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected declare moves: Map<WorkspaceSvg, DragMoveInfo>;

  // Saved methods that get monkeypatched.
  private oldGetConnectionCandidate = null;
  private oldCurrCandidateIsBetter = null;

  private localConns: RenderedConnection[] = [];
  private startParentConn: RenderedConnection | null = null;
  private searchNode: ASTNode | null = null;

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff a move has successfully begun.
   */
  override startMove(workspace: WorkspaceSvg) {
    const cursor = workspace?.getCursor();
    const curNode = cursor?.getCurNode();
    const block = curNode?.getSourceBlock() as BlockSvg | null;
    if (!cursor || !block) throw new Error('precondition failure');

    const startParentConn =
      block.outputConnection?.targetConnection ??
      block.previousConnection?.targetConnection;
    if (startParentConn) {
      this.searchNode = ASTNode.createConnectionNode(startParentConn);
    }

    // Select and focus block.
    common.setSelected(block);
    cursor.setCurNode(ASTNode.createBlockNode(block)!);
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Record that a move is in progress and start dragging.
    const info = new DragMoveInfo(block, dragger);
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
  override finishMove(workspace: WorkspaceSvg) {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

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
  override abortMove(workspace: WorkspaceSvg) {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Monkey patch dragger to trigger call to draggable.revertDrag.
    (info.dragger as any).shouldReturnToStart = () => true;
    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.moves.delete(workspace);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @param xDirection -1 to move left. 1 to move right.
   * @param yDirection -1 to move up. 1 to move down.
   * @returns True iff this action applies and has been performed.
   */
  override moveConstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
    /* ... */
  ): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');
    console.log('move constrained');

    info.totalDelta.x = xDirection;
    info.totalDelta.y = yDirection;

    const dragger = info.dragger as dragging.Dragger;

    // @ts-expect-error draggable is protected
    const draggable = dragger.draggable as BlockSvg;
    // @ts-expect-error dragStrategy is private
    const dragStrategy = draggable.dragStrategy as dragging.BlockDragStrategy;
    // @ts-expect-error startParentConn is private.
    this.startParentConn = dragStrategy.startParentConn;
    this.patchDragStrategy(dragStrategy);
    dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    this.unpatchDragStrategy(dragStrategy);
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
  override moveUnconstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.totalDelta.x +=
      xDirection * this.UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y +=
      yDirection * this.UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    return true;
  }

  /**
   * Returns all of the connections we might connect to blocks on the workspace.
   *
   * Includes any connections on the dragging block, and any last next
   * connection on the stack (if one exists).
   */
  private getLocalConnections(draggingBlock: BlockSvg) {
    const available = draggingBlock.getConnections_(false);
    available.filter((conn) => {
      return conn.type == PREVIOUS_STATEMENT || conn.type == NEXT_STATEMENT;
    });
    const lastOnStack = draggingBlock.lastConnectionInStack(true);
    if (lastOnStack && lastOnStack !== draggingBlock.nextConnection) {
      available.push(lastOnStack);
    }
    this.localConns = available;
    return available;
  }

  private getConstrainedConnectionCandidate(
    draggingBlock: BlockSvg,
    delta: utils.Coordinate,
  ): ConnectionCandidate | null {
    console.log('get constrained connection candidate');
    const cursor = draggingBlock.workspace.getCursor() as LineCursor;
    if (!this.startParentConn) return null;

    const initialNode = this.searchNode; //ASTNode.createConnectionNode(this.startParentConn);
    if (!initialNode) return null;

    this.getLocalConnections(draggingBlock);
    const connectionChecker = draggingBlock.workspace.connectionChecker;

    let candidateConnection: ConnectionCandidate | null = null;

    let potential: ASTNode | null = initialNode;
    // if (delta.x == 0 && delta.y == 1) {
    //   // down
    // up
    while (potential && !candidateConnection) {
      if ((delta.x == 0 && delta.y == -1) || (delta.x == -1 && delta.y == 0)) {
        // @ts-expect-error accessing protected and private properties.
        potential = cursor!.getPreviousNode(potential, (node) => {
          console.log('check if valid');
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      } else if (
        (delta.x == 0 && delta.y == 1) ||
        (delta.x == 1 && delta.y == 0)
      ) {
        // @ts-expect-error accessing protected and private properties.
        potential = cursor!.getNextNode(potential, (node) => {
          console.log('check if valid');
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      } else {
        console.log('how did we get here');
        return null;
      }
      console.log('potential is now ' + potential?.getType());

      this.localConns.forEach((conn) => {
        const potentialLocation =
          potential?.getLocation() as RenderedConnection;
        if (connectionChecker.canConnect(conn, potentialLocation, true, 2000)) {
          candidateConnection = {
            local: conn,
            neighbour: potentialLocation,
            distance: 0,
          };
          console.log('good candidate');
        } else {
          console.log('bad candidate');
        }
      });
    }
    // }
    // Build and return a ConnectionCandidate.

    if (candidateConnection) {
      this.searchNode = ASTNode.createConnectionNode(
        (candidateConnection as ConnectionCandidate).neighbour,
      );
    }
    return candidateConnection;
  }

  private patchDragStrategy(strategy: dragging.BlockDragStrategy) {
    // Monkeypatch getConnectionCandidate and save the old one.
    // @ts-expect-error getConnectionCandidate is private.
    this.oldGetConnectionCandidate = strategy.getConnectionCandidate;

    (strategy as any).getConnectionCandidate =
      this.getConstrainedConnectionCandidate.bind(this);

    // Monkeypatch currCandidateIsBetter and save the old one.
    // @ts-expect-error getConnectionCandidate is private.
    this.oldCurrCandidateIsBetter = strategy.currCandidateIsBetter;
    // If the candidate exists, say it's better.
    (strategy as any).currCandidateIsBetter = () => false;
  }

  private unpatchDragStrategy(strategy: dragging.BlockDragStrategy) {
    (strategy as any).getConnectionCandidate = this.oldGetConnectionCandidate;
    (strategy as any).currCandidateIsBetter = this.oldCurrCandidateIsBetter;
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
class DragMoveInfo extends MoveInfo {
  /** Total distance moved, in screen pixels */
  totalDelta = new utils.Coordinate(0, 0);

  constructor(
    public readonly block: Block,
    public readonly dragger: IDragger,
  ) {
    super(block);
  }

  /** Create fake pointer event for dragging. */
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
