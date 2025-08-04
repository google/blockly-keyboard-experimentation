/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as aria from './aria';

/**
 * Recomputes ARIA tree ownership relationships for all of the specified
 * Toolbox's categories and items.
 *
 * This should only be done when the Toolbox's contents have changed.
 *
 * @param toolbox The toolbox whose ARIA tree should be recomputed.
 */
export function recomputeAriaOwnersInToolbox(toolbox: Blockly.Toolbox) {
  const focusable = toolbox.getFocusableElement();
  const selectableChildren =
    toolbox.getToolboxItems().filter((item) => item.isSelectable()) ?? null;
  const focusableChildElems = selectableChildren.map((selectable) =>
    selectable.getFocusableElement(),
  );
  const focusableChildIds = focusableChildElems.map((elem) => elem.id);
  aria.setState(
    focusable,
    aria.State.OWNS,
    [...new Set(focusableChildIds)].join(' '),
  );
  // Ensure children have the correct position set.
  // TODO: Fix collapsible subcategories. Their groups aren't set up correctly yet, and they aren't getting a correct accounting in top-level toolbox tree.
  focusableChildElems.forEach((elem, index) =>
    aria.setState(elem, aria.State.POSINSET, index + 1),
  );
}
