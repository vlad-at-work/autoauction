export const MODEL_SUBMODELS = {
  Granta: ['седан', 'лифтбек', 'хэтчбек', 'универсал', 'Cross', 'Drive Active'],
  Vesta: ['седан', 'Cross', 'SW', 'SW Cross'],
  'Niva Travel': ['Niva Travel'],
  Largus: ['универсал', 'Cross', 'фургон'],
  'Niva Legend': ['Niva Legend', 'Niva Legend Bronto'],
  Iskra: ['седан', 'SW', 'SW Cross'],
  Aura: ['Aura'],
  Sportivnye: [
    'Vesta Sportline',
    'Vesta SW Sportline',
    'Granta Sportline',
    'Granta Sportline лифтбек',
    'Granta Sport седан',
    'Granta Sport лифтбек',
  ],
} as const;

export const STATUS_OPTIONS = [
  'Коллекционер',
  'Первый автомобиль',
  'Для семьи',
  'Для работы',
  'Другое',
] as const;

export const TRANSMISSION_OPTIONS = ['Механика', 'Автомат', 'Не важно'] as const;

export const COLOR_OPTIONS = [
  'Белый',
  'Черный',
  'Серебристый',
  'Серый',
  'Красный',
  'Синий',
  'Коричневый',
  'Другое',
] as const;

export type Model = keyof typeof MODEL_SUBMODELS;
export type Submodel<M extends Model = Model> = (typeof MODEL_SUBMODELS)[M][number];
export type Transmission = (typeof TRANSMISSION_OPTIONS)[number];
export type Color = (typeof COLOR_OPTIONS)[number];
export type Status = (typeof STATUS_OPTIONS)[number];
