import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import apiDocsPlugin from '@backstage/plugin-api-docs/alpha';
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
// Provides /settings, including the Appearance section that switches between
// the nexora-light and nexora-dark themes registered in modules/theme.
// Without it both themes are registered but unreachable from the UI.
import userSettingsModule from '@backstage/plugin-app-module-user-settings';
import dataProductsPlugin from '@internal/plugin-data-products';
import marketplacePlugin from '@internal/plugin-marketplace';
import { nexoraCommonPlugin } from '@internal/plugin-nexora-common';
import { nexoraAssetsPlugin } from '@internal/plugin-nexora-assets';
import { nexoraContractsPlugin } from '@internal/plugin-nexora-contracts';
import { nexoraQualityPlugin } from '@internal/plugin-nexora-quality';
import { validationExpertPlugin } from '@internal/plugin-validation-expert';
import { ursComposerPlugin } from '@internal/plugin-urs-composer';
import pluginDirectoryPlugin from '@internal/plugin-directory';
import { modelCompanyPlugin } from '@internal/plugin-model-company';
import { architectureModule } from './modules/architecture';
import { legalModule } from './modules/legal';
import { developerHubModule } from './modules/developer-hub';
import { platformComponentsModule } from './modules/platform-components';
import { composerModule } from './modules/composer';
import { productsModule } from './modules/products';
import { assetsModule } from './modules/assets';
import { releasesModule } from './modules/releases';
import { homeModule } from './modules/home';
import { buildModule } from './modules/build';
import { myProductsModule } from './modules/my-products';
import { validateModule } from './modules/validate';
import { adminModule } from './modules/admin';
import { searchModule } from './modules/search';
import { identityModule } from './modules/identity';
import { createModule } from './modules/create';
import { entitlementsModule } from './modules/entitlements';
import { navModule } from './modules/nav';
import { themeModule } from './modules/theme';

export default createApp({
  features: [
    catalogPlugin,
    apiDocsPlugin,
    githubActionsPlugin,
    themeModule,
    userSettingsModule,
    identityModule,
    architectureModule,
    legalModule,
    developerHubModule,
    platformComponentsModule,
    composerModule,
    productsModule,
    assetsModule,
    releasesModule,
    searchModule,
    homeModule,
    buildModule,
    myProductsModule,
    validateModule,
    adminModule,
    createModule,
    entitlementsModule,
    navModule,
    dataProductsPlugin,
    marketplacePlugin,
    nexoraCommonPlugin,
    nexoraAssetsPlugin,
    nexoraContractsPlugin,
    nexoraQualityPlugin,
    validationExpertPlugin,
    ursComposerPlugin,
    pluginDirectoryPlugin,
    modelCompanyPlugin,
  ],
});
