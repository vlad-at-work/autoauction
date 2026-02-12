import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тестирование — AutoAuction',
  description: 'Инструкции для QA: что исправлено, как тестировать webhook и привязку дилеров.',
};

export default function TestingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Тестирование AutoAuction</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Инструкция для QA: что было исправлено (февраль 2025), статус webhook и пошаговые тесты
            для проверки исправлений.
          </p>

          <nav className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium">Содержание</div>
            <ul className="mt-2 grid gap-1 text-sm">
              <li>
                <a className="underline underline-offset-4" href="#fixes">
                  1) Что исправлено (февраль 2025)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#webhook-status">
                  2) Статус webhook
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#test-start">
                  3) Тест 1: Приветственное сообщение (/start)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#test-dealer">
                  4) Тест 2: Привязка дилера и чат в списке
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#test-e2e">
                  5) Тест 3: Полный сквозной сценарий
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#bots">
                  6) Боты для тестирования
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#troubleshooting">
                  7) Если что-то не работает
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <article className="mt-8 space-y-10 text-base leading-relaxed">
          <section id="fixes" className="space-y-4">
            <h2 className="text-xl font-semibold">1) Что исправлено (февраль 2025)</h2>

            <div className="rounded-lg border bg-green-50/50 p-4">
              <h3 className="font-medium text-green-800">✅ Проблема 1: Окно авторизации Vercel</h3>
              <p className="mt-1 text-sm text-green-700">
                <strong>Проблема:</strong> При открытии мини-приложения через кнопку в MAX
                появлялось окно авторизации Vercel (Google/GitHub OAuth).
              </p>
              <p className="mt-1 text-sm text-green-700">
                <strong>Причина:</strong> Включена защита деплоя (Deployment Protection) в Vercel.
              </p>
              <p className="mt-1 text-sm text-green-700">
                <strong>Решение:</strong> Защита деплоя отключена. Теперь приложение открывается
                напрямую.
              </p>
            </div>

            <div className="rounded-lg border bg-green-50/50 p-4">
              <h3 className="font-medium text-green-800">
                ✅ Проблема 2: Дилер не видит бот в списке чатов
              </h3>
              <p className="mt-1 text-sm text-green-700">
                <strong>Проблема:</strong> После закрытия мини-приложения дилер не мог найти бота в
                списке чатов MAX/Telegram — нужно было заново искать ссылку в почте.
              </p>
              <p className="mt-1 text-sm text-green-700">
                <strong>Причина:</strong> Дилер никогда не отправлял сообщение боту, поэтому чат не
                появлялся в списке.
              </p>
              <p className="mt-1 text-sm text-green-700">
                <strong>Решение:</strong> Теперь при привязке аккаунта дилеру автоматически
                отправляется приветственное сообщение, которое создаёт чат в списке.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Технические изменения</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                <li>
                  Обновлены webhook-обработчики для поддержки двух ботов (клиентский и дилерский)
                </li>
                <li>Добавлена отправка приветственных сообщений при привязке дилера</li>
                <li>
                  Созданы скрипты управления webhook: <code>setup-hooks.sh</code>,{' '}
                  <code>check-hooks.sh</code>, <code>delete-hooks.sh</code>
                </li>
              </ul>
            </div>
          </section>

          <section id="webhook-status" className="space-y-4">
            <h2 className="text-xl font-semibold">2) Статус webhook (продакшн)</h2>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Платформа</th>
                    <th className="px-4 py-2 text-left">Бот</th>
                    <th className="px-4 py-2 text-left">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-2">MAX</td>
                    <td className="px-4 py-2">Клиентский (id5010035001_bot)</td>
                    <td className="px-4 py-2">
                      <span className="text-green-600">✅ Активен</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">MAX</td>
                    <td className="px-4 py-2">Дилерский (id5010035001_1_bot)</td>
                    <td className="px-4 py-2">
                      <span className="text-green-600">✅ Активен</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Telegram</td>
                    <td className="px-4 py-2">Клиентский (autoauction_bot)</td>
                    <td className="px-4 py-2">
                      <span className="text-green-600">✅ Активен</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Telegram</td>
                    <td className="px-4 py-2">Дилерский (autoauctiondealer_bot)</td>
                    <td className="px-4 py-2">
                      <span className="text-green-600">✅ Активен</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="test-start" className="space-y-4">
            <h2 className="text-xl font-semibold">3) Тест 1: Приветственное сообщение (/start)</h2>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.1 Клиентский бот MAX</h3>
              <ol className="list-decimal pl-5">
                <li>Откройте MAX на телефоне</li>
                <li>
                  Найдите бота id5010035001_bot (или перейдите по ссылке max.ru/id5010035001_bot)
                </li>
                <li>Отправьте команду /start</li>
              </ol>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">✅ Ожидаемый результат:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Бот отправляет приветственное сообщение: «👋 Добро пожаловать...»</li>
                  <li>Под сообщением кнопка «📱 Открыть приложение»</li>
                  <li>Чат с ботом появляется в списке чатов MAX</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.2 Дилерский бот MAX</h3>
              <ol className="list-decimal pl-5">
                <li>Откройте MAX на телефоне (можно на другом телефоне)</li>
                <li>Найдите бота id5010035001_1_bot (или max.ru/id5010035001_1_bot)</li>
                <li>Отправьте команду /start</li>
              </ol>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">✅ Ожидаемый результат:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    Бот отправляет приветственное сообщение: «👋 Добро пожаловать... Это AutoAuction
                    для дилеров»
                  </li>
                  <li>Под сообщением кнопка «📱 Панель дилера»</li>
                  <li>Чат с ботом появляется в списке чатов MAX</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="test-dealer" className="space-y-4">
            <h2 className="text-xl font-semibold">4) Тест 2: Привязка дилера и чат в списке</h2>

            <p className="text-muted-foreground">
              Этот тест проверяет исправление проблемы #2 — дилер должен видеть бота в списке чатов
              после привязки аккаунта.
            </p>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 1 — Админ создаёт дилера</h3>
              <ol className="list-decimal pl-5">
                <li>Откройте админ-панель: /admin</li>
                <li>Перейдите в Dealers → New dealer</li>
                <li>Создайте дилера с любым именем (например, «Тестовый Дилер QA»)</li>
                <li>Откройте страницу дилера и скопируйте ссылку-приглашение для MAX</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 2 — Дилер привязывает аккаунт</h3>
              <ol className="list-decimal pl-5">
                <li>На телефоне дилера откройте скопированную ссылку в MAX</li>
                <li>Мини-приложение откроется с формой установки пароля</li>
                <li>Введите пароль и нажмите «Сохранить»</li>
              </ol>
              <div className="rounded-lg border bg-yellow-50/50 p-4">
                <p className="font-medium text-yellow-800">⚠️ Критически важно:</p>
                <p className="mt-1 text-sm text-yellow-700">
                  После успешной установки пароля дилер должен получить приветственное сообщение от
                  бота id5010035001_1_bot в чате:
                </p>
                <blockquote className="mt-2 border-l-2 border-yellow-400 pl-3 text-sm text-yellow-700">
                  «🎉 Добро пожаловать в AutoAuction, [Имя дилера]! Ваш аккаунт дилера успешно
                  активирован...»
                </blockquote>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 3 — Проверка чата в списке</h3>
              <ol className="list-decimal pl-5">
                <li>Закройте мини-приложение (крестик вверху)</li>
                <li>Вернитесь в список чатов MAX</li>
              </ol>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">✅ Ожидаемый результат:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Чат с ботом id5010035001_1_bot остаётся в списке чатов</li>
                  <li>
                    В чате видно приветственное сообщение с кнопкой «📱 Открыть панель дилера»
                  </li>
                  <li>При нажатии на кнопку снова открывается панель дилера</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="test-e2e" className="space-y-4">
            <h2 className="text-xl font-semibold">5) Тест 3: Полный сквозной сценарий</h2>

            <p>Требуется два телефона или одно приложение + компьютер.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Телефон 1 — Дилер</h3>
                <p className="mt-1 text-sm text-muted-foreground">Привязанный дилер из Теста 2</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Телефон 2 — Покупатель</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Клиентский бот id5010035001_bot
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Покупатель создаёт заявку</h3>
              <ol className="list-decimal pl-5">
                <li>Откройте клиентский бот → «📱 Открыть приложение»</li>
                <li>Создайте заявку на автомобиль (любые данные)</li>
              </ol>
              <p className="text-muted-foreground">
                ✅ Дилер должен получить уведомление о новой заявке с кнопкой «📱 Открыть заявку»
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Дилер отправляет предложения</h3>
              <ol className="list-decimal pl-5">
                <li>Дилер нажимает кнопку в уведомлении</li>
                <li>Отправляет 2-3 предложения с разными ценами</li>
              </ol>
              <p className="text-muted-foreground">
                ✅ Покупатель получает уведомления о каждом предложении
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Покупатель принимает предложение</h3>
              <ol className="list-decimal pl-5">
                <li>Покупатель открывает заявку из уведомления</li>
                <li>Нажимает «Принять предложение» на лучшей цене</li>
              </ol>
              <p className="text-muted-foreground">
                ✅ Дилер получает уведомление: «🎉 Покупатель принял ваше предложение!»
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Админ проверяет сделку</h3>
              <ol className="list-decimal pl-5">
                <li>В админ-панели перейдите в Transactions</li>
                <li>Должна появиться новая сделка с данными покупателя и дилера</li>
              </ol>
            </div>
          </section>

          <section id="bots" className="space-y-4">
            <h2 className="text-xl font-semibold">6) Боты для тестирования</h2>

            <div className="grid gap-3">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">MAX — Клиентский</h3>
                <p className="mt-1 text-sm">
                  <a
                    href="https://max.ru/id5010035001_bot"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    max.ru/id5010035001_bot
                  </a>
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">MAX — Дилерский</h3>
                <p className="mt-1 text-sm">
                  <a
                    href="https://max.ru/id5010035001_1_bot"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    max.ru/id5010035001_1_bot
                  </a>
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Telegram — Клиентский</h3>
                <p className="mt-1 text-sm">
                  <a
                    href="https://t.me/autoauction_bot"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    t.me/autoauction_bot
                  </a>
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Telegram — Дилерский</h3>
                <p className="mt-1 text-sm">
                  <a
                    href="https://t.me/autoauctiondealer_bot"
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    t.me/autoauctiondealer_bot
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section id="troubleshooting" className="space-y-4">
            <h2 className="text-xl font-semibold">7) Если что-то не работает</h2>

            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Нет приветственного сообщения от дилерского бота</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  <li>
                    Проверьте статус webhook: запустите скрипт <code>./scripts/check-hooks.sh</code>{' '}
                    (для разработчиков)
                  </li>
                  <li>Убедитесь, что дилер открывает ссылку в MAX, а не в другом приложении</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">«Unknown recipient» при отправке сообщений</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  <li>Пользователь должен сначала написать боту /start</li>
                  <li>Это ограничение MAX/Telegram — бот не может писать первым</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Кнопки не открывают приложение</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  <li>Проверьте, что переменная NEXT_PUBLIC_APP_URL установлена в Vercel</li>
                  <li>Убедитесь, что защита деплоя отключена</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium">Дилер не видит чат после закрытия</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  <li>
                    Проверьте, что приветственное сообщение было отправлено (должно быть в чате)
                  </li>
                  <li>Если сообщения нет — возможно, webhook не обрабатывает события</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-muted" />
          <p className="text-sm text-muted-foreground">
            Последнее обновление: 12 февраля 2025. Если нужны дополнительные тест-кейсы или шаблон
            отчёта — сообщите.
          </p>
        </article>
      </div>
    </main>
  );
}
