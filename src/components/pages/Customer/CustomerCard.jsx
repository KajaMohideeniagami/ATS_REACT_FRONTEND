import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../global.css';

const CustomerCard = ({ customer, onCardClick }) => {
  const navigate = useNavigate();
  const customerBadge = (customer.customer_code || customer.customer_name || 'CUS')
    .replace(/\s+/g, '')
    .slice(0, 4)
    .toUpperCase();
  const stats = [
    { label: 'Active', value: customer.total_active_demands || 0 },
    { label: 'Open', value: customer.open_positions || 0 },
    { label: 'Closed', value: customer.closed_positions || 0 },
    { label: 'Lost', value: customer.lost || 0 },
    { label: 'Billing Loss', value: customer.billing_loss || 0, wide: true },
  ];

  const handleClick = () => {
    if (onCardClick) onCardClick(customer);
    navigate(`/customers/${customer.customer_id}`, {
      state: { customer }  // Pass full customer object — stats load instantly
    });
  };

  return (
    <div className="customer-card" onClick={handleClick}>
      <div className="card-header">
        <div className="customer-avatar">{customerBadge}</div>
        <div className="customer-title">
          <h3 className="customer-name">{customer.customer_name}</h3>
          <p className="industry-name">{customer.industry_name || 'Industry not available'}</p>
        </div>
      </div>

      <div className="card-stats">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-item${stat.wide ? ' wide' : ''}`}>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerCard;
