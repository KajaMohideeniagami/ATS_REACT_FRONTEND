import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Loader from '../components/common/Loader';
import LoaderStateContext from './LoaderStateContext';
import { registerGlobalLoaderHandlers } from '../services/httpLoader';

const DEFAULT_OPTIONS = {
  message: 'Loading...',
  size: 'lg',
  backdrop: true,
};

export const LoaderProvider = ({ children }) => {
  const [activeRequests, setActiveRequests] = useState(0);
  const [loaderOptions, setLoaderOptions] = useState(DEFAULT_OPTIONS);

  const showLoader = useCallback((options = {}) => {
    setLoaderOptions((previous) => ({
      ...previous,
      ...options,
    }));
    setActiveRequests((previous) => previous + 1);
  }, []);

  const hideLoader = useCallback(() => {
    setActiveRequests((previous) => Math.max(0, previous - 1));
  }, []);

  useEffect(() => {
    registerGlobalLoaderHandlers({
      show: showLoader,
      hide: hideLoader,
    });
  }, [showLoader, hideLoader]);

  const value = useMemo(
    () => ({
      isVisible: activeRequests > 0,
      showLoader,
      hideLoader,
      activeRequests,
    }),
    [activeRequests, hideLoader, showLoader]
  );

  return (
    <LoaderStateContext.Provider value={value}>
      {children}
      {activeRequests > 0 ? (
        <Loader
          fullscreen
          backdrop={loaderOptions.backdrop}
          size={loaderOptions.size}
          message={loaderOptions.message}
          suppressWhenGlobal={false}
        />
      ) : null}
    </LoaderStateContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderStateContext);
