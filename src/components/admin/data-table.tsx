import Link from 'next/link';
import { Pagination } from './pagination';

type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  detailPath?: (item: T) => string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  basePath: string;
};

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  detailPath,
  pagination,
  basePath,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium sm:px-4 sm:py-3 sm:text-sm"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-muted-foreground sm:px-4"
                  >
                    Данные не найдены
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const cells = columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm"
                    >
                      {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                    </td>
                  ));

                  if (detailPath) {
                    return (
                      <tr
                        key={String(item[keyField])}
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="p-0">
                            <Link
                              href={detailPath(item)}
                              className="block whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm"
                            >
                              {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                            </Link>
                          </td>
                        ))}
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={String(item[keyField])}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      {cells}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && totalPages > 1 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          basePath={basePath}
        />
      )}
    </div>
  );
}
