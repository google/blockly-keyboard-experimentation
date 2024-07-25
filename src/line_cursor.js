/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The class representing a line cursor.
 * A line cursor tries to traverse the blocks and connections on a block as if
 * they were lines of code in a text editor. Previous and next traverse previous
 * connections, next connections and blocks, while in and out traverse input
 * connections and fields.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

import * as Blockly from 'blockly/core';
import {ASTNode, BasicCursor} from 'blockly';

/**
 * Class for a line cursor.
 * @constructor
 * @extends {BasicCursor}
 */
export class LineCursor extends BasicCursor {
  /**
   * Constructor for a line cursor.
   */
  constructor() {
    super();
  }

  /**
   * Moves the cursor to the next previous connection, next connection or block
   * in the pre order traversal. Finds the next node in the pre order traversal.
   * @returns {ASTNode} The next node, or null if the current node is
   *     not set or there is no next value.
   * @override
   */
  next() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = this.getNextNode_(curNode, this.validLineNode);

    // Skip the input or next value if there is a connected block.
    if (
      newNode &&
      (newNode.getType() == ASTNode.types.INPUT ||
        newNode.getType() == ASTNode.types.NEXT) &&
      newNode.getLocation().targetBlock()
    ) {
      newNode = this.getNextNode_(newNode, this.validLineNode);
    }
    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Moves the cursor to the next input connection or field
   * in the pre order traversal.
   * @returns {ASTNode} The next node, or null if the current node is
   *     not set or there is no next value.
   * @override
   */
  in() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = this.getNextNode_(curNode, this.validInLineNode);

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }
  /**
   * Moves the cursor to the previous next connection or previous connection in
   * the pre order traversal.
   * @returns {ASTNode} The previous node, or null if the current node
   *     is not set or there is no previous value.
   * @override
   */
  prev() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = this.getPreviousNode_(curNode, this.validLineNode);

    if (
      newNode &&
      (newNode.getType() == ASTNode.types.INPUT ||
        newNode.getType() == ASTNode.types.NEXT) &&
      newNode.getLocation().targetBlock()
    ) {
      newNode = this.getPreviousNode_(newNode, this.validLineNode);
    }

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }
  /**
   * Moves the cursor to the previous input connection or field in the pre order
   * traversal.
   * @returns {ASTNode} The previous node, or null if the current node
   *     is not set or there is no previous value.
   * @override
   */
  out() {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = this.getPreviousNode_(curNode, this.validInLineNode);

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Decides if the previous and next methods should traverse the given node.
   * The previous and next method only traverse previous connections, next
   * connections and blocks.
   * @param {ASTNode} node The AST node to check.
   * @returns {boolean} True if the node should be visited, false otherwise.
   * @protected
   */
  validLineNode(node) {
    if (!node) {
      return false;
    }
    let isValid = false;
    const location = node.getLocation();
    const type = node && node.getType();
    if (type == ASTNode.types.BLOCK) {
      if (location.outputConnection === null) {
        isValid = true;
      }
    } else if (
      type == ASTNode.types.INPUT &&
      location.type == Blockly.NEXT_STATEMENT
    ) {
      isValid = true;
    } else if (type == ASTNode.types.NEXT) {
      isValid = true;
    }
    return isValid;
  }

  /**
   * Decides if the in and out methods should traverse the given node.
   * The in and out method only traverse fields and input connections.
   * @param {ASTNode} node The AST node to check whether it is valid.
   * @returns {boolean} True if the node should be visited, false otherwise.
   * @protected
   */
  validInLineNode(node) {
    if (!node) {
      return false;
    }
    let isValid = false;
    const location = node.getLocation();
    const type = node && node.getType();
    if (type == ASTNode.types.FIELD) {
      isValid = true;
    } else if (
      type == ASTNode.types.INPUT &&
      location.type == Blockly.INPUT_VALUE
    ) {
      isValid = true;
    }
    return isValid;
  }

  /**
   * Moves the cursor to the next sibling that is at the same level
   * of nesting.
   * @returns {ASTNode} The next sibling node, or null if the current node
   *     is not set or there is no next sibling node.
   * @override
   */
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

  /**
   * Moves the cursor to the previous sibling that is at the same level
   * of nesting.
   * @returns {ASTNode} The previous sibling node, or null if the current node
   *     is not set or there is no previous sibling node.
   * @override
   */
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

  /**
   * Moves the cursor out by one level of nesting.
   * @returns {ASTNode} The new node the cursor points to, or null if
   * one could not be found.
   * @override
   */
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

  /**
   * Moves the cursor in by one level of nesting.
   * @returns {ASTNode} The new node the cursor points to, or null if
   * one could not be found.
   * @override
   */
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

export const registrationName = 'LineCursor';
export const registrationType = Blockly.registry.Type.CURSOR;

Blockly.registry.register(registrationType, registrationName, LineCursor);

export const pluginInfo = {
  [registrationType]: registrationName,
};

/**
 * Install this cursor on the marker manager in the same position as
 * the previous cursor.
 * @param {Blockly.MarkerManager} markerManager
 */
export function installCursor(markerManager) {
  const oldCurNode = markerManager.getCursor().getCurNode();
  const lineCursor = new LineCursor();
  markerManager.setCursor(lineCursor);
  if (oldCurNode) {
    markerManager.getCursor().setCurNode(oldCurNode);
  }
}
