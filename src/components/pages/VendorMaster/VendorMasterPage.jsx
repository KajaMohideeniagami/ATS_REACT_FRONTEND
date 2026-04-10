import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, Plus, RefreshCw, Search, X } from 'lucide-react';
import Loader from '../../common/Loader';
import { toast } from '../../../components/Toast';
import { getCountries } from '../../../services/lovService';
import { createVendor, getVendorMasterList } from '../../../services/vendorMasterService';
import '../../../global.css';

const VENDOR_TYPE_OPTIONS = ['Nearshore', 'Offshore', 'Offshore/Onsite', 'Onsite'];
const PAGE_SIZE = 10;

const formatCell = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
};

const formatCountryLabel = (country) => {
  const value = country?.label
    ?? country?.country_name
    ?? country?.name
    ?? country?.text
    ?? country?.value
    ?? country?.code;
  return String(value ?? '');
};

const getCountryValue = (country) => String(country?.value ?? country?.country_id ?? country?.id ?? country?.code ?? country?.label ?? '');

const matchesSearch = (row, searchTerm) => {
  if (!searchTerm.trim()) return true;

  const haystack = [
    row?.vendor_name,
    row?.contact_no,
    row?.email_id,
    row?.contact_person,
    row?.vendor_type,
    row?.country_name,
  ]
    .map((value) => formatCell(value))
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchTerm.trim().toLowerCase());
};

const readCountry = (countryValue, countries) => {
  const match = countries.find((country) => getCountryValue(country) === String(countryValue));
  return match ? formatCountryLabel(match) : String(countryValue ?? '');
};

const VendorModal = ({ isOpen, onClose, onSubmit, countries = [] }) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_no: '',
    country_id: '',
    vendor_type: '',
    email_id: '',
    contact_person: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vendor_name: '',
        contact_no: '',
        country_id: '',
        vendor_type: '',
        email_id: '',
        contact_person: '',
      });
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.vendor_name.trim()) nextErrors.vendor_name = 'Vendor name is required';
    if (!formData.contact_no.trim()) nextErrors.contact_no = 'Contact number is required';
    if (!formData.country_id) nextErrors.country_id = 'Country is required';
    if (!formData.vendor_type) nextErrors.vendor_type = 'Vendor type is required';
    if (!formData.email_id.trim()) nextErrors.email_id = 'Email ID is required';
    if (!formData.contact_person.trim()) nextErrors.contact_person = 'Contact person is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (submitError) {
      console.error('Vendor create error:', submitError);
      toast.error('Failed to create vendor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vm-modal-overlay" onClick={onClose}>
      <div className="vm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="vm-modal-header">
          <h2>Vendor Info</h2>
          <button type="button" className="vm-icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form className="vm-form" onSubmit={handleSubmit}>
          <div className="vm-field">
            <label className="form-label">Vendor Name</label>
            <input className="form-input vm-input" name="vendor_name" value={formData.vendor_name} onChange={handleChange} />
            {errors.vendor_name ? <span className="form-error">{errors.vendor_name}</span> : null}
          </div>

          <div className="vm-field">
            <label className="form-label">Contact No</label>
            <input className="form-input vm-input" name="contact_no" value={formData.contact_no} onChange={handleChange} />
            {errors.contact_no ? <span className="form-error">{errors.contact_no}</span> : null}
          </div>

          <div className="vm-field">
            <label className="form-label">Country</label>
            <select className="form-select vm-input" name="country_id" value={formData.country_id} onChange={handleChange}>
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={getCountryValue(country)} value={getCountryValue(country)}>
                  {formatCountryLabel(country)}
                </option>
              ))}
            </select>
            {errors.country_id ? <span className="form-error">{errors.country_id}</span> : null}
          </div>

          <div className="vm-field">
            <label className="form-label">Vendor Type</label>
            <select className="form-select vm-input" name="vendor_type" value={formData.vendor_type} onChange={handleChange}>
              <option value="">Select vendor type</option>
              {VENDOR_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.vendor_type ? <span className="form-error">{errors.vendor_type}</span> : null}
          </div>

          <div className="vm-field">
            <label className="form-label">Email ID</label>
            <input className="form-input vm-input" name="email_id" value={formData.email_id} onChange={handleChange} />
            {errors.email_id ? <span className="form-error">{errors.email_id}</span> : null}
          </div>

          <div className="vm-field">
            <label className="form-label">Contact Person</label>
            <input className="form-input vm-input" name="contact_person" value={formData.contact_person} onChange={handleChange} />
            {errors.contact_person ? <span className="form-error">{errors.contact_person}</span> : null}
          </div>

          <div className="vm-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VendorMasterPage = () => {
  const actionsRef = useRef(null);
  const [vendors, setVendors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [vendorList, countryList] = await Promise.all([getVendorMasterList(), getCountries()]);
      setVendors(Array.isArray(vendorList) ? vendorList : []);
      setCountries(Array.isArray(countryList) ? countryList : []);
    } catch (fetchError) {
      console.error('Vendor master load error:', fetchError);
      setError('Failed to load vendor master data.');
      toast.error('Failed to load vendor master data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredVendors = useMemo(
    () => vendors.filter((vendor) => matchesSearch(vendor, searchTerm)),
    [vendors, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedVendors = filteredVendors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startRow = filteredVendors.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredVendors.length);

  const handleCreateVendor = async (formData) => {
    const payload = {
      VENDOR_NAME: formData.vendor_name,
      CONTACT_NO: formData.contact_no,
      COUNTRY_ID: Number(formData.country_id),
      VENDOR_TYPE: formData.vendor_type,
      EMAIL_ID: formData.email_id,
      CONTACT_PERSON: formData.contact_person,
    };

    await createVendor(payload);
    toast.success('Vendor created successfully.');
    await loadData();
  };

  const handleRefresh = async () => {
    await loadData();
    setActionsOpen(false);
    toast.success('Vendor master refreshed.');
  };

  if (loading) {
    return (
      <div className="customer-list-container">
        <Loader message="Loading vendor master..." />
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
    <div className="vendor-master-page">
      <div className="vendor-master-shell">
        <div className="vendor-master-header">
          <div className="header-title-wrapper">
            <Building2 className="header-icon" size={36} strokeWidth={1.5} />
            <div>
              <h1 className="ats-heading-1">Vendor Master</h1>
              <p className="ats-body-small">Manage vendor records in a clean, searchable workspace.</p>
            </div>
          </div>
        </div>

        <div className="vendor-master-panel">
          <div className="demand-report-toolbar">
            <div className="vendor-master-search">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search vendor master..."
              />
            </div>

            <div className="demand-report-actions" ref={actionsRef}>
              <button
                className={`btn-secondary demand-report-action-trigger ${actionsOpen ? 'active' : ''}`}
                onClick={() => setActionsOpen((previous) => !previous)}
              >
                Actions
                <ChevronDown size={15} />
              </button>

              {actionsOpen && (
                <div className="demand-report-action-menu">
                  <button
                    className="action-menu-item"
                    onClick={() => {
                      setShowAddModal(true);
                      setActionsOpen(false);
                    }}
                  >
                    <span className="action-menu-icon"><Plus size={16} /></span>
                    <span className="action-menu-label">Add New Vendor</span>
                  </button>

                  <button className="action-menu-item" onClick={handleRefresh}>
                    <span className="action-menu-icon"><RefreshCw size={16} /></span>
                    <span className="action-menu-label">Refresh Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="vendor-master-table-wrap">
            <table className="vendor-master-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Contact No</th>
                  <th>Email ID</th>
                  <th>Contact Person</th>
                  <th>Vendor Type</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {pagedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="vendor-master-empty">No vendors matched the search.</td>
                  </tr>
                ) : (
                  pagedVendors.map((vendor, index) => (
                    <tr key={vendor.vendor_id || `${currentPage}-${index}`}>
                      <td>{formatCell(vendor.vendor_name)}</td>
                      <td>{formatCell(vendor.contact_no)}</td>
                      <td>{formatCell(vendor.email_id)}</td>
                      <td>{formatCell(vendor.contact_person)}</td>
                      <td>{formatCell(vendor.vendor_type)}</td>
                      <td>{formatCell(vendor.country_name) !== '-' ? formatCell(vendor.country_name) : readCountry(vendor.country_id, countries)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="demand-report-table-meta">
            <span>{startRow} - {endRow} of {filteredVendors.length}</span>
          </div>

          <div className="demand-report-pagination">
            <button className="page-btn" onClick={() => setPage((previous) => Math.max(1, previous - 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button className="page-btn" onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>

      <VendorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateVendor}
        countries={countries}
      />
    </div>
  );
};

export default VendorMasterPage;
