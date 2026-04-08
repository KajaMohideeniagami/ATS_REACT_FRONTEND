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
import {
  getProfileReportCustomers,
  getProfileReportRows,
  getProfileReportVendors,
} from '../../../services/profileReportService';
import '../../../global.css';

const STATUS_OPTIONS = ['All', 'Open', 'Closed', 'Hold', 'Lost'];
const TYPE_OPTIONS = ['All', 'Offshore', 'Onsite', 'NearShore'];
const PAGE_SIZE = 10;
const COLUMN_PREFS_KEY = 'ats_profile_report_column_prefs';

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

  if (normalizedColumnKey === 'profile status' || normalizedColumnKey === 'profile_status') {
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

const ProfileReportPage = () => {
  const actionsRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
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
    const loadFilters = async () => {
      try {
        setError('');

        const [customerList, vendorList] = await Promise.all([
          getProfileReportCustomers(),
          getProfileReportVendors(),
        ]);

        setCustomers(customerList);
        setVendors(vendorList);
      } catch (fetchError) {
        console.error('Profile report filter load error:', fetchError);
        setError('Failed to load profile report filters.');
        toast.error('Failed to load profile report filters.');
      } finally {
        setFiltersLoading(false);
      }
    };

    loadFilters();
  }, []);

  const loadRows = useCallback(async () => {
    try {
      setRowsLoading(true);
      setError('');

      const reportRows = await getProfileReportRows({
        customer: selectedCustomer,
        vendor: selectedVendor,
        demandStatus: selectedStatus,
        demandType: selectedType,
      });

      setRows(Array.isArray(reportRows) ? reportRows : []);
    } catch (fetchError) {
      console.error('Profile report row load error:', fetchError);
      setError('Failed to load profile report data.');
      toast.error('Failed to load profile report data.');
    } finally {
      setRowsLoading(false);
    }
  }, [selectedCustomer, selectedVendor, selectedStatus, selectedType]);

  useEffect(() => {
    setPage(1);
  }, [selectedCustomer, selectedVendor, selectedStatus, selectedType, searchTerm]);

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
  const loading = filtersLoading || rowsLoading;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRow = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  const resetFilters = () => {
    setSelectedCustomer('All');
    setSelectedVendor('All');
    setSelectedStatus('All');
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
    link.download = 'profile-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    setActionsOpen(false);
    setColumnsOpen(false);
  };

  const handleRefresh = async () => {
    await loadRows();
    setActionsOpen(false);
    setColumnsOpen(false);
    toast.success('Profile report refreshed.');
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
        <div className="loading">Loading profile report...</div>
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
              <h1 className="ats-heading-1">Profile Report</h1>
              <p className="ats-body-small">Filter and review profile records in one place.</p>
            </div>
          </div>

          <div className="demand-report-summary">
            <FileSpreadsheet size={18} />
            <span>{filteredRows.length} matching records</span>
          </div>
        </div>

        <div className="demand-report-panel">
          <div className="demand-report-filters profile-report-filters">
            <div className="filter-group filter-group-compact">
              <label className="form-label">Customer</label>
              <select
                className="form-select report-filter-select"
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

            <div className="filter-group filter-group-compact">
              <label className="form-label">Vendor</label>
              <select
                className="form-select report-filter-select"
                value={selectedVendor}
                onChange={(event) => setSelectedVendor(event.target.value)}
              >
                <option value="All">All</option>
                {vendors.map((vendor) => (
                  <option key={vendor.value} value={vendor.value}>
                    {vendor.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group filter-group-compact">
              <label className="form-label">Demand Status</label>
              <select
                className="form-select report-filter-select"
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

            <div className="filter-group filter-group-compact">
              <label className="form-label">Demand Type</label>
              <select
                className="form-select report-filter-select"
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
                    <tr key={getValue(row, ['profile_id', 'profileId', 'profile_code']) || `${currentPage}-${index}`}>
                      {activeColumns.map((column) => (
                        <td key={`${getValue(row, ['profile_id', 'profileId', 'profile_code']) || index}-${column}`}>
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
    </div>
  );
};

export default ProfileReportPage;

