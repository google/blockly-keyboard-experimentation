/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  BlockSvg,
  ConnectionType,
  LineCursor,
  RenderedConnection,
  dragging,
  utils,
} from 'blockly';
import {Direction, getDirectionFromXY} from './drag_direction';

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
    // @ts-expect-error connectionCandidate is private.
    this.connectionCandidate = this.createInitialCandidate();
    this.forceShowPreview();
  }

  override drag(newLoc: utils.Coordinate, e?: PointerEvent): void {
    if (!e) return;
    this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
    super.drag(newLoc);

    // Handle the case when an unconstrained drag found a connection candidate.
    // @ts-expect-error connectionCandidate is private.
    if (this.connectionCandidate) {
      // @ts-expect-error connectionCandidate is private.
      const neighbour = (this.connectionCandidate as ConnectionCandidate)
        .neighbour;
      // The next constrained move will resume the search from the current
      // candidate location.
      this.searchNode = ASTNode.createConnectionNode(neighbour);
      // The moving block will be positioned slightly down and to the
      // right of the connection it found.
      // @ts-expect-error block is private.
      this.block.moveDuringDrag(
        new utils.Coordinate(neighbour.x + 10, neighbour.y + 10),
      );
    } else {
      // Handle the case when unconstrained drag was far from any candidate.
      this.searchNode = null;
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
    // @ts-expect-error getLocalConnections is private.
    const localConns = this.getLocalConnections(draggingBlock);

    let candidateConnection = this.findTraversalCandidate(
      draggingBlock,
      localConns,
    );
    // Fall back on a coordinate-based search if there was no good starting
    // point for the search.
    if (!candidateConnection && !this.searchNode) {
      candidateConnection = this.findNearestCandidate(localConns);
    }
    return candidateConnection;
  }

  /**
   * Get the nearest valid candidate connection, regardless of direction.
   * TODO(github.com/google/blockly/issues/8869): Replace with an
   * override of `getSearchRadius` when implemented in core.
   *
   * @param localConns The list of connections on the dragging block(s) that are
   *     available to connect to.
   * @returns A candidate connection and radius, or null if none was found.
   */
  findNearestCandidate(
    localConns: RenderedConnection[],
  ): ConnectionCandidate | null {
    let radius = Infinity;
    let candidate = null;
    const dxy = new utils.Coordinate(0, 0);

    for (const conn of localConns) {
      const {connection: neighbour, radius: rad} = conn.closest(radius, dxy);
      if (neighbour) {
        candidate = {
          local: conn,
          neighbour: neighbour,
          distance: rad,
        };
        radius = rad;
      }
    }
    return candidate;
  }

  /**
   * Get the nearest valid candidate connection in traversal order.
   *
   * @param draggingBlock The root block being dragged.
   * @param localConns The list of connections on the dragging block(s) that are
   *     available to connect to.
   * @returns A candidate connection and radius, or null if none was found.
   */
  findTraversalCandidate(
    draggingBlock: BlockSvg,
    localConns: RenderedConnection[],
  ): ConnectionCandidate | null {
    // TODO(#385): Make sure this works for any cursor, not just LineCursor.
    const cursor = draggingBlock.workspace.getCursor() as LineCursor;
    if (!cursor) return null;

    const connectionChecker = draggingBlock.workspace.connectionChecker;
    let candidateConnection: ConnectionCandidate | null = null;
    let potential: ASTNode | null = this.searchNode;
    const dir = this.currentDragDirection;
    while (potential && !candidateConnection) {
      if (dir === Direction.Up || dir === Direction.Left) {
        potential = cursor.getPreviousNode(potential, (node) => {
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      } else if (dir === Direction.Down || dir === Direction.Right) {
        potential = cursor.getNextNode(potential, (node) => {
          // @ts-expect-error isConnectionType is private.
          return node && ASTNode.isConnectionType(node.getType());
        });
      }

      localConns.forEach((conn: RenderedConnection) => {
        const location = potential?.getLocation() as RenderedConnection;
        if (connectionChecker.canConnect(conn, location, true, Infinity)) {
          candidateConnection = {
            local: conn,
            neighbour: location,
            distance: 0,
          };
        }
      });
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

  /**
   * Force the preview (replacement or insertion marker) to be shown
   * immediately. Keyboard drags should always show a preview, even when
   * the drag has just started; this forces it.
   */
  private forceShowPreview() {
    // @ts-expect-error connectionPreviewer is private
    const previewer = this.connectionPreviewer;
    // @ts-expect-error connectionCandidate is private
    const candidate = this.connectionCandidate as ConnectionCandidate;
    if (!candidate || !previewer) return;
    // @ts-expect-error block is private
    const block = this.block;

    // This is essentially a copy of the second half of updateConnectionPreview
    // in BlockDragStrategy. It adds a `moveDuringDrag` call at the end.
    const {local, neighbour} = candidate;
    const localIsOutputOrPrevious =
      local.type === ConnectionType.OUTPUT_VALUE ||
      local.type === ConnectionType.PREVIOUS_STATEMENT;

    const target = neighbour.targetBlock();
    const neighbourIsConnectedToRealBlock =
      target && !target.isInsertionMarker();

    const orphanCanConnectAtEnd =
      target &&
      // @ts-expect-error orphanCanConnectAtEnd is private
      this.orphanCanConnectAtEnd(block, target, local.type);
    if (
      localIsOutputOrPrevious &&
      neighbourIsConnectedToRealBlock &&
      !orphanCanConnectAtEnd
    ) {
      previewer.previewReplacement(local, neighbour, target);
    } else {
      previewer.previewConnection(local, neighbour);
    }
    // The moving block will be positioned slightly down and to the
    // right of the connection it found.
    block.moveDuringDrag(
      new utils.Coordinate(neighbour.x + 10, neighbour.y + 10),
    );
  }

  /**
   * Create a candidate representing where the block was previously connected.
   * Used to render the block position after picking up the block but before
   * moving during a drag.
   *
   * @returns A connection candidate representing where the block was at the
   *     start of the drag.
   */
  private createInitialCandidate(): ConnectionCandidate | null {
    // @ts-expect-error startParentConn is private.
    const neighbour = this.startParentConn;
    if (neighbour) {
      this.searchNode = ASTNode.createConnectionNode(neighbour);
      switch (neighbour.type) {
        case ConnectionType.INPUT_VALUE:
          return {
            neighbour: neighbour,
            // @ts-expect-error block is private.
            local: this.block.outputConnection,
            distance: 0,
          };
        case ConnectionType.NEXT_STATEMENT:
          return {
            neighbour: neighbour,
            // @ts-expect-error block is private.
            local: this.block.previousConnection,
            distance: 0,
          };
      }
    }
    return null;
  }
}
