import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
import ViewUser from './page/user.jsx';
import ViewUserById from './page/userbyid.jsx';
import RoomPage from './page/roomPage.jsx';
import BlackJack from './page/blackjack.jsx';
import BlackJackById from './page/blackjackbyid.jsx';
import HorseRacing from './page/horseracing.jsx';
import HorseRacingById from './page/horseracingbyid.jsx';
import Poker from './page/poker.jsx';
import PokerById from './page/pokerbyid.jsx';
import OrgRequest from './page/orgrequest.jsx';
import OrgRestrictedRoute from './component/OrgRestrictedRoute.jsx';  // Import OrgRestrictedRoute
import "./styles.css";

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

function AppContent() {
    const location = useLocation();

    useEffect(() => {
        const { pathname } = location;
        let title = 'WagerWorld'; // Default title

        if (pathname === '/' || pathname === '/index') {
            title = 'Home - WagerWorld';
        } else if (pathname === '/orgrequest') {
            title = 'Organization Request - WagerWorld';
        } else if (pathname.startsWith('/orgsettings')) {
            title = 'Organization Settings - WagerWorld';
        } else if (pathname.startsWith('/org')) {
            title = 'My Organization - WagerWorld';
        } else if (pathname.startsWith('/user')) {
            title = 'User Profile - WagerWorld';
        } else if (pathname.startsWith('/blackjack')) {
            title = 'Blackjack - WagerWorld';
        } else if (pathname.startsWith('/horseracing')) {
            title = 'Horse Racing - WagerWorld';
        } else if (pathname.startsWith('/poker')) {
            title = 'Poker - WagerWorld';
        } else if (pathname === '/signin') {
            title = 'Sign In - WagerWorld';
        } else if (pathname === '/signup') {
            title = 'Sign Up - WagerWorld';
        } else if (pathname === '/admin') {
            title = 'Admin - WagerWorld';
        } else if (pathname === '/404') {
            title = 'Not Found - WagerWorld';
        }
        // TODO: Add more titles as needed

        document.title = title;
    }, [location]);

    useEffect(() => { }, [location]);

    // for now, specifying the pages that won't show the header. will do the opposite once front end is finished
    const showHeader = (pathname) => {
        return (
            pathname === '/' ||
            pathname === '/index' ||
            pathname === '/signin' ||
            pathname === '/signup' ||
            pathname === '/orgrequest'
        );
    }
    // // pages listed here will show the header (game pages included)
    // const showHeader = (pathname) => {
    //     return (
    //         pathname.startsWith('/org/') ||
    //         pathname.startsWith('/user') ||
    //         pathname === '/404' ||
    //         pathname === '/admin'
    //     );
    // };

    return (
        <>
            {!showHeader(location.pathname) && <Header />}
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
                <Route path="/user">
                    <Route index element={<NoOrgRestrictedRoute><ViewUser /></NoOrgRestrictedRoute>} />
                    <Route
                        path=":userId"
                        element={
                            <NoOrgRestrictedRoute>
                                <ViewUserById />
                            </NoOrgRestrictedRoute>
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

                <Route path="/blackjack">
                    <Route index element={<BlackJack />} />
                    <Route
                        path=":roomId"
                        element={<BlackJackById />}
                    />
                </Route>
                <Route path="/horseracing">
                    <Route index element={<HorseRacing />} />
                    <Route
                        path=":roomId"
                        element={<HorseRacingById />}
                    />
                </Route>
                <Route path="/poker">
                    <Route index element={<Poker />} />
                    <Route
                        path=":roomId"
                        element={<PokerById />}
                    />
                </Route>

                <Route path="/admin" element={<AdminOnlyRoute><AdminPage /></AdminOnlyRoute>} />
                <Route path="/room/:roomId" element={<RoomPage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/orgrequest" element={<OrgRequest />} />
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
        </>
    );
}

export default App;
