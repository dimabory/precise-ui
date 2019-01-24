import * as React from 'react';
import memoize from 'memoize-one';
import styled, { themed, css, reStyled } from '../../utils/styled';
import { remCalc } from '../../utils/remCalc';
import { sortObjectList } from '../../utils/sort';
import { distance } from '../../distance';
import { RefProps, StandardProps } from '../../common';
import { TableRowEvent, TableProps, TableSorting, TableColumns } from './Table.types.part';
import {
  defaultCellRenderer,
  StyledTableHead,
  StyledTableHeaderRow,
  StyledTableHeader,
  defaultRowRenderer,
  StyledTableRow,
  StyledTableFoot,
  defaultBodyRenderer,
  getColumns,
} from './TableShared.part';

export interface TableBasicState {
  sorting?: TableSorting;
  controlledSorting: boolean;
}

interface StyledTableProps {
  condensed?: boolean;
  borderless?: boolean;
}

interface SortIconProps {
  currentDirection?: 'ArrowDropDown' | 'ArrowDropUp' | false;
  sortable?: boolean;
}

const StyledTable = reStyled.table<StyledTableProps>(
  ({ theme, borderless, condensed }) => `
    table-layout: ${theme.tableLayout};
    border-collapse: collapse;
    width: 100%;
    color: ${theme.text6};
    border: ${borderless ? 'none' : theme.tableBorder};
    font-size: ${remCalc('14px')};

    > thead > tr > th,
    > tbody > tr > td {
      padding: ${condensed ? `${distance.small} ${distance.large}` : theme.tableHeadPadding};

      &:not(:last-child) {
        padding-right: 0;
      }
    }
  `,
);

const StyledTableBody = styled.tbody``;

interface TableHostProps extends StandardProps {
  head: React.ReactNode;
  foot: React.ReactNode;
}

const TableHost: React.SFC<TableHostProps> = ({ head, foot, theme, children, ...props }) => (
  <StyledTable theme={theme} {...props}>
    {head}
    <StyledTableBody theme={theme}>{children}</StyledTableBody>
    {foot}
  </StyledTable>
);

const HiddenCell = styled.td`
  display: none;
`;

const HeaderLabel = styled.div`
  font-size: 0;
  white-space: nowrap;

  > span {
    display: inline-block;
    vertical-align: middle;
    font-size: ${remCalc('14px')};
  }
`;

const WithArrowUp = css`
  &:after {
    border-top: 4px solid ${themed(({ theme }) => theme.ui5)};
  }
`;

const WithArrowDown = css`
  &:before {
    border-bottom: 4px solid ${themed(({ theme }) => theme.ui5)};
  }
`;

const SortIcon = styled<SortIconProps, 'span'>('span')`
  position: relative;
  margin-left: ${distance.xsmall};
  width: 18px;
  height: 18px;

  &:before,
  &:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    pointer-events: none;
    margin: 0 auto;
  }
  &:before {
    top: 50%;
    margin-top: -5px;
    border-bottom: 4px solid ${themed(({ theme }) => theme.ui4)};
  }
  &:after {
    bottom: 50%;
    margin-bottom: -7px;
    border-top: 4px solid ${themed(({ theme }) => theme.ui4)};
  }
  ${({ currentDirection }) =>
    currentDirection ? (currentDirection === 'ArrowDropDown' ? WithArrowUp : WithArrowDown) : ''};
`;

const StyledTableCell = styled.td`
  text-align: left;
`;

const StyledPlaceholderCell = StyledTableCell.extend`
  text-align: center;
`;

function defaultRowKeyGetter<T>({ key }: TableRowEvent<T>) {
  return key;
}

function normalizeSortBy(sortBy?: TableSorting | string): TableSorting | undefined {
  if (!sortBy) {
    return undefined;
  }

  if (typeof sortBy === 'string') {
    if (sortBy[0] === '-') {
      return {
        columnKey: sortBy.substr(1),
        order: 'descending',
      };
    } else {
      return {
        columnKey: sortBy,
        order: 'ascending',
      };
    }
  }

  return {
    columnKey: sortBy.columnKey,
    order: sortBy.order || 'ascending',
  };
}

export class TableBasic<T> extends React.Component<TableProps<T> & RefProps, TableBasicState> {
  constructor(props: TableProps<T> & RefProps) {
    super(props);
    this.state = {
      controlledSorting: false,
    };
  }

  static getDerivedStateFromProps(props: TableProps<any>, state: TableBasicState) {
    const controlledSorting = props.sortBy !== undefined || state.controlledSorting;

    if (controlledSorting) {
      return {
        sorting: normalizeSortBy(props.sortBy),
        controlledSorting,
      };
    }

    return state;
  }

  private getIndices = memoize((data: Array<T>, grouping?: keyof T, sorting?: TableSorting) =>
    sorting
      ? sortObjectList(data, sorting.columnKey as keyof T, sorting.order, grouping)
      : sortObjectList(data, undefined, undefined, grouping),
  );

  private isSortable(key: string, cols: TableColumns) {
    const { sortBy } = this.props;
    const col = cols[key];
    return !sortBy && (!col || (typeof col !== 'string' && col.sortable));
  }

  private headerClicked(e: React.MouseEvent<HTMLTableCellElement>, column: number, key: string) {
    const { onHeaderClick, data = [], columns } = this.props;
    e.preventDefault();

    if (typeof onHeaderClick === 'function') {
      onHeaderClick({
        column,
        key,
        row: -1,
      });
    } else if (this.isSortable(key, getColumns(data, columns))) {
      const { sorting } = this.state;
      const isAscending = sorting && sorting.order === 'descending' && sorting.columnKey === key;

      if (!isAscending && column !== -1) {
        this.setState({
          sorting: {
            columnKey: key,
            order: sorting && sorting.columnKey === key ? 'descending' : 'ascending',
          },
        });
      } else {
        this.setState({
          sorting: undefined,
        });
      }
    }
  }

  private footerClicked(e: React.MouseEvent<HTMLTableCellElement>, column: number, key: string) {
    e.preventDefault();

    const { onFooterClick } = this.props;

    if (typeof onFooterClick === 'function') {
      onFooterClick({
        column,
        key,
        row: -1,
      });
    }
  }

  private dataClicked(e: React.MouseEvent<HTMLTableCellElement>, row: number, column: number, key: string) {
    const { onDataClick, data } = this.props;
    e.preventDefault();

    if (typeof onDataClick === 'function') {
      const d = data[row];
      onDataClick({
        row,
        column,
        key,
        data: d,
        value: d && (column === -1 ? row + 1 : d[key]),
      });
    }
  }

  private defaultHeadRenderer(keys: Array<string>) {
    const { indexed, theme, data = [], columns } = this.props;
    const { sorting } = this.state;
    const sortDir = sorting && sorting.order === 'descending' ? 'ArrowDropDown' : 'ArrowDropUp';
    const sortColumn = sorting ? sorting.columnKey : undefined;
    const cols = getColumns(data, columns);

    return (
      <StyledTableHead theme={theme}>
        <StyledTableHeaderRow theme={theme}>
          {indexed && (
            <StyledTableHeader onClick={e => this.headerClicked(e, -1, '#')} theme={theme}>
              #
            </StyledTableHeader>
          )}
          {keys.map((key, cell) => {
            const column = cols[key];
            const hidden = typeof column !== 'string' && column.hidden;

            if (!hidden) {
              const name = typeof column === 'string' ? column : column.header;
              const width = typeof column === 'string' ? undefined : column.width;
              const direction = sortColumn === key && sortDir;
              const isSortable = this.isSortable(key, cols);
              return (
                <StyledTableHeader
                  sortable={isSortable}
                  width={width}
                  key={key}
                  onClick={e => this.headerClicked(e, cell, key)}
                  theme={theme}>
                  <HeaderLabel>
                    <span>{name}</span>
                    {isSortable && <SortIcon currentDirection={direction} />}
                  </HeaderLabel>
                </StyledTableHeader>
              );
            }

            return <HiddenCell key={key} />;
          })}
        </StyledTableHeaderRow>
      </StyledTableHead>
    );
  }

  private renderHead(keys: Array<string>) {
    const { headRenderer, sortBy, data = [], columns } = this.props;

    if (typeof headRenderer === 'function') {
      return headRenderer({
        columns: getColumns(data, columns),
        sortBy,
      });
    } else {
      return this.defaultHeadRenderer(keys);
    }
  }

  private renderCells(keys: Array<string>, rowIndex: number) {
    const { data = [], cellRenderer = defaultCellRenderer, indexed, theme, columns } = this.props;
    const cols = getColumns(data, columns);
    const cells = keys.map((key, cell) => {
      const column = cols[key];
      const hidden = typeof column !== 'string' && column.hidden;

      if (!hidden) {
        const row = data[rowIndex];
        const value = cellRenderer({
          column: cell,
          key,
          data: row,
          row: rowIndex,
          value: row[key],
        });
        return (
          <StyledTableCell key={key} onClick={e => this.dataClicked(e, rowIndex, cell, key)} theme={theme}>
            {value}
          </StyledTableCell>
        );
      }

      return <HiddenCell key={key} />;
    });

    if (indexed) {
      cells.unshift(
        <StyledTableCell key="index#" onClick={e => this.dataClicked(e, rowIndex, -1, '__indexed')} theme={theme}>
          {rowIndex + 1}
        </StyledTableCell>,
      );
    }

    return cells;
  }

  private renderRows(keys: Array<string>) {
    const {
      data,
      groupBy,
      indexed,
      placeholder,
      rowRenderer = defaultRowRenderer,
      getRowKey = defaultRowKeyGetter,
      theme,
    } = this.props;
    const indices = this.getIndices(data, groupBy, this.state.sorting);
    const cols = keys.length + (indexed ? 1 : 0);

    if (indices.length === 0) {
      return placeholder
        ? [
            <StyledTableRow theme={theme}>
              <StyledPlaceholderCell colSpan={cols} theme={theme}>
                {placeholder}
              </StyledPlaceholderCell>
            </StyledTableRow>,
          ]
        : [];
    } else {
      return indices.map(index => {
        const cells = this.renderCells(keys, index);
        const renderData = { theme, index, cells, data: data[index], key: index.toString() };
        renderData.key = getRowKey(renderData);
        return rowRenderer(renderData);
      });
    }
  }

  private renderFoot(keys: Array<string>) {
    const { indexed, theme, columns, data = [] } = this.props;
    const cols = getColumns(data, columns);

    return (
      <StyledTableFoot theme={theme}>
        <StyledTableRow theme={theme}>
          {indexed && <StyledTableCell theme={theme} onClick={e => this.footerClicked(e, -1, '#')} />}
          {keys.map(key => {
            const column = cols[key];
            const hidden = typeof column !== 'string' && column.hidden;

            if (!hidden) {
              const name = typeof column === 'string' ? undefined : column.footer;
              return (
                <StyledTableCell key={key} theme={theme} onClick={e => this.footerClicked(e, -1, key)}>
                  {name}
                </StyledTableCell>
              );
            }

            return <HiddenCell key={key} />;
          })}
        </StyledTableRow>
      </StyledTableFoot>
    );
  }

  render() {
    const {
      data = [],
      columns,
      noHeader,
      theme,
      bodyRenderer = defaultBodyRenderer,
      cellRenderer: _1,
      indexed: _2,
      sortBy: _3,
      onDataClick: _4,
      onFooterClick: _5,
      onHeaderClick: _6,
      placeholder: _7,
      columns: _8,
      groupBy: _9,
      ...props
    } = this.props;
    const cols = getColumns(data, columns);
    const keys = Object.keys(cols);
    const showFooter =
      keys.filter(key => {
        const col = cols[key];
        return typeof col === 'object' && !!col.footer && !col.hidden;
      }).length > 0;
    const rows = this.renderRows(keys);

    return bodyRenderer({
      table: TableHost,
      props: {
        theme,
        head: !noHeader && this.renderHead(keys),
        foot: showFooter && this.renderFoot(keys),
        ...props,
      },
      rows,
      mode: 'table',
    });
  }
}
