/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LineCursor} from '@blockly/keyboard-navigation';
import {ASTNode} from 'blockly';

export class ExtendedLineCursor extends LineCursor {
  nextSibling() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = null;
    switch (curNode.type) {
      case ASTNode.types.STACK: {
        newNode = curNode.navigateBetweenStacks(true);
        break;
      }
      case ASTNode.types.WORKSPACE: {
        break;
      }
      default: {
        const block = curNode.getSourceBlock();
        const nextBlock = block.getNextBlock();
        newNode = ASTNode.createBlockNode(nextBlock);
        break;
      }
    }

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  previousSibling() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = null;
    switch (curNode.type) {
      case ASTNode.types.STACK: {
        newNode = curNode.navigateBetweenStacks(false);
        break;
      }
      case ASTNode.types.WORKSPACE: {
        break;
      }
      default: {
        const block = curNode.getSourceBlock();
        // TODO: Decide what this should do if the source block is
        // the first block inside a statement input.
        // TODO: Decide what this should do if the source block
        // has an output instead of a previous.
        const prevBlock = block.getPreviousBlock();
        newNode = ASTNode.createBlockNode(prevBlock);
        break;
      }
    }

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  contextOut() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }

    // Returns null at the workspace level.
    // TODO: Decide where the cursor goes from the workspace level.
    let newNode = curNode.out();
    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  contextIn() {
    let curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    // If we are on a previous or output connection, go to the block level
    // before performing next operation.
    if (
      curNode.getType() === ASTNode.types.PREVIOUS ||
      curNode.getType() === ASTNode.types.OUTPUT
    ) {
      curNode = curNode.next();
    }
    const newNode = curNode?.in() ?? null;

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }
}

export function installCursor(markerManager) {
  const oldCurNode = markerManager.getCursor().getCurNode();
  const lineCursor = new ExtendedLineCursor();
  markerManager.setCursor(lineCursor);
  if (oldCurNode) {
    markerManager.getCursor().setCurNode(oldCurNode);
  }
}
