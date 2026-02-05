import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Инструкции для QA — AutoAuction',
  description: 'Простой шаблон заметок: что сработало, что не сработало, и что приложить.',
};

export default function InstructionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Инструкции для QA</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Цель: после прогона теста прислать короткий, понятный отчёт «что работало / что не
            работало» так, чтобы разработчик мог быстро воспроизвести проблему и исправить её.
          </p>

          <nav className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium">Содержание</div>
            <ul className="mt-2 grid gap-1 text-sm">
              <li>
                <a className="underline underline-offset-4" href="#format">
                  1) Формат отчёта
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#quick-summary">
                  2) Короткое резюме (1 минута)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#qna">
                  3) Вопросы и ответы (по сценарию)
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#bug-template">
                  4) Шаблон бага
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#attachments">
                  5) Что прикладывать
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <article className="mt-8 space-y-10 text-base leading-relaxed">
          <section id="format" className="space-y-3">
            <h2 className="text-xl font-semibold">1) Формат отчёта</h2>
            <div className="rounded-lg border p-4">
              <div className="font-medium">Пожалуйста, отправляйте отчёт так:</div>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                <li>Сначала 5–7 строк «итогов» (что прошло / что не прошло).</li>
                <li>Потом список багов (каждый баг — отдельным блоком).</li>
                <li>В конце — ссылки/скриншоты/видео.</li>
              </ul>
            </div>
          </section>

          <section id="quick-summary" className="space-y-3">
            <h2 className="text-xl font-semibold">2) Короткое резюме (1 минута)</h2>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Заполните (копируйте как шаблон):</div>
              <div className="mt-2 whitespace-pre-wrap rounded bg-background p-3 font-mono text-sm">
                {`Среда: (staging / prod) + ссылка
Дата/время: 
Устройство(а): (1 телефон / 2 телефона)
Покупатель: (Telegram или MAX)
Дилер: (Telegram или MAX)

Итог: (ПРОШЁЛ / НЕ ПРОШЁЛ)
Блокеры: (да/нет, 1 строка)
Критичные проблемы: (1–3 пункта)`}
              </div>
            </div>
          </section>

          <section id="qna" className="space-y-4">
            <h2 className="text-xl font-semibold">3) Вопросы и ответы (по сценарию)</h2>
            <p className="text-muted-foreground">
              Отвечайте коротко: «Да/Нет + 1 фраза». Если «Нет» — сразу пишите баг по шаблону ниже.
            </p>

            <div className="grid gap-3">
              <div className="rounded-lg border p-4">
                <div className="font-medium">Админка / дилер</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Удалось зайти в админку (логин/пароль)?</li>
                  <li>Удалось создать дилера?</li>
                  <li>Удалось скопировать invite‑link и открыть его у дилера?</li>
                  <li>После входа дилера в админке появились platform/userId/chatId?</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Дилерское мини‑приложение</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Открылось с invite‑link без ошибок?</li>
                  <li>Удалось поставить пароль на первом входе?</li>
                  <li>После перезапуска дилер остаётся залогинен?</li>
                  <li>Дилер видит активные заявки после создания заявки покупателем?</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Покупательское мини‑приложение</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Открылось из бота без ошибок?</li>
                  <li>Удалось создать заявку?</li>
                  <li>Заявка появилась на дашборде?</li>
                  <li>Пришли уведомления о предложениях?</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Предложения / принятие</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Дилер смог отправить 3 предложения?</li>
                  <li>Покупатель видит все предложения в заявке?</li>
                  <li>Покупатель смог принять одно предложение?</li>
                  <li>Дилер получил уведомление о принятии?</li>
                  <li>После принятия дилер видит контакты покупателя?</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Ссылки в уведомлениях</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>Кнопки из уведомлений открывают правильный экран?</li>
                  <li>Кнопки из уведомлений открывают правильный домен (не «левый» сайт)?</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <div className="font-medium">Админка / сделки</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  <li>После принятия в админке появилась сделка (transaction)?</li>
                  <li>В transaction корректны дилер/покупатель/цена/снимок данных?</li>
                  <li>Редактирование биллинговых полей работает (amount/invoicedAt и т.п.)?</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="bug-template" className="space-y-3">
            <h2 className="text-xl font-semibold">4) Шаблон бага</h2>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Копируйте и заполняйте:</div>
              <div className="mt-2 whitespace-pre-wrap rounded bg-background p-3 font-mono text-sm">
                {`Название: (коротко)
Шаг: (на каком шаге сценария)
Ожидалось: 
Фактически: 
Повторяемость: (всегда / иногда / один раз)
Срочность: (блокер / критично / средне / мелочь)
ID/ссылка: (если есть: ссылка на страницу, ID из URL)
Скрин/видео: (приложить)`}
              </div>
            </div>
          </section>

          <section id="attachments" className="space-y-3">
            <h2 className="text-xl font-semibold">5) Что прикладывать</h2>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>Скриншот/видео экрана с проблемой.</li>
              <li>Если есть — текст ошибки целиком (как показано в UI).</li>
              <li>Ссылка на страницу (скопировать URL) и/или ID из URL.</li>
              <li>Какие приложения использовали: Telegram/MAX, один или два телефона.</li>
            </ul>
          </section>

          <hr className="border-muted" />
          <p className="text-sm text-muted-foreground">
            Важно: даже если всё прошло — всё равно пришлите короткое резюме из раздела «2)».
          </p>
        </article>
      </div>
    </main>
  );
}
