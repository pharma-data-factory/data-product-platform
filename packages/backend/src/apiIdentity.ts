export function contractApiEntityName(
  productName: string,
  logicalContract: string,
): string {
  return `${productName}--${logicalContract}`;
}
