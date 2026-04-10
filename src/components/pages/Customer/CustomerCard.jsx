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

  const handleOpen = (event) => {
    event.stopPropagation();
    if (onCardClick) onCardClick(customer);
    navigate(`/customers/${customer.customer_id}`, {
      state: { customer },
    });
  };

  const handleClick = () => {
    if (onCardClick) onCardClick(customer);
  };

  return (
    <div
      className="customer-card customer-card-static"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Customer card for ${customer.customer_name}`}
    >
      <div className="back-header customer-static-header">
        <div className="customer-back-title">
          <div className="customer-avatar">{customerBadge}</div>
          <div className="customer-back-heading">
            <p className="industry-name">Customer Metrics</p>
            <h3 className="customer-name">{customer.customer_name}</h3>
          </div>
        </div>

        <button type="button" className="customer-open-btn" onClick={handleOpen}>
          Open
        </button>
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
