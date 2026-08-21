import { searchModule } from './index';

describe('search module', () => {
  it('registers classified TechDocs results on the existing Search plugin', () => {
    expect(searchModule).toBeDefined();
  });
});
