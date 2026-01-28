type MockOffer = {
  id: string;
  price: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockInquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string | null;
  statusDescription: string | null;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  comment: string | null;
  createdAt: Date;
  expiresAt: Date;
  offers: MockOffer[];
  _count: { offers: number };
};

type MockUser = {
  id: string;
  name: string;
  inquiries: MockInquiry[];
};

const now = new Date();

export const MOCK_USERS: Record<string, MockUser> = {
  debug_user_1: {
    id: 'debug_user_1',
    name: 'Олег Тестов',
    inquiries: [
      {
        id: 'mock_inq_1',
        name: 'Олег Тестов',
        email: 'oleg@test.ru',
        phone: '+79123456789',
        status: 'Поддерживаю российских бойцов в зоне СВО',
        statusDescription: null,
        model: 'Niva Travel',
        submodel: 'Niva Travel',
        transmission: 'Не важно',
        color: 'Серебристый',
        comment: 'Срочно нужен автомобиль',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        expiresAt: new Date(now.getTime() + 22 * 60 * 60 * 1000), // 22 hours left
        offers: [
          {
            id: 'mock_off_1',
            price: 1250000,
            comment: 'Лучшая цена, гарантия',
            createdAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
          },
          {
            id: 'mock_off_2',
            price: 1300000,
            comment: 'Немедленная поставка',
            createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          },
        ],
        _count: { offers: 2 },
      },
      {
        id: 'mock_inq_2',
        name: 'Олег Тестов',
        email: 'oleg@test.ru',
        phone: '+79123456789',
        status: null,
        statusDescription: null,
        model: 'Granta',
        submodel: 'седан',
        transmission: 'Механика',
        color: 'Белый',
        comment: null,
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
        expiresAt: new Date(now.getTime() + 14 * 60 * 60 * 1000), // 14 hours left
        offers: [],
        _count: { offers: 0 },
      },
      {
        id: 'mock_inq_3',
        name: 'Олег Тестов',
        email: 'oleg@test.ru',
        phone: '+79123456789',
        status: null,
        statusDescription: null,
        model: 'Vesta',
        submodel: 'SW Cross',
        transmission: 'Автомат',
        color: 'Синий',
        comment: 'Интересует максимальная комплектация',
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000), // 20 hours ago
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours left
        offers: [
          {
            id: 'mock_off_3',
            price: 1450000,
            comment: null,
            createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
          },
        ],
        _count: { offers: 1 },
      },
    ],
  },
  debug_user_2: {
    id: 'debug_user_2',
    name: 'Анна Пустая',
    inquiries: [],
  },
  debug_user_3: {
    id: 'debug_user_3',
    name: 'Иван Просроченный',
    inquiries: [
      {
        id: 'mock_inq_expired_1',
        name: 'Иван Просроченный',
        email: null,
        phone: '+79999999999',
        status: null,
        statusDescription: null,
        model: 'Granta',
        submodel: 'лифтбек',
        transmission: 'Не важно',
        color: 'Серый',
        comment: null,
        createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
        expiresAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Expired 1 hour ago
        offers: [],
        _count: { offers: 0 },
      },
      {
        id: 'mock_inq_expired_2',
        name: 'Иван Просроченный',
        email: 'ivan@test.ru',
        phone: '+79999999999',
        status: null,
        statusDescription: null,
        model: 'Largus',
        submodel: 'универсал',
        transmission: 'Механика',
        color: 'Коричневый',
        comment: null,
        createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000), // 30 hours ago
        expiresAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // Expired 6 hours ago
        offers: [
          {
            id: 'mock_off_4',
            price: 980000,
            comment: 'Выгодное предложение',
            createdAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
          },
        ],
        _count: { offers: 1 },
      },
    ],
  },
  debug_user_4: {
    id: 'debug_user_4',
    name: 'Мария Смешанная',
    inquiries: [
      {
        id: 'mock_inq_4',
        name: 'Мария Смешанная',
        email: 'maria@test.ru',
        phone: '+79111111111',
        status: 'Семья участника СВО',
        statusDescription: null,
        model: 'Iskra',
        submodel: 'седан',
        transmission: 'Автомат',
        color: 'Красный',
        comment: null,
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
        expiresAt: new Date(now.getTime() + 19 * 60 * 60 * 1000), // 19 hours left
        offers: [
          {
            id: 'mock_off_5',
            price: 1350000,
            comment: 'Специальная цена для семей участников СВО',
            createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          },
          {
            id: 'mock_off_6',
            price: 1320000,
            comment: 'Скидка до конца месяца',
            createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          },
          {
            id: 'mock_off_7',
            price: 1380000,
            comment: null,
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
        ],
        _count: { offers: 3 },
      },
      {
        id: 'mock_inq_5',
        name: 'Мария Смешанная',
        email: 'maria@test.ru',
        phone: '+79111111111',
        status: null,
        statusDescription: null,
        model: 'Niva Legend',
        submodel: 'Niva Legend',
        transmission: 'Механика',
        color: 'Черный',
        comment: null,
        createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000), // 26 hours ago
        expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Expired 2 hours ago
        offers: [],
        _count: { offers: 0 },
      },
    ],
  },
};

export type { MockUser, MockInquiry, MockOffer };
