import { useMemo, useState } from 'react';
import { USER_ROLES } from '../data/roles.js';
import { loginCustomerGraph } from './authService.js';

export function useLoginForm() {
  const defaultRole = useMemo(
    () => USER_ROLES.find((role) => role.defaultActive)?.id || USER_ROLES[0]?.id,
    []
  );

  const [email, setEmail] = useState('you@company.com');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword((currentValue) => !currentValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await loginCustomerGraph({
      email,
      password,
      roleId: selectedRole,
    });

    console.log('Login payload:', result);
  };

  return {
    email,
    password,
    selectedRole,
    showPassword,
    setEmail,
    setPassword,
    setSelectedRole,
    togglePassword,
    handleSubmit,
  };
}
