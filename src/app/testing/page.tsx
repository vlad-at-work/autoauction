import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тестирование — AutoAuction',
  description: 'Краткое объяснение продукта и пошаговые инструкции для QA тестирования.',
};

export default function TestingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Тестирование AutoAuction</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Эта страница — инструкция для QA и руководителя: что именно делает продукт, из каких
            частей состоит, и как провести сквозной тест «покупатель → предложения → принятие →
            сделка».
          </p>

          <nav className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium">Содержание</div>
            <ul className="mt-2 grid gap-1 text-sm">
              <li>
                <a className="underline underline-offset-4" href="#overview">
                  1) Что это за продукт
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#components">
                  2) Компоненты
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#flows">
                  3) Основные сценарии
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#prep">
                  4) Подготовка к тесту
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#one-or-two-phones">
                  5) 1 телефон или 2 телефона
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#e2e">
                  6) Сквозной тест (пошагово)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#report">
                  7) Что фиксировать
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#troubleshooting">
                  8) Частые проблемы
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <article className="mt-8 space-y-10 text-base leading-relaxed">
          <section id="overview" className="space-y-4">
            <h2 className="text-xl font-semibold">1) Что это за продукт</h2>
            <p>
              AutoAuction — это сервис, где <strong>покупатель</strong> оставляет заявку на
              автомобиль, а <strong>дилеры</strong> присылают конкурирующие предложения по цене.
              Покупатель выбирает лучшее предложение и подтверждает его.
            </p>
            <p>
              После подтверждения мы фиксируем <strong>сделку</strong> (transaction) и показываем
              дилеру контакты покупателя, чтобы дилер мог связаться и продолжить продажу.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Роли</div>
              <ul className="mt-2 list-disc pl-5">
                <li>
                  <strong>Покупатель</strong> — мини‑приложение в Telegram/MAX
                </li>
                <li>
                  <strong>Дилер</strong> — отдельное дилерское мини‑приложение
                </li>
                <li>
                  <strong>Администратор</strong> — веб‑панель (админка)
                </li>
              </ul>
            </div>
          </section>

          <section id="components" className="space-y-4">
            <h2 className="text-xl font-semibold">2) Компоненты (простыми словами)</h2>
            <div className="grid gap-3">
              <div className="rounded-lg border p-4">
                <div className="font-medium">Мини‑приложение покупателя</div>
                <div className="mt-1 text-muted-foreground">
                  Создаёт заявки, показывает предложения, позволяет принять предложение.
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="font-medium">Мини‑приложение дилера</div>
                <div className="mt-1 text-muted-foreground">
                  Показывает активные заявки и позволяет отправлять предложения (до 5 на одну
                  заявку).
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="font-medium">Уведомления</div>
                <div className="mt-1 text-muted-foreground">
                  Боты в Telegram/MAX отправляют сообщения покупателю и дилеру, чтобы они не
                  пропускали новые события.
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="font-medium">Админ‑панель</div>
                <div className="mt-1 text-muted-foreground">
                  Создаёт дилеров, смотрит покупателей/заявки/офферы и видит записи о сделках
                  (transactions) и поля для биллинга.
                </div>
              </div>
            </div>
          </section>

          <section id="flows" className="space-y-4">
            <h2 className="text-xl font-semibold">3) Основные сценарии</h2>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.1) Покупатель → заявка</h3>
              <ol className="list-decimal pl-5">
                <li>Покупатель открывает мини‑приложение из бота.</li>
                <li>Заполняет форму (модель, цвет, коробка, контакты) и отправляет заявку.</li>
                <li>Заявка активна 24 часа.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.2) Дилер → предложения</h3>
              <ol className="list-decimal pl-5">
                <li>Дилер открывает дилерское мини‑приложение.</li>
                <li>Видит список активных заявок и открывает нужную.</li>
                <li>Отправляет предложения по цене (до 5 предложений на одну заявку).</li>
                <li>Покупатель получает уведомления о новых/обновлённых предложениях.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.3) Покупатель → принятие → сделка</h3>
              <ol className="list-decimal pl-5">
                <li>Покупатель открывает заявку и смотрит предложения.</li>
                <li>Нажимает «Принять предложение» на выбранном варианте.</li>
                <li>
                  Система создаёт запись о сделке (transaction) и фиксирует снимок данных (цена,
                  дилер, параметры заявки) для биллинга.
                </li>
                <li>Дилер получает уведомление о принятии и видит контакты покупателя.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">3.4) Что делает администратор</h3>
              <ol className="list-decimal pl-5">
                <li>Заходит в админ‑панель и создаёт дилера (логин + контактные поля).</li>
                <li>
                  Открывает страницу дилера и копирует <strong>ссылку‑приглашение</strong> (Telegram
                  или MAX) — отправляет дилеру.
                </li>
                <li>
                  После первого входа дилера админ видит, что дилер «привязался» к Telegram/MAX
                  (появятся platform / userId / chatId) и что пароль установлен.
                </li>
                <li>Проверяет, что после принятия предложения появилась сделка (transactions).</li>
              </ol>
            </div>
          </section>

          <section id="prep" className="space-y-4">
            <h2 className="text-xl font-semibold">4) Подготовка к тесту (чек‑лист)</h2>
            <ul className="list-disc pl-5">
              <li>
                Есть доступ к админ‑панели (логин/пароль администратора) и к тестовому окружению
                (staging/production).
              </li>
              <li>
                Настроены боты и кнопки открывают правильный домен приложения (важно для ссылок из
                уведомлений).
              </li>
              <li>
                Понятно, каким мессенджером вы будете пользоваться для <strong>покупателя</strong> и
                для <strong>дилера</strong>.
              </li>
            </ul>
          </section>

          <section id="one-or-two-phones" className="space-y-4">
            <h2 className="text-xl font-semibold">5) 1 телефон или 2 телефона</h2>

            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold">Вариант A — один телефон</h3>
              <p className="mt-2 text-muted-foreground">
                Можно протестировать на одном телефоне, используя{' '}
                <strong>два разных приложения</strong> (например, Telegram и MAX). Тогда у вас будут
                разные user ID, и роли не будут конфликтовать.
              </p>
              <ul className="mt-2 list-disc pl-5">
                <li>
                  Покупатель: Telegram <em>или</em> MAX
                </li>
                <li>
                  Дилер: другое приложение (если покупатель в Telegram — дилер в MAX, и наоборот)
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-semibold">Вариант B — два телефона</h3>
              <ul className="mt-2 list-disc pl-5">
                <li>Телефон 1: дилер</li>
                <li>Телефон 2: покупатель</li>
              </ul>
            </div>
          </section>

          <section id="e2e" className="space-y-4">
            <h2 className="text-xl font-semibold">6) Сквозной тест (пошагово)</h2>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 1 — админ создаёт дилера</h3>
              <ol className="list-decimal pl-5">
                <li>
                  Откройте админ‑панель:{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">/admin</code>.
                </li>
                <li>Перейдите в Dealers → New dealer.</li>
                <li>Заполните: username, имя, телефон, email (без Telegram/MAX ID).</li>
                <li>
                  После создания откройте страницу дилера и скопируйте ссылку‑приглашение (Telegram
                  или MAX).
                </li>
                <li>Отправьте эту ссылку дилеру (в мессенджер, где дилер будет работать).</li>
              </ol>
              <p className="text-muted-foreground">
                Ожидаемо: у нового дилера сначала <strong>нет</strong> привязки к платформе и{' '}
                <strong>нет</strong> пароля.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 2 — дилер ставит пароль</h3>
              <ol className="list-decimal pl-5">
                <li>Дилер открывает ссылку‑приглашение на телефоне.</li>
                <li>Открывается дилерское мини‑приложение.</li>
                <li>На первом входе дилер задаёт пароль.</li>
              </ol>
              <p className="text-muted-foreground">
                Ожидаемо: дилер попадает на дашборд и видит «нет активных заявок» (пока покупатель
                не создал заявку).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 3 — покупатель создаёт заявку</h3>
              <ol className="list-decimal pl-5">
                <li>Покупатель открывает мини‑приложение покупателя из бота.</li>
                <li>Переходит к форме и создаёт заявку (любые корректные значения).</li>
              </ol>
              <p className="text-muted-foreground">
                Ожидаемо: заявка появляется на дашборде покупателя; дилер получает уведомление о
                новой заявке и видит её в своём дашборде.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 4 — дилер отправляет 3 предложения</h3>
              <ol className="list-decimal pl-5">
                <li>Дилер открывает заявку.</li>
                <li>Отправляет предложения (например: 1 500 000 → 1 450 000 → 1 400 000).</li>
              </ol>
              <p className="text-muted-foreground">
                Ожидаемо: покупатель получает уведомления и видит предложения внутри заявки.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                Шаг 5 — покупатель принимает лучшее предложение
              </h3>
              <ol className="list-decimal pl-5">
                <li>Покупатель открывает заявку и список предложений.</li>
                <li>Нажимает «Принять предложение» на лучшей цене.</li>
              </ol>
              <p className="text-muted-foreground">
                Ожидаемо: предложение помечено как принятое; дилер получает уведомление и видит
                контакты покупателя; в админ‑панели появляется запись о сделке (transaction).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Шаг 6 — админ проверяет сделку</h3>
              <ol className="list-decimal pl-5">
                <li>Откройте Transactions.</li>
                <li>Проверьте: дилер, покупатель, цена, параметры заявки.</li>
                <li>При необходимости заполните поля биллинга (amount / invoicedAt и т.п.).</li>
              </ol>
            </div>
          </section>

          <section id="report" className="space-y-4">
            <h2 className="text-xl font-semibold">7) Что фиксировать при тестировании</h2>
            <ul className="list-disc pl-5">
              <li>Среда тестирования (staging/production), дата и время.</li>
              <li>Какие мессенджеры использовались для покупателя и дилера (Telegram/MAX).</li>
              <li>Факт/ожидание на каждом шаге.</li>
              <li>Скриншоты проблем и текст ошибок.</li>
            </ul>
          </section>

          <section id="troubleshooting" className="space-y-4">
            <h2 className="text-xl font-semibold">8) Частые проблемы и что делать</h2>
            <ul className="list-disc pl-5">
              <li>
                <strong>Дилер видит «нужна ссылка приглашения»</strong> — значит, в системе
                несколько непривязанных дилеров. Откройте нужного дилера в админке и используйте
                именно его invite‑link.
              </li>
              <li>
                <strong>Кнопка из уведомления открывает не тот сайт</strong> — проверьте домен
                приложения в окружении деплоя (важно для ссылок из уведомлений).
              </li>
              <li>
                <strong>MAX пишет “Unknown recipient”</strong> — в MAX пользователь должен начать
                чат с ботом/быть корректно подписан; иногда требуется настройка вебхуков.
              </li>
            </ul>
          </section>

          <hr className="border-muted" />
          <p className="text-sm text-muted-foreground">
            Если хотите — добавлю шаблон отчёта (1 страница) и список must‑pass проверок, чтобы
            прогон занимал 10–15 минут.
          </p>
        </article>
      </div>
    </main>
  );
}
