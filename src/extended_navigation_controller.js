/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NavigationController} from './base_keyboard_nav/navigation_controller';
import {SHORTCUT_NAMES, STATE} from './base_keyboard_nav/constants';
import {ASTNode, ShortcutRegistry} from 'blockly';
import {utils as BlocklyUtils} from 'blockly';
import {keyCodeArrayToString} from './keynames';

export class ExtendedNavigationController extends NavigationController {
  // override
  init() {
    this.addShortcutHandlers();
    this.registerDefaults();
    this.remapDefaults();
    this.registerAddOns();
  }

  listShortcuts() {
    const announcer = document.getElementById('announcer');

    const registry = ShortcutRegistry.registry.getRegistry();
    let text = `<table>
<thead>
<tr>
<td>Shortcut name</td>
<td>Shortcut action</td>
</tr>
</thead>`;
    for (const keyboardShortcut of Object.keys(registry)) {
      const codeArray =
        ShortcutRegistry.registry.getKeyCodesByShortcutName(keyboardShortcut);
      const prettyPrinted = keyCodeArrayToString(codeArray);
      text += `<tr><td>${keyboardShortcut}</td> <td>${prettyPrinted}</td></tr>`;
    }
    announcer.innerHTML = text + '\n</table/>';
  }

  registerListShortcuts() {
    const listShortcuts = {
      name: 'List shortcuts',
      preconditionFn: (workspace) => {
        return true;
      },
      // List out the current shortcuts.
      // Adds a table to the announcer area.
      callback: (workspace) => {
        this.listShortcuts();
        return true;
      },
    };

    ShortcutRegistry.registry.register(listShortcuts);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.SLASH,
      listShortcuts.name,
    );
  }

  registerAnnounce() {
    const announceShortcut = {
      name: 'Announce',
      preconditionFn: (workspace) => {
        return true;
      },
      // Print out the type of the current node.
      callback: (workspace) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();
        announcer.innerText = cursor.getCurNode().getType();
        return true;
      },
    };

    ShortcutRegistry.registry.register(announceShortcut);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.A,
      announceShortcut.name,
    );
  }

  registerNextSibling() {
    const shortcut = {
      name: 'Go to next sibling',
      preconditionFn: (workspace) => {
        return true;
      },
      // Jump to the next node at the same level, when in the workspace
      callback: (workspace, e, shortcut) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();

        if (this.navigation.getState(workspace) == STATE.WORKSPACE) {
          if (this.fieldShortcutHandler(workspace, e, shortcut)) {
            announcer.innerText = 'next sibling (handled by field)';
            return true;
          }
          if (cursor.nextSibling()) {
            announcer.innerText = 'next sibling (success)';
            return true;
          }
        }
        announcer.innerText = 'next sibling (no-op)';
        return false;
      },
    };

    ShortcutRegistry.registry.register(shortcut);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.N,
      shortcut.name,
    );
  }

  registerPreviousSibling() {
    const shortcut = {
      name: 'Go to previous sibling',
      preconditionFn: (workspace) => {
        return true;
      },
      callback: (workspace, e, shortcut) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();

        if (this.navigation.getState(workspace) == STATE.WORKSPACE) {
          if (this.fieldShortcutHandler(workspace, e, shortcut)) {
            announcer.innerText = 'previous sibling (handled by field)';
            return true;
          }
          if (cursor.previousSibling()) {
            announcer.innerText = 'previous sibling (success)';
            return true;
          }
        }
        announcer.innerText = 'previous sibling (no-op)';
        return false;
      },
    };

    ShortcutRegistry.registry.register(shortcut);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.M,
      shortcut.name,
    );
  }

  registerJumpToRoot() {
    const jumpShortcut = {
      name: 'Jump to root of current stack',
      preconditionFn: (workspace) => {
        return true;
      },
      // Jump to the root of the current stack.
      callback: (workspace) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();
        const curNode = cursor.getCurNode();
        const curBlock = curNode.getSourceBlock();
        if (curBlock) {
          const rootBlock = curBlock.getRootBlock();
          const stackNode = ASTNode.createStackNode(rootBlock);
          cursor.setCurNode(stackNode);
          announcer.innerText = 'jumped to root';
          return true;
        }
        announcer.innerText = 'could not jump to root';
        return false;
      },
    };

    ShortcutRegistry.registry.register(jumpShortcut);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.R,
      jumpShortcut.name,
    );
  }

  registerAnnounce() {
    const announceShortcut = {
      name: 'Announce',
      preconditionFn: (workspace) => {
        return true;
      },
      // Print out the type of the current node.
      callback: (workspace) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();
        announcer.innerText = cursor.getCurNode().getType();
        return true;
      },
    };

    ShortcutRegistry.registry.register(announceShortcut);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.A,
      announceShortcut.name,
    );
  }

  registerContextOut() {
    /** @type {!Blockly.ShortcutRegistry.KeyboardShortcut} */
    const shortcut = {
      name: 'Context out',
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      callback: (workspace) => {
        const announcer = document.getElementById('announcer');
        if (this.navigation.getState(workspace) == STATE.WORKSPACE) {
          announcer.innerText = 'context out';
          if (workspace.getCursor().contextOut()) {
            return true;
          }
        }
        announcer.innerText = 'context out (no-op)';
        return false;
      },
    };

    ShortcutRegistry.registry.register(shortcut);
    const ctrlShiftO = ShortcutRegistry.registry.createSerializedKey(
      BlocklyUtils.KeyCodes.O,
      [BlocklyUtils.KeyCodes.SHIFT],
    );
    ShortcutRegistry.registry.addKeyMapping(ctrlShiftO, shortcut.name);
  }

  registerContextIn() {
    const shortcut = {
      name: 'Context in',
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      // Print out the type of the current node.
      callback: (workspace) => {
        const announcer = document.getElementById('announcer');
        const cursor = workspace.getCursor();
        if (this.navigation.getState(workspace) == STATE.WORKSPACE) {
          if (cursor.contextIn()) {
            announcer.innerText = 'context in';
            return true;
          }
        }
        announcer.innerText = 'context in (no-op)';
        return false;
      },
    };

    ShortcutRegistry.registry.register(shortcut);
    const ctrlShiftI = ShortcutRegistry.registry.createSerializedKey(
      BlocklyUtils.KeyCodes.I,
      [BlocklyUtils.KeyCodes.SHIFT],
    );
    ShortcutRegistry.registry.addKeyMapping(ctrlShiftI, shortcut.name);
  }

  registerAddOns() {
    this.registerAnnounce();
    this.registerPreviousSibling();
    this.registerNextSibling();
    this.registerJumpToRoot();
    this.registerListShortcuts();
    this.registerContextIn();
    this.registerContextOut();
  }

  // Remap to use arrow keys instead.
  remapDefaults() {
    ShortcutRegistry.registry.removeAllKeyMappings(
      SHORTCUT_NAMES.OUT,
    );
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.LEFT,
      SHORTCUT_NAMES.OUT,
    );

    ShortcutRegistry.registry.removeAllKeyMappings(SHORTCUT_NAMES.IN);
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.RIGHT,
      SHORTCUT_NAMES.IN,
    );

    ShortcutRegistry.registry.removeAllKeyMappings(
      SHORTCUT_NAMES.PREVIOUS,
    );
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.UP,
      SHORTCUT_NAMES.PREVIOUS,
    );

    ShortcutRegistry.registry.removeAllKeyMappings(
      SHORTCUT_NAMES.NEXT,
    );
    ShortcutRegistry.registry.addKeyMapping(
      BlocklyUtils.KeyCodes.DOWN,
      SHORTCUT_NAMES.NEXT,
    );
  }
}

export function installNavController(workspace) {
  const navigationController = new ExtendedNavigationController();
  navigationController.init();
  navigationController.addWorkspace(workspace);
  // Turns on keyboard navigation.
  navigationController.enable(workspace);
  navigationController.listShortcuts();
}
