/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as aria from './aria';

/**
 * Computes the human-readable ARIA label for the specified block.
 *
 * @param block The block whose label should be computed.
 * @returns A human-readable ARIA label/representation for the block.
 */
export function computeBlockAriaLabel(block: Blockly.BlockSvg): string {
  // Guess the block's aria label based on its field labels.
  if (block.isShadow()) {
    // TODO: Shadows may have more than one field.
    // Shadow blocks are best represented directly by their field since they
    // effectively operate like a field does for keyboard navigation purposes.
    const field = Array.from(block.getFields())[0];
    return (
      aria.getState(field.getFocusableElement(), aria.State.LABEL) ?? 'Unknown?'
    );
  }

  const fieldLabels = [];
  for (const field of block.getFields()) {
    if (field instanceof Blockly.FieldLabel) {
      fieldLabels.push(field.getText());
    }
  }
  return fieldLabels.join(' ');
}

function collectSiblingBlocks(
  block: Blockly.BlockSvg,
  surroundParent: Blockly.BlockSvg | null,
): Blockly.BlockSvg[] {
  // NOTE TO DEVELOPERS: it's very important that these are NOT sorted. The
  // returned list needs to be relatively stable for consistency block indexes
  // read out to users via screen readers.
  if (surroundParent) {
    // Start from the first sibling and iterate in navigation order.
    const firstSibling: Blockly.BlockSvg = surroundParent.getChildren(false)[0];
    const siblings: Blockly.BlockSvg[] = [firstSibling];
    let nextSibling: Blockly.BlockSvg | null = firstSibling;
    while ((nextSibling = nextSibling.getNextBlock())) {
      siblings.push(nextSibling);
    }
    return siblings;
  } else {
    // For top-level blocks, simply return those from the workspace.
    return block.workspace.getTopBlocks(false);
  }
}

function computeLevelInWorkspace(block: Blockly.BlockSvg): number {
  const surroundParent = block.getSurroundParent();
  return surroundParent ? computeLevelInWorkspace(surroundParent) + 1 : 0;
}

/**
 * Recomputes all BlockSvg ARIA tree structures in the workspace.
 *
 * This is a fairly expensive operation and should ideally only be performed
 * when a block structure or relationship change has been made.
 *
 * @param workspace The workspace whose top-level blocks may need a tree
 *     structure recomputation.
 */
export function recomputeAllWorkspaceAriaTrees(
  workspace: Blockly.WorkspaceSvg,
) {
  // TODO: Do this efficiently (probably incrementally).
  workspace
    .getTopBlocks(false)
    .forEach((block) => recomputeAriaTreeItemDetailsRecursively(block));
}

function recomputeAriaTreeItemDetailsRecursively(block: Blockly.BlockSvg) {
  const elem = block.getFocusableElement();
  const connection = getCurrentConnectionCandidate(block);
  let childPosition: number;
  let parentsChildCount: number;
  let hierarchyDepth: number;
  if (connection) {
    // If the block is being inserted into a new location, the position is hypothetical.
    // TODO: Figure out how to deal with output connections.
    let surroundParent: Blockly.BlockSvg | null;
    let siblingBlocks: Blockly.BlockSvg[];
    if (connection.type === Blockly.ConnectionType.INPUT_VALUE) {
      surroundParent = connection.sourceBlock_;
      siblingBlocks = collectSiblingBlocks(block, surroundParent);
      // The block is being added as a child since it's input.
      // TODO: Figure out how to compute the correct position.
      childPosition = 1;
    } else {
      surroundParent = connection.sourceBlock_.getSurroundParent();
      siblingBlocks = collectSiblingBlocks(block, surroundParent);
      // The block is being added after the connected block.
      childPosition = siblingBlocks.indexOf(connection.sourceBlock_) + 2;
    }
    parentsChildCount = siblingBlocks.length + 1;
    hierarchyDepth = surroundParent
      ? computeLevelInWorkspace(surroundParent) + 1
      : 1;
  } else {
    const surroundParent = block.getSurroundParent();
    const siblingBlocks = collectSiblingBlocks(block, surroundParent);
    childPosition = siblingBlocks.indexOf(block) + 1;
    parentsChildCount = siblingBlocks.length;
    hierarchyDepth = computeLevelInWorkspace(block) + 1;
  }
  aria.setState(elem, aria.State.POSINSET, childPosition);
  aria.setState(elem, aria.State.SETSIZE, parentsChildCount);
  aria.setState(elem, aria.State.LEVEL, hierarchyDepth);
  block
    .getChildren(false)
    .forEach((child) => recomputeAriaTreeItemDetailsRecursively(child));
}

/**
 * Announces the current dynamic state of the specified block, if any.
 *
 * An example of dynamic state is whether the block is currently being moved,
 * and in what way. These states aren't represented through ARIA directly, so
 * they need to be determined and announced using an ARIA live region
 * (see aria.announceDynamicAriaState).
 *
 * @param block The block whose dynamic state should maybe be announced.
 * @param isMoving Whether the specified block is currently being moved.
 * @param isCanceled Whether the previous movement operation has been canceled.
 * @param newLoc The new location the block is moving to (if unconstrained).
 */
export function announceDynamicAriaStateForBlock(
  block: Blockly.BlockSvg,
  isMoving: boolean,
  isCanceled: boolean,
  newLoc?: Blockly.utils.Coordinate,
) {
  const connection = getCurrentConnectionCandidate(block);
  if (isCanceled) {
    aria.announceDynamicAriaState('Canceled movement');
    return;
  }
  if (!isMoving) return;
  if (connection) {
    // TODO: Figure out general detachment.
    // TODO: Figure out how to deal with output connections.
    const surroundParent: Blockly.BlockSvg | null = connection.sourceBlock_;
    const announcementContext = [];
    announcementContext.push('Moving'); // TODO: Specialize for inserting?
    // NB: Old code here doesn't seem to handle parents correctly.
    if (connection.type === Blockly.ConnectionType.INPUT_VALUE) {
      announcementContext.push('to', 'input');
    } else {
      announcementContext.push('to', 'child');
    }
    if (surroundParent) {
      announcementContext.push('of', computeBlockAriaLabel(surroundParent));
    }

    // If the block is currently being moved, announce the new block label so that the user understands where it is now.
    // TODO: Figure out how much recomputeAriaTreeItemDetailsRecursively needs to anticipate position if it won't be reannounced, and how much of that context should be included in the liveannouncement.
    aria.announceDynamicAriaState(announcementContext.join(' '));
  } else if (newLoc) {
    // The block is being freely dragged.
    aria.announceDynamicAriaState(
      `Moving unconstrained to coordinate x ${Math.round(newLoc.x)} and y ${Math.round(newLoc.y)}.`,
    );
  }
}

interface ConnectionCandidateHolder {
  currentConnectionCandidate: Blockly.RenderedConnection | null;
}

function getCurrentConnectionCandidate(
  block: Blockly.BlockSvg,
): Blockly.RenderedConnection | null {
  const connectionHolder = block as unknown as ConnectionCandidateHolder;
  return connectionHolder.currentConnectionCandidate;
}

/**
 * Updates the current connection candidate for the specified block (that is,
 * the connection the block is being connected to).
 *
 * This corresponds to a temporary property used when determining specifics of
 * a block's location when being moved.
 *
 * @param block The block which may have a new connection candidate.
 * @param connection The latest connection candidate for the block, or null if
 *     none.
 */
export function setCurrentConnectionCandidate(
  block: Blockly.BlockSvg,
  connection: Blockly.RenderedConnection | null,
) {
  const connectionHolder = block as unknown as ConnectionCandidateHolder;
  connectionHolder.currentConnectionCandidate = connection;
}
