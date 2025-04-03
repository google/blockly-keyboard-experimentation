/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ASTNode, BlockSvg, RenderedConnection, dragging, utils} from 'blockly';
import {Direction, getDirectionFromXY} from './drag_direction';
import {LineCursor} from './line_cursor';

// Copied in from core because it is not exported.
interface ConnectionCandidate {
  /** A connection on the dragging stack that is compatible with neighbour. */
  local: RenderedConnection;

  /** A nearby connection that is compatible with local. */
  neighbour: RenderedConnection;

  /** The distance between the local connection and the neighbour connection. */
  distance: number;
}

// @ts-expect-error overrides a private function.
export class KeyboardDragStrategy extends dragging.BlockDragStrategy {
  /** Which direction the current constrained drag is in, if any. */
  private currentDragDirection: Direction | null = null;

  /** Where a constrained movement should start when traversing the tree. */
  private searchNode: ASTNode | null = null;

  override startDrag(e?: PointerEvent) {
    super.startDrag(e);
    // Set position of the dragging block, so that it doesn't pop
    // to the top left of the workspace.
    // @ts-expect-error block and startLoc are private.
    this.block.moveDuringDrag(this.startLoc);
    // @ts-expect-error startParentConn is private.
    this.searchNode = ASTNode.createConnectionNode(this.startParentConn);
  }

  override drag(newLoc: utils.Coordinate, e?: PointerEvent): void {
    if (!e) return;
    this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
    super.drag(newLoc);

    // Handle the case when an unconstrained drag found a connection candidate.
    // The next constrained move will resume the search from the current candidate
    // location.
    // @ts-expect-error connectionCandidate is private.
    if (this.connectionCandidate) {
      this.searchNode = ASTNode.createConnectionNode(
        // @ts-expect-error connectionCandidate is private.
        (this.connectionCandidate as ConnectionCandidate).neighbour,
      );
    }
  }

  /**
   * Returns the next compatible connection in keyboard navigation order,
   * based on the input direction.
   * Always resumes the search at the last valid connection that was tried.
   *
   * @param draggingBlock The block where the drag started.
   * @returns A valid connection candidate, or null if none was found.
   */
  private getConstrainedConnectionCandidate(
    draggingBlock: BlockSvg,
  ): ConnectionCandidate | null {
    // TODO(#385): Make sure this works for any cursor, not just LineCursor.
    const cursor = draggingBlock.workspace.getCursor() as LineCursor;

    const initialNode = this.searchNode;
    if (!initialNode || !cursor) return null;

    // @ts-expect-error getLocalConnections is private.
    const localConns = this.getLocalConnections(draggingBlock);
    const connectionChecker = draggingBlock.workspace.connectionChecker;

    let candidateConnection: ConnectionCandidate | null = null;

    let potential: ASTNode | null = initialNode;
    while (potential && !candidateConnection) {
      if (
        this.currentDragDirection === Direction.Up ||
        this.currentDragDirection === Direction.Left
      ) {
        potential = cursor.getPreviousNode(potential, (node) => {
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      } else if (
        this.currentDragDirection === Direction.Down ||
        this.currentDragDirection === Direction.Right
      ) {
        potential = cursor.getNextNode(potential, (node) => {
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      }

      localConns.forEach((conn: RenderedConnection) => {
        const potentialLocation =
          potential?.getLocation() as RenderedConnection;
        if (
          connectionChecker.canConnect(conn, potentialLocation, true, Infinity)
        ) {
          candidateConnection = {
            local: conn,
            neighbour: potentialLocation,
            distance: 0,
          };
        }
      });
    }
    if (candidateConnection) {
      this.searchNode = ASTNode.createConnectionNode(
        (candidateConnection as ConnectionCandidate).neighbour,
      );
    }
    return candidateConnection;
  }

  override currCandidateIsBetter(
    currCandidate: ConnectionCandidate,
    delta: utils.Coordinate,
    newCandidate: ConnectionCandidate,
  ): boolean {
    if (this.isConstrainedMovement()) {
      return false; // New connection is always better during a constrained drag.
    }
    // @ts-expect-error currCandidateIsBetter is private.
    return super.currCandidateIsBetter(currCandidate, delta, newCandidate);
  }

  override getConnectionCandidate(
    draggingBlock: BlockSvg,
    delta: utils.Coordinate,
  ): ConnectionCandidate | null {
    if (this.isConstrainedMovement()) {
      return this.getConstrainedConnectionCandidate(draggingBlock);
    }
    // @ts-expect-error getConnctionCandidate is private.
    return super.getConnectionCandidate(draggingBlock, delta);
  }

  /**
   * Get whether the most recent drag event represents a constrained
   * keyboard drag.
   *
   * @returns true if the current movement is constrained, otherwise false.
   */
  private isConstrainedMovement(): boolean {
    return !!this.currentDragDirection;
  }
}
