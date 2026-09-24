import { NEXORA_CARD, NEXORA_GREY, NEXORA_TONE } from '@internal/plugin-nexora-common';
import { Box, Chip, Typography } from '@material-ui/core';
import { contractRef } from '@internal/platform-common';
import type {
  DataContract,
  ProductComponent,
  ProductDependency,
} from '@internal/platform-common';

/** The contracts one component of the selected version provides. */
export interface ProvidedContracts {
  component: ProductComponent;
  contracts: DataContract[];
}

/**
 * One declared dependency, with the contract it names resolved.
 *
 * `contract` is absent when the id resolves to nothing — a contract that was
 * removed after the dependency was declared. That reads as a broken reference,
 * which is what it is; it must not read as "no dependency".
 */
export interface ConsumedContract {
  dependency: ProductDependency;
  contract?: DataContract;
}

interface ContractsTabProps {
  providedContracts: ProvidedContracts[] | null;
  consumedContracts: ConsumedContract[] | null;
  error: string | null;
}

const CARD_STYLE = {
  border: `1px solid ${NEXORA_GREY[200]}`,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
};

function ContractRow({ contract }: { contract: DataContract }) {
  return (
    <section style={CARD_STYLE}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">
          {contractRef({
            namespace: contract.namespace,
            name: contract.name,
            version: contract.version,
          })}
        </Typography>
        <Box style={{ display: 'flex', gap: 8 }}>
          <Chip size="small" variant="outlined" label={contract.schemaType} />
          <Chip
            size="small"
            label={contract.status}
            style={{
              backgroundColor:
                contract.status === 'ACTIVE'
                  ? NEXORA_TONE.success.bg
                  : NEXORA_TONE.neutral.text,
              color: NEXORA_CARD,
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>
      <Typography variant="body2" color="textSecondary">
        {/*
          Exchange is optional on the model and required at the release gate
          (Phase 4, Slice 2), so "declared / not declared" is the honest
          reading. Naming the mechanism is more useful than repeating "yes".
        */}
        {contract.exchange
          ? `Exchange: ${contract.exchange.deliveryMechanism}${
              contract.exchange.accessMode
                ? ` · ${contract.exchange.accessMode}`
                : ''
            }`
          : 'No exchange definition — the release gate requires one'}
        {' · '}
        {contract.qualityRules.length} quality rule
        {contract.qualityRules.length === 1 ? '' : 's'}
        {contract.owner ? ` · owned by ${contract.owner}` : ''}
      </Typography>
    </section>
  );
}

export function ContractsTab({
  providedContracts,
  consumedContracts,
  error,
}: ContractsTabProps) {
  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }

  if (providedContracts === null || consumedContracts === null) {
    return (
      <Typography variant="body2" color="textSecondary">
        Loading contracts…
      </Typography>
    );
  }

  const withContracts = providedContracts.filter(
    entry => entry.contracts.length > 0,
  );

  return (
    <>
      <section>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Provided
        </Typography>
        {withContracts.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            {providedContracts.length === 0
              ? 'No components on this version, so nothing can declare a contract yet.'
              : 'No component of this version declares a data contract.'}
          </Typography>
        ) : (
          withContracts.map(entry => (
            <Box key={entry.component.id} marginBottom={2}>
              <Typography variant="subtitle2" color="textSecondary">
                {entry.component.name}
              </Typography>
              {entry.contracts.map(contract => (
                <ContractRow key={contract.id} contract={contract} />
              ))}
            </Box>
          ))
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Consumed
        </Typography>
        {consumedContracts.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            This version declares no dependency on another product's contract.
          </Typography>
        ) : (
          consumedContracts.map(({ dependency, contract }) =>
            contract ? (
              <Box key={dependency.id}>
                <ContractRow contract={contract} />
                {dependency.description && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    {dependency.description}
                  </Typography>
                )}
              </Box>
            ) : (
              <section key={dependency.id} style={CARD_STYLE}>
                <Typography variant="subtitle1">
                  {dependency.contractId}
                </Typography>
                <Typography variant="body2" style={{ color: NEXORA_TONE.danger.text }}>
                  This contract could not be resolved. The dependency names a
                  contract that no longer exists.
                </Typography>
              </section>
            ),
          )
        )}
      </section>
    </>
  );
}
