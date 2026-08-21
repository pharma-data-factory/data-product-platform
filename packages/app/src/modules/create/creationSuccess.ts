export interface CreationSuccessLink {
  title: string;
  url?: string;
  entityRef?: string;
}

export interface CreationSuccessInput {
  productName?: string;
  links?: CreationSuccessLink[];
  remoteUrl?: string;
}

export interface CreationSuccessAction {
  id: string;
  label: string;
  to: string;
}

export function creationSuccessActions(
  input: CreationSuccessInput,
): {
  productName: string;
  repository?: string;
  actions: CreationSuccessAction[];
} {
  const productName = (input.productName ?? '').trim();
  const repoFromLinks = input.links?.find(
    link =>
      Boolean(link.url) &&
      (/repo/i.test(link.title) || /github\.com/i.test(link.url ?? '')),
  )?.url;
  const repository = input.remoteUrl || repoFromLinks;
  const entityRef = input.links?.find(link => link.entityRef)?.entityRef;
  const nameFromRef = entityRef?.split('/').pop();
  const name = productName || nameFromRef || '';

  const actions: CreationSuccessAction[] = [];
  if (name) {
    actions.push({
      id: 'product',
      label: 'View Data Product',
      to: `/data-products/${name}`,
    });
  }
  if (repository) {
    actions.push({
      id: 'repository',
      label: 'Open Repository',
      to: repository,
    });
    actions.push({
      id: 'ci',
      label: 'View CI Pipeline',
      to: `${repository.replace(/\.git$/, '')}/actions`,
    });
  }
  if (name) {
    actions.push({
      id: 'docs',
      label: 'Open Documentation',
      to: `/docs/default/component/${name}`,
    });
    actions.push({
      id: 'contract',
      label: 'View Data Contract',
      to: `/data-products/${name}#contract`,
    });
  }

  return { productName: name, repository, actions };
}
