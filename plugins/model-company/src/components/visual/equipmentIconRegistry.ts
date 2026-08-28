import type { ComponentType, SVGProps } from 'react';
import {
  AssemblyIcon,
  CartonerIcon,
  CasePackerIcon,
  CheckweigherIcon,
  CompoundingIcon,
  FeederIcon,
  FillingIcon,
  GenericEquipmentIcon,
  LabelerIcon,
  PalletizerIcon,
  SerializationIcon,
  TestIcon,
  WarehouseIcon,
  resolveEquipmentIconKind,
  type EquipmentIconKind,
} from './equipmentIcons';

export type EquipmentIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { title?: string }
>;

/**
 * STATIC asset map only: canonical kind → SVG component.
 * Lookup path is always: equipment.type → resolveEquipmentIconKind → registry.
 * Never index this map by concrete equipment ids.
 */
export const equipmentIconRegistry: Record<
  EquipmentIconKind,
  EquipmentIconComponent
> = {
  compounding: CompoundingIcon,
  filling: FillingIcon,
  feeder: FeederIcon,
  assembly: AssemblyIcon,
  test: TestIcon,
  labeler: LabelerIcon,
  cartoner: CartonerIcon,
  checkweigher: CheckweigherIcon,
  serialization: SerializationIcon,
  'case-packer': CasePackerIcon,
  palletizer: PalletizerIcon,
  warehouse: WarehouseIcon,
  generic: GenericEquipmentIcon,
};

/** Resolve SVG from Factory-as-Code equipment.type (never id). */
export function getEquipmentIcon(
  equipmentType: string | undefined,
): EquipmentIconComponent {
  const kind = resolveEquipmentIconKind(equipmentType);
  return equipmentIconRegistry[kind] ?? GenericEquipmentIcon;
}

export { resolveEquipmentIconKind };
export type { EquipmentIconKind };
