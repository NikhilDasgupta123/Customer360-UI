// Central role configuration for future admin/user-management screens.
// Login does not read or submit these values; the backend reads the role from
// the authenticated user's database account.
export const USER_ROLES = [
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'Full access',
    iconClass: 'ti ti-shield-half',
  },
  {
    id: 'sales_executive',
    title: 'Sales Executive',
    subtitle: 'Pipeline & Accounts',
    iconClass: 'ti ti-chart-line',
  },
  {
    id: 'account_manager',
    title: 'Account Manager',
    subtitle: 'Manage Customers',
    iconClass: 'ti ti-users',
  },
  {
    id: 'support_agent',
    title: 'Support Agent',
    subtitle: 'Support & Tickets',
    iconClass: 'ti ti-headset',
  },
];
