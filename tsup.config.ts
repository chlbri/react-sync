import { glob } from 'glob';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'tsup';

export const DEFAULT_PATTERN = './src/**/*.ts';
export const name = '@bemedev/exclude-coverage';

export const buildInput = async (
  pattern: string | string[],
  ...ignore: string[]
) => {
  const arr = await glob(pattern, {
    ignore,
    cwd: process.cwd(),
  });
  const entries = arr.map(file =>
    // This expands the relative paths to absolute paths, so e.g.
    // src/nested/foo becomes /project/src/nested/foo.js
    path.resolve(process.cwd(), file),
  );
  // const input = Object.fromEntries(entries);

  return entries;
};

const entry = await buildInput(DEFAULT_PATTERN, '**/tests/**/*');

type Plugin = Exclude<
  Exclude<
    Parameters<typeof defineConfig>[0],
    // eslint-disable-next-line @typescript-eslint/ban-types
    Function | Array<any>
  >['plugins'],
  undefined
>[number];

const plugin = () => {
  const out: Plugin = {
    name: '@bemedev/remove-empty-chunks',

    async buildEnd({ writtenFiles }) {
      const files = writtenFiles
        .map(({ name, size }) => ({
          name,
          size,
        }))
        .filter(({ name, size }) => {
          return name.endsWith('js.map') && size === 51;
        })
        .map(({ name }) => {
          const map = name.replace('.map', '');
          const out = [
            () => rm(path.resolve(process.cwd(), name), { force: true }),
            () => rm(path.resolve(process.cwd(), map), { force: true }),
          ] as const;

          return out;
        })
        .flat(1);

      const promises = () => files.map(fn => fn());
      await Promise.all(promises());
    },
  };
  return out;
};
export default defineConfig({
  // The file we created above that will be the entrypoint to the library.
  entry,
  outDir: 'lib',
  splitting: true,
  plugins: [plugin()],

  // external: ['glob'],
  target: 'esnext',

  // Enable TypeScript type definitions to be generated in the output.
  // This provides type-definitions to consumers.
  dts: {},
  format: ['esm', 'cjs'],
  noExternal: ['glob'],
  bundle: false,
  treeshake: true,
  skipNodeModulesBundle: true,
  clean: true,
  minify: true,

  // Sourcemaps for easier debugging.
  sourcemap: true,
  onSuccess: async () => {
    // await rm('./lib/types.js', { force: true });
    // await rm('./lib/types.cjs', { force: true });
  },
});
