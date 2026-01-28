export const MODEL_SUBMODELS = {
  Granta: ['sedan', 'liftbek', 'khetchbek', 'universal', 'Cross', 'Drive Active'],
  Vesta: ['sedan', 'Cross', 'SW', 'SW Cross'],
  'Niva Travel': ['Niva Travel'],
  Largus: ['universal', 'Cross', 'furgon'],
  'Niva Legend': ['Niva Legend', 'Niva Legend Bronto'],
  Iskra: ['sedan', 'SW', 'SW Cross'],
  Aura: ['Aura'],
  Sportivnye: [
    'Vesta Sportline',
    'Vesta SW Sportline',
    'Granta Sportline',
    'Granta Sportline liftbek',
    'Granta Sport sedan',
    'Granta Sport liftbek',
  ],
} as const;

export const STATUS_OPTIONS = [
  'Podderzhivayu rossiyskikh boytsov v zone SVO',
  'Uchastnik SVO / mobilizovannyy',
  'Semya uchastnika SVO',
  'Veteran boyevykh deystviy',
  'Drugoye',
] as const;

export const TRANSMISSION_OPTIONS = ['Mekhanika', 'Avtomat', 'Ne vazhno'] as const;

export const COLOR_OPTIONS = [
  'Belyy',
  'Chernyy',
  'Serebristyy',
  'Seryy',
  'Krasnyy',
  'Siniy',
  'Korichnevyy',
  'Drugoye',
] as const;

export type Model = keyof typeof MODEL_SUBMODELS;
export type Submodel<M extends Model = Model> = (typeof MODEL_SUBMODELS)[M][number];
export type Transmission = (typeof TRANSMISSION_OPTIONS)[number];
export type Color = (typeof COLOR_OPTIONS)[number];
export type Status = (typeof STATUS_OPTIONS)[number];
