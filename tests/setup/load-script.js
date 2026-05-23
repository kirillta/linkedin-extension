/**
 * Load a vanilla-JS source file into the current global scope.
 *
 * Source files declare classes and functions directly on globalThis (no
 * exports). This helper reads the file and executes it in the current context
 * so that e.g. `new RoleHighlighter()` works after loadScript('role-highlighter.js').
 *
 * Usage (at the top of a test file, outside describe blocks):
 *   import { loadScript } from '../setup/load-script.js';
 *   loadScript('role-highlighter.js');
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');

export function loadScript(filename) {
  const code = readFileSync(resolve(ROOT, filename), 'utf-8');
  // runInThisContext executes in the current VM context, meaning class/const/function
  // declarations become visible on globalThis just like a <script> tag in a browser.
  vm.runInThisContext(code);
}
