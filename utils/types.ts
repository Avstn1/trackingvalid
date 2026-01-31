export interface Appointment {
  id: string;
  client_name: string;
  date: string;
  service: string;
  price: number;
  earnings: number;
  clients: string;
  name: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_type: 'web' | 'mobile';
  device_id?: string;
  device_name?: string;
  session_id?: string;
  last_login: string;
  last_active: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}