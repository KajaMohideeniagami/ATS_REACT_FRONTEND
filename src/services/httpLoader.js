let loaderHandlers = {
  show: () => {},
  hide: () => {},
};

export const registerGlobalLoaderHandlers = (handlers = {}) => {
  loaderHandlers = {
    show: typeof handlers.show === 'function' ? handlers.show : () => {},
    hide: typeof handlers.hide === 'function' ? handlers.hide : () => {},
  };
};

export const showGlobalHttpLoader = (options) => {
  loaderHandlers.show(options);
};

export const hideGlobalHttpLoader = () => {
  loaderHandlers.hide();
};

export const attachGlobalLoaderInterceptors = (client) => {
  if (!client || client.__atsLoaderAttached) {
    return client;
  }

  const requestInterceptor = client.interceptors.request.use(
    (config) => {
      if (!config?.skipGlobalLoader) {
        showGlobalHttpLoader({
          message: config?.loaderMessage || 'Loading...',
          backdrop: config?.loaderBackdrop !== false,
          size: config?.loaderSize || 'lg',
        });
      }

      return config;
    },
    (error) => {
      hideGlobalHttpLoader();
      return Promise.reject(error);
    }
  );

  const responseInterceptor = client.interceptors.response.use(
    (response) => {
      if (!response?.config?.skipGlobalLoader) {
        hideGlobalHttpLoader();
      }

      return response;
    },
    (error) => {
      if (!error?.config?.skipGlobalLoader) {
        hideGlobalHttpLoader();
      }

      return Promise.reject(error);
    }
  );

  client.__atsLoaderAttached = true;
  client.__atsLoaderInterceptorIds = {
    request: requestInterceptor,
    response: responseInterceptor,
  };

  return client;
};
