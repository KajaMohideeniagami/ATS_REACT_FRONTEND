import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getCustomerDetails } from "../../../services/customerDetailService";
import { getDemandDownloadUrl } from "../../../services/demandService";
import {
  ArrowLeft, Pencil, Eye,
  ChevronLeft, ChevronRight, Plus,
  UserPlus, Briefcase, User, Activity, Mail,
  ChevronDown, Trash2
} from "lucide-react";
import "../../../global.css";
import AddContactModal from './AddContactModal';
import AddDemandModal from './AddDemandModal';
import AddProfileModal from './AddProfileModal';
import ProfileStatusModal from '../ProfileStatus/ProfileStatus';
import SendEmailToVendorsModal from './SendEmailToVendorsModal';
import ViewDemandRequestModal from './ViewDemandRequestModal';
import EditDemandModal from './EditDemandModal';
import { deleteContact } from "../../../services/contactService";
import { toast } from "../../Toast";
const TABS = [
  { key: "all",      label: "Show All" },
  { key: "details",  label: "Customer Details" },
  { key: "contacts", label: "Contacts" },
  { key: "demands",  label: "Demand Request" },
  { key: "profiles", label: "Demand Profile Mapping" },
  { key: "emails",   label: "Demand Mail to Vendor" },
];

const PAGE_SIZE = 15;

// ── Pagination ─────────────────────────────────────────────────────────────
const Pagination = ({ total, page, onPage }) => {
  if (total <= PAGE_SIZE) return null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <span className="page-info">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="page-btns">
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => onPage(p)}>
            {p}
          </button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

const paginate = (data, page) => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

const getContactId = (contact) =>
  contact?.customer_contact_id ||
  contact?.CUSTOMER_CONTACT_ID ||
  contact?.contact_id ||
  contact?.CONTACT_ID ||
  null;

// ═══════════════════════════════════════════════════════════════════════════
const CustomerDetail = () => {
  const { id }    = useParams();
  const { state } = useLocation();
  const navigate  = useNavigate();
  const cardData  = state?.customer || {};

  const [activeTab,      setActiveTab]      = useState("all");
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [deletingContact, setDeletingContact] = useState(false);
  const [showAddDemand, setShowAddDemand] = useState(false);
  const [showActions,    setShowActions]    = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showSendEmailToVendors, setShowSendEmailToVendors] = useState(false);
  const [viewDemandId, setViewDemandId] = useState(null);
  const [editDemandId, setEditDemandId] = useState(null);
  const [selectedDemandId, setSelectedDemandId] = useState(null);
  const [selectedDemandInfo, setSelectedDemandInfo] = useState(null);
  const [showProfileStatus, setShowProfileStatus] = useState(false);
  const actionsRef = useRef(null);

  const [demandsPage,  setDemandsPage]  = useState(1);
  const [profilesPage, setProfilesPage] = useState(1);
  const [emailsPage,   setEmailsPage]   = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getCustomerDetails(id);
      setData(result);
    } catch (err) {
      setError("Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    setDemandsPage(1);
    setProfilesPage(1);
    setEmailsPage(1);
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const customer = data?.customer      || {};
  const contacts = data?.contacts      || [];
  const demands  = data?.demands       || [];
  const profiles = data?.profiles      || [];
  const emails   = data?.vendor_emails || [];

  const demandsSlice  = paginate(demands,  demandsPage);
  const profilesSlice = paginate(profiles, profilesPage);
  const emailsSlice   = paginate(emails,   emailsPage);

  const showSection = (key) => activeTab === "all" || activeTab === key;

  // ── Quick actions list ─────────────────────────────────────────────────
  const quickActions = [
    { label: "Add Contact",icon: <UserPlus  size={14} />, action: () => { setShowActions(false); setEditingContact(null); setShowAddContact(true); } },
    { label: "Add Demand", icon: <Briefcase size={14} />, action: () => { setShowActions(false); setShowAddDemand(true); } },
    { label: "Add Profile", icon: <User size={14} />, action: () => { setShowActions(false); setSelectedDemandId(null); setSelectedDemandInfo(null); setShowAddProfile(true); } },
    { label: "Profile Status", icon: <Activity size={14} />, action: () => { setShowActions(false); setShowProfileStatus(true); } },
    { label: "Send Email To Vendors", icon: <Mail size={14} />, action: () => { setShowActions(false); setShowSendEmailToVendors(true); } },
  ];

  const handleDeleteContact = async (contact) => {
    setContactToDelete(contact);
  };

  const handleDemandDownload = async (demandId, fileType = "IQ") => {
    if (!demandId) {
      toast.error("Demand ID not found for this row.");
      return;
    }

    try {
      const response = await getDemandDownloadUrl(demandId, fileType);
      if (!response.success || !response.download_url) {
        toast.error(response.message || "Failed to generate download link.");
        return;
      }

      window.open(response.download_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download file.");
    }
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    const contactId = getContactId(contactToDelete);
    if (!contactId) {
      toast.error("Contact ID not found for this row.");
      return;
    }

    setDeletingContact(true);
    try {
      const response = await deleteContact({
        customer_contact_id: contactId,
      });

      if (response.success) {
        toast.success("Contact deleted successfully!");
        setContactToDelete(null);
        loadData();
      } else {
        toast.error(response.message || "Failed to delete contact.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete contact.");
    } finally {
      setDeletingContact(false);
    }
  };

  return (
    <div className="detail-page">

      {/* ── Header ── */}
      <div className="detail-header">
        <div className="detail-header-left">
          <button className="btn-icon" onClick={() => navigate("/")}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="ats-heading-1">
            {cardData.customer_name || customer.customer_name || "—"}
          </h1>
        </div>

        {/* ── Header Right: Edit + Quick Actions ── */}
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate(`/customers/${id}/edit`)}>
            <Pencil size={14} style={{ marginRight: 6 }} />
            Edit Customer
          </button>

          {/* Quick Actions Dropdown */}
          <div className="quick-actions-wrap" ref={actionsRef}>
            <button
              className="btn-quick-actions"
              onClick={() => setShowActions(!showActions)}
            >
              Actions <ChevronDown size={14} style={{ marginLeft: 4, transform: showActions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showActions && (
              <div className="quick-actions-dropdown">
                {quickActions.map((item, i) => (
                  <button key={i} className="quick-action-item" onClick={item.action}>
                    <span className="quick-action-icon">{item.icon}</span>
                    <span className="quick-action-label">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="detail-stats-bar">
        <span><strong>Total Active Demands:</strong> {cardData.total_active_demands ?? 0}</span>
        <span className="stat-divider">|</span>
        <span><strong>Open Positions:</strong> {cardData.open_positions ?? 0}</span>
        <span className="stat-divider">|</span>
        <span><strong>Closed Positions:</strong> {cardData.closed_positions ?? 0}</span>
        <span className="stat-divider">|</span>
        <span><strong>Lost:</strong> {cardData.lost ?? 0}</span>
        <span className="stat-divider">|</span>
        <span><strong>Billing Loss:</strong> {cardData.billing_loss ?? 0}</span>
      </div>

      {/* ── Tabs ── */}
      <div className="detail-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`detail-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="detail-content">
        {loading ? (
          <div className="loading">Loading customer details...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>

            {/* ══ CUSTOMER DETAILS ══ */}
            {showSection("details") && (
              <div className="detail-section">
                <h3 className="detail-section-title">Customer Details</h3>
                <div className="ats-table-wrap">
                  <table className="ats-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Customer Code</th>
                        <th>Country</th>
                        <th>Region</th>
                        <th>Industry</th>
                        <th>Type</th>
                        <th>Engagement Type</th>
                        <th>Website</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{customer.customer_name || cardData.customer_name || "—"}</td>
                        <td><span className="t-badge">{customer.customer_code || "—"}</span></td>
                        <td>{customer.country_name  || "—"}</td>
                        <td>{customer.region_name   || "—"}</td>
                        <td>{customer.industry_name || cardData.industry_name || "—"}</td>
                        <td>{customer.type_name     || "—"}</td>
                        <td>{customer.engagement_type_name || "—"}</td>
                        <td>
                          {customer.website ? (
                            <a href={customer.website} target="_blank" rel="noreferrer" className="t-link">
                              {customer.website}
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ CONTACTS ══ */}
            {showSection("contacts") && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  Contacts <span className="section-count">{contacts.length}</span>
                  <button className="btn-add-section" onClick={() => { setEditingContact(null); setShowAddContact(true); }}>
                    <Plus size={14} /> Add Contact
                  </button>
                </h3>
                {contacts.length === 0 ? (
                  <p className="detail-empty">No contacts found.</p>
                ) : (
                  <div className="ats-table-wrap">
                    <table className="ats-table">
                      <thead>
                        <tr>
                          <th className="col-actions"></th>
                          <th>Name</th>
                          <th>Designation</th>
                          <th>Phone</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((c, i) => (
                          <tr key={i}>
                            <td className="col-actions">
                              <div className="action-btns">
                                <button
                                  className="action-btn edit"
                                  title="Edit"
                                  onClick={() => {
                                    setEditingContact(c);
                                    setShowAddContact(true);
                                  }}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  className="action-btn delete"
                                  title="Delete"
                                  onClick={() => handleDeleteContact(c)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                            <td>{c.contact_name || "—"}</td>
                            <td>{c.designation  || "—"}</td>
                            <td>{c.contact_no   || "—"}</td>
                            <td>{c.email || c.email_id || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ DEMAND REQUEST ══ */}
            {showSection("demands") && (
              <div className="detail-section">
              <h3 className="detail-section-title">
                Demand Request <span className="section-count">{demands.length}</span>
                <button className="btn-add-section" onClick={() => setShowAddDemand(true)}>
                  <Plus size={14} /> Add Demand
                </button>
              </h3>
                {demands.length === 0 ? (
                  <p className="detail-empty">No demands found.</p>
                ) : (
                  <>
                    <div className="ats-table-wrap">
                      <table className="ats-table">
                        <thead>
                          <tr>
                            <th className="col-actions"></th>
                            <th>Demand Code</th>
                            <th>Demand Type</th>
                            <th>Job Type</th>
                            <th>Job Role</th>
                            <th>No Of Position</th>
                            <th>Work Mode</th>
                            <th>Demand Date</th>
                            <th>Billable Date</th>
                            <th>Decision</th>
                            <th>Demand Status</th>
                            <th>Demand Ageing</th>
                            <th>Billing Ageing</th>
                            <th>Download IQ</th>
                            <th>Assigned To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {demandsSlice.map((d, i) => (
                            <tr key={i}>
                              <td className="col-actions">
                                <div className="action-btns">
                                  <button className="action-btn view" title="View" onClick={() => setViewDemandId(d.demand_id)}><Eye size={13} /></button>
                                  <button className="action-btn edit" title="Edit" onClick={() => setEditDemandId(d.demand_id)}><Pencil size={13} /></button>
                                </div>
                              </td>
                              <td><span className="t-badge">{d.demand_code || "—"}</span></td>
                              <td>{d.demand_type || "—"}</td>
                              <td>{d.job_type_name  || d.job_type_id  || "—"}</td>
                              <td>{d.job_role       || "—"}</td>
                              <td>{d.no_of_position ?? "—"}</td>
                              <td>{d.work_mode_name || d.work_mode_id || "—"}</td>
                              <td>{d.demand_date    || "—"}</td>
                              <td>{d.billable_date  || "—"}</td>
                              <td>{d.decision_status_name || d.des_status_id || "—"}</td>
                              <td>
                                <span className={`t-status ${d.demand_status?.toLowerCase()}`}>
                                  {d.demand_status || "—"}
                                </span>
                              </td>
                              <td>{d.demand_ageing  ?? "—"}</td>
                              <td>{d.billing_ageing ?? "—"}</td>
                              <td>
                                {d.file_name ? (
                                  <button
                                    type="button"
                                    className="table-link-btn"
                                    onClick={() => handleDemandDownload(d.demand_id, "IQ")}
                                  >
                                    Download
                                  </button>
                                ) : "—"}
                              </td>
                              <td>{d.assigned_to_name || d.assigned_to || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination total={demands.length} page={demandsPage} onPage={setDemandsPage} />
                  </>
                )}
              </div>
            )}

            {/* ══ DEMAND PROFILE MAPPING ══ */}
            {showSection("profiles") && (
              <div className="detail-section">
              <h3 className="detail-section-title">
                Demand Profile Mapping <span className="section-count">{profiles.length}</span>

                <button
                  className="btn-add-section"
                  onClick={() => {
                    setSelectedDemandId(null); // or default demand
                    setShowAddProfile(true);
                  }}
                >
                  <Plus size={14} /> Add Profile
                </button>
              </h3>
                {profiles.length === 0 ? (
                  <p className="detail-empty">No profiles found.</p>
                ) : (
                  <>
                    <div className="ats-table-wrap">
                      <table className="ats-table">
                        <thead>
                          <tr>
                            <th className="col-actions"></th>
                            <th>Demand Code + Name</th>
                            <th>Profile Code</th>
                            <th>Name</th>
                            <th>Source</th>
                            <th>Match Score</th>
                            <th>Work Mode</th>
                            <th>Current Company</th>
                            <th>Preferred Location</th>
                            <th>Profile Availability</th>
                            <th>Profile Status</th>
                            <th>Contact No</th>
                            <th>Vendor</th>
                            <th>Email</th>
                            <th>Download Profile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profilesSlice.map((p, i) => (
                            <tr key={i}>
                              <td className="col-actions">
                                <div className="action-btns">
                                  <button className="action-btn view" title="View"><Eye    size={13} /></button>
                                  <button className="action-btn edit" title="Edit"><Pencil size={13} /></button>
                                </div>
                              </td>
                              <td>
                                <span className="t-badge">{p.demand_code || "—"}</span>
                                {p.demand_name && (
                                  <span style={{ marginLeft: 6, color: "var(--ats-neutral)", fontSize: 12 }}>
                                    {p.demand_name}
                                  </span>
                                )}
                              </td>
                              <td><span className="t-badge">{p.profile_code || "—"}</span></td>
                              <td>{p.profile_name || "—"}</td>
                              <td>
                                <span className={`t-source ${p.source?.toLowerCase()}`}>{p.source || "—"}</span>
                              </td>
                              <td>
                                {p.ai_profile_score ? (
                                  <span className="match-score">{p.ai_profile_score}</span>
                                ) : "—"}
                              </td>
                              <td>{p.work_mode_name     || "—"}</td>
                              <td>{p.current_company    || "—"}</td>
                              <td>{p.preferred_location || "—"}</td>
                              <td>{p.profile_availability || "—"}</td>
                              <td>
                                {p.profile_status_name ? (
                                  <span className="t-status-profile">{p.profile_status_name}</span>
                                ) : "—"}
                              </td>
                              <td>{p.profile_contact_no || "—"}</td>
                              <td>{p.vendor_name        || "—"}</td>
                              <td>{p.profile_email      || "—"}</td>
                              <td>
                                {p.file_name ? (
                                  <a href={p.file_name} target="_blank" rel="noreferrer" className="t-link">Download</a>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination total={profiles.length} page={profilesPage} onPage={setProfilesPage} />
                  </>
                )}
              </div>
            )}

            {/* ══ DEMAND MAIL TO VENDOR ══ */}
            {showSection("emails") && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  Demand Mail to Vendor <span className="section-count">{emails.length}</span>
                  <button className="btn-add-section" onClick={() => setShowSendEmailToVendors(true)}>
                    <Mail size={14} /> Send Email
                  </button>
                </h3>
                {emails.length === 0 ? (
                  <p className="detail-empty">No vendor emails found.</p>
                ) : (
                  <>
                    <div className="ats-table-wrap">
                      <table className="ats-table">
                        <thead>
                          <tr>
                            <th>Vendor Name</th>
                            <th>Demand Name</th>
                            <th>Vendor Type</th>
                            <th>Type</th>
                            <th>Currency</th>
                            <th>Max</th>
                            <th>Send Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailsSlice.map((e, i) => (
                            <tr key={i}>
                              <td>{e.vendor_name   || "—"}</td>
                              <td>{e.demand_name   || "—"}</td>
                              <td>{e.location_type || "—"}</td>
                              <td>{e.type          || "—"}</td>
                              <td>{e.currency      || "—"}</td>
                              <td>{e.max           ?? "—"}</td>
                              <td>{e.send_date     || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination total={emails.length} page={emailsPage} onPage={setEmailsPage} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ ADD CONTACT MODAL ══ */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => { setShowAddContact(false); setEditingContact(null); }}
        customerId={id}
        onSuccess={loadData}
        editContact={editingContact}
      />

      <AddDemandModal
      isOpen={showAddDemand}
      onClose={() => setShowAddDemand(false)}
      customerId={id}
      onSuccess={loadData}
      />

      <AddProfileModal
        isOpen={showAddProfile}
        onClose={() => setShowAddProfile(false)}
        onSuccess={loadData}
        demandId={selectedDemandId}
        demandType={selectedDemandInfo?.demand_type}
        demands={demands}
        customerId={id}
      />
      <ProfileStatusModal
        customerId={id}
        isOpen={showProfileStatus}
        onClose={() => setShowProfileStatus(false)}
      />
      <SendEmailToVendorsModal
        isOpen={showSendEmailToVendors}
        onClose={() => setShowSendEmailToVendors(false)}
        onSuccess={loadData}
        customerId={id}
        demands={demands}
      />
      <ViewDemandRequestModal
        isOpen={Boolean(viewDemandId)}
        onClose={() => setViewDemandId(null)}
        customerId={id}
        demandId={viewDemandId}
      />
      <EditDemandModal
        isOpen={Boolean(editDemandId)}
        onClose={() => setEditDemandId(null)}
        onSuccess={loadData}
        customerId={id}
        demandId={editDemandId}
      />
      {contactToDelete && (
        <>
          <div className="modal-backdrop" onClick={() => !deletingContact && setContactToDelete(null)} />
          <div className="contact-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-contact-title">
            <div className="contact-delete-header">
              <h2 className="ats-heading-3" id="delete-contact-title">Delete Contact</h2>
            </div>
            <div className="contact-delete-body">
              <p className="contact-delete-text">
                Are you sure you want to delete{" "}
                <strong>{contactToDelete.contact_name || "this contact"}</strong>?
              </p>
            </div>
            <div className="contact-delete-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setContactToDelete(null)}
                disabled={deletingContact}
              >
                Cancel
              </button>
              <button
                type="button"
                className="contact-delete-btn"
                onClick={confirmDeleteContact}
                disabled={deletingContact}
              >
                {deletingContact ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }
        .detail-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 32px 24px;
        }

        /* ── Header ── */
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          max-width: 1440px;
          margin-left: auto;
          margin-right: auto;
        }
        .detail-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* ── Header right: Edit + Actions dropdown ── */
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }

        /* Actions dropdown trigger */
        .btn-quick-actions {
          display: inline-flex;
          align-items: center;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--ats-primary);
          background: #ffffff;
          border: 2px solid var(--ats-border);
          border-radius: 8px;
          padding: 10px 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .btn-quick-actions:hover {
          border-color: var(--ats-primary);
          background: var(--ats-bg-accent);
        }

        /* Dropdown panel */
        .quick-actions-wrap {
          position: relative;
        }
        .quick-actions-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 999;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid var(--ats-border);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          min-width: 220px;
          overflow: hidden;
          animation: dropdownIn 0.15s ease;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .quick-action-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 1px solid var(--ats-border-light);
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: 'Inter', sans-serif;
          text-align: left;
        }
        .quick-action-item:last-child { border-bottom: none; }
        .quick-action-item:hover { background: #eef3ff; }
        .quick-action-icon {
          display: inline-flex;
          align-items: center;
          color: #2563eb;
          flex-shrink: 0;
        }
        .quick-action-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--ats-primary);
        }

        /* ── Stats Bar ── */
        .detail-stats-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          background: #ffffff;
          border-radius: 10px;
          padding: 14px 20px;
          margin-bottom: 24px;
          max-width: 1440px;
          margin-left: auto;
          margin-right: auto;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: var(--ats-neutral);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .detail-stats-bar strong { color: var(--ats-primary); }
        .stat-divider { color: var(--ats-border); font-size: 18px; }

        /* ── Tabs ── */
        .detail-tabs {
          display: flex;
          gap: 0;
          border-bottom: 2px solid var(--ats-border);
          margin-bottom: 24px;
          max-width: 1440px;
          margin-left: auto;
          margin-right: auto;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .detail-tabs::-webkit-scrollbar { display: none; }
        .detail-tab {
          background: none;
          border: none;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: var(--ats-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .detail-tab:hover  { color: var(--ats-primary); }
        .detail-tab.active {
          color: var(--ats-primary);
          border-bottom-color: var(--ats-primary);
          font-weight: 600;
        }

        /* ── Content ── */
        .detail-content { max-width: 1440px; margin: 0 auto; }
        .detail-section {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid var(--ats-border);
        }
        .detail-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--ats-primary);
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--ats-border);
        }
        .section-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--ats-bg-accent);
          color: var(--ats-secondary);
          font-size: 12px;
          font-weight: 600;
          border-radius: 20px;
          padding: 2px 8px;
          min-width: 24px;
        }
        .btn-add-section {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-left: auto;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          background: var(--ats-primary);
          border: none;
          border-radius: 6px;
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-add-section:hover {
          background: var(--ats-primary-light);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(30,41,59,0.2);
        }
        .detail-empty {
          font-size: 14px;
          color: var(--ats-secondary);
          text-align: center;
          padding: 40px 0;
          font-family: 'Inter', sans-serif;
        }

        /* ── Table ── */
        .ats-table-wrap {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #000000;
        }
        .ats-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          min-width: 600px;
        }
        .ats-table thead tr { background: #e8edf5; }
        .ats-table thead th {
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          text-align: left;
          border-right: 1px solid #000000;
          border-bottom: 2px solid #000000;
          white-space: nowrap;
          letter-spacing: 0.2px;
        }
        .ats-table thead th:last-child { border-right: none; }
        .ats-table tbody tr { background: #ffffff; transition: background 0.15s ease; }
        .ats-table tbody tr:nth-child(even) { background: #f8fafc; }
        .ats-table tbody tr:hover           { background: #eef3ff; }
        .ats-table tbody td {
          padding: 10px 14px;
          color: var(--ats-neutral);
          border-right: 1px solid #000000;
          border-bottom: 1px solid #000000;
          vertical-align: middle;
          white-space: nowrap;
        }
        .ats-table tbody td:last-child    { border-right: none; }
        .ats-table tbody tr:last-child td { border-bottom: none; }

        .col-actions { width: 60px !important; text-align: center; padding: 8px 10px !important; }
        .action-btns { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.15s ease;
        }
        .action-btn.view { background: rgba(37,99,235,0.1); color: #2563eb; }
        .action-btn.view:hover { background: rgba(37,99,235,0.2); }
        .action-btn.edit { background: rgba(217,119,6,0.1); color: #d97706; }
        .action-btn.edit:hover { background: rgba(217,119,6,0.2); }
        .action-btn.delete { background: rgba(220,38,38,0.1); color: #dc2626; }
        .action-btn.delete:hover { background: rgba(220,38,38,0.2); }
        .contact-delete-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          width: min(420px, calc(100vw - 24px));
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .contact-delete-header {
          padding: 20px 24px 14px;
          border-bottom: 1px solid var(--ats-border);
        }
        .contact-delete-body {
          padding: 18px 24px;
        }
        .contact-delete-text {
          margin: 0 0 8px;
          color: var(--ats-primary);
          font-size: 15px;
          line-height: 1.5;
        }
        .contact-delete-subtext {
          margin: 0;
          color: var(--ats-secondary);
          font-size: 13px;
          line-height: 1.5;
        }
        .contact-delete-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--ats-border);
        }
        .contact-delete-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .contact-delete-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(220,38,38,0.24);
        }
        .contact-delete-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .t-badge {
          display: inline-block; padding: 2px 8px; border-radius: 6px;
          font-size: 12px; font-weight: 600; color: var(--ats-primary);
          background: var(--ats-bg-accent); border: 1px solid var(--ats-border);
        }
        .t-status {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
        }
        .t-status.open { background: rgba(5,150,105,0.1); color: #059669; }
        .t-status.hold { background: rgba(217,119,6,0.1); color: #d97706; }
        .t-status-profile {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
          background: rgba(37,99,235,0.08); color: #2563eb;
          border: 1px solid rgba(37,99,235,0.15); white-space: nowrap;
        }
        .match-score {
          display: inline-block; padding: 3px 8px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          background: rgba(5,150,105,0.1); color: #059669;
          border: 1px solid rgba(5,150,105,0.2);
        }
        .t-source { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .t-source.vendor   { background: rgba(37,99,235,0.1);  color: #2563eb; }
        .t-source.internal { background: rgba(124,58,237,0.1); color: #7c3aed; }
        .t-link { color: #2563eb; text-decoration: none; font-weight: 500; font-size: 12px; }
        .t-link:hover { text-decoration: underline; }
        .table-link-btn {
          background: none;
          border: none;
          padding: 0;
          color: #2563eb;
          font-weight: 500;
          font-size: 12px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          text-decoration: none;
        }
        .table-link-btn:hover { text-decoration: underline; }

        /* ── Pagination ── */
        .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px 0; font-family: 'Inter', sans-serif; }
        .page-info { font-size: 13px; color: var(--ats-secondary); }
        .page-btns { display: flex; align-items: center; gap: 4px; }
        .page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 6px; border-radius: 6px;
          border: 1px solid var(--ats-border); background: #ffffff;
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
          color: var(--ats-neutral); cursor: pointer; transition: all 0.15s ease;
        }
        .page-btn:hover:not(:disabled) { background: var(--ats-bg-accent); border-color: var(--ats-primary); color: var(--ats-primary); }
        .page-btn.active { background: var(--ats-primary); border-color: var(--ats-primary); color: #ffffff; font-weight: 600; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 768px) {
          .detail-page   { padding: 16px; }
          .detail-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .detail-stats-bar { gap: 8px; font-size: 13px; }
          .stat-divider  { display: none; }
          .detail-stats-bar span { flex: 1; min-width: 120px; }
          .pagination { flex-direction: column; gap: 8px; align-items: flex-start; }
          .quick-actions-dropdown { right: auto; left: 0; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDetail;
