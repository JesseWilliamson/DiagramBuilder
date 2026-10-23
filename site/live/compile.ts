/**
 * Turn a demo's source text into a React component, in the browser.
 *
 * sucrase strips the TypeScript, turns JSX into jsx() calls and turns
 * `import { x } from '@figurae/core'` into `const { x } = require('@figurae/core')`. We then
 * run the result with a tiny `require` that hands back the real modules. So
 * the code you edit is exactly the code an app would write, imports and all.
 */
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { transform } from 'sucrase';
import * as core from '@figurae/core';
import * as layout from '@figurae/layout';
import * as ds from '@figurae/ds';
import * as plot from '@figurae/plot';
import * as prob from '@figurae/prob';
import * as geom from '@figurae/geom';
import * as os from '@figurae/os';
import * as arch from '@figurae/arch';
import * as uml from '@figurae/uml';
import * as git from '@figurae/git';
import * as figuraeReact from '@figurae/react';

const modules: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@figurae/core': core,
  '@figurae/layout': layout,
  '@figurae/ds': ds,
  '@figurae/plot': plot,
  '@figurae/prob': prob,
  '@figurae/geom': geom,
  '@figurae/os': os,
  '@figurae/arch': arch,
  '@figurae/uml': uml,
  '@figurae/git': git,
  '@figurae/react': figuraeReact,
};

export function compile(source: string): React.ComponentType {
  const { code } = transform(source, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    production: true,
  });
  const require = (name: string) => {
    if (!(name in modules)) throw new Error(`Only ${Object.keys(modules).join(', ')} can be imported here (got '${name}')`);
    return modules[name];
  };
  const exports: { default?: React.ComponentType } = {};
  new Function('require', 'exports', 'module', code)(require, exports, { exports });
  if (typeof exports.default !== 'function') throw new Error('The demo needs an `export default function …`');
  return exports.default;
}
