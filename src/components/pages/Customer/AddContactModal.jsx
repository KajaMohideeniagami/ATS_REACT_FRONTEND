import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { addContact, updateContact } from '../../../services/contactService';
import { toast } from '../../toast/index';
import { validateRequiredFields } from '../../../utils/formValidation';

const emptyForm = {
  CONTACT_NAME: '',
  CONTACT_NO:   '',
  EMAIL_ID:     '',
  DESIGNATION:  '',
};

const getContactId = (contact) =>
  contact?.customer_contact_id ||
  contact?.CUSTOMER_CONTACT_ID ||
  contact?.contact_id ||
  contact?.CONTACT_ID ||
  null;

const AddContactModal = ({ isOpen, onClose, onSuccess, customerId, editContact = null }) => {
  const [formData, setFormData] = useState({
    ...emptyForm,
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(getContactId(editContact));

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode) {
      setFormData({
        CONTACT_NAME: editContact.contact_name || '',
        CONTACT_NO:   editContact.contact_no || '',
        EMAIL_ID:     editContact.email || editContact.email_id || '',
        DESIGNATION:  editContact.designation || '',
      });
      setErrors({});
      return;
    }

    setFormData({ ...emptyForm });
    setErrors({});
  }, [editContact, isEditMode, isOpen]);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const result = validateRequiredFields(
      {
        CONTACT_NAME: formData.CONTACT_NAME,
      },
      {
        toastKey: 'contact-form',
      }
    );

    setErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const basePayload = {
        customer_id:  customerId,
        contact_name: formData.CONTACT_NAME.trim(),
        contact_no:   formData.CONTACT_NO.trim()   || null,
        email_id:     formData.EMAIL_ID.trim()      || null,
        designation:  formData.DESIGNATION.trim()   || null,
      };

      const payload = isEditMode
        ? {
            ...basePayload,
            customer_contact_id: getContactId(editContact),
          }
        : basePayload;

      const response = isEditMode
        ? await updateContact(payload)
        : await addContact(payload);

      if (response.success) {
        toast.success(isEditMode ? 'Contact updated successfully!' : 'Contact added successfully!');
        resetForm();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.message || `Failed to ${isEditMode ? 'update' : 'add'} contact.`);
      }
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} contact. Please try again.`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />

      {/* Modal */}
      <div className="modal-container" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="modal-header">
          <h2 className="ats-heading-2">{isEditMode ? 'Edit Contact' : 'Add Contact'}</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <form id="add-contact-form" onSubmit={handleSubmit}>

            {/* Contact Name */}
            <div className="form-group">
              <label className="form-label">Contact Name *</label>
              <input
                type="text"
                name="CONTACT_NAME"
                className={`form-input ${errors.CONTACT_NAME ? 'input-error' : ''}`}
                value={formData.CONTACT_NAME}
                onChange={handleChange}
                placeholder="Enter contact name"
                autoFocus
              />
              {errors.CONTACT_NAME && (
                <span className="form-error">{errors.CONTACT_NAME}</span>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                name="CONTACT_NO"
                className="form-input"
                value={formData.CONTACT_NO}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="EMAIL_ID"
                className="form-input"
                value={formData.EMAIL_ID}
                onChange={handleChange}
                placeholder="Enter email address"
              />
            </div>

            {/* Designation */}
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input
                type="text"
                name="DESIGNATION"
                className="form-input"
                value={formData.DESIGNATION}
                onChange={handleChange}
                placeholder="Enter designation"
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-contact-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Contact' : 'Add Contact')}
          </button>
        </div>

      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        .modal-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1001;
          background: #ffffff;
          border-radius: 16px;
          width: 90%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.12);
          animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--ats-border);
        }
        .modal-close-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          border-radius: 8px;
          color: var(--ats-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .modal-close-btn:hover {
          background: var(--ats-bg-accent);
          color: var(--ats-primary);
        }
        .modal-body {
          padding: 20px 24px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid var(--ats-border);
        }
        .input-error {
          border-color: var(--ats-error) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @media (max-width: 768px) {
          .modal-container {
            width: 100%;
            max-width: 100%;
            top: auto;
            bottom: 0;
            left: 0;
            transform: none;
            border-radius: 16px 16px 0 0;
            animation: slideUpMobile 0.25s ease;
          }
          @keyframes slideUpMobile {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        }
      `}</style>
    </>
  );
};

export default AddContactModal;
