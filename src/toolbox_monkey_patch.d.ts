/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Installs a Toolbox-specific monkey-patch. Note that this must be installed
 * before any Toolboxes are registered for key bindings.
 */
export declare function install(): void;

/** Uninstalls the Toolbox-specific monkey-patch. */
export declare function uninstall(): void;
