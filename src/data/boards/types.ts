export type BoardId = 'nodemcu_32s_typec';

export interface MountingHoleSpec {
  id: string;
  label: string;
  xMm: number;
  zMm: number;
  drillDiameterMm: number;
  padDiameterMm: number;
}

export interface BoardMechanicalSpec {
  id: BoardId;
  modelName: string;
  taglineZh: string;
  revisionYear: number;
  widthMm: number;
  depthMm: number;
  thicknessMm: number;
  cornerRadiusMm: number;
  mountingHoleSpacingXMm: number;
  mountingHoleSpacingZMm: number;
  mountingHoleDrillMm: number;
  mountingHoles: MountingHoleSpec[];
  glbAssetPath: string;
  sourceUrl: string;
  officialProductUrl: string;
  officialSchematicsUrl: string;
  officialDatasheetUrl: string;
  keyHighlightsZh: string[];
}

export type ComponentStatus = 'populated' | 'backside' | 'silkscreen-only';

export interface FactItem {
  label: string;
  value: string;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface SubCircuitItem {
  meshKey: string;
  label: string;
  valueSpec: string;
  detail: string;
}

export type ComponentCategory =
  | 'overview'
  | 'core'
  | 'wireless'
  | 'power'
  | 'interface'
  | 'io'
  | 'storage'
  | 'passives';

export interface ComponentEntry {
  id: string;
  abbr: string;
  titleZh: string;
  subtitleEn: string;
  category: ComponentCategory;
  side: 'top' | 'bottom' | 'both';
  status: ComponentStatus;
  summary: string;
  paragraphs: string[];
  facts: FactItem[];
  notes?: string[];
  links?: LinkItem[];
  subCircuits?: SubCircuitItem[];
  meshKeys?: string[];
}

export type GpioPinType =
  | 'power5v'
  | 'power3v3'
  | 'gnd'
  | 'i2c'
  | 'uart'
  | 'spi'
  | 'adc'
  | 'dac'
  | 'touch'
  | 'gpio'
  | 'flash_reserved';

export interface GpioPinSpec {
  pin: number;
  side: 'left' | 'right';
  indexInRow: number;
  name: string;
  titleZh: string;
  gpio: number | null;
  adcChannel: string | null;
  touchChannel: string | null;
  type: GpioPinType;
  typeLabel: string;
  color: string;
  defaultPull: string;
  strappingInfo?: string;
  altFunctions: string;
  descriptionZh: string;
  position3D: [number, number, number];
}

export interface PlacementItem {
  componentId: string;
  subLabel?: string;
  side: 'top' | 'bottom' | 'both';
  isPCB?: boolean;
  isAuxiliaryPassive?: boolean;
}

export interface SyntheticHighlightZone {
  key: string;
  componentId: string;
  subLabel: string;
  side: 'top' | 'bottom' | 'both';
  center: [number, number, number];
  size: [number, number, number];
}

export interface TutorialStep {
  stepNumber: number;
  componentId: string;
  title: string;
  body: string;
}

export interface BoardPackage {
  id: BoardId;
  name: string;
  badge: string;
  year: number;
  chipTag: string;
  spec: BoardMechanicalSpec;
  components: ComponentEntry[];
  componentMap: Record<string, ComponentEntry>;
  placements: Record<string, PlacementItem>;
  syntheticZones: SyntheticHighlightZone[];
  gpioPins: GpioPinSpec[];
  gpioPinMap: Record<number, GpioPinSpec>;
  tutorialSteps: TutorialStep[];
}
