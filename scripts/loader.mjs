/**
 * Lets the test scripts import the app's TypeScript modules directly under
 * `node --experimental-strip-types`, which otherwise cannot resolve Next.js
 * style extensionless imports or the `server-only` marker package.
 *
 * Registered with: node --import ./scripts/loader.mjs script.mjs
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    // `server-only` exists to fail a client-side build; tests are neither.
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    // Next.js resolves extensionless relative imports; plain Node does not.
    if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // Fall through to the specifier as written.
      }
    }
    return nextResolve(specifier, context);
  },
});
