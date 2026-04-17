import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AiLoader from '../components/common/AiLoader';
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
  const [aiLoaderState, setAiLoaderState] = useState({
    isVisible: false,
    mode: 'demand',
    title: '',
  });

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

  const showAiLoader = useCallback((options = {}) => {
    setAiLoaderState({
      isVisible: true,
      mode: options.mode || 'demand',
      title: options.title || '',
    });
  }, []);

  const hideAiLoader = useCallback(() => {
    setAiLoaderState((previous) => ({
      ...previous,
      isVisible: false,
    }));
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
      aiIsVisible: aiLoaderState.isVisible,
      showAiLoader,
      hideAiLoader,
    }),
    [activeRequests, aiLoaderState.isVisible, hideAiLoader, hideLoader, showAiLoader, showLoader]
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
      {aiLoaderState.isVisible ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(15, 23, 42, 0.38)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ width: 'min(720px, 100%)' }}>
            <AiLoader mode={aiLoaderState.mode} title={aiLoaderState.title} />
          </div>
        </div>
      ) : null}
    </LoaderStateContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderStateContext);
