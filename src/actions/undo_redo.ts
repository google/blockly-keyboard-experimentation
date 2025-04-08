/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ShortcutRegistry,
  utils as BlocklyUtils,
  ShortcutItems,
  WorkspaceSvg,
} from 'blockly/core';

import * as Constants from '../constants';
import type {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Class for registering a shortcut for undo/redo actions.
 */
export class UndoRedoAction {
  private originalUndo?: ShortcutRegistry.KeyboardShortcut;
  private originalRedo?: ShortcutRegistry.KeyboardShortcut;
  /**
   * Patches the existing undo/redo shortcuts in the registry.
   */
  install() {
    const undo =
      ShortcutRegistry.registry.getRegistry()[ShortcutItems.names.UNDO];
    if (undo) {
      this.originalUndo = undo;
      const patchedUndo = {
        ...this.originalUndo,
        preconditionFn: (workspace: WorkspaceSvg) => {
          return !!(
            !workspace.isDragging() && undo.preconditionFn?.(workspace)
          );
        },
        allowCollision: true,
      };

      ShortcutRegistry.registry.register(patchedUndo, true);
    }

    const redo =
      ShortcutRegistry.registry.getRegistry()[ShortcutItems.names.REDO];
    if (redo) {
      this.originalRedo = redo;
      const patchedRedo = {
        ...this.originalRedo,
        preconditionFn: (workspace: WorkspaceSvg) => {
          return !!(
            !workspace.isDragging() && redo.preconditionFn?.(workspace)
          );
        },
        allowCollision: true,
      };

      ShortcutRegistry.registry.register(patchedRedo, true);
    }
  }

  /**
   * Reverts the patched undo/redo shortcuts in the registry.
   */
  uninstall() {
    if (this.originalUndo) {
      ShortcutRegistry.registry.register(this.originalUndo, true);
      this.originalUndo = undefined;
    }
    if (this.originalRedo) {
      ShortcutRegistry.registry.register(this.originalRedo, true);
      this.originalRedo = undefined;
    }
  }
}
