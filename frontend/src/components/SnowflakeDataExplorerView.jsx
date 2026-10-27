import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Download,
  Layers,
  Table as TableIcon,
  CheckCircle2,
  Activity,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Info,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
  Sprout,
  BarChart3,
  Calendar
} from 'lucide-react';
import { fetchSnowflakeInventory, fetchSnowflakeTableData } from '../services/api';

export default function SnowflakeDataExplorerView({ t }) {
  // Inventory & active table state
  const [inventory, setInventory] = useState(null);
  const [selectedTable, setSelectedTable] = useState('MANDI_PRICES');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState(null);

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('ASC');
  const [showSchema, setShowSchema] = useState(false);

  // 1. Load Inventory on Mount
  useEffect(() => {
    loadInventory();
  }, []);

  // 2. Load Table Data when table, page, search, or sorting changes
  useEffect(() => {
    loadTableData();
  }, [selectedTable, page, pageSize, sortBy, sortDir]);

  async function loadInventory() {
    setLoadingInventory(true);
    setError(null);
    try {
      const res = await fetchSnowflakeInventory();
      setInventory(res);
      if (res.tables && res.tables.length > 0 && !selectedTable) {
        setSelectedTable(res.tables[0].name);
      }
    } catch (err) {
      console.error('Failed to load Snowflake inventory:', err);
      setError(err.message || 'Failed to connect to Snowflake analytical warehouse');
    } finally {
      setLoadingInventory(false);
    }
  }

  async function loadTableData(search = searchQuery) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSnowflakeTableData({
        table: selectedTable,
        search: search || undefined,
        page,
        page_size: pageSize,
        sort_by: sortBy || undefined,
        sort_dir: sortDir
      });
      setTableData(res);
    } catch (err) {
      console.error(`Failed to load data for ${selectedTable}:`, err);
      setError(err.message || `Failed to fetch records from table ${selectedTable}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTableData(searchQuery);
  };

  const handleTableChange = (tableName) => {
    setSelectedTable(tableName);
    setSearchQuery('');
    setPage(1);
    setSortBy('');
    setSortDir('ASC');
  };

  const handleSort = (colName) => {
    if (sortBy === colName) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(colName);
      setSortDir('ASC');
    }
  };

  const handleExportCsv = () => {
    if (!tableData || !tableData.records || tableData.records.length === 0) return;
    const records = tableData.records;
    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(','),
      ...records.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Snowflake_${selectedTable}_Page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const activeTableMeta = inventory?.tables?.find(t => t.name === selectedTable);

  const formatCellValue = (key, val) => {
    if (val === null || val === undefined) {
      return <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>null</span>;
    }
    const lowerKey = key.toLowerCase();
    if (typeof val === 'number') {
      if (lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('revenue') || lowerKey.includes('profit')) {
        return <span style={{ fontWeight: 600, color: '#113826' }}>₹{val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>;
      }
      return val.toLocaleString();
    }
    const str = String(val);
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return (
        <a href={str} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Source Link <ExternalLink size={12} />
        </a>
      );
    }
    if (lowerKey === 'state') {
      return <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{str}</span>;
    }
    if (lowerKey === 'crop' || lowerKey === 'commodity') {
      return <span style={{ fontWeight: 700, color: '#113826' }}>{str}</span>;
    }
    return str;
  };

  const totalPages = tableData ? Math.ceil(tableData.total_records / pageSize) : 1;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Banner & Session Context */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          color: '#FFFFFF',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(6, 78, 59, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <Database size={20} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#A7F3D0' }}>
                Snowflake Data Cloud Integration
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#065F46',
                  border: '1px solid #10B981',
                  color: '#6EE7B7',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
                LIVE CONNECTED
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Snowflake Analytical Data Explorer
            </h1>
            <p style={{ fontSize: 14, color: '#D1FAE5', marginTop: 6, maxWidth: 850 }}>
              Direct live query interface to all agricultural tables, verified agronomy benchmarks, and 9,800+ APMC mandi price observations in Snowflake database <strong>FARMPRICE_DB.AGRICULTURE</strong>.
            </p>
          </div>

          {/* Live Context Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: '#A7F3D0', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Warehouse</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{inventory?.warehouse || 'FARMPRICE_WH'}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: '#A7F3D0', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Database & Schema</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{inventory?.database || 'FARMPRICE_DB'}.{inventory?.schema || 'AGRICULTURE'}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: '#A7F3D0', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Query Latency</div>
              <div style={{ fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={13} color="#FBBF24" /> {inventory?.latency_ms ? `${inventory.latency_ms} ms` : 'Live'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: 10, padding: '14px 18px', color: '#B91C1C', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Info size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
          <button onClick={() => loadTableData()} style={{ marginLeft: 'auto', background: '#DC2626', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Retry Query
          </button>
        </div>
      )}

      {/* Table Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 18 }}>
        {inventory?.tables?.map((tbl) => {
          const isSelected = selectedTable === tbl.name;
          return (
            <button
              key={tbl.name}
              onClick={() => handleTableChange(tbl.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 10,
                border: isSelected ? '2px solid #059669' : '1px solid #D1D5DB',
                backgroundColor: isSelected ? '#E6F7F0' : '#FFFFFF',
                color: isSelected ? '#065F46' : '#374151',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <TableIcon size={15} color={isSelected ? '#059669' : '#6B7280'} />
              <span>{tbl.name}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: isSelected ? '#059669' : '#E5E7EB',
                  color: isSelected ? '#FFFFFF' : '#4B5563',
                  padding: '2px 7px',
                  borderRadius: 12
                }}
              >
                {tbl.row_count != null ? tbl.row_count.toLocaleString() : '...'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Table Meta Card */}
      {activeTableMeta && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: '18px 22px',
            marginBottom: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#113826', margin: 0 }}>
                  {activeTableMeta.display_name}
                </h3>
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#E6F7F0', color: '#059669', padding: '2px 8px', borderRadius: 6 }}>
                  {activeTableMeta.category}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 6 }}>
                  {activeTableMeta.badge}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 0 }}>
                {activeTableMeta.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setShowSchema(!showSchema)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  backgroundColor: showSchema ? '#F3F4F6' : '#FFFFFF',
                  color: '#374151',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Layers size={14} />
                {showSchema ? 'Hide Schema' : 'Inspect Schema'}
              </button>
              <button
                onClick={handleExportCsv}
                disabled={!tableData?.records?.length}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #059669',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: tableData?.records?.length ? 1 : 0.5
                }}
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Schema Drawer */}
          {showSchema && tableData?.columns && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Column Specifications in Snowflake:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tableData.columns.map((col) => (
                  <div
                    key={col.name}
                    style={{
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#111827' }}>{col.name}</span>
                    <span style={{ fontSize: 10, color: '#6B7280', backgroundColor: '#E5E7EB', padding: '1px 5px', borderRadius: 4 }}>
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 500 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={`Search ${selectedTable}... (e.g. crop, market, district, state)`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '9px 16px',
              backgroundColor: '#113826',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
                loadTableData('');
              }}
              style={{
                padding: '9px 12px',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            Rows per page:
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                marginLeft: 6,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button
            onClick={() => loadTableData()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '650px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                {tableData?.columns?.map((col) => {
                  const isSorted = sortBy === col.name;
                  return (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      style={{
                        padding: '12px 16px',
                        fontWeight: 700,
                        color: isSorted ? '#059669' : '#374151',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{col.name}</span>
                        <ArrowUpDown size={12} color={isSorted ? '#059669' : '#9CA3AF'} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableData?.columns?.length || 1} style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
                    <div style={{ fontWeight: 600 }}>Querying Snowflake Analytical Warehouse...</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Fetching live records from {selectedTable}</div>
                  </td>
                </tr>
              ) : tableData?.records?.length ? (
                tableData.records.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFA',
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFCFA')}
                  >
                    {tableData.columns.map((col) => (
                      <td key={col.name} style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {formatCellValue(col.name, row[col.name.toLowerCase()] ?? row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableData?.columns?.length || 1} style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280' }}>
                    <Database size={32} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#374151' }}>No Records Match Your Query</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                      Try clearing filters or search terms to browse the entire dataset.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {tableData && tableData.total_records > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              backgroundColor: '#FAFAFA'
            }}
          >
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Showing <strong>{((page - 1) * pageSize) + 1}</strong> to{' '}
              <strong>{Math.min(page * pageSize, tableData.total_records)}</strong> of{' '}
              <strong>{tableData.total_records.toLocaleString()}</strong> total records in{' '}
              <span style={{ fontWeight: 700, color: '#113826' }}>{selectedTable}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  backgroundColor: page <= 1 ? '#F3F4F6' : '#FFFFFF',
                  color: page <= 1 ? '#9CA3AF' : '#374151',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', padding: '0 6px' }}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  backgroundColor: page >= totalPages ? '#F3F4F6' : '#FFFFFF',
                  color: page >= totalPages ? '#9CA3AF' : '#374151',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
