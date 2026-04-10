import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCustomer, updateCustomer } from '../../../services/customerService';
import { getIndustries, getTypes, getEngagementTypes, getCountries } from '../../../services/lovService';
import { getCustomerDetails } from '../../../services/customerDetailService';
import Loader from '../../common/Loader';
import '../../../global.css';
import { toast } from '../../../components/toast/index';  
import { validateRequiredFields } from '../../../utils/formValidation';

const CustomerCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    CUSTOMER_NAME: '',
    CUSTOMER_CODE: '',
    INDUSTRY_ID: '',
    TYPE_ID: '',
    ENGAGEMENT_TYPE_ID: '',
    COUNTRY_ID: '',
    WEB_SITE: '',
    CUSTOMER_NOTES: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lovLoading, setLovLoading] = useState(true);
  const [lovError, setLovError] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // LOV data state
  const [industries, setIndustries] = useState([]);
  const [types, setTypes] = useState([]);
  const [engagementTypes, setEngagementTypes] = useState([]);
  const [countries, setCountries] = useState([]);

  const toFormValue = (value) => (value === null || value === undefined ? '' : String(value));

  useEffect(() => {
    const fetchLovData = async () => {
      try {
        setLovLoading(true);
        setLovError(null);

        // Fetch all LOV data in parallel using Promise.all
        const [industriesData, typesData, engagementTypesData, countriesData] = await Promise.all([
          getIndustries(),
          getTypes(),
          getEngagementTypes(),
          getCountries()
        ]);

        // Set the data in state
        setIndustries(industriesData);
        setTypes(typesData);
        setEngagementTypes(engagementTypesData);
        setCountries(countriesData);

      } catch (error) {
        console.error('Error fetching LOV data:', error);
        setLovError('Failed to load form data. Please refresh the page.');
      } finally {
        setLovLoading(false);
      }
    };

    fetchLovData();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const findLovValueByLabel = (items, label) => {
      if (!label || !Array.isArray(items)) return '';
      const normalizedLabel = String(label).trim().toLowerCase();
      const match = items.find((item) => String(item.label).trim().toLowerCase() === normalizedLabel);
      return match ? String(match.value) : '';
    };

    const fetchCustomerForEdit = async () => {
      try {
        setDetailsLoading(true);
        const result = await getCustomerDetails(id);
        const customer = result?.customer || {};

        setFormData({
          CUSTOMER_NAME: customer.customer_name || customer.CUSTOMER_NAME || '',
          CUSTOMER_CODE: customer.customer_code || customer.CUSTOMER_CODE || '',
          INDUSTRY_ID: toFormValue(
            customer.industry_id ||
            customer.INDUSTRY_ID ||
            findLovValueByLabel(industries, customer.industry_name || customer.INDUSTRY_NAME)
          ),
          TYPE_ID: toFormValue(
            customer.type_id ||
            customer.TYPE_ID ||
            findLovValueByLabel(types, customer.type_name || customer.TYPE_NAME)
          ),
          ENGAGEMENT_TYPE_ID: toFormValue(
            customer.engagement_type_id ||
            customer.ENGAGEMENT_TYPE_ID ||
            findLovValueByLabel(
              engagementTypes,
              customer.engagement_type_name || customer.ENGAGEMENT_TYPE_NAME
            )
          ),
          COUNTRY_ID: toFormValue(
            customer.country_id ||
            customer.COUNTRY_ID ||
            findLovValueByLabel(countries, customer.country_name || customer.COUNTRY_NAME)
          ),
          WEB_SITE: customer.web_site || customer.WEB_SITE || customer.website || '',
          CUSTOMER_NOTES: customer.customer_notes || customer.CUSTOMER_NOTES || '',
        });
      } catch (error) {
        console.error('Error fetching customer details for edit:', error);
        setLovError('Failed to load customer data. Please try again.');
      } finally {
        setDetailsLoading(false);
      }
    };

    if (!lovLoading) {
      fetchCustomerForEdit();
    }
  }, [isEditMode, id, lovLoading, industries, types, engagementTypes, countries]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (!isEditMode && name === 'CUSTOMER_NAME') {
      // When customer name changes, auto-fill customer code with first 5 letters
      const autoCode = value.substring(0, 5).toUpperCase();
      setFormData(prev => ({
        ...prev,
        [name]: value,
        CUSTOMER_CODE: autoCode
      }));
    } else if (name === 'CUSTOMER_CODE') {
      // Convert customer code to uppercase
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const result = validateRequiredFields(
      {
        CUSTOMER_NAME: formData.CUSTOMER_NAME,
        CUSTOMER_CODE: formData.CUSTOMER_CODE,
        INDUSTRY_ID: formData.INDUSTRY_ID,
        TYPE_ID: formData.TYPE_ID,
        ENGAGEMENT_TYPE_ID: formData.ENGAGEMENT_TYPE_ID,
        COUNTRY_ID: formData.COUNTRY_ID,
      },
      {
        toastKey: 'customer-create-form',
        formId: 'customer-form',
      }
    );

    const newErrors = { ...result.errors };

    if (formData.CUSTOMER_CODE.trim() && formData.CUSTOMER_CODE.length > 5) {
      newErrors.CUSTOMER_CODE = 'Customer code must be 5 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form submission started');
    console.log('Form data:', formData);

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form validation passed, proceeding with API call');

    setLoading(true);
    setErrors({});

    try {
      // Prepare payload with correct data types
      const payload = {
        CUSTOMER_NAME: formData.CUSTOMER_NAME,
        CUSTOMER_CODE: formData.CUSTOMER_CODE,
        INDUSTRY_ID: Number(formData.INDUSTRY_ID),
        TYPE_ID: formData.TYPE_ID ? Number(formData.TYPE_ID) : null,
        ENGAGEMENT_TYPE_ID: formData.ENGAGEMENT_TYPE_ID ? Number(formData.ENGAGEMENT_TYPE_ID) : null,
        COUNTRY_ID: Number(formData.COUNTRY_ID),
        WEB_SITE: formData.WEB_SITE || null,
        CUSTOMER_NOTES: formData.CUSTOMER_NOTES || null
      };

      console.log('Customer Creation Payload:', payload);

      const response = isEditMode
        ? await updateCustomer(id, payload)
        : await createCustomer(payload);

      console.log(`Customer ${isEditMode ? 'Update' : 'Creation'} Success:`, response);

      toast.success(isEditMode ? 'Customer updated successfully!' : 'Customer created successfully!');

      setTimeout(() => {
        navigate(isEditMode ? `/customers/${id}` : '/');
      }, 1200);
    } catch (error) {
      console.error('Customer Creation Error:', error);
      console.error('Error Response:', error.response);
      console.error('Error Data:', error.response?.data);

      let errorMessage = 'Failed to create customer. Please try again.';

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            errorMessage = data?.message || data?.error || 'Invalid data provided. Please check your input.';
            break;
          case 401:
            errorMessage = 'Authentication required. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to create customers.';
            break;
          case 404:
            errorMessage = 'API endpoint not found. Please contact support.';
            break;
          case 409:
            errorMessage = data?.message || 'Customer already exists.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = data?.message || data?.error || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        // Other error
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      setErrors({
        submit: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isEditMode ? `/customers/${id}` : '/');
  };

  // Show loading state while fetching LOV data
  if (lovLoading || detailsLoading) {
    return (
      <div className="customer-list-container">
        <div className="form-container">
          <Loader message={isEditMode ? 'Loading customer data...' : 'Loading form data...'} />
        </div>
      </div>
    );
  }

  // Show error state if LOV data failed to load
  if (lovError) {
    return (
      <div className="customer-list-container">
        <div className="form-container">
          <div className="error-message">
            {lovError}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-list-container">
      <div className="form-container">
          <div className="form-header">
          <h2 className="ats-heading-2">{isEditMode ? 'Edit Customer' : 'Create New Customer'}</h2>
          <div className="form-header-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" form="customer-form" className="btn-primary" disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Customer' : 'Create Customer')}
            </button>
          </div>
        </div>

        <form id="customer-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                name="CUSTOMER_NAME"
                className="form-input"
                value={formData.CUSTOMER_NAME}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                required
              />
              {errors.CUSTOMER_NAME && <span className="form-error">{errors.CUSTOMER_NAME}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Customer Code *</label>
              <input
                type="text"
                name="CUSTOMER_CODE"
                className="form-input"
                value={formData.CUSTOMER_CODE}
                onChange={handleInputChange}
                maxLength="5"
                required
              />
              {errors.CUSTOMER_CODE && <span className="form-error">{errors.CUSTOMER_CODE}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Industry *</label>
              <select
                name="INDUSTRY_ID"
                className="form-select"
                value={formData.INDUSTRY_ID}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Industry</option>
                {Array.isArray(industries) && industries.map(industry => (
                  <option key={industry.value} value={industry.value}>
                    {industry.label}
                  </option>
                ))}
              </select>
              {errors.INDUSTRY_ID && <span className="form-error">{errors.INDUSTRY_ID}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                name="TYPE_ID"
                className="form-select"
                value={formData.TYPE_ID}
                onChange={handleInputChange}
              >
                <option value="">Select Type</option>
                {Array.isArray(types) && types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.TYPE_ID && <span className="form-error">{errors.TYPE_ID}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Engagement Type *</label>
              <select
                name="ENGAGEMENT_TYPE_ID"
                className="form-select"
                value={formData.ENGAGEMENT_TYPE_ID}
                onChange={handleInputChange}
              >
                <option value="">Select Engagement Type</option>
                {Array.isArray(engagementTypes) && engagementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                  
                ))}
              </select>
              {errors.ENGAGEMENT_TYPE_ID && <span className="form-error">{errors.ENGAGEMENT_TYPE_ID}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Country *</label>
              <select
                name="COUNTRY_ID"
                className="form-select"
                value={formData.COUNTRY_ID}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Country</option>
                {Array.isArray(countries) && countries.map(country => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
              {errors.COUNTRY_ID && <span className="form-error">{errors.COUNTRY_ID}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              name="WEB_SITE"
              className="form-input"
              value={formData.WEB_SITE}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="CUSTOMER_NOTES"
              className="form-textarea"
              value={formData.CUSTOMER_NOTES}
              onChange={handleInputChange}
              rows="4"
            />
          </div>

          {errors.submit && (
            <div className="form-error" style={{ textAlign: 'center', marginBottom: '16px' }}>
              {errors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CustomerCreate;
