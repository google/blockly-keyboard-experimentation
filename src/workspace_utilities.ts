/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

/**
 * Scrolls the provided bounds into view.
 *
 * In the case of small workspaces/large bounds, this function prioritizes
 * getting the top left corner of the bounds into view. It also adds some
 * padding around the bounds to allow the element to be comfortably in view.
 *
 * @param bounds A rectangle to scroll into view, as best as possible.
 * @param workspace The workspace to scroll the given bounds into view in.
 */
export function scrollBoundsIntoView(
  bounds: Blockly.utils.Rect,
  workspace: Blockly.WorkspaceSvg,
) {
  if (Blockly.Gesture.inProgress()) {
    // This can cause jumps during a drag and it only suited for keyboard nav.
    return;
  }
  const scale = workspace.getScale();

  const rawViewport = workspace.getMetricsManager().getViewMetrics(true);
  const viewport = new Blockly.utils.Rect(
    rawViewport.top,
    rawViewport.top + rawViewport.height,
    rawViewport.left,
    rawViewport.left + rawViewport.width,
  );

  if (
    bounds.left >= viewport.left &&
    bounds.top >= viewport.top &&
    bounds.right <= viewport.right &&
    bounds.bottom <= viewport.bottom
  ) {
    // Do nothing if the block is fully inside the viewport.
    return;
  }

  // Add some padding to the bounds so the element is scrolled comfortably
  // into view.
  bounds = bounds.clone();
  bounds.top -= 10;
  bounds.bottom += 10;
  bounds.left -= 10;
  bounds.right += 10;

  let deltaX = 0;
  let deltaY = 0;

  if (bounds.left < viewport.left) {
    deltaX = viewport.left - bounds.left;
  } else if (bounds.right > viewport.right) {
    deltaX = viewport.right - bounds.right;
  }

  if (bounds.top < viewport.top) {
    deltaY = viewport.top - bounds.top;
  } else if (bounds.bottom > viewport.bottom) {
    deltaY = viewport.bottom - bounds.bottom;
  }

  deltaX *= scale;
  deltaY *= scale;
  workspace.scroll(workspace.scrollX + deltaX, workspace.scrollY + deltaY);
}

/**
 * Get the workspace SVG group which is the element that takes focus.
 *
 * @param workspace The workspace.
 * @returns The element.
 */
export function getWorkspaceElement(workspace: Blockly.Workspace): SVGElement {
  return (workspace as Blockly.WorkspaceSvg).getSvgGroup() as SVGElement;
}

/**
 * Get the toolbox element that takes the focus (if any).
 *
 * @param workspace The workspace.
 * @returns The element or null if a toolbox is not in use.
 */
export function getToolboxElement(
  workspace: Blockly.WorkspaceSvg,
): HTMLElement | null {
  const toolbox = workspace.getToolbox();
  if (toolbox instanceof Blockly.Toolbox) {
    return toolbox.HtmlDiv?.querySelector(
      '.blocklyToolboxCategoryGroup',
    ) as HTMLElement | null;
  }
  return null;
}

/**
 * Get the flyout element we focus.
 *
 * @param workspace The workspace.
 * @returns The element, or null if there is no flyout.
 */
export function getFlyoutElement(
  workspace: Blockly.WorkspaceSvg,
): SVGElement | null {
  const flyout = workspace.getFlyout();
  if (flyout != null && flyout instanceof Blockly.Flyout) {
    // This relies on internals.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((flyout as any).svgGroup_ as SVGElement) ?? null;
  }
  return null;
}
