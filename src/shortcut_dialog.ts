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

/**
 * Register classes used by the shortcuts modal
 * Alt: plugin exports a register() function that updates the registry
 */
Blockly.Css.register(`
:root {
  --divider-border-color: #eee;
  --key-border-color: #ccc;
  --shortcut-modal-border-color: #9aa0a6;
}

.shortcut-modal {
  border: 1px solid var(--shortcut-modal-border-color);
  border-radius: 12px;
  box-shadow: 6px 6px 32px rgba(0,0,0,.5);
  flex-direction: column;
  gap: 12px;
  margin: auto;
  max-height: 82vh;
  max-width: calc(100% - 10em);
  padding: 24px 12px 24px 32px;
  position: relative;
  z-index: 99;
}

.shortcut-modal[open] {
  display: flex;
}

.shortcut-modal .close-modal {
  border: 0;
  background: transparent;
  float: inline-end;
  margin: 0 0 0 0;
  position: absolute;
  top: 16px;
  right: 24px;
}

.shortcut-modal h1 {
  font-weight: 600;
  font-size: 1.2em;
}

.shortcut-modal:before {
  background: radial-gradient(rgba(244, 244, 244, 0.43), rgba(75, 75, 75, 0.51));
  align-items: center;
  display: block;
  font-family: Roboto;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}

.shortcut-tables {
  display: grid;
  align-items: start;
  grid-template-columns: 1fr;
  row-gap: 1em;
  column-gap: 2em;
}

@media (min-width: 950px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr
  }
}

@media (min-width: 1360px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr 1fr
  }
}

.shortcut-table {
  border-collapse: collapse;
  font-family: Roboto;
  font-size: .9em;
}

.shortcut-table th {
  padding-inline-end: 0.5em;
  text-align: left;
  text-wrap: nowrap;
  vertical-align: baseline;
}

.shortcut-table td:first-child {
  text-wrap: auto;
  width: 40%;
}

.shortcut-table tr:has(+ .category) {
  --divider-border-color: transparent;
  margin-end: 1em;
}

.shortcut-table tr:not(.category, :last-child) {
  border-bottom: 1px solid var(--divider-border-color);
}

.shortcut-table td {
  padding: 0.2em 1em 0.3em 0;
  text-wrap: nowrap;
}

.shortcut-table h2 {
  border-bottom: 1px solid #999;
  font-size: 1em;
  padding-block-end: 0.5em;
}

.shortcut-table .key {
  border: 1px solid var(--key-border-color);
  border-radius: 8px;
  display: inline-block;
  margin: 0 4px;
  min-width: 2em;
  padding: .3em .5em;
  text-align: center;
}

.shortcut-table .separator {
  color: gray;
  display: inline-block;
  padding: 0 0.5em;
}

.shortcut-container {
  font-size: 0.95em;
  overflow: auto;
  padding: 0.5em;
}

.shortcut-combo {
  display: inline-block;
  padding: 0.25em 0;
  text-wrap: nowrap;
}

`);
