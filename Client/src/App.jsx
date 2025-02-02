import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './page/header.jsx';
import Index from './page/index.jsx';
import NotFound from './page/notfound.jsx';
import AdminPage from './page/admin.jsx';
import AdminOnlyRoute from './component/AdminOnlyRoute.jsx';
import Signup from './page/signup.jsx';
import Signin from './page/signin.jsx';
import CreateOrg from './page/createorg.jsx';
import ViewOrg from './page/org.jsx';
import NoOrgRestrictedRoute from './component/NoOrgRestrictedRoute.jsx';
import ViewOrgById from './page/orgbyid.jsx';
import BlackJack from './page/blackjack.jsx';
import Poker from './page/poker.jsx';

function App() {
    return (
    <BrowserRouter>
        <Header />
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Index />} />
            <Route path="/org">
                <Route index element={<NoOrgRestrictedRoute><ViewOrg /></NoOrgRestrictedRoute>} />
                <Route path=":orgCode" element={<ViewOrgById />} />
            </Route>
            <Route path="/admin" element={<AdminOnlyRoute><AdminPage /></AdminOnlyRoute>} />
            <Route path="/blackjack" element={<BlackJack />} />
            <Route path="/poker" element={<Poker />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/createorg" element={<AdminOnlyRoute><CreateOrg /></AdminOnlyRoute>} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    </BrowserRouter>
    )
}

export default App;
