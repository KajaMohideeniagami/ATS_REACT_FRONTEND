import { toast } from '../components/toast/index';

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const focusField = (fieldName, formId) => {
  if (typeof document === 'undefined' || !fieldName) return;

  const form = formId ? document.getElementById(formId) : document;
  const field = form?.querySelector?.(`[name="${fieldName}"]`);

  if (!field || typeof field.focus !== 'function') return;

  requestAnimationFrame(() => {
    field.focus();
    if (typeof field.scrollIntoView === 'function') {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
};

export const validateRequiredFields = (fields, options = {}) => {
  const {
    message = 'Please fill all required fields',
    toastKey = 'default-validation',
    showToast = true,
    focusOnError = true,
    formId,
  } = options;

  const errors = Object.entries(fields).reduce((accumulator, [fieldName, value]) => {
    if (isEmptyValue(value)) {
      accumulator[fieldName] = `${fieldName.replace(/_/g, ' ')} is required`;
    }
    return accumulator;
  }, {});

  const firstInvalidField = Object.keys(errors)[0];

  if (showToast && Object.keys(errors).length > 0) {
    toast.requiredFields(message, toastKey);
  }

  if (focusOnError && firstInvalidField) {
    focusField(firstInvalidField, formId);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstInvalidField,
  };
};
