/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The class representing a cursor used to navigate the flyout.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

import * as Blockly from 'blockly/core';

/**
 * Class for a flyout cursor.
 * This controls how a user navigates blocks in the flyout.
 * This cursor only allows a user to go to the previous or next stack.
 */
export class FlyoutCursor extends Blockly.Cursor {
  private flyout: Blockly.IFlyout;
  /**
   * The constructor for the FlyoutCursor.
   */
  constructor(private readonly workspace: Blockly.WorkspaceSvg | any) {
    super();
    this.flyout = this.workspace.targetWorkspace.getFlyout();
  }

  /**
   * Set correct height to enable edge scrolling
   */
  edgeScrollY(newNode: Blockly.ASTNode) {
    const wsHeight = this.flyout.getHeight();
    const block = newNode.getSourceBlock() as Blockly.BlockSvg;
    const blockHeight =
      block.getRelativeToSurfaceXY().y + block.height + 10;
    const scrollY =
    blockHeight > wsHeight
        ? wsHeight - blockHeight
        : blockHeight;
    this.flyout.getWorkspace().scroll(0, scrollY);
  }

  /**
   * Moves the cursor to the next stack of blocks in the flyout.
   *
   * @returns The next element, or null if the current node is
   *     not set or there is no next value.
   */
  override next(): Blockly.ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = curNode.next();

    if (newNode) {
      this.edgeScrollY(newNode);
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * This is a no-op since a flyout cursor can not go in.
   *
   * @returns Always null.
   */
  override in(): Blockly.ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = curNode.in();
    if (newNode) {
      this.edgeScrollY(newNode);
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Moves the cursor to the previous stack of blocks in the flyout.
   *
   * @returns The previous element, or null if the current
   *     node is not set or there is no previous value.
   */
  override prev(): Blockly.ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    const newNode = curNode.prev();
    if (newNode) {
      this.edgeScrollY(newNode);
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * This is a  no-op since a flyout cursor can not go out.
   *
   * @returns Always null.
   */
  override out(): Blockly.ASTNode | null {
    const curNode = this.getCurNode();
    if (!curNode) {
      return null;
    }
    let newNode = curNode.out();
    if (newNode) {
      this.edgeScrollY(newNode);
      this.setCurNode(newNode);
    }
    return newNode;
  }
}

export const registrationType = Blockly.registry.Type.CURSOR;
export const registrationName = 'FlyoutCursor';

Blockly.registry.register(registrationType, registrationName, FlyoutCursor);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};
