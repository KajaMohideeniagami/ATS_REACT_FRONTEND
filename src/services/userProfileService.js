import api from './api';

export const resetPassword = async (username, oldPassword, newPassword) => {
  const response = await api.post('/ats/users/ats_users', {
    username,
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.data;
};