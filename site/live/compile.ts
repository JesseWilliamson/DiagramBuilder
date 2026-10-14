/**
 * Turn a demo's source text into a React component, in the browser.
 *
 * sucrase strips the TypeScript, turns JSX into jsx() calls and turns
 * `import { x } from 'dsviz'` into `const { x } = require('dsviz')`. We then
 * run the result with a tiny `require` that hands back the real modules. So
 * the code you edit is exactly the code an app would write, imports and all.
 */
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { transform } from 'sucrase';
import * as dsviz from 'dsviz';
import * as dsvizReact from 'dsviz/react';

const modules: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  dsviz,
  'dsviz/react': dsvizReact,
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
