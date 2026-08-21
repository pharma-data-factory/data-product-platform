export interface Config {
  commercial?: {
    /**
     * Commercial organization id for this Control Plane.
     * Catalog namespace remains `default`. Not multi-tenancy.
     * @visibility frontend
     */
    organizationId?: string;
    /**
     * Operating edition: internal | template | platform | saas
     * @visibility frontend
     */
    edition?: string;
    /**
     * Deployment environment: local | test-marketplace | production
     * @visibility frontend
     */
    environment?: 'local' | 'test-marketplace' | 'production';
    /**
     * Entitlement provider: local | aws
     * @visibility frontend
     */
    entitlementProvider?: 'local' | 'aws';
    /**
     * BLOCKED until counsel approves outbound Golden Path licenses.
     * APPROVED is an explicit operational override after legal review.
     */
    legalDistributionStatus?: 'BLOCKED' | 'APPROVED';
    localEntitlements?: { [organizationId: string]: string[] };
    awsMarketplace?: {
      /**
       * AWS region for Marketplace APIs. Server-side only.
       */
      region?: string;
      /**
       * Marketplace product code. Not a secret, but not a customer identifier.
       */
      productCode?: string;
      /**
       * Optional JSON file for approved/pending links. Server-side only.
       * Do not commit this file. Not a secret store for tokens.
       */
      linkStorePath?: string;
      /**
       * Verified Marketplace identity → organization mappings.
       * Server-side only. Never trust client-supplied organization ids.
       */
      organizationLinks?: Array<{
        organizationId: string;
        customerAwsAccountId?: string;
        licenseArn?: string;
        productCode?: string;
      }>;
    };
  };
}
