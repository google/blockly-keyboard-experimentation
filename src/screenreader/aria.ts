/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const ARIA_PREFIX = 'aria-';
const ROLE_ATTRIBUTE = 'role';

/** Represents an ARIA role that an element may have. */
export enum Role {
  GROUP = 'group',
  LISTBOX = 'listbox',
  PRESENTATION = 'presentation',
  TREE = 'tree',
  TREEITEM = 'treeitem',
  SEPARATOR = 'separator',
  IMAGE = 'image',
  FIGURE = 'figure',
  BUTTON = 'button',
  CHECKBOX = 'checkbox',
  TEXTBOX = 'textbox',
}

/** Represents ARIA-specific state that can be configured for an element. */
export enum State {
  LABEL = 'label',
  LEVEL = 'level',
  POSINSET = 'posinset',
  SELECTED = 'selected',
  SETSIZE = 'setsize',
  LIVE = 'live',
  HIDDEN = 'hidden',
  ROLEDESCRIPTION = 'roledescription',
  OWNS = 'owns',
}

let isMutatingAriaProperty = false;

/**
 * Updates the specific role for the specified element.
 *
 * @param element The element whose ARIA role should be changed.
 * @param roleName The new role for the specified element, or null if its role
 *     should be cleared.
 */
export function setRole(element: Element, roleName: Role | null) {
  isMutatingAriaProperty = true;
  if (roleName) {
    element.setAttribute(ROLE_ATTRIBUTE, roleName);
  } else element.removeAttribute(ROLE_ATTRIBUTE);
  isMutatingAriaProperty = false;
}

/**
 * Returns the ARIA role of the specified element, or null if it either doesn't
 * have a designated role or if that role is unknown.
 *
 * @param element The element from which to retrieve its ARIA role.
 * @returns The ARIA role of the element, or null if undefined or unknown.
 */
export function getRole(element: Element): Role | null {
  // This is an unsafe cast which is why it needs to be checked to ensure that
  // it references a valid role.
  const currentRoleName = element.getAttribute(ROLE_ATTRIBUTE) as Role;
  if (Object.values(Role).includes(currentRoleName)) {
    return currentRoleName;
  }
  return null;
}

/**
 * Sets the specified ARIA state by its name and value for the specified
 * element.
 *
 * Note that the type of value is not validated against the specific type of
 * state being changed, so it's up to callers to ensure the correct value is
 * used for the given state.
 *
 * @param element The element whose ARIA state may be changed.
 * @param stateName The state to change.
 * @param value The new value to specify for the provided state.
 */
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

/**
 * Returns a string representation of the specified state for the specified
 * element, or null if it's not defined or specified.
 *
 * Note that an explicit set state of 'null' will return the 'null' string, not
 * the value null.
 *
 * @param element The element whose state is being retrieved.
 * @param stateName The state to retrieve.
 * @returns The string representation of the requested state for the specified
 *     element, or null if not defined.
 */
export function getState(element: Element, stateName: State): string | null {
  const attrStateName = ARIA_PREFIX + stateName;
  return element.getAttribute(attrStateName);
}

/**
 * Softly requests that the specified text be read to the user if a screen
 * reader is currently active.
 *
 * This relies on a centrally managed ARIA live region that should not interrupt
 * existing announcements (that is, this is what's considered a polite
 * announcement).
 *
 * Callers should use this judiciously. It's often considered bad practice to
 * over announce information that can be inferred from other sources on the
 * page, so this ought to only be used when certain context cannot be easily
 * determined (such as dynamic states that may not have perfect ARIA
 * representations or indications).
 *
 * @param text The text to politely read to the user.
 */
export function announceDynamicAriaState(text: string) {
  const ariaAnnouncementSpan = document.getElementById('blocklyAriaAnnounce');
  if (!ariaAnnouncementSpan) {
    throw new Error('Expected element with id blocklyAriaAnnounce to exist.');
  }
  ariaAnnouncementSpan.innerHTML = text;
}

/**
 * Determines whether an ARIA property is in the process of being changed.
 *
 * @returns Returns whether an ARIA property is changing for any element,
 *     specifically via setRole() or stateState().
 */
export function isCurrentlyMutatingAriaProperty(): boolean {
  return isMutatingAriaProperty;
}
