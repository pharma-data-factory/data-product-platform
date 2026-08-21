import { Entity } from '@backstage/catalog-model';

import { parseGithubUrl, resolveGithubRepository } from './resolveRepository';

function entity(annotations: Record<string, string>, links?: Entity['metadata']['links']): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'cold-room-temperature',
      annotations,
      ...(links ? { links } : {}),
    },
    spec: {
      type: 'data-product',
    },
  };
}

describe('resolveGithubRepository', () => {
  it('prefers github.com/project-slug from the Catalog entity', () => {
    expect(
      resolveGithubRepository(
        entity({
          'github.com/project-slug': 'pharma-data-factory/cold-room-temperature',
          'backstage.io/source-location':
            'url:https://github.com/example/ignored',
        }),
      ),
    ).toEqual({
      host: 'github.com',
      owner: 'pharma-data-factory',
      repo: 'cold-room-temperature',
      url: 'https://github.com/pharma-data-factory/cold-room-temperature',
    });
  });

  it('uses backstage.io/source-location when project-slug is absent', () => {
    expect(
      resolveGithubRepository(
        entity({
          'backstage.io/source-location':
            'url:https://github.com/pharma-data-factory/cold-room-temperature/blob/main/catalog-info.yaml',
        }),
      ),
    ).toEqual({
      host: 'github.com',
      owner: 'pharma-data-factory',
      repo: 'cold-room-temperature',
      url: 'https://github.com/pharma-data-factory/cold-room-temperature',
    });
  });

  it('uses a Repository link as a last Catalog fallback', () => {
    expect(
      resolveGithubRepository(
        entity(
          {},
          [
            {
              title: 'Repository',
              url: 'https://github.com/pharma-data-factory/line-equipment-status',
            },
          ],
        ),
      ),
    ).toEqual({
      host: 'github.com',
      owner: 'pharma-data-factory',
      repo: 'line-equipment-status',
      url: 'https://github.com/pharma-data-factory/line-equipment-status',
    });
  });

  it('returns undefined when no GitHub repository metadata exists', () => {
    expect(resolveGithubRepository(entity({}))).toBeUndefined();
  });
});

describe('parseGithubUrl', () => {
  it('parses GitHub repository URLs', () => {
    expect(
      parseGithubUrl('https://github.com/pharma-data-factory/cold-room-temperature'),
    ).toMatchObject({
      owner: 'pharma-data-factory',
      repo: 'cold-room-temperature',
    });
  });

  it('rejects non-URLs', () => {
    expect(parseGithubUrl('not a url')).toBeUndefined();
  });
});
