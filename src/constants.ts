/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Constants for keyboard navigation.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

/**
 * Keyboard navigation states.
 * The different parts of Blockly that the user navigates between.
 */
export enum STATE {
  WORKSPACE = 'workspace',
  FLYOUT = 'flyout',
  TOOLBOX = 'toolbox',
}

/**
 * Default keyboard navigation shortcut names.
 */
export enum SHORTCUT_NAMES {
  PREVIOUS = 'previous',
  NEXT = 'next',
  IN = 'in',
  OUT = 'out',
  INSERT = 'insert',
  MARK = 'mark',
  DISCONNECT = 'disconnect',
  TOOLBOX = 'toolbox',
  EXIT = 'exit',
  COPY = 'keyboard_nav_copy',
  CUT = 'keyboard_nav_cut',
  PASTE = 'keyboard_nav_paste',
  DELETE = 'keyboard_nav_delete',
  /* eslint-disable @typescript-eslint/naming-convention */
  MOVE_WS_CURSOR_UP = 'workspace_up',
  MOVE_WS_CURSOR_DOWN = 'workspace_down',
  MOVE_WS_CURSOR_LEFT = 'workspace_left',
  MOVE_WS_CURSOR_RIGHT = 'workspace_right',
  TOGGLE_KEYBOARD_NAV = 'toggle_keyboard_nav',
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Types of possible messages passed into the loggingCallback in the Navigation
 * class.
 */
export enum LOGGING_MSG_TYPE {
  ERROR = 'error',
  WARN = 'warn',
  LOG = 'log',
}
