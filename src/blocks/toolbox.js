/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const toolbox = {
  'kind': 'flyoutToolbox',
  'contents': [
    {
      kind: 'block',
      type: 'p5_background_color',
      inputs: {
        COLOR: {
          shadow: {
            type: 'colour_picker',
          },
        },
      },
    },
    {
      kind: 'block',
      type: 'colour_random',
    },
    {
      kind: 'block',
      type: 'draw_emoji',
    },
    {
      kind: 'block',
      type: 'simple_circle',
      inputs: {
        COLOR: {
          shadow: {
            type: 'colour_picker',
          },
        },
      },
    },
  ],
};
