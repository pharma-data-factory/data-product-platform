/**
 * Ensures @internal workspace packages are resolvable from plugin folders.
 * Webpack/Rspack on Windows+OneDrive sometimes fails to walk up to the root
 * node_modules for newly added workspace packages.
 *
 * Skipped in production (NODE_ENV=production) because the Docker image uses
 * `yarn workspaces focus --all --production` which does not require these
 * dev-time symlinks — the monorepo workspace resolution works differently in
 * the production bundle context.
 */
if (process.env.NODE_ENV === 'production') {
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const links = [
  {
    target: path.join(root, 'packages', 'data-product-consumption'),
    link: path.join(
      root,
      'plugins',
      'data-products',
      'node_modules',
      '@internal',
      'data-product-consumption',
    ),
  },
  {
    target: path.join(root, 'packages', 'data-product-consumption'),
    link: path.join(
      root,
      'plugins',
      'data-products-backend',
      'node_modules',
      '@internal',
      'data-product-consumption',
    ),
  },
  {
    target: path.join(root, 'packages', 'data-product-consumption'),
    link: path.join(
      root,
      'packages',
      'app',
      'node_modules',
      '@internal',
      'data-product-consumption',
    ),
  },
];

function ensureLink({ target, link }) {
  if (!fs.existsSync(target)) {
    console.warn(`[link-internal] skip missing target ${target}`);
    return;
  }
  fs.mkdirSync(path.dirname(link), { recursive: true });
  try {
    if (fs.existsSync(link)) {
      const st = fs.lstatSync(link);
      if (st.isSymbolicLink() || st.isDirectory()) {
        fs.rmSync(link, { recursive: true, force: true });
      }
    }
  } catch {
    // continue
  }
  try {
    fs.symlinkSync(target, link, 'junction');
    console.log(`[link-internal] ${link} -> ${target}`);
  } catch (err) {
    console.warn(`[link-internal] failed ${link}: ${err.message}`);
  }
}

for (const item of links) {
  ensureLink(item);
}
