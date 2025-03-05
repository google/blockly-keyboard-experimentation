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
export type CursorOptions = {
  /**
   * Can the cursor visit all stack connections (next/previous), or
   * (if false) only unconnected next connections?
   */
  stackConnections: boolean;
};

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

  /**
   * @param workspace The workspace this cursor belongs to.
   */
  constructor(
    public readonly workspace: Blockly.WorkspaceSvg,
    options?: Partial<CursorOptions>,
  ) {
    super();
    // Bind selectListener to facilitate future install/uninstall.
    this.selectListener = this.selectListener.bind(this);
    // Regularise options and apply defaults.
    this.options = {...defaultOptions, ...options};
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
    if (this.oldCursor) this.setCurNode(this.oldCursor.getCurNode());
    this.workspace.addChangeListener(this.selectListener);
    this.installed = true;
  }

  /**
   * Remove the select listener and uninstall this LineCursor from its
   * workspace's marker manager, restoring any previously-existing
   * cursor.  Does not attempt to adjust original cursor's location.
   */
  uninstall() {
    if (!this.installed) throw new Error('LineCursor not yet installed');
    this.workspace.removeChangeListener(this.selectListener.bind(this));
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
    let newNode = this.getNextNode(curNode, this.validLineNode.bind(this));

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
    let newNode = this.getPreviousNode(curNode, this.validLineNode.bind(this));

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
      case ASTNode.types.INPUT:
        const connection = location as Blockly.Connection;
        return (
          connection.type === Blockly.NEXT_STATEMENT &&
          (this.options.stackConnections || !connection.isConnected())
        );
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

    const nodes: Blockly.ASTNode[] = [curNode];
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
    const curBlock = curNode.getSourceBlock();
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
   * Overrides superclass implementation to add a hack that attempts
   * to detect if the user has moved focus by selecting a block and,
   * if so, update the cursor location (and any highlighting) to
   * match.
   *
   * Doing this only when getCurNode would naturally be called works
   * reasonably well but has some glitches, most notably that if the
   * cursor was not on a block (e.g. it was on a connection or the
   * workspace) when the user selected a block then it will remain
   * visible in its previous location until some keyboard navigation occurs.
   *
   * To ameliorate this, the LineCursor constructor adds an event
   * listener that calls getCurNode in response to SELECTED events.
   *
   * Remove this hack once Blockly is modified to update the
   * cursor/focus itself.
   *
   * @returns The current field, connection, or block the cursor is on.
   */
  override getCurNode(): ASTNode {
    const curNode = super.getCurNode();
    const selected = Blockly.common.getSelected();
    if (selected?.workspace !== this.workspace) return curNode;

    // Selected item is on workspace that this cursor belongs to.
    const curLocation = curNode?.getLocation();
    if (curLocation === selected) return curNode;

    // Selected item is not where cursor is.  Try to move cursor.
    if (!(selected instanceof Blockly.Block)) {
      console.error('Selected item is not a block.  Ignoring');
      return curNode;
    }
    const newNode = new ASTNode(ASTNode.types.BLOCK, selected);
    this.setCurNode(newNode);
    return newNode;
  }

  /**
   * Set the location of the cursor and draw it.
   *
   * Overrides normal Marker setCurNode logic to call
   * this.drawMarker() instead of this.drawer.draw() directly.
   *
   * @param newNode The new location of the cursor.
   */
  override setCurNode(newNode: ASTNode) {
    const oldNode = super.getCurNode();
    // Kludge: we can't set this.curNode directly, so we have to call
    // super.setCurNode(...) to do it for us - but that would call
    // this.drawer.draw(...), so prevent that by temporarily setting
    // this.drawer to null (which we also can't do directly!)
    const drawer = this.getDrawer();
    this.setDrawer(null as any); // Cast required since param is not nullable.
    super.setCurNode(newNode);
    this.setDrawer(drawer);
    // Draw this marker the way we want to.
    this.drawMarker(oldNode, newNode);
    // Try to scroll cursor into view.
    if (newNode?.getType() === ASTNode.types.BLOCK) {
      const block = newNode.getLocation() as Blockly.BlockSvg;
      scrollBoundsIntoView(
        block.getBoundingRectangleWithoutChildren(),
        block.workspace,
      );
    }
  }

  override hide(): void {
    super.hide();

    // If there's a block currently selected, remove the selection since the
    // cursor should now be hidden.
    const curNode = this.getCurNode();
    if (curNode.getType() === ASTNode.types.BLOCK) {
      const block = curNode.getLocation() as Blockly.BlockSvg;
      if (!block.isShadow()) {
        Blockly.common.setSelected(null);
      } else {
        block.removeSelect();
      }
    }
  }

  /**
   * Redraw the current marker.
   *
   * Overrides normal Marker drawing logic to use this.drawMarker()
   * instead of this.drawer.draw() directly.
   *
   * This hooks the method used by the renderer to draw the marker,
   * preventing the marker drawer from showing a marker if we don't
   * want it to.
   */
  override draw() {
    const curNode = super.getCurNode();
    this.drawMarker(curNode, curNode);
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
   */
  private drawMarker(oldNode: ASTNode, curNode: ASTNode) {
    // If old node was a block, unselect it or remove fake selection.
    if (oldNode?.getType() === ASTNode.types.BLOCK) {
      const block = oldNode.getLocation() as Blockly.BlockSvg;
      if (!block.isShadow()) {
        Blockly.common.setSelected(null);
      } else {
        block.removeSelect();
      }
    }

    // If curNode node is not block, just use the drawer.
    if (curNode?.getType() !== ASTNode.types.BLOCK) {
      this.getDrawer()?.draw(oldNode, curNode);
      return;
    }

    // curNode is a block.  Hide any visible marker SVG and instead
    // select the block or make it look selected.
    super.hide(); // Calls this.drawer?.hide().
    const block = curNode.getLocation() as Blockly.BlockSvg;
    if (!block.isShadow()) {
      Blockly.common.setSelected(block);
    } else {
      block.addSelect();
    }

    // Call MarkerSvg.prototype.fireMarkerEvent like
    // MarkerSvg.prototype.draw would (even though it's private).
    (this.getDrawer() as any)?.fireMarkerEvent?.(oldNode, curNode);
  }

  /**
   * Event listener that syncs the cursor location to the selected
   * block on SELECTED events.
   */
  private selectListener(event: Blockly.Events.Abstract) {
    if (event.type !== Blockly.Events.SELECTED) return;
    const selectedEvent = event as Blockly.Events.Selected;
    if (selectedEvent.workspaceId !== this.workspace.id) return;
    this.getCurNode();
  }
}

export const registrationName = 'LineCursor';
export const registrationType = Blockly.registry.Type.CURSOR;

Blockly.registry.register(registrationType, registrationName, LineCursor);

export const pluginInfo = {
  [registrationType.toString()]: registrationName,
};
