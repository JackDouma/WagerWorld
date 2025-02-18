import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './page/header.jsx';
import Index from './page/index.jsx';
import NotFound from './page/notfound.jsx'; // Make sure the NotFound component is imported
import AdminPage from './page/admin.jsx';
import AdminOnlyRoute from './component/AdminOnlyRoute.jsx';
import OwnerOnlyRoute from './component/OwnerOnlyRoute.jsx';
import Signup from './page/signup.jsx';
import Signin from './page/signin.jsx';
import CreateOrg from './page/createorg.jsx';
import EditOrg from './page/editorg.jsx';
import ViewOrg from './page/org.jsx';
import NoOrgRestrictedRoute from './component/NoOrgRestrictedRoute.jsx';
import ViewOrgById from './page/orgbyid.jsx';
import ViewOrgSettingsById from './page/orgsettingsbyid.jsx';
import ViewOrgSettings from './page/orgsettings.jsx';
import EditOrgById from './page/editorgbyid.jsx';
import RoomPage from './page/roomPage.jsx';
import BlackJack from './page/blackjack.jsx';
import Poker from './page/poker.jsx';
import OrgRestrictedRoute from './component/OrgRestrictedRoute.jsx';  // Import OrgRestrictedRoute
import "./styles.css";


function App() {
    return (
        <BrowserRouter>
            <Header />
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/org">
                    <Route index element={<NoOrgRestrictedRoute><ViewOrg /></NoOrgRestrictedRoute>} />
                    <Route 
                        path=":orgId" 
                        element={
                            <OrgRestrictedRoute>
                                <ViewOrgById />
                            </OrgRestrictedRoute>
                        }
                    />
                </Route>
                <Route path="/orgsettings">
                    <Route index element={<OwnerOnlyRoute><ViewOrgSettings /></OwnerOnlyRoute>} />
                    <Route 
                        path=":orgId" 
                        element={
                            <OwnerOnlyRoute>
                                <ViewOrgSettingsById />
                            </OwnerOnlyRoute>
                        }
                    />
                </Route>
                <Route path="/admin" element={<AdminOnlyRoute><AdminPage /></AdminOnlyRoute>} />
                <Route path="/blackjack" element={<BlackJack />} />
                <Route path="/poker" element={<Poker />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/createorg" element={<AdminOnlyRoute><CreateOrg /></AdminOnlyRoute>} />
                <Route path="/editorg">
                    <Route index element={<AdminOnlyRoute><EditOrg /></AdminOnlyRoute>} />
                    <Route 
                        path=":orgId" 
                        element={
                            <AdminOnlyRoute>
                                <EditOrgById />
                            </AdminOnlyRoute>
                        }
                    />
                </Route>
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
