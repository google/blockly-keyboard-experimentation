/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as Constants from './constants';
import {Msg, ShortcutRegistry} from 'blockly/core';
import {
  getLongActionShortcutsAsKeys,
  upperCaseFirst,
} from './shortcut_formatting';
import {clearHelpHint} from './hints';

/**
 * Class for handling the shortcuts dialog.
 */
export class ShortcutDialog {
  outputDiv: HTMLElement | null;
  modalContainer: HTMLElement | null;
  shortcutDialog: HTMLDialogElement | null;
  open: boolean;
  closeButton: HTMLElement | null;
  /**
   * Constructor for a dialog that displays available keyboard shortcuts.
   */
  constructor() {
    // For testing purposes, this assumes that the page has a
    // div named 'shortcuts'.
    this.outputDiv = document.getElementById('shortcuts');

    this.open = false;
    this.modalContainer = null;
    this.shortcutDialog = null;
    this.closeButton = null;
  }

  getPlatform() {
    const {platform, userAgent} = navigator;
    if (platform.startsWith('Win')) {
      return Msg['WINDOWS'];
    } else if (platform.startsWith('Mac')) {
      return Msg['MAC_OS'];
    } else if (/\bCrOS\b/.test(userAgent)) {
      // Order is important because platform matches the Linux case below.
      return Msg['CHROME_OS'];
    } else if (platform.includes('Linux')) {
      return Msg['LINUX'];
    } else {
      return Msg['UNKNOWN'];
    }
  }

  /**
   * Update the modifier key to the user's specific platform.
   */
  updatePlatformName() {
    const platform = this.getPlatform();
    const platformEl = this.outputDiv
      ? this.outputDiv.querySelector('.platform')
      : null;
    if (platformEl) {
      platformEl.textContent = platform;
    }
  }

  toggle(workspace: Blockly.WorkspaceSvg) {
    clearHelpHint(workspace);
    this.toggleInternal();
  }

  toggleInternal() {
    if (this.modalContainer && this.shortcutDialog) {
      // Use built in dialog methods.
      if (this.shortcutDialog.hasAttribute('open')) {
        this.shortcutDialog.close();
      } else {
        this.shortcutDialog.showModal();
      }
    }
  }

  /**
   * Munges a shortcut name into human readable text.
   *
   * @param shortcutName Shortcut name to convert.
   * @returns A title case version of the name.
   */
  getReadableShortcutName(shortcutName: string) {
    return upperCaseFirst(shortcutName.replace(/_/gi, ' '));
  }

  /**
   * List all currently registered shortcuts as a table.
   */
  createModalContent() {
    let modalContents = `<div class="modal-container">
      <dialog class="shortcut-modal">
        <div class="shortcut-container" tabindex="0">
          <div class="header">
            <button class="close-modal">
              <span class="material-symbols-outlined">close</span>
            </button>
            <h1>Keyboard shortcuts – <span class="platform">Windows</span></h1>
          </div>
          <div class="shortcut-tables">`;

    // Display shortcuts by their categories.
    for (const [key, categoryShortcuts] of Object.entries(
      Constants.SHORTCUT_CATEGORIES,
    )) {
      modalContents += `
        <table class="shortcut-table">
          <tbody>
          <tr class="category"><th colspan="3"><h2>${key}</h2></th></tr>
          <tr>
          `;

      for (const keyboardShortcut of categoryShortcuts) {
        modalContents += `
              <td>${this.getReadableShortcutName(keyboardShortcut)}</td>
              <td>${this.actionShortcutsToHTML(keyboardShortcut)}</td>
              </tr>`;
      }
      modalContents += '</tr></tbody></table>';
    }
    if (this.outputDiv) {
      this.outputDiv.innerHTML =
        modalContents +
        `</div>
      </dialog>
    </div>`;
      this.modalContainer = this.outputDiv.querySelector('.modal-container');
      this.shortcutDialog = this.outputDiv.querySelector('.shortcut-modal');
      this.closeButton = this.outputDiv.querySelector('.close-modal');
      this.updatePlatformName();
      // Can we also intercept the Esc key to dismiss.
      if (this.closeButton) {
        this.closeButton.addEventListener('click', (e) => {
          this.toggleInternal();
        });
      }
    }
  }

  private actionShortcutsToHTML(action: string) {
    const shortcuts = getLongActionShortcutsAsKeys(action);
    return shortcuts.map((keys) => this.actionShortcutToHTML(keys)).join(' / ');
  }

  private actionShortcutToHTML(keys: string[]) {
    const separator = navigator.platform.startsWith('Mac') ? '' : ' + ';
    return [
      `<span class="shortcut-combo">`,
      ...keys.map((key, index) => {
        return `<span class="key">${key}</span>${index < keys.length - 1 ? separator : ''}`;
      }),
      `</span>`,
    ].join('');
  }

  /**
   * Registers an action to list shortcuts with the shortcut registry.
   */
  install() {
    /** List all of the currently registered shortcuts. */
    const announceShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.LIST_SHORTCUTS,
      callback: (workspace) => {
        this.toggle(workspace);
        return true;
      },
      keyCodes: [Blockly.utils.KeyCodes.SLASH],
    };
    ShortcutRegistry.registry.register(announceShortcut);
  }

  /**
   * Unregisters the action to list shortcuts.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.LIST_SHORTCUTS,
    );
  }
}
