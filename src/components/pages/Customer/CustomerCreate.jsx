import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer } from '../../../services/customerService';
import { getIndustries, getTypes, getEngagementTypes, getCountries } from '../../../services/lovService';
import '../../../global.css';
import { toast } from '../../../components/Toast';  

const CustomerCreate = () => {
  const navigate = useNavigate();
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
  const [success, setSuccess] = useState(false);
  const [lovLoading, setLovLoading] = useState(true);
  const [lovError, setLovError] = useState(null);

  // LOV data state
  const [industries, setIndustries] = useState([]);
  const [types, setTypes] = useState([]);
  const [engagementTypes, setEngagementTypes] = useState([]);
  const [countries, setCountries] = useState([]);

  // Fetch LOV data on component mount
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'CUSTOMER_NAME') {
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
    const newErrors = {};

    if (!formData.CUSTOMER_NAME.trim()) {
      newErrors.CUSTOMER_NAME = 'Customer name is required';
    }

    if (!formData.CUSTOMER_CODE.trim()) {
      newErrors.CUSTOMER_CODE = 'Customer code is required';
    } else if (formData.CUSTOMER_CODE.length > 5) {
      newErrors.CUSTOMER_CODE = 'Customer code must be 5 characters or less';
    }

    if (!formData.INDUSTRY_ID) {
      newErrors.INDUSTRY_ID = 'Industry is required';
    }

    if (!formData.COUNTRY_ID) {
      newErrors.COUNTRY_ID = 'Country is required';
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

      const response = await createCustomer(payload);
      console.log('Customer Creation Success:', response);

      setSuccess(true);
toast.success('Customer created successfully!');

      // Redirect to customer list after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
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
    navigate('/');
  };

  // Show loading state while fetching LOV data
  if (lovLoading) {
    return (
      <div className="customer-list-container">
        <div className="form-container">
          <div className="loading-message">
            Loading form data...
          </div>
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
          <h2 className="ats-heading-2">Create New Customer</h2>
          <div className="form-header-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" form="customer-form" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Customer'}
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
                required
              >
                <option value="">Select Type</option>
                {Array.isArray(types) && types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
                required
              >
                <option value="">Select Engagement Type</option>
                {Array.isArray(engagementTypes) && engagementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                  
                ))}
              </select>
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