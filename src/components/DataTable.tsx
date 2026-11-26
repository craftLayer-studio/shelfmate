'use client';

import {Table, type TableColumn} from '@astryxdesign/core/Table';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';

export type Row = Record<string, string | number | null>;

export interface Col {
  key: string;
  header: string;
  align?: 'start' | 'center' | 'end';
  /** Render the cell as a link to the URL in this row field. */
  linkKey?: string;
}

/**
 * Server pages cannot pass render functions to the client Table, so they pass
 * pre-formatted rows and this wrapper builds the columns.
 */
export function DataTable({rows, columns, idKey = 'id', empty = 'Nothing here yet.'}: {rows: Row[]; columns: Col[]; idKey?: string; empty?: string}) {
  const cols: TableColumn<Row>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    align: c.align,
    renderCell: (r: Row) => {
      const v = r[c.key] ?? '';
      const href = c.linkKey ? r[c.linkKey] : null;
      return href ? <Link href={String(href)}>{String(v)}</Link> : String(v);
    },
  }));
  return <Table density="compact" idKey={(r) => String(r[idKey])} data={rows} columns={cols} emptyState={<Text color="secondary">{empty}</Text>} />;
}
