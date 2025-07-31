import * as Blockly from 'blockly/core';
import * as aria from './aria';

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
};
