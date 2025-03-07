/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {CursorOptions, LineCursor} from './line_cursor';
import * as Constants from './constants';

export interface ExternalToolbox {
  focus(): void;
}

/** Options object for KeyboardNavigation instances. */
export type NavigationOptions = {
  cursor?: Partial<CursorOptions>;
  externalToolbox?: ExternalToolbox;
};

/** Default options for LineCursor instances. */
const defaultOptions: NavigationOptions = {
  cursor: {},
};

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;
  /**
   * Workaround: Tracks when we're focusing the workspace just to get flyout
   * keyboard navigation working. In this case we need to avoid resetting the
   * flyout. In future, we hope the flyout can take focus.
   */
  private focusingWorkspaceForFlyoutKeyboardNavigation = false;

  /** Event handler run when the workspace gains focus. */
  private focusListener: () => void;

  /** Event handler run when the workspace loses focus. */
  private blurListener: () => void;

  /** Keyboard navigation controller instance for the workspace. */
  private navigationController: NavigationController;

  /** Cursor for the main workspace. */
  private cursor: LineCursor;

  /**
   * These fields are used to preserve the workspace's initial state to restore
   * it when/if keyboard navigation is disabled.
   */
  private injectionDivTabIndex: string | null;
  private workspaceParentTabIndex: string | null;
  private originalTheme: Blockly.Theme;

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will
   *     be added to.
   * @param options Options.
   */
  constructor(workspace: Blockly.WorkspaceSvg, options: NavigationOptions) {
    this.workspace = workspace;

    // Regularise options and apply defaults.
    options = {...defaultOptions, ...options};

    this.navigationController = new NavigationController(options);
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);
    this.navigationController.listShortcuts();

    this.originalTheme = workspace.getTheme();
    this.setGlowTheme();

    this.cursor = new LineCursor(workspace, options.cursor);
    this.cursor.install();

    // Ensure that only the root SVG G (group) has a tab index.
    this.injectionDivTabIndex = workspace
      .getInjectionDiv()
      .getAttribute('tabindex');
    workspace.getInjectionDiv().removeAttribute('tabindex');
    this.workspaceParentTabIndex = workspace
      .getParentSvg()
      .getAttribute('tabindex');
    // We add a focus listener below so use -1 so it doesn't become focusable.
    workspace.getParentSvg().setAttribute('tabindex', '-1');

    this.focusListener = () => {
      this.navigationController.setHasFocus(
        workspace,
        true,
        this.focusingWorkspaceForFlyoutKeyboardNavigation,
      );
    };
    this.blurListener = () => {
      this.navigationController.setHasFocus(workspace, false);
    };

    workspace.getSvgGroup().addEventListener('focus', this.focusListener);
    workspace.getSvgGroup().addEventListener('blur', this.blurListener);
    // Temporary workaround for #136.
    // TODO(#136): fix in core.
    workspace.getParentSvg().addEventListener('focus', this.focusListener);
    workspace.getParentSvg().addEventListener('blur', this.blurListener);
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    // Temporary workaround for #136.
    // TODO(#136): fix in core.
    this.workspace
      .getParentSvg()
      .removeEventListener('blur', this.blurListener);
    this.workspace
      .getParentSvg()
      .removeEventListener('focus', this.focusListener);

    this.workspace.getSvgGroup().removeEventListener('blur', this.blurListener);
    this.workspace
      .getSvgGroup()
      .removeEventListener('focus', this.focusListener);

    if (this.workspaceParentTabIndex) {
      this.workspace
        .getParentSvg()
        .setAttribute('tabindex', this.workspaceParentTabIndex);
    } else {
      this.workspace.getParentSvg().removeAttribute('tabindex');
    }

    if (this.injectionDivTabIndex) {
      this.workspace
        .getInjectionDiv()
        .setAttribute('tabindex', this.injectionDivTabIndex);
    } else {
      this.workspace.getInjectionDiv().removeAttribute('tabindex');
    }

    this.cursor.uninstall();

    this.workspace.setTheme(this.originalTheme);

    this.navigationController.dispose();
  }

  /**
   * Focus the flyout if open.
   *
   * Generally not required if Blockly manages your toolbox.
   */
  focusFlyout(): void {
    this.navigationController.navigation.focusFlyout(this.workspace);
    this.focusingWorkspaceForFlyoutKeyboardNavigation = true;
    (this.workspace.getSvgGroup() as SVGElement).focus();
    this.focusingWorkspaceForFlyoutKeyboardNavigation = false;
  }

  /**
   * Called when an external toolbox loses the focus.
   */
  onExternalToolboxBlur(): void {
    if (
      this.navigationController.navigation.getState(this.workspace) !==
      Constants.STATE.FLYOUT
    ) {
      this.navigationController.navigation.resetFlyout(this.workspace, true);
    }

  /**
   * Toggle visibility of a help dialog for the keyboard shortcuts.
   */
  toggleShortcutDialog(): void {
    this.navigationController.shortcutDialog.toggle();
  }

  /**
   * Update the theme to match the selected glow colour to the cursor
   * colour.
   */
  setGlowTheme() {
    const newTheme = Blockly.Theme.defineTheme('zelosDerived', {
      name: 'zelosDerived',
      base: Blockly.Themes.Zelos,
      componentStyles: {
        selectedGlowColour: '#ffa200',
      },
    });
    this.workspace.setTheme(newTheme);
  }
}
