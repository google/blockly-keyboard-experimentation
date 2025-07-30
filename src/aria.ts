/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const ARIA_PREFIX = 'aria-';
const ROLE_ATTRIBUTE = 'role';

// TODO: Finalize this.
export enum Role {
  GRID = 'grid',
  GRIDCELL = 'gridcell',
  GROUP = 'group',
  LISTBOX = 'listbox',
  MENU = 'menu',
  MENUITEM = 'menuitem',
  MENUITEMCHECKBOX = 'menuitemcheckbox',
  OPTION = 'option',
  PRESENTATION = 'presentation',
  ROW = 'row',
  TREE = 'tree',
  TREEITEM = 'treeitem',
  SEPARATOR = 'separator',
  STATUS = 'status',
  REGION = 'region',
  IMAGE = 'image',
  FIGURE = 'figure',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  TEXTBOX = 'textbox',
  APPLICATION = 'application',
}

// TODO: Finalize this.
export enum State {
  ACTIVEDESCENDANT = 'activedescendant',
  COLCOUNT = 'colcount',
  DISABLED = 'disabled',
  EXPANDED = 'expanded',
  INVALID = 'invalid',
  LABEL = 'label',
  LABELLEDBY = 'labelledby',
  LEVEL = 'level',
  ORIENTATION = 'orientation',
  POSINSET = 'posinset',
  ROWCOUNT = 'rowcount',
  SELECTED = 'selected',
  SETSIZE = 'setsize',
  VALUEMAX = 'valuemax',
  VALUEMIN = 'valuemin',
  LIVE = 'live',
  HIDDEN = 'hidden',
  ROLEDESCRIPTION = 'roledescription',
  ATOMIC = 'atomic',
  OWNS = 'owns',
}

var isMutatingAriaProperty: boolean = false;

export function setRole(element: Element, roleName: Role | null) {
  isMutatingAriaProperty = true;
  if (roleName) {
    element.setAttribute(ROLE_ATTRIBUTE, roleName);
  } else element.removeAttribute(ROLE_ATTRIBUTE);
  isMutatingAriaProperty = false;
}

export function getRole(element: Element): Role | null {
  // This is an unsafe cast which is why it needs to be checked to ensure that
  // it references a valid role.
  const currentRoleName = element.getAttribute(ROLE_ATTRIBUTE) as Role;
  if (Object.values(Role).includes(currentRoleName)) {
    return currentRoleName;
  }
  return null;
}

export function setState(
  element: Element,
  stateName: State,
  value: string | boolean | number | string[],
) {
  isMutatingAriaProperty = true;
  if (Array.isArray(value)) {
    value = value.join(' ');
  }
  const attrStateName = ARIA_PREFIX + stateName;
  element.setAttribute(attrStateName, `${value}`);
  isMutatingAriaProperty = false;
}

export function getState(element: Element, stateName: State): string | null {
  const attrStateName = ARIA_PREFIX + stateName;
  return element.getAttribute(attrStateName);
}

export function announceDynamicAriaState(text: string) {
  const ariaAnnouncementSpan = document.getElementById('blocklyAriaAnnounce');
  if (!ariaAnnouncementSpan) {
    throw new Error('Expected element with id blocklyAriaAnnounce to exist.');
  }
  ariaAnnouncementSpan.innerHTML = text;
}

export function isCurrentlyMutatingAriaProperty(): boolean {
  return isMutatingAriaProperty;
}
