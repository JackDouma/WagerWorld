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
import BlackJackById from './page/blackjackbyid.jsx';
import HorseRacing from './page/horseracing.jsx';
import HorseRacingById from './page/horseracingbyid.jsx';
import Poker from './page/poker.jsx';
import PokerById from './page/pokerbyid.jsx';
import OrgRequest from './page/orgrequest.jsx';
import OrgRestrictedRoute from './component/OrgRestrictedRoute.jsx';  // Import OrgRestrictedRoute
import ViewLeaderboard from './page/leaderboard.jsx';
import ViewLeaderboardById from './page/leaderboardbyid.jsx';
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
            title = 'Organizations - WW Admin';
        } else if (pathname === '/404') {
            title = 'Not Found - WagerWorld';
        } else if (pathname.startsWith('/room')) {
            title = 'Room - WagerWorld';
        } else if (pathname === '/createorg') {
            title = 'Create Org - WW Admin';
        } else if (pathname.startsWith('/editorg')) {
            title = "Edit Org - WW Admin";
        }
        else if (pathname.startsWith('/leaderboard')) {
            title = "Leaderboard - WagerWorld";
        }
        // TODO: Add more titles as needed

        document.title = title;
    }, [location]);

    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/org">
                    <Route index element={<NoOrgRestrictedRoute><Header /><ViewOrg /></NoOrgRestrictedRoute>} />
                    <Route
                        path=":orgId"
                        element={
                            <OrgRestrictedRoute>
                                <Header />
                                <ViewOrgById />
                            </OrgRestrictedRoute>
                        }
                    />
                </Route>

                <Route path="/leaderboard">
                    <Route index element={<NoOrgRestrictedRoute><Header /><ViewLeaderboard /></NoOrgRestrictedRoute>} />
                    <Route
                        path=":orgId"
                        element={
                            <OrgRestrictedRoute>
                                <Header />
                                <ViewLeaderboardById />
                            </OrgRestrictedRoute>
                        }
                    />
                </Route>

                <Route path="/user">
                    <Route index element={<NoOrgRestrictedRoute><Header /><ViewUser /></NoOrgRestrictedRoute>} />
                    <Route
                        path=":userId"
                        element={
                            <NoOrgRestrictedRoute>
                                <Header />
                                <ViewUserById />
                            </NoOrgRestrictedRoute>
                        }
                    />
                </Route>
                <Route path="/orgsettings">
                    <Route index element={<OwnerOnlyRoute><Header /><ViewOrgSettings /></OwnerOnlyRoute>} />
                    <Route
                        path=":orgId"
                        element={
                            <OwnerOnlyRoute>
                                <Header />
                                <ViewOrgSettingsById />
                            </OwnerOnlyRoute>
                        }
                    />
                </Route>

                <Route path="/blackjack">
                    <Route index element={<><Header /><BlackJackById /></>} />
                    <Route
                        path=":roomId"
                        element={<><Header /><BlackJackById /></>}
                    />
                </Route>
                <Route path="/horseracing">
                    <Route index element={<><Header /><HorseRacing /></>} />
                    <Route
                        path=":roomId"
                        element={<><Header /><HorseRacingById /></>}
                    />
                </Route>
                <Route path="/poker">
                    <Route index element={<><Header /><Poker /></>} />
                    <Route
                        path=":roomId"
                        element={<><Header /><PokerById /></>}
                    />
                </Route>

                <Route path="/admin" element={<AdminOnlyRoute><Header /><AdminPage /></AdminOnlyRoute>} />
                <Route path="/room/:roomId" element={<><Header /><RoomPage /></>} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/orgrequest" element={<OrgRequest />} />
                <Route path="/createorg" element={<AdminOnlyRoute><Header /><CreateOrg /></AdminOnlyRoute>} />
                <Route path="/editorg">
                    <Route index element={<AdminOnlyRoute><Header /><EditOrg /></AdminOnlyRoute>} />
                    <Route
                        path=":orgId"
                        element={
                            <AdminOnlyRoute>
                                <Header />
                                <EditOrgById />
                            </AdminOnlyRoute>
                        }
                    />
                </Route>
                <Route path="/404" element={<><Header /><NotFound /></>} />
                <Route path="*" element={<><Header /><NotFound /></>} />
            </Routes>
        </>
    );
}

export default App;
