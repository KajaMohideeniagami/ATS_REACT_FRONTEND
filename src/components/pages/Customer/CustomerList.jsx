import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import CustomerCard from './CustomerCard';
import Loader from '../../common/Loader';
import { getProfiles } from '../../../services/api';
import '../../../global.css';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getProfiles();
        setCustomers(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleCardClick = (customer) => {
    console.log('Selected customer:', customer);
  };

  const handleAddCustomer = () => {
    navigate('/customers/create');
  };



  if (loading) {
    return (
      <div className="customer-list-container">
        <Loader message="Loading customers..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-list-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="customer-list-container">
      <div className="customer-list-header">
        <div className="header-title-wrapper">
          <Handshake className="header-icon" size={36} strokeWidth={1.5} />
          <h1 className="ats-heading-1">Customer</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn-primary" onClick={handleAddCustomer}>
            Add Customer
          </button>
        </div>
      </div>
      <div className="customer-grid">
        {customers.map((customer) => (
          <CustomerCard
            key={customer.customer_id}
            customer={customer}
            onCardClick={handleCardClick}
          />
        ))}
      </div>
    </div>
  );
};

export default CustomerList;
