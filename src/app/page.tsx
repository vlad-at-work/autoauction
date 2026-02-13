import { Car } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Car className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            AutoAuction
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Получите лучшие предложения от дилеров Lada за 24 часа. Заполните заявку и дилеры сами
            предложат вам цену.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-6 text-center">
          <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
            Как это работает
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                1
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Выберите модель и комплектацию
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                2
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Получите предложения от дилеров
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                3
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Выберите лучшее и свяжитесь с дилером
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>Приложение временно недоступно для входа.</p>
          <p>Интерфейс дилера находится на реконструкции.</p>
        </div>
      </main>
    </div>
  );
}
