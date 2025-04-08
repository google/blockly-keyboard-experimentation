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
  utils,
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

  // The line drawn to indicate passive focus on a next connection.
  nextConnectionIndicator: SVGRectElement;

  constructor() {
    this.nextConnectionIndicator = this.createNextIndicator();
  }

  /**
   * Get the current passive focus node.
   *
   * @returns the node or null.
   */
  getCurNode(): ASTNode | null {
    return this.curNode;
  }

  /** Dispose of this indicator. Do any necessary cleanup. */
  dispose() {
    this.hide();
    if (this.nextConnectionIndicator) {
      utils.dom.removeNode(this.nextConnectionIndicator);
    }
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
    } else if (this.curNode.isConnection()) {
      const curNodeAsConnection = location as RenderedConnection;
      const connectionType = curNodeAsConnection.type;
      if (connectionType === ConnectionType.NEXT_STATEMENT) {
        this.hideAtNext(this.curNode);
      }
    } else {
      console.log('Could not hide passive focus indicator');
    }
    this.curNode = null;
  }

  /**
   * Show the passive focus indicator at the specified location.
   * Implementation varies based on location type.
   *
   * @param node The node to show passive focus for.
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
    utils.dom.addClass(block.pathObject.svgPath, 'passiveBlockFocus');
  }

  /**
   * Hide a passive focus indicator on a block.
   *
   * @param node The passively-focused block.
   */
  hideAtBlock(node: ASTNode) {
    const block = node.getLocation() as BlockSvg;
    // When a block is selected we can end up with a duplicate svgPath.
    const svgPaths = block.getSvgRoot().querySelectorAll('.passiveBlockFocus');
    svgPaths.forEach((svgPath) =>
      utils.dom.removeClass(svgPath, 'passiveBlockFocus'),
    );
  }

  /**
   * Creates DOM elements for the next connection indicator.
   *
   * @returns The root element of the next indicator.
   */
  createNextIndicator() {
    // A horizontal line used to represent a next connection.
    const indicator = utils.dom.createSvgElement(utils.Svg.RECT, {
      'width': 100,
      'height': 5,
      'class': 'passiveNextIndicator',
    });
    return indicator;
  }

  /**
   * Show a passive focus indicator on a next connection.
   *
   * @param node The passively-focused connection.
   */
  showAtNext(node: ASTNode) {
    const connection = node.getLocation() as RenderedConnection;
    const targetBlock = connection.getSourceBlock();

    // Make the connection indicator a child of the block's SVG group.
    const blockSvgRoot = targetBlock.getSvgRoot();
    blockSvgRoot.appendChild(this.nextConnectionIndicator);

    // Move the indicator relative to the origin of the block's SVG group.
    let x = 0;
    const y = connection.getOffsetInBlock().y;
    const width = targetBlock.getHeightWidth().width;
    if (targetBlock.workspace.RTL) {
      x = -width;
    }

    this.nextConnectionIndicator.setAttribute('x', `${x}`);
    this.nextConnectionIndicator.setAttribute('y', `${y}`);
    this.nextConnectionIndicator.setAttribute('width', `${width}`);

    this.nextConnectionIndicator.style.display = '';
  }

  /**
   * Hide a passive focus indicator on a next connection.
   *
   * @param node The passively-focused connection.
   */
  hideAtNext(node: ASTNode) {
    this.nextConnectionIndicator.parentNode?.removeChild(
      this.nextConnectionIndicator,
    );
    this.nextConnectionIndicator.style.display = 'none';
  }

  isVisible(): boolean {
    return !!this.curNode;
  }
}
