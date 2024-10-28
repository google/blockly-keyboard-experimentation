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

import { FieldColour } from '@blockly/field-colour';
import * as Blockly from 'blockly/core';
import {ASTNode, Marker} from 'blockly/core';

/**
 * Class for a line cursor.
 */
export class LineCursor extends Marker {
  override type = 'cursor';

  /**
   * Constructor for a line cursor.
   */
  constructor() {
    super();
  }

  /**
   * Moves the cursor to the next previous connection, next connection or block
   * in the pre order traversal. Finds the next node in the pre order traversal.
   *
   * @returns The next node, or null if the current node is
   *     not set or there is no next value.
   */
  next(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = this.getNextNode(curNode, this.validLineNode);

    // Skip the input (but not next) connection if there is a connected block.
    if (
      newNode &&
      newNode.getType() === ASTNode.types.INPUT &&
      (newNode.getLocation() as Blockly.Connection).targetBlock()
    ) {
      newNode = this.getNextNode(newNode, this.validLineNode);
    }
    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Moves the cursor to the next input connection or field
   * in the pre order traversal.
   *
   * @returns The next node, or null if the current node is
   *     not set or there is no next value.
   */
  in(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = this.getNextNode(curNode, this.validInLineNode);

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }
  /**
   * Moves the cursor to the previous next connection or previous connection in
   * the pre order traversal.
   *
   * @returns The previous node, or null if the current node
   *     is not set or there is no previous value.
   */
  prev(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = this.getPreviousNode(curNode, this.validLineNode);

    if (
      newNode &&
      (newNode.getType() == ASTNode.types.INPUT ||
        newNode.getType() == ASTNode.types.NEXT) &&
      (newNode.getLocation() as Blockly.Connection).targetBlock()
    ) {
      newNode = this.getPreviousNode(newNode, this.validLineNode);
    }

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Moves the cursor to the previous input connection or field in the pre order
   * traversal.
   *
   * @returns The previous node, or null if the current node
   *     is not set or there is no previous value.
   */
  out(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = this.getPreviousNode(curNode, this.validInLineNode);

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Decides if the previous and next methods should traverse the given node.
   * The previous and next method only traverse previous connections, next
   * connections and blocks.
   *
   * @param node The AST node to check.
   * @returns True if the node should be visited, false otherwise.
   * @protected
   */
  validLineNode(node: ASTNode | null): boolean {
    if (!node) {
      return false;
    }
    let isValid = false;
    const location = node.getLocation();
    const type = node && node.getType();
    if (type == ASTNode.types.BLOCK) {
      if ((location as Blockly.Block).outputConnection === null) {
        isValid = true;
      }
    } else if (
      type == ASTNode.types.INPUT &&
      (location as Blockly.Connection).type == Blockly.NEXT_STATEMENT
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
   *
   * @param node The AST node to check whether it is valid.
   * @returns True if the node should be visited, false otherwise.
   * @protected
   */
  validInLineNode(node: ASTNode | null): boolean {
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
      (location as Blockly.Connection).type == Blockly.INPUT_VALUE
    ) {
      isValid = true;
    }
    return isValid;
  }

  /**
   * Moves the cursor to the next sibling that is at the same level
   * of nesting.
   *
   * @returns The next sibling node, or null if the current node
   *     is not set or there is no next sibling node.
   */
  nextSibling(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = null;
    switch (curNode.getType()) {
      case ASTNode.types.STACK: {
        // TODO: Make navigateBetweenStacks public
        newNode = (curNode as any).navigateBetweenStacks(true);
        break;
      }
      case ASTNode.types.WORKSPACE: {
        break;
      }
      default: {
        const block = curNode.getSourceBlock();
        const nextBlock = block?.getNextBlock();
        if (nextBlock) {
          newNode = ASTNode.createBlockNode(nextBlock);
        }
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
   *
   * @returns The previous sibling node, or null if the current node
   *     is not set or there is no previous sibling node.
   */
  previousSibling(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = null;
    switch (curNode.getType()) {
      case ASTNode.types.STACK: {
        // TODO: Make navigateBetweenStacks public.
        newNode = (curNode as any).navigateBetweenStacks(false);
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
        const prevBlock = block?.getPreviousBlock();
        if (prevBlock) {
          newNode = ASTNode.createBlockNode(prevBlock);
        }
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
   *
   * @returns The new node the cursor points to, or null if
   * one could not be found.
   */
  contextOut(): ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }

    // Returns null at the workspace level.
    // TODO: Decide where the cursor goes from the workspace level.
    const newNode = curNode.out();
    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Moves the cursor in by one level of nesting.
   *
   * @returns The new node the cursor points to, or null if
   * one could not be found.
   */
  contextIn(): ASTNode | null {
    let curNode: ASTNode | null = this.getCurNode();
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

  /**
   * Uses pre order traversal to navigate the Blockly AST. This will allow
   * a user to easily navigate the entire Blockly AST without having to go in
   * and out levels on the tree.
   *
   * @param node The current position in the AST.
   * @param isValid A function true/false depending on whether the given node
   *     should be traversed.
   * @returns The next node in the traversal.
   */
  private getNextNode(
    node: ASTNode | null,
    isValid: (p1: ASTNode | null) => boolean,
  ): ASTNode | null {
    if (!node) {
      return null;
    }
    const newNode = node.in() || node.next();
    if (isValid(newNode)) {
      return newNode;
    } else if (newNode) {
      return this.getNextNode(newNode, isValid);
    }
    const siblingOrParent = this.findSiblingOrParent(node.out());
    if (isValid(siblingOrParent)) {
      return siblingOrParent;
    } else if (siblingOrParent) {
      return this.getNextNode(siblingOrParent, isValid);
    }
    return null;
  }

  /**
   * Reverses the pre order traversal in order to find the previous node. This
   * will allow a user to easily navigate the entire Blockly AST without having
   * to go in and out levels on the tree.
   *
   * @param node The current position in the AST.
   * @param isValid A function true/false depending on whether the given node
   *     should be traversed.
   * @returns The previous node in the traversal or null if no previous node
   *     exists.
   */
  private getPreviousNode(
    node: ASTNode | null,
    isValid: (p1: ASTNode | null) => boolean,
  ): ASTNode | null {
    if (!node) {
      return null;
    }
    let newNode: ASTNode | null = node.prev();

    if (newNode) {
      newNode = this.getRightMostChild(newNode);
    } else {
      newNode = node.out();
    }
    if (isValid(newNode)) {
      return newNode;
    } else if (newNode) {
      return this.getPreviousNode(newNode, isValid);
    }
    return null;
  }

  /**
   * From the given node find either the next valid sibling or parent.
   *
   * @param node The current position in the AST.
   * @returns The parent AST node or null if there are no valid parents.
   */
  private findSiblingOrParent(node: ASTNode | null): ASTNode | null {
    if (!node) {
      return null;
    }
    const nextNode = node.next();
    if (nextNode) {
      return nextNode;
    }
    return this.findSiblingOrParent(node.out());
  }

  /**
   * Get the right most child of a node.
   *
   * @param node The node to find the right most child of.
   * @returns The right most child of the given node, or the node if no child
   *     exists.
   */
  private getRightMostChild(node: ASTNode | null): ASTNode | null {
    if (!node!.in()) {
      return node;
    }
    let newNode = node!.in();
    while (newNode && newNode.next()) {
      newNode = newNode.next();
    }
    return this.getRightMostChild(newNode);
  }

  /**
   * Set the location of the marker and call the update method.
   * Setting isStack to true will only work if the newLocation is the top most
   * output or previous connection on a stack.
   * 
   * Overrides drawing logic to call `setSelected` if the location is
   * a block, for testing on October 28 2024.
   *
   * @param newNode The new location of the marker.
   */
  setCurNode(newNode: ASTNode) {
    const oldNode = (this as any).curNode;
    (this as any).curNode = newNode;
    const drawer = (this as any).drawer;
    if (!drawer) {
      console.error('could not find a drawer');
      return;
    }

    const newNodeIsFieldColour = newNode?.getType() == ASTNode.types.FIELD && 
        (newNode.getLocation() as Blockly.Field) instanceof FieldColour;
    const oldNodeIsFieldColour = oldNode?.getType() == ASTNode.types.FIELD && 
        (oldNode.getLocation() as Blockly.Field) instanceof FieldColour


    if (newNode?.getType() == ASTNode.types.BLOCK) {
      drawer.hide();
      const block = newNode.getLocation() as Blockly.BlockSvg;
      Blockly.common.setSelected(block);
    }
    else if (newNodeIsFieldColour) {
      drawer.hide();

      if (oldNode?.getType() == ASTNode.types.BLOCK) {
        Blockly.common.setSelected(null);
      } else if (oldNodeIsFieldColour) {
        const field = oldNode.getLocation() as FieldColour;
        const block = field.getSourceBlock() as Blockly.BlockSvg;
        block.removeSelect();
      }

      const field = newNode.getLocation() as FieldColour;
      const block = field.getSourceBlock() as Blockly.BlockSvg;
      block.addSelect();
    }
    else {
      if (oldNode?.getType() == ASTNode.types.BLOCK) {
        Blockly.common.setSelected(null);
      } else if (oldNodeIsFieldColour) {
        const field = oldNode.getLocation() as FieldColour;
        const block = field.getSourceBlock() as Blockly.BlockSvg;
        block.removeSelect();
      }

      drawer.draw(oldNode, newNode);
    }
  }
}

export const registrationName = 'LineCursor';
export const registrationType = Blockly.registry.Type.CURSOR;

Blockly.registry.register(registrationType, registrationName, LineCursor);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};

/**
 * Install this cursor on the marker manager in the same position as
 * the previous cursor.
 *
 * @param markerManager The currently active marker manager.
 */
export function installCursor(markerManager: Blockly.MarkerManager) {
  const oldCurNode = markerManager.getCursor()?.getCurNode();
  const lineCursor = new LineCursor();
  markerManager.setCursor(lineCursor);
  if (oldCurNode) {
    markerManager.getCursor()?.setCurNode(oldCurNode);
  }
}
