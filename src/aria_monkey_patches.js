/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Overrides a bunch of methods throughout core Blockly in order
 * to augment Blockly components with ARIA support.
 */

// TODO: Consider splitting this up into multiple files (might make things a bit easier).

import * as Blockly from 'blockly/core';
import * as aria from './aria';

const oldCreateElementNS = document.createElementNS;

document.createElementNS = function (namepspaceURI, qualifiedName) {
  const element = oldCreateElementNS.call(this, namepspaceURI, qualifiedName);
  // Top-level SVG elements and groups are presentation by default. They will be
  // specified more specifically elsewhere if they need to be readable.
  if (qualifiedName === 'svg' || qualifiedName === 'g') {
    aria.setRole(element, aria.Role.PRESENTATION);
  }
  return element;
};

const oldElementSetAttribute = Element.prototype.setAttribute;

Element.prototype.setAttribute = function (name, value) {
  // This is a hacky way to disable all aria changes in core Blockly since it's
  // easier to just undefine everything globally and then conditionally reenable
  // things with the correct definitions.
  if (
    aria.isCurrentlyMutatingAriaProperty() ||
    (name !== 'role' && !name.startsWith('aria-'))
  ) {
    oldElementSetAttribute.call(this, name, value);
  }
};

const oldIconInitView = Blockly.icons.Icon.prototype.initView;

Blockly.icons.Icon.prototype.initView = function (pointerdownListener) {
  oldIconInitView.call(this, pointerdownListener);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.FIGURE);
  aria.setState(element, aria.State.LABEL, 'Icon');
};

const oldCommentIconInitView = Blockly.icons.CommentIcon.prototype.initView;

Blockly.icons.CommentIcon.prototype.initView = function (pointerdownListener) {
  oldCommentIconInitView.call(this, pointerdownListener);
  const element = this.getFocusableElement();
  aria.setState(
    element,
    aria.State.LABEL,
    this.bubbleIsVisible() ? 'Close Comment' : 'Open Comment',
  );
};

const oldMutatorIconInitView = Blockly.icons.MutatorIcon.prototype.initView;

Blockly.icons.MutatorIcon.prototype.initView = function (pointerdownListener) {
  oldMutatorIconInitView.call(this, pointerdownListener);
  const element = this.getFocusableElement();
  aria.setState(
    element,
    aria.State.LABEL,
    this.bubbleIsVisible() ? 'Close Mutator' : 'Open Mutator',
  );
};

const oldWarningIconInitView = Blockly.icons.WarningIcon.prototype.initView;

Blockly.icons.WarningIcon.prototype.initView = function (pointerdownListener) {
  oldWarningIconInitView.call(this, pointerdownListener);
  const element = this.getFocusableElement();
  aria.setState(
    element,
    aria.State.LABEL,
    this.bubbleIsVisible() ? 'Close Warning' : 'Open Warning',
  );
};

const oldFieldCreateTextElement = Blockly.Field.prototype.createTextElement_;

Blockly.Field.prototype.createTextElement_ = function () {
  oldFieldCreateTextElement.call(this);
  // The text itself is presentation since it's represented through the
  // block's ARIA label.
  aria.setState(this.getTextElement(), aria.State.HIDDEN, true);
};

// TODO: This can be consolidated to FieldInput, but that's not exported so it has to be overwritten on a per-field basis.
const oldFieldNumberInit = Blockly.FieldNumber.prototype.init;
const oldFieldTextInputInit = Blockly.FieldTextInput.prototype.init;

Blockly.FieldNumber.prototype.init = function () {
  oldFieldNumberInit.call(this);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.TEXTBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    this.name ? `Text ${this.name}` : 'Text',
  );
};

Blockly.FieldTextInput.prototype.init = function () {
  oldFieldTextInputInit.call(this);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.TEXTBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    this.name ? `Text ${this.name}` : 'Text',
  );
};

const oldFieldLabelInitView = Blockly.FieldLabel.prototype.initView;

Blockly.FieldLabel.prototype.initView = function () {
  oldFieldLabelInitView.call(this);
  // There's no additional semantic meaning needed for a label; the aria-label
  // should be sufficient for context.
  aria.setState(this.getFocusableElement(), aria.State.LABEL, this.getText());
};

const oldFieldImageInitView = Blockly.FieldImage.prototype.initView;

Blockly.FieldImage.prototype.initView = function () {
  oldFieldImageInitView.call(this);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.IMAGE);
  aria.setState(
    element,
    aria.State.LABEL,
    this.name ? `Image ${this.name}` : 'Image',
  );
};

const oldFieldDropdownInitView = Blockly.FieldDropdown.prototype.initView;

Blockly.FieldDropdown.prototype.initView = function () {
  oldFieldDropdownInitView.call(this);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.LISTBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    this.name ? `Item ${this.name}` : 'Item',
  );
};

const oldFieldCheckboxInitView = Blockly.FieldCheckbox.prototype.initView;

Blockly.FieldCheckbox.prototype.initView = function () {
  oldFieldCheckboxInitView.call(this);
  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.CHECKBOX);
  aria.setState(
    element,
    aria.State.LABEL,
    this.name ? `Checkbox ${this.name}` : 'Checkbox',
  );
};

const oldFlyoutButtonUpdateTransform =
  Blockly.FlyoutButton.prototype.updateTransform;

Blockly.FlyoutButton.prototype.updateTransform = function () {
  // This is a very hacky way to augment FlyoutButton's initialization since it
  // happens in FlyoutButton's constructor (which can't be patched directly).
  if (!this.isPatchInitialized) {
    this.isPatchInitialized = true;
    oldFlyoutButtonUpdateTransform.call(this);

    const element = this.getFocusableElement();
    aria.setRole(element, aria.Role.BUTTON);
    aria.setState(element, aria.State.LABEL, 'Button');
  }
};

const oldRenderedWorkspaceCommentAddModelUpdateBindings =
  Blockly.comments.RenderedWorkspaceComment.prototype.addModelUpdateBindings;

Blockly.comments.RenderedWorkspaceComment.prototype.addModelUpdateBindings =
  function () {
    // This is a very hacky way to augment RenderedWorkspaceComments's
    // initialization since it happens in RenderedWorkspaceComments's constructor
    // (which can't be patched directly).
    if (!this.isPatchInitialized) {
      this.isPatchInitialized = true;
      oldRenderedWorkspaceCommentAddModelUpdateBindings.call(this);

      const element = this.getFocusableElement();
      aria.setRole(element, aria.Role.TEXTBOX);
      aria.setState(element, aria.State.LABEL, 'DoNotOverride?');
    }
  };

const oldRenderedConnectionFindHighlightSvg =
  Blockly.RenderedConnection.prototype.findHighlightSvg;

Blockly.RenderedConnection.prototype.findHighlightSvg = function () {
  const element = oldRenderedConnectionFindHighlightSvg.call(this);
  // This is a later initialization than most components but it's likely
  // adequate since the creation of RenderedConnection's focusable element is
  // part of the block rendering lifecycle (so the class itself isn't even aware
  // when its element exists).
  if (element) {
    aria.setRole(element, aria.Role.FIGURE);
    aria.setState(element, aria.State.LABEL, 'Open connection');
  }
  return element;
};

const oldWorkspaceSvgCreateDom = Blockly.WorkspaceSvg.prototype.createDom;

Blockly.WorkspaceSvg.prototype.createDom = function (
  backgroundClass,
  injectionDiv,
) {
  const element = oldWorkspaceSvgCreateDom.call(
    this,
    backgroundClass,
    injectionDiv,
  );
  aria.setRole(element, aria.Role.TREE);
  let ariaLabel = null;
  if (this.injectionDiv) {
    ariaLabel = Blockly.Msg['WORKSPACE_ARIA_LABEL'];
  } else if (this.isFlyout) {
    ariaLabel = 'Flyout';
  } else if (this.isMutator) {
    ariaLabel = 'Mutator';
  } else {
    throw new Error('Cannot determine ARIA label for workspace.');
  }
  aria.setState(element, aria.State.LABEL, ariaLabel);
  return element;
};

const oldToolboxCreateDom = Blockly.Toolbox.prototype.createDom_;

Blockly.Toolbox.prototype.createDom_ = function (workspace) {
  const element = oldToolboxCreateDom.call(this, workspace);
  aria.setRole(element, aria.Role.TREE);
  return element;
};

const recomputeAriaOwnersInToolbox = function (toolbox) {
  const focusable = toolbox.getFocusableElement();
  const selectableChildren =
    toolbox.getToolboxItems().filter((item) => item.isSelectable()) ?? null;
  const focusableChildElems = selectableChildren.map((selectable) =>
    selectable.getFocusableElement(),
  );
  const focusableChildIds = focusableChildElems.map((elem) => elem.id);
  aria.setState(
    focusable,
    aria.State.OWNS,
    [...new Set(focusableChildIds)].join(' '),
  );
  // Ensure children have the correct position set.
  // TODO: Fix collapsible subcategories. Their groups aren't set up correctly yet, and they aren't getting a correct accounting in top-level toolbox tree.
  focusableChildElems.forEach((elem, index) =>
    aria.setState(elem, aria.State.POSINSET, index + 1),
  );
};

// TODO: Reimplement selected for items and expanded for categories, and levels.
const oldToolboxCategoryInit = Blockly.ToolboxCategory.prototype.init;

Blockly.ToolboxCategory.prototype.init = function () {
  oldToolboxCategoryInit.call(this);
  aria.setRole(this.getFocusableElement(), aria.Role.TREEITEM);
  recomputeAriaOwnersInToolbox(this.parentToolbox_);
};

const oldCollapsibleToolboxCategoryInit =
  Blockly.CollapsibleToolboxCategory.prototype.init;

Blockly.CollapsibleToolboxCategory.prototype.init = function () {
  oldCollapsibleToolboxCategoryInit.call(this);

  const element = this.getFocusableElement();
  aria.setRole(element, aria.Role.GROUP);

  // Ensure this group has properly set children.
  const selectableChildren =
    this.getChildToolboxItems().filter((item) => item.isSelectable()) ?? null;
  const focusableChildIds = selectableChildren.map(
    (selectable) => selectable.getFocusableElement().id,
  );
  aria.setState(
    element,
    aria.State.OWNS,
    [...new Set(focusableChildIds)].join(' '),
  );
  recomputeAriaOwnersInToolbox(this.parentToolbox_);
};

const oldToolboxSeparatorInit = Blockly.ToolboxSeparator.prototype.init;

Blockly.ToolboxSeparator.prototype.init = function () {
  oldToolboxSeparatorInit.call(this);
  aria.setRole(this.getFocusableElement(), aria.Role.SEPARATOR);
  recomputeAriaOwnersInToolbox(this.parentToolbox_);
};

const oldBlockSvgDoInit = Blockly.BlockSvg.prototype.doInit_;
const oldBlockSvgSetParent = Blockly.BlockSvg.prototype.setParent;
const oldBlockSvgStartDrag = Blockly.BlockSvg.prototype.startDrag;
const oldBlockSvgDrag = Blockly.BlockSvg.prototype.drag;
const oldBlockSvgEndDrag = Blockly.BlockSvg.prototype.endDrag;
const oldBlockSvgRevertDrag = Blockly.BlockSvg.prototype.revertDrag;
const oldBlockSvgOnNodeFocus = Blockly.BlockSvg.prototype.onNodeFocus;
const oldBlockSvgOnNodeBlur = Blockly.BlockSvg.prototype.onNodeBlur;

const computeBlockAriaLabel = function (block) {
  // Guess the block's aria label based on its field labels.
  if (block.isShadow()) {
    // TODO: Shadows may have more than one field.
    // Shadow blocks are best represented directly by their field since they
    // effectively operate like a field does for keyboard navigation purposes.
    const field = Array.from(block.getFields())[0];
    return aria.getState(field.getFocusableElement(), aria.State.LABEL);
  }

  const fieldLabels = [];
  for (const field of block.getFields()) {
    if (field instanceof Blockly.FieldLabel) {
      fieldLabels.push(field.getText());
    }
  }
  return fieldLabels.join(' ');
};

const collectSiblingBlocksForBlock = function (block, surroundParent) {
  // NOTE TO DEVELOPERS: it's very important that these are NOT sorted. The
  // returned list needs to be relatively stable for consistency block indexes
  // read out to users via screen readers.
  if (surroundParent) {
    // Start from the first sibling and iterate in navigation order.
    const firstSibling = surroundParent.getChildren(false)[0];
    // TODO: Fix this case. It happens when replacing a block input with a new block.
    if (!firstSibling) throw new Error('No child in parent (somehow).');
    const siblings = [firstSibling];
    let nextSibling = firstSibling;
    while ((nextSibling = nextSibling.getNextBlock())) {
      siblings.push(nextSibling);
    }
    return siblings;
  } else {
    // For top-level blocks, simply return those from the workspace.
    return block.workspace.getTopBlocks(false);
  }
};

const computeLevelInWorkspaceForBlock = function (block) {
  const surroundParent = block.getSurroundParent();
  return surroundParent
    ? computeLevelInWorkspaceForBlock(surroundParent) + 1
    : 0;
};

// TODO: Do this efficiently (probably centrally).
const recomputeAriaTreeItemDetailsInBlockRecursively = function (block) {
  const elem = block.getFocusableElement();
  const connection = block.currentConnectionCandidate;
  let childPosition;
  let parentsChildCount;
  let hierarchyDepth;
  if (connection) {
    // If the block is being inserted into a new location, the position is hypothetical.
    // TODO: Figure out how to deal with output connections.
    let surroundParent;
    let siblingBlocks;
    if (connection.type === Blockly.ConnectionType.INPUT_VALUE) {
      surroundParent = connection.sourceBlock_;
      siblingBlocks = collectSiblingBlocksForBlock(block, surroundParent);
      // The block is being added as a child since it's input.
      // TODO: Figure out how to compute the correct position.
      childPosition = 1;
    } else {
      surroundParent = connection.sourceBlock_.getSurroundParent();
      siblingBlocks = collectSiblingBlocksForBlock(block, surroundParent);
      // The block is being added after the connected block.
      childPosition = siblingBlocks.indexOf(connection.sourceBlock_) + 2;
    }
    parentsChildCount = siblingBlocks.length + 1;
    hierarchyDepth = surroundParent
      ? computeLevelInWorkspaceForBlock(surroundParent) + 1
      : 1;
  } else {
    const surroundParent = block.getSurroundParent();
    const siblingBlocks = collectSiblingBlocksForBlock(block, surroundParent);
    childPosition = siblingBlocks.indexOf(block) + 1;
    parentsChildCount = siblingBlocks.length;
    hierarchyDepth = computeLevelInWorkspaceForBlock(block) + 1;
  }
  aria.setState(elem, aria.State.POSINSET, childPosition);
  aria.setState(elem, aria.State.SETSIZE, parentsChildCount);
  aria.setState(elem, aria.State.LEVEL, hierarchyDepth);
  block
    .getChildren(false)
    .forEach((block) => recomputeAriaTreeItemDetailsInBlockRecursively(block));
};

const announceDynamicAriaStateForBlock = function (
  block,
  isMoving,
  isCanceled,
  newLoc,
) {
  const connection = block.currentConnectionCandidate;
  if (isCanceled) {
    aria.announceDynamicAriaState('Canceled movement');
    return;
  }
  if (!isMoving) return;
  if (connection) {
    // TODO: Figure out general detachment.
    // TODO: Figure out how to deal with output connections.
    const surroundParent = connection.sourceBlock_;
    const announcementContext = [];
    announcementContext.push('Moving'); // TODO: Specialize for inserting?
    // NB: Old code here doesn't seem to handle parents correctly.
    if (connection.type === Blockly.ConnectionType.INPUT_VALUE) {
      announcementContext.push('to', 'input', 'of');
    } else {
      announcementContext.push('to', 'child', 'of');
    }

    announcementContext.push(computeBlockAriaLabel(surroundParent));

    // If the block is currently being moved, announce the new block label so that the user understands where it is now.
    // TODO: Figure out how much recomputeAriaTreeItemDetailsRecursively needs to anticipate position if it won't be reannounced, and how much of that context should be included in the liveannouncement.
    aria.announceDynamicAriaState(announcementContext.join(' '));
  } else if (newLoc) {
    // The block is being freely dragged.
    aria.announceDynamicAriaState(
      `Moving unconstrained to coordinate x ${Math.round(newLoc.x)} and y ${Math.round(newLoc.y)}.`,
    );
  }
};

Blockly.BlockSvg.prototype.doInit_ = function () {
  oldBlockSvgDoInit.call(this);
  const svgPath = this.getFocusableElement();
  aria.setState(svgPath, aria.State.ROLEDESCRIPTION, 'block');
  aria.setRole(svgPath, aria.Role.TREEITEM);
  aria.setState(svgPath, aria.State.LABEL, computeBlockAriaLabel(this));
  svgPath.tabIndex = -1;
  this.currentConnectionCandidate = null;
};

Blockly.BlockSvg.prototype.setParent = function (newParent) {
  oldBlockSvgSetParent.call(this, newParent);
  this.workspace
    .getTopBlocks(false)
    .forEach((block) => recomputeAriaTreeItemDetailsInBlockRecursively(block));
};

Blockly.BlockSvg.prototype.startDrag = function (e) {
  oldBlockSvgStartDrag.call(this, e);
  this.currentConnectionCandidate =
    this.dragStrategy.connectionCandidate?.neighbour ?? null;
  announceDynamicAriaStateForBlock(this, true, false);
};

Blockly.BlockSvg.prototype.drag = function (newLoc, e) {
  oldBlockSvgDrag.call(this, newLoc, e);
  this.currentConnectionCandidate =
    this.dragStrategy.connectionCandidate?.neighbour ?? null;
  announceDynamicAriaStateForBlock(this, true, false, newLoc);
};

Blockly.BlockSvg.prototype.endDrag = function (e) {
  oldBlockSvgEndDrag.call(this, e);
  this.currentConnectionCandidate = null;
  announceDynamicAriaStateForBlock(this, false, false);
};

Blockly.BlockSvg.prototype.revertDrag = function () {
  oldBlockSvgRevertDrag.call(this);
  announceDynamicAriaStateForBlock(this, false, true);
};

Blockly.BlockSvg.prototype.onNodeFocus = function () {
  oldBlockSvgOnNodeFocus.call(this);
  aria.setState(this.getFocusableElement(), aria.State.SELECTED, true);
};

Blockly.BlockSvg.prototype.onNodeBlur = function () {
  aria.setState(this.getFocusableElement(), aria.State.SELECTED, false);
  oldBlockSvgOnNodeBlur.call(this);
};

// TODO: Figure out how to patch CommentEditor. It doesn't seem to have any methods really to override, so it may actually require patching at the dom utility layer, or higher up.
// TODO: Ditto for CommentBarButton and its children.
// TODO: Ditto for Bubble and its children.
