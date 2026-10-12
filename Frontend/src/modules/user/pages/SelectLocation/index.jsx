import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * SelectLocation page has been replaced in favor of automatic background
 * GPS detection directly on the User Home page.
 */
const SelectLocation = () => {
  return <Navigate to="/user" replace state={{ autoFetchLocation: true }} />;
};

export default SelectLocation;
