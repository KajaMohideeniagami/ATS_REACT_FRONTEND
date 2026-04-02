import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Columns3,
  Download,
  FileSpreadsheet,
  GripVertical,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { toast } from '../../../components/Toast';
import { getDemandReportCustomers, getDemandReportRows } from '../../../services/demandReportService';
import '../../../global.css';

const STATUS_OPTIONS = ['All', 'Open', 'Closed', 'Hold', 'Lost'];
const TYPE_OPTIONS = ['All', 'Offshore', 'Onsite', 'NearShore'];
const PAGE_SIZE = 10;
const COLUMN_PREFS_KEY = 'ats_demand_report_column_prefs';

const getValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return '';
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const formatHeader = (key) => (
  String(key ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
);

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-US');
};

const formatCell = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const resultTone = (value) => {
  const normalized = normalize(value);

  if (normalized.includes('green')) return 'green';
  if (normalized.includes('amber') || normalized.includes('yellow')) return 'amber';
  return 'red';
};

const matchesSearch = (row, searchTerm) => {
  if (!searchTerm.trim()) return true;

  const haystack = Object.values(row || {})
    .map((value) => formatCell(value))
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchTerm.trim().toLowerCase());
};

const getStatusTone = (value) => {
  const normalized = normalize(value);

  if (normalized.includes('open')) return 'open';
  if (normalized.includes('close')) return 'closed';
  if (normalized.includes('hold')) return 'hold';
  if (normalized.includes('lost')) return 'lost';
  return 'unknown';
};

const isDateColumn = (columnKey) => normalize(columnKey).includes('date');

const renderCellValue = (columnKey, value) => {
  const normalizedColumnKey = normalize(columnKey);

  if (normalizedColumnKey === 'result sign' || normalizedColumnKey === 'result_sign') {
    return (
      <span className={`result-pill ${resultTone(value)}`}>
        <span className="result-pill-dot" />
        {formatCell(value)}
      </span>
    );
  }

  if (normalizedColumnKey === 'demand status' || normalizedColumnKey === 'demand_status') {
    return (
      <span className={`status-pill ${getStatusTone(value)}`}>
        {formatCell(value)}
      </span>
    );
  }

  if (isDateColumn(columnKey)) {
    return formatDate(value);
  }

  return formatCell(value);
};

const toCsvSafe = (value) => `"${formatCell(value).replace(/"/g, '""')}"`;

const readColumnPrefs = () => {
  if (typeof window === 'undefined') {
    return { order: [], hidden: [] };
  }

  try {
    const rawPrefs = window.localStorage.getItem(COLUMN_PREFS_KEY);
    if (!rawPrefs) {
      return { order: [], hidden: [] };
    }

    const parsedPrefs = JSON.parse(rawPrefs);
    return {
      order: Array.isArray(parsedPrefs?.order) ? parsedPrefs.order : [],
      hidden: Array.isArray(parsedPrefs?.hidden) ? parsedPrefs.hidden : [],
    };
  } catch {
    return { order: [], hidden: [] };
  }
};

const DemandReportPage = () => {
  const actionsRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [selectedType, setSelectedType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [columnOrder, setColumnOrder] = useState(() => readColumnPrefs().order);
  const [hiddenColumns, setHiddenColumns] = useState(() => readColumnPrefs().hidden);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
        setColumnsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        setError('');

        const customerList = await getDemandReportCustomers();
        setCustomers(customerList);
      } catch (fetchError) {
        console.error('Demand report customer load error:', fetchError);
        setError('Failed to load demand report filters.');
        toast.error('Failed to load demand report filters.');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const reportRows = await getDemandReportRows({
        customer: selectedCustomer,
        demandStatus: selectedStatus,
        demandType: selectedType,
      });

      setRows(Array.isArray(reportRows) ? reportRows : []);
    } catch (fetchError) {
      console.error('Demand report row load error:', fetchError);
      setError('Failed to load demand report data.');
      toast.error('Failed to load demand report data.');
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, selectedStatus, selectedType]);

  useEffect(() => {
    setPage(1);
  }, [selectedCustomer, selectedStatus, selectedType, searchTerm]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, searchTerm)),
    [rows, searchTerm]
  );

  const columns = useMemo(
    () => rows.reduce((allColumns, row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!allColumns.includes(key)) {
          allColumns.push(key);
        }
      });

      return allColumns;
    }, []),
    [rows]
  );

  useEffect(() => {
    setColumnOrder((previousColumns) => {
      if (columns.length === 0) return [];
      if (previousColumns.length === 0) return columns;

      const retainedColumns = previousColumns.filter((column) => columns.includes(column));
      const newColumns = columns.filter((column) => !retainedColumns.includes(column));

      return [...retainedColumns, ...newColumns];
    });
  }, [columns]);

  useEffect(() => {
    setHiddenColumns((previousHiddenColumns) => previousHiddenColumns.filter((column) => columns.includes(column)));
  }, [columns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      COLUMN_PREFS_KEY,
      JSON.stringify({
        order: columnOrder,
        hidden: hiddenColumns,
      })
    );
  }, [columnOrder, hiddenColumns]);

  const activeColumns = columnOrder.filter((column) => !hiddenColumns.includes(column));

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRow = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  const resetFilters = () => {
    setSelectedCustomer('All');
    setSelectedStatus('Open');
    setSelectedType('All');
    setSearchTerm('');
  };

  const toggleColumn = (column) => {
    setHiddenColumns((previousHiddenColumns) => {
      const activeColumnCount = columnOrder.filter((item) => !previousHiddenColumns.includes(item)).length;

      if (!previousHiddenColumns.includes(column) && activeColumnCount === 1) {
        return previousHiddenColumns;
      }

      if (previousHiddenColumns.includes(column)) {
        return previousHiddenColumns.filter((item) => item !== column);
      }

      return [...previousHiddenColumns, column];
    });
  };

  const showAllColumns = () => {
    setHiddenColumns([]);
    toast.success('All columns are now visible.');
  };

  const moveColumn = (sourceColumn, targetColumn) => {
    if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) return;

    setColumnOrder((previousColumns) => {
      const nextColumns = [...previousColumns];
      const sourceIndex = nextColumns.indexOf(sourceColumn);
      const targetIndex = nextColumns.indexOf(targetColumn);

      if (sourceIndex === -1 || targetIndex === -1) {
        return previousColumns;
      }

      const [movedColumn] = nextColumns.splice(sourceIndex, 1);
      nextColumns.splice(targetIndex, 0, movedColumn);
      return nextColumns;
    });

    toast.success('Column order saved.');
  };

  const downloadCsv = () => {
    if (filteredRows.length === 0 || activeColumns.length === 0) {
      toast.warning('No report rows available to download.');
      return;
    }

    const csvRows = [
      activeColumns.map((column) => toCsvSafe(formatHeader(column))).join(','),
      ...filteredRows.map((row) => activeColumns.map((column) => toCsvSafe(row?.[column])).join(',')),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'demand-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    setActionsOpen(false);
    setColumnsOpen(false);
  };

  const handleRefresh = async () => {
    await loadRows();
    setActionsOpen(false);
    setColumnsOpen(false);
    toast.success('Demand report refreshed.');
  };

  const handleResetView = () => {
    resetFilters();
    setColumnOrder(columns);
    setHiddenColumns([]);
    setActionsOpen(false);
    setColumnsOpen(false);
    toast.success('Report view reset.');
  };

  if (loading) {
    return (
      <div className="customer-list-container">
        <div className="loading">Loading demand report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-list-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="demand-report-page">
      <div className="demand-report-shell">
        <div className="demand-report-header">
          <div className="demand-report-title-wrap">
            <div>
              <div className="demand-report-kicker">Analytics</div>
              <h1 className="ats-heading-1">Demand Report</h1>
              <p className="ats-body-small">Filter and review demand pipeline data in one place.</p>
            </div>
          </div>

          <div className="demand-report-summary">
            <FileSpreadsheet size={18} />
            <span>{filteredRows.length} matching records</span>
          </div>
        </div>

        <div className="demand-report-panel">
          <div className="demand-report-filters">
            <div className="filter-group">
              <label className="form-label">Customer</label>
              <select
                className="form-select"
                value={selectedCustomer}
                onChange={(event) => setSelectedCustomer(event.target.value)}
              >
                <option value="All">All</option>
                {customers.map((customer) => (
                  <option key={customer.value} value={customer.value}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="form-label">Demand Status</label>
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="form-label">Demand Type</label>
              <select
                className="form-select"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="demand-report-toolbar">
            <div className="demand-report-search">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search any report column..."
              />
            </div>

            <div className="demand-report-actions" ref={actionsRef}>
              <button className="btn-secondary demand-report-reset" onClick={resetFilters}>
                <RotateCcw size={15} />
                Reset Filters
              </button>

              <button
                className={`btn-secondary demand-report-action-trigger ${actionsOpen ? 'active' : ''}`}
                onClick={() => {
                  setActionsOpen((previous) => !previous);
                  setColumnsOpen(false);
                }}
              >
                Actions
                <ChevronDown size={15} />
              </button>

              {actionsOpen && (
                <div className="demand-report-action-menu">
                  <button
                    className={`action-menu-item ${columnsOpen ? 'active' : ''}`}
                    onClick={() => setColumnsOpen((previous) => !previous)}
                  >
                    <span className="action-menu-icon"><Columns3 size={16} /></span>
                    <span className="action-menu-label">Columns</span>
                    <span className="action-menu-caret"><ChevronDown size={14} /></span>
                  </button>

                  {columnsOpen && (
                    <div className="action-submenu">
                      <button className="action-submenu-item strong" onClick={showAllColumns}>
                        Show All Columns
                      </button>
                      <div className="action-submenu-hint">Drag the grip icon to reorder columns.</div>
                      {columnOrder.map((column) => {
                        const checked = !hiddenColumns.includes(column);

                        return (
                          <button
                            key={column}
                            className={`action-submenu-item ${checked ? 'checked' : ''}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              moveColumn(draggedColumn, column);
                              setDraggedColumn(null);
                            }}
                            onClick={() => toggleColumn(column)}
                          >
                            <span
                              className="action-submenu-drag"
                              draggable
                              onClick={(event) => event.stopPropagation()}
                              onDragStart={(event) => {
                                event.stopPropagation();
                                setDraggedColumn(column);
                              }}
                              onDragEnd={(event) => {
                                event.stopPropagation();
                                setDraggedColumn(null);
                              }}
                            >
                              <GripVertical size={14} />
                            </span>
                            <span className="action-submenu-check">{checked ? <Check size={14} /> : null}</span>
                            <span>{formatHeader(column)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button className="action-menu-item" onClick={handleRefresh}>
                    <span className="action-menu-icon"><RefreshCw size={16} /></span>
                    <span className="action-menu-label">Refresh Data</span>
                  </button>

                  <button className="action-menu-item" onClick={downloadCsv}>
                    <span className="action-menu-icon"><Download size={16} /></span>
                    <span className="action-menu-label">Download CSV</span>
                  </button>

                  <button className="action-menu-item" onClick={handleResetView}>
                    <span className="action-menu-icon"><RotateCcw size={16} /></span>
                    <span className="action-menu-label">Reset View</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="demand-report-table-meta">
            <span>
              {startRow} - {endRow} of {filteredRows.length}
            </span>
          </div>

          <div className="demand-report-table-wrap">
            <table className="demand-report-table">
              <thead>
                <tr>
                  {activeColumns.map((column) => (
                    <th key={column}>{formatHeader(column)}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(activeColumns.length, 1)} className="demand-report-empty">
                      No report rows matched the selected filters.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => (
                    <tr key={getValue(row, ['demand_id', 'demandId', 'demand_code']) || `${currentPage}-${index}`}>
                      {activeColumns.map((column) => (
                        <td key={`${getValue(row, ['demand_id', 'demandId', 'demand_code']) || index}-${column}`}>
                          {renderCellValue(column, row?.[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="demand-report-pagination">
            <button
              className="page-btn"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="page-btn"
              onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .demand-report-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%),
            linear-gradient(180deg, #eef4ff 0%, #f8fafc 42%, #edf2f7 100%);
          padding: 32px 20px 48px;
        }

        .demand-report-shell {
          max-width: 1600px;
          margin: 0 auto;
        }

        .demand-report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .demand-report-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }

        .demand-report-kicker {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #2563eb;
          margin-bottom: 6px;
        }

        .demand-report-summary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(37, 99, 235, 0.15);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          color: var(--ats-primary);
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .demand-report-panel {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(10px);
        }

        .demand-report-filters {
          display: grid;
          grid-template-columns: repeat(3, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 18px;
        }

        .filter-group {
          min-width: 0;
        }

        .demand-report-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .demand-report-search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 2px solid var(--ats-border);
          border-radius: 14px;
          padding: 0 14px;
          min-height: 48px;
        }

        .demand-report-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: var(--ats-neutral);
        }

        .demand-report-actions {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .demand-report-reset,
        .demand-report-action-trigger {
          gap: 8px;
          text-transform: none;
          padding-left: 18px;
          padding-right: 18px;
        }

        .demand-report-action-trigger.active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .demand-report-action-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 240px;
          background: #ffffff;
          border: 1px solid var(--ats-border);
          border-radius: 16px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
          overflow: hidden;
          z-index: 20;
        }

        .action-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          background: #ffffff;
          border: none;
          border-bottom: 1px solid var(--ats-border-light);
          text-align: left;
          cursor: pointer;
          color: var(--ats-primary);
          transition: background 0.15s ease;
        }

        .action-menu-item:last-of-type {
          border-bottom: none;
        }

        .action-menu-item:hover,
        .action-menu-item.active {
          background: #eff6ff;
        }

        .action-menu-icon {
          display: inline-flex;
          align-items: center;
          color: #2563eb;
          flex-shrink: 0;
        }

        .action-menu-label {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        .action-menu-caret {
          color: var(--ats-secondary);
          display: inline-flex;
          align-items: center;
        }

        .action-submenu {
          max-height: 320px;
          overflow: auto;
          background: #f8fbff;
          border-bottom: 1px solid var(--ats-border-light);
        }

        .action-submenu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          color: var(--ats-primary);
          font-size: 13px;
        }

        .action-submenu-item:hover {
          background: rgba(37, 99, 235, 0.08);
        }

        .action-submenu-item.strong {
          font-weight: 700;
          color: #1d4ed8;
          border-bottom: 1px solid var(--ats-border-light);
        }

        .action-submenu-item.checked {
          font-weight: 600;
        }

        .action-submenu-hint {
          padding: 10px 14px 8px;
          color: var(--ats-secondary);
          font-size: 12px;
          border-bottom: 1px solid var(--ats-border-light);
          background: rgba(37, 99, 235, 0.03);
        }

        .action-submenu-drag {
          width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ats-secondary);
          flex-shrink: 0;
          cursor: grab;
        }

        .action-submenu-check {
          width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
        }

        .demand-report-table-meta {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
          color: var(--ats-secondary);
          font-size: 13px;
          font-weight: 500;
        }

        .demand-report-table-wrap {
          overflow: auto;
          border: 1px solid var(--ats-border);
          border-radius: 18px;
          background: #ffffff;
        }

        .demand-report-table {
          width: 100%;
          min-width: 1600px;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }

        .demand-report-table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #f8fbff;
          color: #2563eb;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          padding: 16px 14px;
          border-bottom: 1px solid var(--ats-border);
          border-right: 1px solid var(--ats-border-light);
          white-space: nowrap;
        }

        .demand-report-table thead th:last-child {
          border-right: none;
        }

        .demand-report-table tbody td {
          padding: 14px;
          border-bottom: 1px solid var(--ats-border-light);
          border-right: 1px solid var(--ats-border-light);
          color: var(--ats-primary);
          vertical-align: middle;
          background: #ffffff;
          white-space: nowrap;
        }

        .demand-report-table tbody tr:nth-child(even) td {
          background: #fcfdff;
        }

        .demand-report-table tbody tr:hover td {
          background: #eff6ff;
        }

        .demand-report-table tbody td:last-child {
          border-right: none;
        }

        .demand-report-empty {
          text-align: center;
          padding: 28px;
          color: var(--ats-secondary);
        }

        .result-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 600;
          white-space: nowrap;
        }

        .result-pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .result-pill.red {
          color: #b45309;
          background: rgba(251, 191, 36, 0.16);
        }

        .result-pill.green {
          color: #047857;
          background: rgba(16, 185, 129, 0.16);
        }

        .result-pill.amber {
          color: #b45309;
          background: rgba(245, 158, 11, 0.18);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-pill.open {
          color: #047857;
          background: rgba(16, 185, 129, 0.14);
        }

        .status-pill.closed {
          color: #475569;
          background: rgba(148, 163, 184, 0.2);
        }

        .status-pill.hold {
          color: #b45309;
          background: rgba(245, 158, 11, 0.16);
        }

        .status-pill.lost {
          color: #b91c1c;
          background: rgba(239, 68, 68, 0.14);
        }

        .status-pill.unknown {
          color: var(--ats-secondary);
          background: rgba(148, 163, 184, 0.14);
        }

        .demand-report-pagination {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 18px;
        }

        .page-info {
          font-size: 13px;
          color: var(--ats-secondary);
        }

        @media (max-width: 980px) {
          .demand-report-header {
            flex-direction: column;
            align-items: stretch;
          }

          .demand-report-summary {
            align-self: flex-start;
          }

          .demand-report-filters {
            grid-template-columns: 1fr;
          }

          .demand-report-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .demand-report-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .demand-report-reset,
          .demand-report-action-trigger {
            width: 100%;
            justify-content: center;
          }

          .demand-report-action-menu {
            left: 0;
            right: 0;
            min-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .demand-report-page {
            padding: 16px 12px 28px;
          }

          .demand-report-panel {
            padding: 16px;
            border-radius: 18px;
          }

          .demand-report-title-wrap {
            flex-direction: column;
            gap: 12px;
          }

          .demand-report-pagination {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default DemandReportPage;
