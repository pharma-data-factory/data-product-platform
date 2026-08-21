export function contractApiEntityName(
  productName: string,
  logicalContract: string,
): string {
  return `${productName}--${logicalContract}`;
}

export function parseContractApiEntityName(entityName: string): {
  productName?: string;
  contract: string;
} {
  const separator = entityName.lastIndexOf('--');
  if (separator <= 0) {
    return { contract: entityName };
  }
  return {
    productName: entityName.slice(0, separator),
    contract: entityName.slice(separator + 2),
  };
}

export function logicalContractName(
  entityName: string,
  annotation?: string,
): string {
  if (annotation) {
    return annotation;
  }
  return parseContractApiEntityName(entityName).contract;
}
