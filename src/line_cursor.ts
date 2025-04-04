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
import {ASTNode, Marker} from 'blockly/core';
import {scrollBoundsIntoView} from './workspace_utilities';

/** Options object for LineCursor instances. */
export interface CursorOptions {
  /**
   * Can the cursor visit all stack connections (next/previous), or
   * (if false) only unconnected next connections?
   */
  stackConnections: boolean;
}

/** Default options for LineCursor instances. */
const defaultOptions: CursorOptions = {
  stackConnections: true,
};

/**
 * Class for a line cursor.
 */
export class LineCursor extends Marker {
  override type = 'cursor';

  /** Options for this line cursor. */
  private readonly options: CursorOptions;

  /** Has the cursor been installed in a workspace's marker manager? */
  private installed = false;

  /** Old Cursor instance, saved during installation. */
  private oldCursor: Blockly.Cursor | null = null;

  /** Locations to try moving the cursor to after a deletion. */
  private potentialNodes: Blockly.ASTNode[] | null = null;

  /** Whether the renderer is zelos-style. */
  private isZelos = false;

  /**
   * @param workspace The workspace this cursor belongs to.
   * @param options Cursor options.
   */
  constructor(
    private readonly workspace: Blockly.WorkspaceSvg,
    options?: Partial<CursorOptions>,
  ) {
    super();
    // Bind selectListener to facilitate future install/uninstall.
    this.changeListener = this.changeListener.bind(this);
    // Regularise options and apply defaults.
    this.options = {...defaultOptions, ...options};

    this.isZelos = workspace.getRenderer() instanceof Blockly.zelos.Renderer;
  }

  /**
   * Install this LineCursor in its workspace's marker manager and set
   * up the select listener.  The original cursor (if any) is saved
   * for future use by .uninstall(), and its location is used to set
   * this one's.
   */
  install() {
    if (this.installed) throw new Error('LineCursor already installed');
    const markerManager = this.workspace.getMarkerManager();
    this.oldCursor = markerManager.getCursor();
    markerManager.setCursor(this);
    const oldCursorNode = this.oldCursor?.getCurNode();
    if (oldCursorNode) this.setCurNode(oldCursorNode);
    this.workspace.addChangeListener(this.changeListener);
    this.installed = true;
  }

  /**
   * Remove the select listener and uninstall this LineCursor from its
   * workspace's marker manager, restoring any previously-existing
   * cursor.  Does not attempt to adjust original cursor's location.
   */
  uninstall() {
    if (!this.installed) throw new Error('LineCursor not yet installed');
    this.workspace.removeChangeListener(this.changeListener.bind(this));
    if (this.oldCursor) {
      this.workspace.getMarkerManager().setCursor(this.oldCursor);
    }
    this.installed = false;
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
    const newNode = this.getNextNode(curNode, this.validLineNode.bind(this));

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
    const newNode = this.getNextNode(curNode, this.validInLineNode.bind(this));

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
    const newNode = this.getPreviousNode(
      curNode,
      this.validLineNode.bind(this),
    );

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
    const newNode = this.getPreviousNode(
      curNode,
      this.validInLineNode.bind(this),
    );

    if (newNode) {
      this.setCurNode(newNode);
    }
    return newNode;
  }

  /**
   * Returns true iff the node to which we would navigate if in() were
   * called, which will be a validInLineNode, is also a validLineNode
   * - in effect, if the LineCursor is at the end of the 'current
   * line' of the program.
   */
  atEndOfLine(): boolean {
    const curNode = this.getCurNode();
    if (!curNode) return false;
    const rightNode = this.getNextNode(
      curNode,
      this.validInLineNode.bind(this),
    );
    return this.validLineNode(rightNode);
  }

  /**
   * Returns true iff the given node represents the "beginning of a
   * new line of code" (and thus can be visited by pressing the
   * up/down arrow keys).  Specifically, if the node is for:
   *
   * - Any block that is not a value block.
   * - A top-level value block (one that is unconnected).
   * - An unconnected next statement input.
   * - An unconnected 'next' connection - the "blank line at the end".
   *   This is to facilitate connecting additional blocks to a
   *   stack/substack.
   *
   * If options.stackConnections is true (the default) then allow the
   * cursor to visit all (useful) stack connection by additionally
   * returning true for:
   *
   *   - Any next statement input
   *   - Any 'next' connection.
   *   - An unconnected previous statement input.
   *
   * @param node The AST node to check.
   * @returns True if the node should be visited, false otherwise.
   */
  protected validLineNode(node: ASTNode | null): boolean {
    if (!node) return false;
    const location = node.getLocation();
    const type = node && node.getType();
    switch (type) {
      case ASTNode.types.BLOCK:
        return !(location as Blockly.Block).outputConnection?.isConnected();
      case ASTNode.types.INPUT: {
        const connection = location as Blockly.Connection;
        return (
          connection.type === Blockly.NEXT_STATEMENT &&
          (this.options.stackConnections || !connection.isConnected())
        );
      }
      case ASTNode.types.NEXT:
        return (
          this.options.stackConnections ||
          !(location as Blockly.Connection).isConnected()
        );
      case ASTNode.types.PREVIOUS:
        return (
          this.options.stackConnections &&
          !(location as Blockly.Connection).isConnected()
        );
      default:
        return false;
    }
  }

  /**
   * Returns true iff the given node can be visited by the cursor when
   * using the left/right arrow keys.  Specifically, if the node is
   * any node for which valideLineNode would return true, plus:
   *
   * - Any block.
   * - Any field that is not a full block field.
   * - Any unconnected next or input connection.  This is to
   *   facilitate connecting additional blocks.
   *
   * @param node The AST node to check whether it is valid.
   * @returns True if the node should be visited, false otherwise.
   */
  protected validInLineNode(node: ASTNode | null): boolean {
    if (!node) return false;
    if (this.validLineNode(node)) return true;
    const location = node.getLocation();
    const type = node && node.getType();
    switch (type) {
      case ASTNode.types.BLOCK:
        return true;
      case ASTNode.types.INPUT:
        return !(location as Blockly.Connection).isConnected();
      case ASTNode.types.FIELD: {
        const field = node.getLocation() as Blockly.Field;
        return !(
          field.getSourceBlock()?.isSimpleReporter() &&
          // @ts-expect-error isFullBlockField is a protected method.
          field.isFullBlockField()
        );
      }
      default:
        return false;
    }
  }

  /**
   * Returns true iff the given node can be visited by the cursor.
   * Specifically, if the node is any for which validInLineNode woudl
   * return true, or if it is a workspace node.
   *
   * @param node The AST node to check whether it is valid.
   * @returns True if the node should be visited, false otherwise.
   */
  protected validNode(node: ASTNode | null): boolean {
    return (
      !!node &&
      (this.validInLineNode(node) || node.getType() === ASTNode.types.WORKSPACE)
    );
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
  getNextNode(
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
  getPreviousNode(
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
  private getRightMostChild(node: ASTNode): ASTNode | null {
    let newNode = node.in();
    if (!newNode) {
      return node;
    }
    for (
      let nextNode: ASTNode | null = newNode;
      nextNode;
      nextNode = newNode.next()
    ) {
      newNode = nextNode;
    }
    return this.getRightMostChild(newNode);
  }

  /**
   * Prepare for the deletion of a block by making a list of nodes we
   * could move the cursor to afterwards and save it to
   * this.potentialNodes.
   *
   * After the deletion has occurred, call postDelete to move it to
   * the first valid node on that list.
   *
   * The locations to try (in order of preference) are:
   *
   * - The current location.
   * - The connection to which the deleted block is attached.
   * - The block connected to the next connection of the deleted block.
   * - The parent block of the deleted block.
   * - A location on the workspace beneath the deleted block.
   *
   * N.B.: When block is deleted, all of the blocks conneccted to that
   * block's inputs are also deleted, but not blocks connected to its
   * next connection.
   *
   * @param deletedBlock The block that is being deleted.
   */
  preDelete(deletedBlock: Blockly.Block) {
    const curNode = this.getCurNode();

    const nodes: Blockly.ASTNode[] = curNode ? [curNode] : [];
    // The connection to which the deleted block is attached.
    const parentConnection =
      deletedBlock.previousConnection?.targetConnection ??
      deletedBlock.outputConnection?.targetConnection;
    if (parentConnection) {
      const parentNode = Blockly.ASTNode.createConnectionNode(parentConnection);
      if (parentNode) nodes.push(parentNode);
    }
    // The block connected to the next connection of the deleted block.
    const nextBlock = deletedBlock.getNextBlock();
    if (nextBlock) {
      const nextNode = Blockly.ASTNode.createBlockNode(nextBlock);
      if (nextNode) nodes.push(nextNode);
    }
    //  The parent block of the deleted block.
    const parentBlock = deletedBlock.getParent();
    if (parentBlock) {
      const parentNode = Blockly.ASTNode.createBlockNode(parentBlock);
      if (parentNode) nodes.push(parentNode);
    }
    // A location on the workspace beneath the deleted block.
    // Move to the workspace.
    const curBlock = curNode?.getSourceBlock();
    if (curBlock) {
      const workspaceNode = Blockly.ASTNode.createWorkspaceNode(
        this.workspace,
        curBlock.getRelativeToSurfaceXY(),
      );
      if (workspaceNode) nodes.push(workspaceNode);
    }
    this.potentialNodes = nodes;
  }

  /**
   * Move the cursor to the first valid location in
   * this.potentialNodes, following a block deletion.
   */
  postDelete() {
    const nodes = this.potentialNodes;
    this.potentialNodes = null;
    if (!nodes) throw new Error('must call preDelete first');
    for (const node of nodes) {
      if (this.validNode(node) && !node.getSourceBlock()?.disposed) {
        this.setCurNode(node);
        return;
      }
    }
    throw new Error('no valid nodes in this.potentialNodes');
  }

  /**
   * Get the current location of the cursor.
   *
   * Overrides normal Marker getCurNode to update the current node from the selected
   * block. This typically happens via the selection listener but that is not called
   * immediately when `Gesture` calls `Blockly.common.setSelected`.
   * In particular the listener runs after showing the context menu.
   *
   * @returns The current field, connection, or block the cursor is on.
   */
  override getCurNode(): Blockly.ASTNode | null {
    this.updateCurNodeFromSelection();
    return super.getCurNode();
  }

  /**
   * Sets the object in charge of drawing the marker.
   *
   * We want to customize drawing, so rather than directly setting the given
   * object, we instead set a wrapper proxy object that passes through all
   * method calls and property accesses except for draw(), which it delegates
   * to the drawMarker() method in this class.
   *
   * @param drawer The object ~in charge of drawing the marker.
   */
  override setDrawer(drawer: Blockly.blockRendering.MarkerSvg) {
    const altDraw = function (
      this: LineCursor,
      oldNode: ASTNode | null,
      curNode: ASTNode | null,
    ) {
      // Pass the unproxied, raw drawer object so that drawMarker can call its
      // `draw()` method without triggering infinite recursion.
      this.drawMarker(oldNode, curNode, drawer);
    }.bind(this);

    super.setDrawer(
      new Proxy(drawer, {
        get(target: typeof drawer, prop: keyof typeof drawer) {
          if (prop === 'draw') {
            return altDraw;
          }

          return target[prop];
        },
      }),
    );
  }

  /**
   * Set the location of the cursor and draw it.
   *
   * Overrides normal Marker setCurNode logic to call
   * this.drawMarker() instead of this.drawer.draw() directly.
   *
   * @param newNode The new location of the cursor.
   * @param selectionUpToDate If false (the default) we'll update the selection too.
   */
  override setCurNode(newNode: ASTNode | null, selectionUpToDate = false) {
    if (!selectionUpToDate) {
      this.updateSelectionFromNode(newNode);
    }

    super.setCurNode(newNode);

    // Try to scroll cursor into view.
    if (newNode?.getType() === ASTNode.types.BLOCK) {
      const block = newNode.getLocation() as Blockly.BlockSvg;
      scrollBoundsIntoView(
        block.getBoundingRectangleWithoutChildren(),
        block.workspace,
      );
    }
  }

  /**
   * Draw this cursor's marker.
   *
   * This is a wrapper around this.drawer.draw (usually implemented by
   * MarkerSvg.prototype.draw) that will, if newNode is a BLOCK node,
   * instead call `setSelected` to select it (if it's a regular block)
   * or `addSelect` (if it's a shadow block, since shadow blocks can't
   * be selected) instead of using the normal drawer logic.
   *
   * TODO(#142): The selection and fake-selection code was originally
   * a hack added for testing on October 28 2024, because the default
   * drawer (MarkerSvg) behaviour in Zelos was to draw a box around
   * the block and all attached child blocks, which was confusing when
   * navigating stacks.
   *
   * Since then we have decided that we probably _do_ in most cases
   * want navigating to a block to select the block, but more
   * particularly that we want navigation to move _focus_.  Replace
   * this selection hack with non-hacky changing of focus once that's
   * possible.
   *
   * @param oldNode The previous node.
   * @param curNode The current node.
   * @param realDrawer The object ~in charge of drawing the marker.
   */
  private drawMarker(
    oldNode: ASTNode | null,
    curNode: ASTNode | null,
    realDrawer: Blockly.blockRendering.MarkerSvg,
  ) {
    // If old node was a block, unselect it or remove fake selection.
    if (oldNode?.getType() === ASTNode.types.BLOCK) {
      const block = oldNode.getLocation() as Blockly.BlockSvg;
      if (!block.isShadow()) {
        // Selection should already be in sync.
      } else {
        block.removeSelect();
      }
    }

    if (this.isZelos && oldNode && this.isValueInputConnection(oldNode)) {
      this.hideAtInput(oldNode);
    }

    const curNodeType = curNode?.getType();
    const isZelosInputConnection =
      this.isZelos && curNode && this.isValueInputConnection(curNode);

    // If drawing can't be handled locally, just use the drawer.
    if (curNodeType !== ASTNode.types.BLOCK && !isZelosInputConnection) {
      realDrawer.draw(oldNode, curNode);
      return;
    }

    // Hide any visible marker SVG and instead do some manual rendering.
    realDrawer.hide();

    if (isZelosInputConnection) {
      this.showAtInput(curNode);
    } else if (curNode && curNodeType === ASTNode.types.BLOCK) {
      const block = curNode.getLocation() as Blockly.BlockSvg;
      if (!block.isShadow()) {
        // Selection should already be in sync.
      } else {
        block.addSelect();
        block.getParent()?.removeSelect();
      }
    }

    // Call MarkerSvg.prototype.fireMarkerEvent like
    // MarkerSvg.prototype.draw would (even though it's private).
    // @ts-expect-error calling protected method
    realDrawer?.fireMarkerEvent?.(oldNode, curNode);
  }

  /**
   * Check whether the node represents a value input connection.
   *
   * @param node The node to check
   * @returns True if the node represents a value input connection.
   */
  private isValueInputConnection(node: ASTNode) {
    if (node?.getType() !== ASTNode.types.INPUT) return false;
    const connection = node.getLocation() as Blockly.Connection;
    return connection.type === Blockly.ConnectionType.INPUT_VALUE;
  }

  /**
   * Hide the cursor rendering at the given input node.
   *
   * @param node The input node to hide.
   */
  private hideAtInput(node: ASTNode) {
    const inputConnection = node.getLocation() as Blockly.Connection;
    const sourceBlock = inputConnection.getSourceBlock() as Blockly.BlockSvg;
    const input = inputConnection.getParentInput();
    if (input) {
      const pathObject = sourceBlock.pathObject as Blockly.zelos.PathObject;
      // @ts-expect-error getOutlinePath is private.
      const outlinePath = pathObject.getOutlinePath(input.name);
      Blockly.utils.dom.removeClass(outlinePath, 'inputActiveFocus');
    }
  }

  /**
   * Show the cursor rendering at the given input node.
   *
   * @param node The input node to show.
   */
  private showAtInput(node: ASTNode) {
    const inputConnection = node.getLocation() as Blockly.Connection;
    const sourceBlock = inputConnection.getSourceBlock() as Blockly.BlockSvg;
    const input = inputConnection.getParentInput();
    if (input) {
      const pathObject = sourceBlock.pathObject as Blockly.zelos.PathObject;
      // @ts-expect-error getOutlinePath is private.
      const outlinePath = pathObject.getOutlinePath(input.name);
      Blockly.utils.dom.addClass(outlinePath, 'inputActiveFocus');
    }
  }

  /**
   * Event listener that syncs the cursor location to the selected block on
   * SELECTED events.
   *
   * This does not run early enough in all cases so `getCurNode()` also updates
   * the node from the selection.
   *
   * @param event The `Selected` event.
   */
  private changeListener(event: Blockly.Events.Abstract) {
    switch (event.type) {
      case Blockly.Events.SELECTED:
        this.updateCurNodeFromSelection();
        break;
      case Blockly.Events.CLICK: {
        const click = event as Blockly.Events.Click;
        if (
          click.workspaceId === this.workspace.id &&
          click.targetType === Blockly.Events.ClickTarget.WORKSPACE
        ) {
          this.setCurNode(null);
        }
      }
    }
  }

  /**
   * Updates the current node to match the selection.
   *
   * Clears the current node if it's on a block but the selection is null.
   * Sets the node to a block if selected for our workspace.
   * For shadow blocks selections the parent is used by default (unless we're
   * already on the shadow block via keyboard) as that's where the visual
   * selection is.
   */
  private updateCurNodeFromSelection() {
    const curNode = super.getCurNode();
    const selected = Blockly.common.getSelected();

    if (
      selected === null &&
      curNode?.getType() === Blockly.ASTNode.types.BLOCK
    ) {
      this.setCurNode(null, true);
      return;
    }
    if (selected?.workspace !== this.workspace) {
      return;
    }
    if (selected instanceof Blockly.BlockSvg) {
      let block: Blockly.BlockSvg | null = selected;
      if (selected.isShadow()) {
        // OK if the current node is on the parent OR the shadow block.
        // The former happens for clicks, the latter for keyboard nav.
        if (
          curNode &&
          (curNode.getLocation() === block ||
            curNode.getLocation() === block.getParent())
        ) {
          return;
        }
        block = block.getParent();
      }
      if (block) {
        this.setCurNode(Blockly.ASTNode.createBlockNode(block), true);
      }
    }
  }

  /**
   * Updates the selection from the node.
   *
   * Clears the selection for non-block nodes.
   * Clears the selection for shadow blocks as the selection is drawn on
   * the parent but the cursor will be drawn on the shadow block itself.
   * We need to take care not to later clear the current node due to that null
   * selection, so we track the latest selection we're in sync with.
   *
   * @param newNode The new node.
   */
  private updateSelectionFromNode(newNode: Blockly.ASTNode | null) {
    if (newNode?.getType() === ASTNode.types.BLOCK) {
      if (Blockly.common.getSelected() !== newNode.getLocation()) {
        Blockly.Events.disable();
        Blockly.common.setSelected(newNode.getLocation() as Blockly.BlockSvg);
        Blockly.Events.enable();
      }
    } else {
      if (Blockly.common.getSelected()) {
        Blockly.Events.disable();
        Blockly.common.setSelected(null);
        Blockly.Events.enable();
      }
    }
  }
}

export const registrationName = 'LineCursor';
export const registrationType = Blockly.registry.Type.CURSOR;

Blockly.registry.register(registrationType, registrationName, LineCursor);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};
