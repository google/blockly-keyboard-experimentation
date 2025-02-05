/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  RenderedConnection,
  BlockSvg,
  ConnectionType,
} from 'blockly/core';

/**
 * A renderer for passive focus on AST node locations on the main workspace.
 * Responsible for showing and hiding in an ephemeral way. Not
 * guaranteed to stay up to date if workspace contents change.
 * In general, passive focus should be hidden when the main workspace
 * has active focus.
 */
export class PassiveFocus {
  // The node where the indicator is drawn, if any.
  private curNode: ASTNode | null = null;

  constructor() {}

  /** Dispose of this indicator. Do any necessary cleanup. */
  dispose() {
    this.hide();
  }

  /**
   * Hide the currently visible passive focus indicator.
   * Implementation varies based on location type.
   */
  hide() {
    if (!this.curNode) return;
    const type = this.curNode.getType();
    const location = this.curNode.getLocation();

    // If old node was a block, unselect it or remove fake selection.
    if (type === ASTNode.types.BLOCK) {
      this.hideAtBlock(this.curNode);
      return;
    } else if (this.curNode.isConnection()) {
      const curNodeAsConnection = location as RenderedConnection;
      const connectionType = curNodeAsConnection.type;
      if (connectionType === ConnectionType.NEXT_STATEMENT) {
        this.hideAtNext(this.curNode);
        return;
      }
    }
    console.log('Could not hide passive focus indicator');
  }

  /**
   * Show the passive focus indicator at the specified location.
   * Implementation varies based on location type.
   */
  show(node: ASTNode) {
    // Hide last shown.
    this.hide();
    this.curNode = node;

    const type = this.curNode.getType();
    const location = this.curNode.getLocation();
    if (type === ASTNode.types.BLOCK) {
      this.showAtBlock(this.curNode);
      return;
    } else if (this.curNode.isConnection()) {
      const curNodeAsConnection = location as RenderedConnection;
      const connectionType = curNodeAsConnection.type;
      if (connectionType === ConnectionType.NEXT_STATEMENT) {
        this.showAtNext(this.curNode);
        return;
      }
    }
    console.log('Could not show passive focus indicator');
  }

  /**
   * Show a passive focus indicator on a block.
   *
   * @param node The passively-focused block.
   */
  showAtBlock(node: ASTNode) {
    const block = node.getLocation() as BlockSvg;
    // Note that this changes rendering but does not change Blockly's
    // internal selected state.
    block.addSelect();
  }

  /**
   * Hide a passive focus indicator on a block.
   *
   * @param node The passively-focused block.
   */
  hideAtBlock(node: ASTNode) {
    const block = node.getLocation() as BlockSvg;
    // Note that this changes rendering but does not change Blockly's
    // internal selected state.
    block.removeSelect();
  }

  /**
   * Show a passive focus indicator on a next connection.
   *
   * @param node The passively-focused connection.
   */
  showAtNext(node: ASTNode) {
    const connection = node.getLocation() as RenderedConnection;
    connection.highlight();
  }

  /**
   * Hide a passive focus indicator on a next connection.
   *
   * @param node The passively-focused connection.
   */
  hideAtNext(node: ASTNode) {
    const connection = node.getLocation() as RenderedConnection;
    connection.unhighlight();
  }
}
