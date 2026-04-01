import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../global.css';

const CustomerCard = ({ customer, onCardClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onCardClick) onCardClick(customer);
    navigate(`/customers/${customer.customer_id}`, {
      state: { customer }  // Pass full customer object — stats load instantly
    });
  };

  return (
    <div className="customer-card" onClick={handleClick}>
      <div className="card-header">
        <div className="customer-avatar">{customer.customer_code}</div>
        <div className="customer-title">
          <h3 className="customer-name">{customer.customer_name}</h3>
          <p className="industry-name">{customer.industry_name}</p>
        </div>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">Active</span>
          <span className="stat-value">{customer.total_active_demands || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Open</span>
          <span className="stat-value">{customer.open_positions || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Closed</span>
          <span className="stat-value">{customer.closed_positions || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Lost</span>
          <span className="stat-value">{customer.lost || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Billing Loss</span>
          <span className="stat-value">{customer.billing_loss || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;