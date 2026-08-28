import { ReactNode, SVGProps } from 'react';
import { NX } from './styles';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

const base = {
  width: 56,
  height: 40,
  viewBox: '0 0 56 40',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

function frame(props: IconProps, body: ReactNode) {
  const { title, ...rest } = props;
  return (
    <svg
      {...base}
      {...rest}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="4" width="54" height="32" rx="4" fill={NX.base} stroke={NX.border} />
      {body}
    </svg>
  );
}

/** Mixing vessel with agitator — compounding / blend tank. */
export function CompoundingIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* vessel body */}
      <path
        d="M18 14h20v10c0 5-4.5 8-10 8s-10-3-10-8V14z"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* lid + motor */}
      <path d="M16 14h24" stroke={NX.navy} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="24" y="8" width="8" height="6" rx="1" stroke={NX.teal} strokeWidth="1.4" />
      {/* agitator shaft + blades */}
      <path d="M28 14v12" stroke={NX.teal} strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M22 22h12M24 26h8"
        stroke={NX.teal}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Fill nozzle over vials on a short conveyor. */
export function FillingIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* machine head / manifold */}
      <rect x="14" y="9" width="28" height="7" rx="1.5" stroke={NX.navy} strokeWidth="1.5" />
      {/* fill nozzles */}
      <path
        d="M20 16v4M28 16v4M36 16v4"
        stroke={NX.teal}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* vials */}
      <rect x="17" y="21" width="6" height="8" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      <rect x="25" y="21" width="6" height="8" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      <rect x="33" y="21" width="6" height="8" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      {/* conveyor */}
      <path d="M12 30h32" stroke={NX.teal} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="30" r="1.5" fill={NX.teal} />
      <circle cx="40" cy="30" r="1.5" fill={NX.teal} />
    </>,
  );
}

/** Vibratory / bowl feeder hopper feeding parts onto a track. */
export function FeederIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* hopper */}
      <path
        d="M18 10h14l4 10H14l4-10z"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ellipse cx="25" cy="10" rx="7" ry="2.5" stroke={NX.navy} strokeWidth="1.3" />
      {/* feed track */}
      <path
        d="M32 20h10v8H14v-4"
        stroke={NX.navy}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* parts on track */}
      <circle cx="20" cy="26" r="2" fill={NX.teal} />
      <circle cx="28" cy="26" r="2" fill={NX.teal} />
      <circle cx="36" cy="26" r="2" stroke={NX.teal} strokeWidth="1.2" />
    </>,
  );
}

/** Assembly press joining two device halves. */
export function AssemblyIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* press frame */}
      <path
        d="M14 10h28v4H14zM16 14v16M40 14v16"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* ram */}
      <rect x="22" y="14" width="12" height="5" rx="1" stroke={NX.teal} strokeWidth="1.4" />
      <path d="M28 19v4" stroke={NX.teal} strokeWidth="1.4" strokeLinecap="round" />
      {/* left / right workpiece halves */}
      <rect x="18" y="24" width="8" height="6" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      <rect x="30" y="24" width="8" height="6" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      <path d="M26 27h4" stroke={NX.teal} strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}

/** Functional tester: fixture with probe over a device under test. */
export function TestIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* test head / gantry */}
      <path d="M12 12h32" stroke={NX.navy} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="22" y="9" width="12" height="5" rx="1" stroke={NX.navy} strokeWidth="1.4" />
      {/* probe */}
      <path d="M28 14v6" stroke={NX.teal} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28" cy="21" r="2" fill={NX.teal} />
      {/* DUT on fixture pad */}
      <rect x="18" y="24" width="20" height="7" rx="1.5" stroke={NX.navy} strokeWidth="1.5" />
      <path
        d="M22 27h4M30 27h4"
        stroke={NX.teal}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Labeler: label reel + applicator arm + bottle. */
export function LabelerIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* label reel */}
      <circle cx="16" cy="18" r="7" stroke={NX.navy} strokeWidth="1.5" />
      <circle cx="16" cy="18" r="2.5" stroke={NX.teal} strokeWidth="1.3" />
      {/* web path to applicator */}
      <path
        d="M23 15h10l2 4"
        stroke={NX.teal}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* applicator pad */}
      <rect x="30" y="17" width="6" height="5" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      {/* bottle / container */}
      <rect x="38" y="16" width="8" height="12" rx="1.5" stroke={NX.navy} strokeWidth="1.4" />
      <path d="M40 16V13h4v3" stroke={NX.navy} strokeWidth="1.3" strokeLinejoin="round" />
      {/* conveyor */}
      <path d="M12 30h34" stroke={NX.teal} strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}

/** Cartoner: open carton blank being erected on a machine bed. */
export function CartonerIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* machine bed */}
      <path d="M10 30h36" stroke={NX.navy} strokeWidth="1.4" strokeLinecap="round" />
      {/* erected carton (3D-ish box) */}
      <path
        d="M18 26V14l10-4 10 4v12l-10 4-10-4z"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M18 14l10 4 10-4M28 18v12" stroke={NX.navy} strokeWidth="1.3" />
      {/* tuck flap / leaflet hint */}
      <path
        d="M22 20h6M22 23h8"
        stroke={NX.teal}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Checkweigher: infeed/outfeed conveyor with scale pan and indicator. */
export function CheckweigherIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* infeed / outfeed belts */}
      <path
        d="M8 26h12M36 26h12"
        stroke={NX.navy}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="10" cy="26" r="1.4" fill={NX.navy} />
      <circle cx="46" cy="26" r="1.4" fill={NX.navy} />
      {/* weighing platform */}
      <rect x="18" y="22" width="20" height="8" rx="1.5" stroke={NX.navy} strokeWidth="1.5" />
      {/* load cell / stem */}
      <path d="M28 22v-4" stroke={NX.teal} strokeWidth="1.5" strokeLinecap="round" />
      {/* scale pan / product */}
      <ellipse cx="28" cy="16" rx="8" ry="3" stroke={NX.teal} strokeWidth="1.4" />
      {/* digital indicator */}
      <rect x="38" y="10" width="10" height="7" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      <path d="M40 13.5h6" stroke={NX.teal} strokeWidth="1.2" strokeLinecap="round" />
    </>,
  );
}

/** Serialization: camera over coded pack with barcode-like marks. */
export function SerializationIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* vision / print head */}
      <rect x="20" y="8" width="16" height="6" rx="1.5" stroke={NX.navy} strokeWidth="1.5" />
      <circle cx="28" cy="11" r="2" fill={NX.teal} />
      <path d="M28 14v3" stroke={NX.teal} strokeWidth="1.3" strokeLinecap="round" />
      {/* pack / carton */}
      <rect x="16" y="18" width="24" height="12" rx="1.5" stroke={NX.navy} strokeWidth="1.5" />
      {/* 2D code block */}
      <rect x="19" y="21" width="7" height="7" stroke={NX.teal} strokeWidth="1.2" />
      <path
        d="M20.5 23h4M20.5 25h2M22.5 25h2"
        stroke={NX.teal}
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* linear barcode */}
      <path
        d="M29 22v6M31 22v6M32.5 22v6M34.5 22v6M36 22v6"
        stroke={NX.navy}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Case packer: open shipping case with product units inside. */
export function CasePackerIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* open case (U-shape walls) */}
      <path
        d="M12 12v18h32V12"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12l4-3h24l4 3" stroke={NX.navy} strokeWidth="1.4" strokeLinejoin="round" />
      {/* packed units */}
      <rect x="16" y="16" width="8" height="10" rx="1" stroke={NX.teal} strokeWidth="1.3" />
      <rect x="26" y="16" width="8" height="10" rx="1" stroke={NX.teal} strokeWidth="1.3" />
      <rect x="36" y="16" width="5" height="10" rx="1" stroke={NX.teal} strokeWidth="1.3" />
      {/* flap crease */}
      <path d="M16 28h24" stroke={NX.navy} strokeWidth="1.2" strokeLinecap="round" />
    </>,
  );
}

/** Palletizer: stacked layers on a pallet with layer-place hint. */
export function PalletizerIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* pallet base */}
      <path
        d="M10 30h36M12 30v2h8M24 30v2h8M36 30v2h8"
        stroke={NX.navy}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* stack layers */}
      <rect x="14" y="22" width="28" height="7" rx="1" stroke={NX.navy} strokeWidth="1.4" />
      <rect x="16" y="15" width="24" height="6" rx="1" stroke={NX.navy} strokeWidth="1.3" />
      {/* incoming case on gripper */}
      <rect x="20" y="8" width="10" height="5" rx="1" stroke={NX.teal} strokeWidth="1.3" />
      <path d="M25 8V6M22 6h6" stroke={NX.teal} strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}

/** Warehouse: rack bay with shelf levels and staged goods. */
export function WarehouseIcon(props: IconProps) {
  return frame(
    props,
    <>
      {/* rack uprights */}
      <path
        d="M12 10v20M44 10v20"
        stroke={NX.navy}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* shelves */}
      <path
        d="M12 14h32M12 22h32M12 30h32"
        stroke={NX.navy}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* goods on shelves */}
      <rect x="16" y="16" width="10" height="5" rx="0.5" stroke={NX.teal} strokeWidth="1.2" />
      <rect x="30" y="16" width="10" height="5" rx="0.5" stroke={NX.teal} strokeWidth="1.2" />
      <rect x="18" y="24" width="20" height="5" rx="0.5" stroke={NX.teal} strokeWidth="1.2" />
    </>,
  );
}

/** Generic process machine: cabinet + short conveyor. */
export function GenericEquipmentIcon(props: IconProps) {
  return frame(
    props,
    <>
      <rect x="14" y="10" width="28" height="16" rx="2" stroke={NX.navy} strokeWidth="1.5" />
      <rect x="18" y="13" width="8" height="5" rx="1" stroke={NX.teal} strokeWidth="1.2" />
      <circle cx="36" cy="15.5" r="2" fill={NX.teal} />
      <path d="M12 30h32" stroke={NX.navy} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="30" r="1.5" fill={NX.navy} />
      <circle cx="40" cy="30" r="1.5" fill={NX.navy} />
      <path d="M22 26v4M34 26v4" stroke={NX.navy} strokeWidth="1.2" />
    </>,
  );
}

export type EquipmentIconKind =
  | 'compounding'
  | 'filling'
  | 'feeder'
  | 'assembly'
  | 'test'
  | 'labeler'
  | 'cartoner'
  | 'checkweigher'
  | 'serialization'
  | 'case-packer'
  | 'palletizer'
  | 'warehouse'
  | 'generic';

/**
 * Map equipment.type (Factory-as-Code) → icon kind.
 * Never branch on equipment.id. Instance ids (…-01) must not match.
 */
export function resolveEquipmentIconKind(equipmentType: string | undefined): EquipmentIconKind {
  const t = (equipmentType ?? '').toLowerCase().trim();
  if (!t || /-\d+$/.test(t)) return 'generic';
  if (/compound|hold(ing)?-tank|mixer|blend/.test(t)) return 'compounding';
  if (/fill|syringe-fill|sterile-filter/.test(t)) return 'filling';
  if (/feed/.test(t)) return 'feeder';
  if (/assembl|spring/.test(t)) return 'assembly';
  if (/test|inspect|visual-inspection|device-inspection/.test(t)) return 'test';
  if (/label/.test(t)) return 'labeler';
  if (/carton|leaflet/.test(t)) return 'cartoner';
  if (/checkweigh|check-weigh|weigher/.test(t)) return 'checkweigher';
  if (/serial/.test(t)) return 'serialization';
  if (/case-pack|casepack/.test(t)) return 'case-packer';
  if (/pallet/.test(t)) return 'palletizer';
  if (/warehouse|receiv/.test(t)) return 'warehouse';
  return 'generic';
}

/** Conceptual aliases used in product docs / registry discussions. */
export const FillingMachineIcon = FillingIcon;
export const AssemblyMachineIcon = AssemblyIcon;
export const FunctionalTesterIcon = TestIcon;

export function EquipmentTypeIcon({
  equipmentType,
  ...props
}: IconProps & { equipmentType?: string }) {
  // Lazy import avoided: registry imports this module; use kind resolve only.
  const kind = resolveEquipmentIconKind(equipmentType);
  const Icon = {
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
  }[kind];
  return <Icon {...props} title={props.title ?? kind} />;
}

/** @deprecated alias */
export const EquipmentIcon = EquipmentTypeIcon;
