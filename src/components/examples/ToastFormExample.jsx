import React, { useState } from 'react';
import { useToast } from '../toast/index';
import { validateRequiredFields } from '../../utils/formValidation';

const ToastFormExample = () => {
  const { success } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = validateRequiredFields(
      {
        name: formData.name,
        email: formData.email,
      },
      {
        toastKey: 'toast-form-example',
      }
    );

    setErrors(result.errors);

    if (!result.isValid) {
      return;
    }

    success('Form submitted successfully!');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
        placeholder="Name"
      />
      {errors.name ? <span>{errors.name}</span> : null}

      <input
        type="email"
        value={formData.email}
        onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
        placeholder="Email"
      />
      {errors.email ? <span>{errors.email}</span> : null}

      <button type="submit">Submit</button>
    </form>
  );
};

export default ToastFormExample;
