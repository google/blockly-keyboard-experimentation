/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {getFlyoutElement, getToolboxElement} from './workspace_utilities';

/** Options object for KeyboardNavigation instances. */
export interface NavigationOptions {
  cursor: Partial<Blockly.CursorOptions>;
}

/** Default options for LineCursor instances. */
const defaultOptions: NavigationOptions = {
  cursor: {},
};

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;

  /** Event handler run when the workspace gains focus. */
  private focusListener: () => void;

  /** Event handler run when the workspace loses focus. */
  private blurListener: () => void;

  /** Event handler run when the widget or dropdown div loses focus. */
  private widgetDropDownDivFocusOutListener: (e: Event) => void;

  /** Event handler run when the toolbox gains focus. */
  private toolboxFocusInListener: (e: Event) => void;

  /** Event handler run when the toolbox loses focus. */
  private toolboxFocusOutListener: (e: Event) => void;

  /** Event handler run when the flyout gains focus. */
  private flyoutFocusListener: () => void;

  /** Event handler run when the flyout loses focus. */
  private flyoutBlurListener: (e: Event) => void;

  /** Keyboard navigation controller instance for the workspace. */
  private navigationController: NavigationController;

  /** Cursor for the main workspace. */
  private cursor: Blockly.LineCursor;

  /**
   * These fields are used to preserve the workspace's initial state to restore
   * it when/if keyboard navigation is disabled.
   */
  private injectionDivTabIndex: string | null;
  private workspaceParentTabIndex: string | null;
  private originalTheme: Blockly.Theme;

  /**
   * Stored to enable us to undo workspace monkey patching.
   */
  private oldMarkFocused: () => void;
  /**
   * Stored to enable us to undo flyout workspace monkey patching.
   */
  private oldFlyoutMarkFocused: (() => void) | null = null;

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will
   *     be added to.
   * @param options Options.
   */
  constructor(
    workspace: Blockly.WorkspaceSvg,
    options: Partial<NavigationOptions>,
  ) {
    this.workspace = workspace;

    // Regularise options and apply defaults.
    options = {...defaultOptions, ...options};

    this.navigationController = new NavigationController();
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);

    this.originalTheme = workspace.getTheme();
    this.setGlowTheme();

    this.cursor = new Blockly.LineCursor(workspace, options.cursor);

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

    // Move the flyout for logical tab order.
    const flyoutElement = getFlyoutElement(workspace);
    flyoutElement?.parentElement?.insertBefore(
      flyoutElement,
      workspace.getParentSvg(),
    );

    // Temporary workaround for #136.
    this.oldMarkFocused = workspace.markFocused;
    workspace.markFocused = () => {
      // Starting a gesture unconditionally calls markFocused on the parent SVG
      // but we really don't want to move to the workspace (and close the
      // flyout) if all you did was click in a flyout, potentially on a
      // button. See also `gesture_monkey_patch.js`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gestureInternals = this.workspace.currentGesture_ as any;
      const gestureFlyout = gestureInternals?.flyout;
      const gestureFlyoutAutoClose = gestureFlyout?.autoClose;
      const gestureOnBlock = gestureInternals?.startBlock;

      if (
        // When clicking on flyout that cannot close.
        (gestureFlyout && !gestureFlyoutAutoClose) ||
        // When clicking on a block in a flyout that can close.
        (gestureFlyout && gestureFlyoutAutoClose && !gestureOnBlock)
      ) {
        this.navigationController.focusFlyout(workspace);
      } else {
        this.navigationController.focusWorkspace(workspace);
      }
    };
    const flyout = this.workspace.getFlyout();
    if (flyout) {
      this.oldFlyoutMarkFocused = flyout.getWorkspace().markFocused;
      flyout.getWorkspace().markFocused = () => {
        // By default this would call markFocused on the main workspace.  It is
        // called when you click on the flyout scrollbars, which is a
        // particularly unfortunate time for the flyout to close.
        this.navigationController.focusFlyout(this.workspace);
      };
    }

    this.focusListener = () => {
      this.navigationController.handleFocusWorkspace(workspace);
    };
    this.blurListener = () => {
      this.navigationController.handleBlurWorkspace(workspace);
    };

    workspace.getSvgGroup().addEventListener('focus', this.focusListener);
    workspace.getSvgGroup().addEventListener('blur', this.blurListener);

    this.widgetDropDownDivFocusOutListener = (e: Event) => {
      this.navigationController.handleFocusOutWidgetDropdownDiv(
        workspace,
        (e as FocusEvent).relatedTarget,
      );
    };

    Blockly.WidgetDiv.getDiv()?.addEventListener(
      'focusout',
      this.widgetDropDownDivFocusOutListener,
    );
    Blockly.DropDownDiv.getContentDiv()?.addEventListener(
      'focusout',
      this.widgetDropDownDivFocusOutListener,
    );

    const toolboxElement = getToolboxElement(workspace);
    this.toolboxFocusInListener = (e: Event) => {
      if (
        (e.currentTarget as Element).contains(
          (e as FocusEvent).relatedTarget as Node,
        )
      ) {
        return;
      }

      this.navigationController.handleFocusToolbox(workspace);
    };
    this.toolboxFocusOutListener = (e: Event) => {
      if (
        (e.currentTarget as Element).contains(
          (e as FocusEvent).relatedTarget as Node,
        )
      ) {
        return;
      }

      this.navigationController.handleBlurToolbox(
        workspace,
        this.shouldCloseFlyoutOnBlur(
          (e as FocusEvent).relatedTarget,
          flyoutElement,
        ),
      );
    };
    toolboxElement?.addEventListener('focusin', this.toolboxFocusInListener);
    toolboxElement?.addEventListener('focusout', this.toolboxFocusOutListener);

    this.flyoutFocusListener = () => {
      this.navigationController.handleFocusFlyout(workspace);
    };
    this.flyoutBlurListener = (e: Event) => {
      this.navigationController.handleBlurFlyout(
        workspace,
        this.shouldCloseFlyoutOnBlur(
          (e as FocusEvent).relatedTarget,
          toolboxElement,
        ),
      );
    };
    flyoutElement?.addEventListener('focus', this.flyoutFocusListener);
    flyoutElement?.addEventListener('blur', this.flyoutBlurListener);
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    // Revert markFocused monkey patch.
    this.workspace.markFocused = this.oldMarkFocused;
    if (this.oldFlyoutMarkFocused) {
      const flyout = this.workspace.getFlyout();
      if (flyout) {
        flyout.getWorkspace().markFocused = this.oldFlyoutMarkFocused;
      }
    }

    this.workspace.getSvgGroup().removeEventListener('blur', this.blurListener);
    this.workspace
      .getSvgGroup()
      .removeEventListener('focus', this.focusListener);

    Blockly.WidgetDiv.getDiv()?.removeEventListener(
      'focusout',
      this.widgetDropDownDivFocusOutListener,
    );
    Blockly.DropDownDiv.getContentDiv()?.removeEventListener(
      'focusout',
      this.widgetDropDownDivFocusOutListener,
    );

    const toolboxElement = getToolboxElement(this.workspace);
    toolboxElement?.removeEventListener('focusin', this.toolboxFocusInListener);
    toolboxElement?.removeEventListener(
      'focusout',
      this.toolboxFocusOutListener,
    );

    const flyoutElement = getFlyoutElement(this.workspace);
    flyoutElement?.removeEventListener('focus', this.flyoutFocusListener);
    flyoutElement?.removeEventListener('blur', this.flyoutBlurListener);

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

    this.workspace.setTheme(this.originalTheme);

    this.navigationController.dispose();
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

  /**
   * Identify whether we should close the flyout when the toolbox or flyout
   * blurs. If a gesture is in progerss or we're moving from one the other
   * then we leave it open.
   *
   * @param relatedTarget The related target from the event on the flyout or toolbox.
   * @param container The other element of flyout or toolbox (opposite to the event).
   * @returns true if the flyout should be closed, false otherwise.
   */
  private shouldCloseFlyoutOnBlur(
    relatedTarget: EventTarget | null,
    container: Element | null,
  ) {
    if (Blockly.Gesture.inProgress()) {
      return false;
    }
    if (!relatedTarget) {
      return false;
    }
    if (
      relatedTarget instanceof Node &&
      container?.contains(relatedTarget as Node)
    ) {
      return false;
    }
    return true;
  }
}
