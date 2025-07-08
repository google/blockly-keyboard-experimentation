/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {enableBlocksOnDrag} from './disabled_blocks';
import {registerHtmlToast} from './html_toast';

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;

  /** Keyboard navigation controller instance for the workspace. */
  private navigationController: NavigationController;

  /** Cursor for the main workspace. */
  private cursor: Blockly.LineCursor;

  /**
   * Focus ring in the workspace.
   */
  private workspaceFocusRing: Element | null = null;

  /**
   * Selection ring inside the workspace.
   */
  private workspaceSelectionRing: Element | null = null;

  /**
   * Used to restore monkey patch.
   */
  private oldWorkspaceResize:
    | InstanceType<typeof Blockly.WorkspaceSvg>['resize']
    | null = null;

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will be added to.
   * @param options Options for plugin
   * @param options.allowCrossWorkspacePaste If true, will allow paste
   * option to appear enabled when pasting in a different workspace
   * than was copied from. Defaults to false. Set to true if using
   * cross-tab-copy-paste plugin or similar.
   */
  constructor(
    workspace: Blockly.WorkspaceSvg,
    options: {allowCrossWorkspacePaste: boolean} = {
      allowCrossWorkspacePaste: false,
    },
  ) {
    this.workspace = workspace;

    this.navigationController = new NavigationController(options);
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);

    this.cursor = new Blockly.LineCursor(workspace);

    // Add the event listener to enable disabled blocks on drag.
    workspace.addChangeListener(enableBlocksOnDrag);

    // Move the flyout for logical tab order.
    const flyout = workspace.getFlyout();
    if (flyout != null && flyout instanceof Blockly.Flyout) {
      // This relies on internals.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flyoutElement = ((flyout as any).svgGroup_ as SVGElement) ?? null;
      flyoutElement?.parentElement?.insertBefore(
        flyoutElement,
        workspace.getParentSvg(),
      );
    }

    this.oldWorkspaceResize = workspace.resize;
    workspace.resize = () => {
      this.oldWorkspaceResize?.call(this.workspace);
      this.resizeWorkspaceRings();
    };
    this.workspaceSelectionRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceSelectionRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceSelectionRing);
    this.workspaceFocusRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceFocusRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceFocusRing);
    this.resizeWorkspaceRings();

    registerHtmlToast();
  }

  private resizeWorkspaceRings() {
    if (!this.workspaceFocusRing || !this.workspaceSelectionRing) return;
    this.resizeFocusRingInternal(this.workspaceSelectionRing, 5);
    this.resizeFocusRingInternal(this.workspaceFocusRing, 0);
  }

  private resizeFocusRingInternal(ring: Element, inset: number) {
    const metrics = this.workspace.getMetrics();
    ring.setAttribute('x', (metrics.absoluteLeft + inset).toString());
    ring.setAttribute('y', (metrics.absoluteTop + inset).toString());
    ring.setAttribute(
      'width',
      Math.max(0, metrics.viewWidth - inset * 2).toString(),
    );
    ring.setAttribute(
      'height',
      Math.max(0, metrics.svgHeight - inset * 2).toString(),
    );
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    this.workspaceFocusRing?.remove();
    this.workspaceSelectionRing?.remove();
    if (this.oldWorkspaceResize) {
      this.workspace.resize = this.oldWorkspaceResize;
    }

    // Remove the event listener that enables blocks on drag
    this.workspace.removeChangeListener(enableBlocksOnDrag);
    this.navigationController.dispose();
  }

  /**
   * Toggle visibility of a help dialog for the keyboard shortcuts.
   */
  toggleShortcutDialog(): void {
    this.navigationController.shortcutDialog.toggle(this.workspace);
  }

  /**
   * Register CSS used by the plugin.
   * This is broken up into sections by purpose, with some notes about
   * where it should eventually live.
   * Must be called before `Blockly.inject`.
   */
  static registerKeyboardNavigationStyles() {
    // Enable the delete icon for comments.
    //
    // This should remain in the plugin for the time being because we do
    // not want to display the delete icon by default.
    Blockly.Css.register(`
  .blocklyDeleteIcon {
    display: block;
  }
`);

    // Set variables that will be used to control the appearance of the
    // focus indicators.  Attach them to the injectionDiv since they will
    // apply to things contained therein.
    //
    // This should be moved to core, either to core/css.ts
    // or to core/renderers/.
    Blockly.Css.register(`
  .injectionDiv {
    --blockly-active-node-color: #fff200;
    --blockly-active-tree-color: #60a5fa;
    --blockly-selection-width: 3px;
  }
`);

    // Styling focusing blocks, connections and fields.
    //
    // This should be moved to core, being integrated into the
    // existing styling of renderers in core/renderers/*/constants.ts.
    //
    // Many selectors include .blocklyKeyboardNavigation to ensure keyboard
    // nav is on (via the heuristic). This class is added/removed from body.
    Blockly.Css.register(`
  /* Active focus cases: */
  /* Blocks with active focus. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus:is(.blocklyPath, .blocklyHighlightedConnectionPath),
  /* Fields with active focus, */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus.blocklyField
    > .blocklyFieldRect,
  /* Icons with active focus. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus.blocklyIconGroup
    > .blocklyIconShape:first-child {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
  }

  /* Passive focus cases: */
  /* Blocks with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus:is(
      .blocklyPath:not(.blocklyFlyout .blocklyPath),
      .blocklyHighlightedConnectionPath
    ),
  /* Fields with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus.blocklyField
    > .blocklyFieldRect,
  /* Icons with passive focus except when widget/dropdown div in use. */
  .blocklyKeyboardNavigation:not(
          :has(
              .blocklyDropDownDiv:focus-within,
              .blocklyWidgetDiv:focus-within
            )
        )
    .blocklyPassiveFocus.blocklyIconGroup
    > .blocklyIconShape:first-child {
    stroke: var(--blockly-active-node-color);
    stroke-dasharray: 5px 3px;
    stroke-width: var(--blockly-selection-width);
  }

  /* Workaround for unexpectedly hidden connection path due to core style. */
  .blocklyKeyboardNavigation
    .blocklyPassiveFocus.blocklyHighlightedConnectionPath {
    display: unset !important;
  }
`);

    // Styling for focusing the toolbox and flyout.
    //
    // This should be moved to core, to core/css.ts if not to somewhere
    // more specific in core/toolbox/.
    Blockly.Css.register(`
  /* Different ways for toolbox/flyout to be the active tree: */
  /* Active focus in the flyout. */
  .blocklyKeyboardNavigation .blocklyFlyout:has(.blocklyActiveFocus),
  /* Active focus in the toolbox. */
  .blocklyKeyboardNavigation .blocklyToolbox:has(.blocklyActiveFocus),
  /* Active focus on the toolbox/flyout. */
  .blocklyKeyboardNavigation
    .blocklyActiveFocus:is(.blocklyFlyout, .blocklyToolbox) {
    outline-offset: calc(var(--blockly-selection-width) * -1);
    outline: var(--blockly-selection-width) solid
      var(--blockly-active-tree-color);
  }

  /* Suppress default outline. */
  .blocklyKeyboardNavigation
    .blocklyToolboxCategoryContainer:focus-visible {
    outline: none;
  }
`);

    // Styling for focusing the Workspace.
    //
    // This should be move to core, probably to core/css.ts.
    Blockly.Css.register(`
  /* Different ways for the workspace to be the active tree: */
  /* Active focus within workspace. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace:has(.blocklyActiveFocus)
    .blocklyWorkspaceFocusRing,
  /* Active focus within drag layer. */
  .blocklyKeyboardNavigation
    .blocklySvg:has(~ .blocklyBlockDragSurface .blocklyActiveFocus)
    .blocklyWorkspaceFocusRing,
  /* Active focus on workspace. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace.blocklyActiveFocus
    .blocklyWorkspaceFocusRing,
  /* Focus in widget/dropdown div considered to be in workspace. */
  .blocklyKeyboardNavigation:has(
    .blocklyWidgetDiv:focus-within,
    .blocklyDropDownDiv:focus-within
  )
    .blocklyWorkspace
    .blocklyWorkspaceFocusRing {
    stroke: var(--blockly-active-tree-color);
    stroke-width: calc(var(--blockly-selection-width) * 2);
  }

  /* The workspace itself is the active node. */
  .blocklyKeyboardNavigation
    .blocklyWorkspace.blocklyActiveFocus
    .blocklyWorkspaceSelectionRing {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
  }
`);

    // Keyboard-nav-specific styling for the context menu.
    //
    // This should remain in the plugin for the time being because the
    // classes selected are currently only defined in the plugin.
    Blockly.Css.register(`
  .blocklyRTL .blocklyMenuItemContent .blocklyShortcutContainer {
    flex-direction: row-reverse;
  }
  .blocklyMenuItemContent .blocklyShortcutContainer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .blocklyMenuItemContent .blocklyShortcutContainer .blocklyShortcut {
    color: #ccc;
  }
`);
  }
}
