import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import dataProductsPlugin from '@internal/plugin-data-products';
import marketplacePlugin from '@internal/plugin-marketplace';
import { architectureModule } from './modules/architecture';
import { legalModule } from './modules/legal';
import { developerHubModule } from './modules/developer-hub';
import { platformComponentsModule } from './modules/platform-components';
import { composerModule } from './modules/composer';
import { assetsModule } from './modules/assets';
import { releasesModule } from './modules/releases';
import { homeModule } from './modules/home';
import { searchModule } from './modules/search';
import { identityModule } from './modules/identity';
import { createModule } from './modules/create';
import { entitlementsModule } from './modules/entitlements';
import { navModule } from './modules/nav';
import { themeModule } from './modules/theme';

export default createApp({
  features: [
    catalogPlugin,
    themeModule,
    identityModule,
    architectureModule,
    legalModule,
    developerHubModule,
    platformComponentsModule,
    composerModule,
    assetsModule,
    releasesModule,
    searchModule,
    homeModule,
    createModule,
    entitlementsModule,
    navModule,
    dataProductsPlugin,
    marketplacePlugin,
  ],
});
