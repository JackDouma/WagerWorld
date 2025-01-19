import { StrictMode } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '../page/header.jsx';
import ViewOrg from '../page/org.jsx';
import NotFound from '../page/notfound.jsx';
import NoOrgRestrictedRoute from '../component/NoOrgRestrictedRoute.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route
          path="/org"
          element={
            <NoOrgRestrictedRoute>
                <ViewOrg />
            </NoOrgRestrictedRoute>
          }
        />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
