import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SearchResultListItemBlueprint } from '@backstage/plugin-search-react/alpha';

const classifiedTechDocsSearchResultItem = SearchResultListItemBlueprint.make({
  name: 'classified-techdocs',
  params: {
    predicate: result => result.type === 'techdocs',
    component: async () => {
      const { ClassifiedTechDocsSearchResultListItem } = await import(
        './ClassifiedTechDocsSearchResultListItem'
      );
      return ClassifiedTechDocsSearchResultListItem;
    },
  },
});

export const searchModule = createFrontendModule({
  pluginId: 'search',
  extensions: [classifiedTechDocsSearchResultItem],
});
