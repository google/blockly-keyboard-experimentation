/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

const sunnyDay = {
  'blocks': {
    'languageVersion': 0,
    'blocks': [
      {
        'type': 'p5_setup',
        'id': '5.{;T}3Qv}Awi:1M$:ut',
        'x': 0,
        'y': 75,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'p5_canvas',
              'id': 'spya_H-5F=K8+DhedX$y',
              'deletable': false,
              'movable': false,
              'fields': {
                'WIDTH': 400,
                'HEIGHT': 400,
              },
              'next': {
                'block': {
                  'type': 'p5_background_color',
                  'id': 'i/Hvi~^DYffkN/WpT_Ck',
                  'inputs': {
                    'COLOR': {
                      'shadow': {
                        'type': 'colour_picker',
                        'id': 'B:zpi7kg+.GF_Dutd9GL',
                        'fields': {
                          'COLOUR': '#9999ff',
                        },
                      },
                    },
                  },
                  'next': {
                    'block': {
                      'type': 'p5_stroke',
                      'id': 'I}RN|0g#W,(kh2Cx}9)Z',
                      'inputs': {
                        'COLOR': {
                          'shadow': {
                            'type': 'colour_picker',
                            'id': '`i.j^X!DV:9;]X5[6Lq/',
                            'fields': {
                              'COLOUR': '#ffff00',
                            },
                          },
                        },
                      },
                      'next': {
                        'block': {
                          'type': 'p5_fill',
                          'id': 'JlM!Jyw@s5J5/?9fs8Wi',
                          'inputs': {
                            'COLOR': {
                              'shadow': {
                                'type': 'colour_picker',
                                'id': '^a`BlAD,AV]iN^Qvck~E',
                                'fields': {
                                  'COLOUR': '#ffff00',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        'type': 'p5_draw',
        'id': '3iI4f%2#Gmk}=OjI7(8h',
        'x': 0,
        'y': 332,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'p5_ellipse',
              'id': '_}!@OHwjAb,2Gi8nT0}L',
              'inline': true,
              'inputs': {
                'X': {
                  'shadow': {
                    'type': 'math_number',
                    'id': '_0MCsD2LK%j.$YOf3#R/',
                    'fields': {
                      'NUM': 100,
                    },
                  },
                },
                'Y': {
                  'shadow': {
                    'type': 'math_number',
                    'id': 'gq(POne}j:hVw%C3t{vx',
                    'fields': {
                      'NUM': 100,
                    },
                  },
                },
                'WIDTH': {
                  'shadow': {
                    'type': 'math_number',
                    'id': '3RP[-C^1|8zA.^]81M0m',
                    'fields': {
                      'NUM': 50,
                    },
                  },
                },
                'HEIGHT': {
                  'shadow': {
                    'type': 'math_number',
                    'id': '8kKn|lOU8xckQ+#+Q7=~',
                    'fields': {
                      'NUM': 50,
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};

const blankCanvas = {
  'blocks': {
    'languageVersion': 0,
    'blocks': [
      {
        'type': 'p5_setup',
        'id': '5.{;T}3Qv}Awi:1M$:ut',
        'x': 0,
        'y': 75,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'p5_canvas',
              'id': 'spya_H-5F=K8+DhedX$y',
              'deletable': false,
              'movable': false,
              'fields': {
                'WIDTH': 400,
                'HEIGHT': 400,
              },
            },
          },
        },
      },
      {
        'type': 'p5_draw',
        'id': '3iI4f%2#Gmk}=OjI7(8h',
        'x': 0,
        'y': 332,
        'deletable': false,
      },
    ],
  },
};

const simpleCircle = {
  'blocks': {
    'languageVersion': 0,
    'blocks': [
      {
        'type': 'p5_setup',
        'id': '5.{;T}3Qv}Awi:1M$:ut',
        'x': 0,
        'y': 75,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'p5_canvas',
              'id': 'spya_H-5F=K8+DhedX$y',
              'deletable': false,
              'movable': false,
              'fields': {
                'WIDTH': 400,
                'HEIGHT': 400,
              },
              'next': {
                'block': {
                  'type': 'p5_background_color',
                  'id': 'i/Hvi~^DYffkN/WpT_Ck',
                  'inputs': {
                    'COLOR': {
                      'shadow': {
                        'type': 'colour_picker',
                        'id': 'B:zpi7kg+.GF_Dutd9GL',
                        'fields': {
                          'COLOUR': '#9999ff',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        'type': 'p5_draw',
        'id': '3iI4f%2#Gmk}=OjI7(8h',
        'x': 0,
        'y': 332,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'simple_circle',
              'id': 'draw_circle_1',
              'inline': true,
              'inputs': {
                'COLOR': {
                  'shadow': {
                    'type': 'colour_picker',
                    'id': 'gq(POne}j:hVw%C3t{vx',
                    'fields': {
                      'COLOUR': '#ffff00',
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};

const moreBlocks = {
  'blocks': {
    'languageVersion': 0,
    'blocks': [
      {
        'type': 'p5_setup',
        'id': '5.{;T}3Qv}Awi:1M$:ut',
        'x': 0,
        'y': 75,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'p5_canvas',
              'id': 'spya_H-5F=K8+DhedX$y',
              'deletable': false,
              'movable': false,
              'fields': {
                'WIDTH': 400,
                'HEIGHT': 400,
              },
              'next': {
                'block': {
                  'type': 'p5_background_color',
                  'id': 'i/Hvi~^DYffkN/WpT_Ck',
                  'inputs': {
                    'COLOR': {
                      'shadow': {
                        'type': 'colour_picker',
                        'id': 'B:zpi7kg+.GF_Dutd9GL',
                        'fields': {
                          'COLOUR': '#9999ff',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        'type': 'p5_draw',
        'id': '3iI4f%2#Gmk}=OjI7(8h',
        'x': 0,
        'y': 332,
        'deletable': false,
        'inputs': {
          'STATEMENTS': {
            'block': {
              'type': 'simple_circle',
              'id': 'draw_circle_1',
              'inline': true,
              'inputs': {
                'COLOR': {
                  'shadow': {
                    'type': 'colour_picker',
                    'id': 'gq(POne}j:hVw%C3t{vx',
                    'fields': {
                      'COLOUR': '#ffff00',
                    },
                  },
                },
              },
              'next': {
                'block': {
                  'type': 'text_print',
                  'id': 'J`*)bq?#`_Vq^X(DQF2t',
                  'inputs': {
                    'TEXT': {
                      'shadow': {
                        'type': 'text',
                        'id': '6fW_sIt1t|63j}nPE1ge',
                        'fields': {
                          'TEXT': 'abc',
                        },
                      },
                    },
                  },
                  'next': {
                    'block': {
                      'type': 'controls_if',
                      'id': ',rP|uDy,esfrOeQrk64u',
                      'inputs': {
                        'IF0': {
                          'block': {
                            'type': 'logic_negate',
                            'id': '8iH/,SwwTfk7iR;~m^s[',
                          },
                        },
                        'DO0': {
                          'block': {
                            'type': 'text_print',
                            'id': 'uSxT~QT8p%D2o)b~)Dki',
                            'inputs': {
                              'TEXT': {
                                'shadow': {
                                  'type': 'text',
                                  'id': 'j|)#Di2,(L^TK)iLI3LC',
                                  'fields': {
                                    'TEXT': 'abc',
                                  },
                                },
                                'block': {
                                  'type': 'math_arithmetic',
                                  'id': 'mRTJ4D+(mjBnUy8c4KaT',
                                  'fields': {
                                    'OP': 'ADD',
                                  },
                                  'inputs': {
                                    'A': {
                                      'shadow': {
                                        'type': 'math_number',
                                        'id': 'hxGO;t4bA9$.~|E6Gy~H',
                                        'fields': {
                                          'NUM': 1,
                                        },
                                      },
                                    },
                                    'B': {
                                      'shadow': {
                                        'type': 'math_number',
                                        'id': 'P,$Lqn5{mFE?R)#~v|/V',
                                        'fields': {
                                          'NUM': 1,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      'next': {
                        'block': {
                          'type': 'text_print',
                          'id': '-bTQ2YVSuBS/SYn[C^LX',
                          'inputs': {
                            'TEXT': {
                              'shadow': {
                                'type': 'text',
                                'id': 'cy+0[WR6]O(x%Q;~c*0f',
                                'fields': {
                                  'TEXT': 'abc',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
};

/**
 * Loads saved state from local storage into the given workspace.
 * @param {Blockly.Workspace} workspace Blockly workspace to load into.
 * @param {string} scenarioString Which scenario to load.
 */
export const load = function (workspace, scenarioString) {
  const scenarioMap = {
    'blank': blankCanvas,
    'sun': sunnyDay,
    'simpleCircle': simpleCircle,
    'moreBlocks': moreBlocks,
  };

  const data = JSON.stringify(scenarioMap[scenarioString]);
  // Don't emit events during loading.
  Blockly.Events.disable();
  Blockly.serialization.workspaces.load(JSON.parse(data), workspace, false);
  Blockly.Events.enable();
};
