import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  BriefcaseBusiness,
  Globe2,
  MapPinned,
  Target,
  CircleDollarSign,
  TrendingDown,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { getDashboardSummary } from '../../../services/dashboardService';
import '../../../global.css';

const CARD_META = {
  'Total Customer': {
    icon: Building2,
    eyebrow: 'Customer Base',
  },
  'Total Active Customer': {
    icon: Users,
    eyebrow: 'Live Accounts',
  },
  'Total Demand - Offshore': {
    icon: Globe2,
    eyebrow: 'Demand Flow',
  },
  'Total Demand - Onsite': {
    icon: MapPinned,
    eyebrow: 'Demand Flow',
  },
  'Total Open Position - Offshore': {
    icon: BriefcaseBusiness,
    eyebrow: 'Open Positions',
  },
  'Total Open Position - Onsite': {
    icon: BriefcaseBusiness,
    eyebrow: 'Open Positions',
  },
  'Total Lost - Offshore': {
    icon: TrendingDown,
    eyebrow: 'Loss Monitor',
  },
  'Total Lost - Onsite': {
    icon: TrendingDown,
    eyebrow: 'Loss Monitor',
  },
  'Total Onboarded - Offshore': {
    icon: UserCheck,
    eyebrow: 'Delivery Outcome',
  },
  'Total Onboarded - Onsite': {
    icon: UserCheck,
    eyebrow: 'Delivery Outcome',
  },
  'Total Billing Loss - Offshore': {
    icon: CircleDollarSign,
    eyebrow: 'Billing Risk',
  },
  'Total Billing Loss - Onsite': {
    icon: AlertTriangle,
    eyebrow: 'Billing Risk',
  },
};

const DashboardPage = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const summary = await getDashboardSummary();
        setCards(summary);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        {loading ? (
          <div className="dashboard-state-card">Loading dashboard metrics...</div>
        ) : error ? (
          <div className="dashboard-state-card error">{error}</div>
        ) : (
          <div className="dashboard-grid">
            {cards.map((card, index) => {
              const meta = CARD_META[card.card_label] || {
                icon: Target,
                eyebrow: 'Summary',
              };
              const Icon = meta.icon;

              return (
                <article key={`${card.card_label}-${index}`} className="dashboard-card">
                  <div className="dashboard-card-top">
                    <div className="dashboard-card-heading">
                      <span className="dashboard-card-icon">
                        <Icon size={18} />
                      </span>
                      <div className="dashboard-card-copy">
                        <span className="dashboard-card-eyebrow">{meta.eyebrow}</span>
                        <h3 className="dashboard-card-title">{card.card_label}</h3>
                      </div>
                    </div>
                    <span className="dashboard-count-badge">{card.total_count}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-page {
          min-height: 100vh;
          padding: 22px 18px 28px;
          background:
            radial-gradient(circle at top left, rgba(91, 110, 225, 0.12), transparent 24%),
            linear-gradient(180deg, #eef4fb 0%, #f8fafc 46%, #eef2f7 100%);
        }
        .dashboard-shell {
          max-width: 1360px;
          margin: 0 auto;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(320px, 1fr));
          gap: 14px;
        }
        .dashboard-card {
          position: relative;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          padding: 22px;
          min-height: 142px;
          display: flex;
          align-items: center;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .dashboard-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top right, rgba(91, 110, 225, 0.1), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.24), transparent 44%);
          pointer-events: none;
        }
        .dashboard-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          width: 100%;
          position: relative;
          z-index: 1;
        }
        .dashboard-card-heading {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .dashboard-card-icon {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: linear-gradient(135deg, #5b6ee1 0%, #7c5bd6 100%);
          color: #ffffff;
          box-shadow: 0 14px 22px rgba(91, 110, 225, 0.24);
          flex-shrink: 0;
        }
        .dashboard-card-copy {
          min-width: 0;
        }
        .dashboard-card-eyebrow {
          display: inline-flex;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          color: #64748b;
        }
        .dashboard-card-title {
          font-size: 18px;
          line-height: 1.35;
          color: #1e293b;
          margin: 0;
          max-width: 360px;
        }
        .dashboard-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 88px;
          padding: 16px 18px;
          border-radius: 20px;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          border: 1px solid rgba(148, 163, 184, 0.16);
          color: #1e293b;
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -1px;
          flex-shrink: 0;
        }
        .dashboard-state-card {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          padding: 24px;
          text-align: center;
          color: var(--ats-primary);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }
        .dashboard-state-card.error {
          color: #b91c1c;
          background: rgba(254, 242, 242, 0.92);
        }
        @media (max-width: 960px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .dashboard-page {
            padding: 14px 10px 24px;
          }
          .dashboard-card {
            min-height: 120px;
            padding: 18px;
          }
          .dashboard-card-top {
            align-items: flex-start;
            gap: 12px;
          }
          .dashboard-card-heading {
            gap: 12px;
          }
          .dashboard-card-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
          }
          .dashboard-card-title {
            font-size: 15px;
          }
          .dashboard-count-badge {
            min-width: 72px;
            padding: 14px 16px;
            border-radius: 18px;
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
