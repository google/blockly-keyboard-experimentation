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
import {scrollBoundsIntoView} from './workspace_utilities';

/**
 * Class for a flyout cursor.
 * This controls how a user navigates blocks in the flyout.
 * This cursor only allows a user to go to the previous or next stack.
 */
export class FlyoutCursor extends Blockly.Cursor {
  /**
   * The constructor for the FlyoutCursor.
   */
  constructor(private readonly flyout: Blockly.IFlyout) {
    super();
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
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * This is a no-op since a flyout cursor can not go in.
   *
   * @returns Always null.
   */
  override in(): null {
    return null;
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
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * This is a  no-op since a flyout cursor can not go out.
   *
   * @returns Always null.
   */
  override out(): null {
    return null;
  }

  override setCurNode(node: Blockly.ASTNode) {
    super.setCurNode(node);

    const location = node.getLocation();
    let bounds: Blockly.utils.Rect | undefined;
    if (
      'getBoundingRectangle' in location &&
      typeof location.getBoundingRectangle === 'function'
    ) {
      bounds = location.getBoundingRectangle();
    } else if (location instanceof Blockly.FlyoutButton) {
      const {x, y} = location.getPosition();
      bounds = new Blockly.utils.Rect(
        y,
        y + location.height,
        x,
        x + location.width,
      );
    }

    if (!(bounds instanceof Blockly.utils.Rect)) return;

    scrollBoundsIntoView(bounds, this.flyout.getWorkspace());
  }
}

export const registrationType = Blockly.registry.Type.CURSOR;
export const registrationName = 'FlyoutCursor';

Blockly.registry.register(registrationType, registrationName, FlyoutCursor);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};
