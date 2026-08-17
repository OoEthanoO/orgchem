/**
 * Lets the test scripts import the app's TypeScript modules directly under
 * `node --experimental-strip-types`, which otherwise cannot resolve Next.js
 * style extensionless imports or the `server-only` marker package.
 *
 * Registered with: node --import ./scripts/loader.mjs script.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let typescript;

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

  // Distribution builds of Node are routinely compiled without the type
  // stripper (`process.features.typescript` is then false), which fails every
  // import of a `.ts` file. The project already depends on TypeScript, so
  // transpiling here keeps the suites runnable on those builds.
  load(url, context, nextLoad) {
    if (process.features.typescript || !url.startsWith("file:") || !url.endsWith(".ts")) {
      return nextLoad(url, context);
    }
    typescript ??= require("typescript");
    const fileName = fileURLToPath(url);
    const { outputText } = typescript.transpileModule(readFileSync(fileName, "utf8"), {
      fileName,
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.ESNext,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});
