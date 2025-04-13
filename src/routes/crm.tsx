import { Route } from 'react-router-dom';
import ClientList from '../components/crm/ClientList';
import ClientDetail from '../components/crm/ClientDetail';

export const crmRoutes = (
  <>
    <Route path="/crm/clients" element={<ClientList />} />
    <Route path="/crm/clients/:id" element={<ClientDetail />} />
  </>
); 