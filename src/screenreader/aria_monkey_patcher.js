/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Overrides a bunch of methods throughout core Blockly in order
 * to augment Blockly components with ARIA support.
 */

import * as aria from './aria';
import './stuboverrides/override_block_svg'
import './stuboverrides/override_collapsible_toolbox_category'
import './stuboverrides/override_comment_icon'
import './stuboverrides/override_field_checkbox'
import './stuboverrides/override_field_dropdown'
import './stuboverrides/override_field_image'
import './stuboverrides/override_field_input'
import './stuboverrides/override_field_label'
import './stuboverrides/override_field'
import './stuboverrides/override_flyout_button'
import './stuboverrides/override_icon'
import './stuboverrides/override_mutator_icon'
import './stuboverrides/override_rendered_connection'
import './stuboverrides/override_rendered_workspace_comment'
import './stuboverrides/override_toolbox_category'
import './stuboverrides/override_toolbox_separator'
import './stuboverrides/override_toolbox'
import './stuboverrides/override_warning_icon'
import './stuboverrides/override_workspace_svg'

const oldCreateElementNS = document.createElementNS;

document.createElementNS = function (namepspaceURI, qualifiedName) {
  const element = oldCreateElementNS.call(this, namepspaceURI, qualifiedName);
  // Top-level SVG elements and groups are presentation by default. They will be
  // specified more specifically elsewhere if they need to be readable.
  if (qualifiedName === 'svg' || qualifiedName === 'g') {
    aria.setRole(element, aria.Role.PRESENTATION);
  }
  return element;
};

const oldElementSetAttribute = Element.prototype.setAttribute;
// TODO: Replace these cases with property augmentation here so that all aria
// behavior is defined within this file.
const ariaAttributeAllowlist = ['aria-disabled', 'aria-selected'];

Element.prototype.setAttribute = function (name, value) {
  // This is a hacky way to disable all aria changes in core Blockly since it's
  // easier to just undefine everything globally and then conditionally reenable
  // things with the correct definitions.
  // TODO: Add an exemption for role here once all roles are properly defined
  // within this file (see failing tests when role changes are ignored here).
  if (
    aria.isCurrentlyMutatingAriaProperty() ||
    ariaAttributeAllowlist.includes(name) ||
    !name.startsWith('aria-')
  ) {
    oldElementSetAttribute.call(this, name, value);
  }
};

// TODO: Figure out how to patch CommentEditor. It doesn't seem to have any methods really to override, so it may actually require patching at the dom utility layer, or higher up.
// TODO: Ditto for CommentBarButton and its children.
// TODO: Ditto for Bubble and its children.
