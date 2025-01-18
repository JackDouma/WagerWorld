import { StrictMode } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '../page/header.jsx';
import CreateOrg from '../page/createorg.jsx';
import NotFound from '../page/notfound.jsx';
import OrgRestrictedRoute from '../component/OrgRestrictedRoute.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Header />
      <Routes>
        <Route
          path="/createorg"
          element={
            <OrgRestrictedRoute>
              <CreateOrg />
            </OrgRestrictedRoute>
          }
        />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);